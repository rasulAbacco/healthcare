// server/src/biometric/biometric.helper.js
// Pure helper functions — no Prisma calls here, just time math and shaping.
// Kept separate from biometric.service.js so the calculation logic is easy
// to unit-test on its own later.
//
// ----------------------------------------------------------------------------
// TIME ZONE MODEL (read this first)
//
// The device sends unmarked IST wall-clock times ("2026-10-05 09:15:00").
// Previously those were parsed with `new Date(y, m, d, ...)`, which uses the
// SERVER's time zone, and attendance days were keyed with local midnight.
// On a server that isn't running in IST that shifts every punch by 5h30m and
// can push the "date" key around, so punches of the same day stop landing on
// the same Attendance row — each punch then opened its own row with
// firstPunch === lastPunch, which is exactly the "punch-in and punch-out show
// the same time" bug.
//
// Now everything is explicit and server-time-zone independent:
//   * A punch is stored as the real instant (IST wall time − 5h30m).
//   * An attendance "date key" is UTC midnight of the IST calendar date, which
//     is exactly what Postgres stores in a @db.Date column.
//   * First / last punch for a day are always recomputed from ALL the raw
//     punch logs of that day (not patched incrementally), so the punch-out is
//     simply the latest punch of the shift day.
// ----------------------------------------------------------------------------

export const IST_OFFSET_MINUTES = 330; // UTC+05:30
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * MINUTE_MS;

// ----------------------------------------------------------------------------
// Fallback shift used only when a person has no shift from Shift Assignment
// and no shift on their biometric mapping.
// ----------------------------------------------------------------------------
export const DEFAULT_SHIFT_START_MINUTES = 9 * 60; // 09:00
export const DEFAULT_FULL_DAY_MINUTES = 8 * 60; // 480
export const DEFAULT_GRACE_MINUTES = 10;
// Per-shift defaults for the full-day / half-day / OT rules (editable on
// each shift): up to 1 hour of late login + early logout is excused for a
// full day, and half-day / OT lines get a 20-minute window.
export const DEFAULT_LATE_EXCUSE_MINUTES = 60;
export const DEFAULT_DAY_WINDOW_MINUTES = 20;

export const DEFAULT_SHIFT = {
  id: null,
  name: "Default (Unassigned)",
  code: "DEFAULT",
  type: "GENERAL",
  startTime: "09:00",
  endTime: "17:00",
  graceBeforeMinutes: DEFAULT_GRACE_MINUTES,
  graceAfterMinutes: DEFAULT_GRACE_MINUTES,
  breakMinutes: 0,
  overtimeAfterMinutes: 0,
  totalWorkingMinutes: DEFAULT_FULL_DAY_MINUTES,
  lateExcuseMinutes: DEFAULT_LATE_EXCUSE_MINUTES,
  dayWindowMinutes: DEFAULT_DAY_WINDOW_MINUTES,
  isActive: true,
};

// Treat two punches from the same device+enrollmentId within this window as
// the same physical punch (duplicate press / device retry), not a new event.
export const DUPLICATE_PUNCH_WINDOW_SECONDS = 60;

// The latest punch of a day only counts as the punch-OUT if it is at least
// this far after the first punch. Anything closer is a double press, so the
// day is treated as "punched in, no punch-out yet".
export const MIN_PUNCH_OUT_GAP_MINUTES = 5;

// Upper bound on report / rebuild ranges so a typo can't scan years of logs.
export const MAX_REPORT_RANGE_DAYS = 93;

// ----------------------------------------------------------------------------
// IST date helpers
// ----------------------------------------------------------------------------

// Wall-clock parts of an instant as seen in IST.
export function istParts(value) {
  const shifted = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

// UTC midnight of the IST calendar date of `value` — the Attendance.date key.
export function istDateKey(value) {
  const p = istParts(value);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

// Kept for backwards compatibility with older imports.
export const startOfDay = istDateKey;

export function addDays(dateKey, days) {
  return new Date(new Date(dateKey).getTime() + days * DAY_MS);
}

export function dateKeyToString(dateKey) {
  return new Date(dateKey).toISOString().slice(0, 10);
}

export function dateKeyWeekday(dateKey) {
  return new Date(dateKey).getUTCDay(); // 0 = Sunday
}

// The real instant at which an IST calendar day starts (00:00 IST).
export function istDayStartInstant(dateKey) {
  return new Date(new Date(dateKey).getTime() - IST_OFFSET_MS);
}

export function eachDateKey(fromKey, toKey) {
  const out = [];
  const end = new Date(toKey).getTime();
  for (let t = new Date(fromKey).getTime(); t <= end; t += DAY_MS)
    out.push(new Date(t));
  return out;
}

export function daysInclusive(fromKey, toKey) {
  return (
    Math.round(
      (new Date(toKey).getTime() - new Date(fromKey).getTime()) / DAY_MS,
    ) + 1
  );
}

export function minutesBetween(from, to) {
  return Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / MINUTE_MS),
  );
}

function istMinutesOfDay(value) {
  const p = istParts(value);
  return p.hours * 60 + p.minutes;
}

// ----------------------------------------------------------------------------
// Shift math
// ----------------------------------------------------------------------------

// "08:00" -> 480. Returns null for anything unparseable.
export function timeStringToMinutes(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Overnight = end clock-time is not after start clock-time (e.g. 20:00 -> 08:00).
export function isOvernightShift(shift) {
  const start = timeStringToMinutes(shift?.startTime);
  const end = timeStringToMinutes(shift?.endTime);
  if (start === null || end === null) return false;
  return end <= start;
}

// Scheduled span in minutes, before subtracting the break.
export function shiftSpanMinutes(shift) {
  const start = timeStringToMinutes(shift?.startTime);
  const end = timeStringToMinutes(shift?.endTime);
  if (start === null || end === null) return 0;
  return end <= start ? 1440 - start + end : end - start;
}

// Working minutes after the unpaid break — stored as Shift.totalWorkingMinutes.
export function computeShiftWorkingMinutes(shift) {
  return Math.max(
    0,
    shiftSpanMinutes(shift) - (Number(shift?.breakMinutes) || 0),
  );
}

// Expected working minutes for one day on this shift.
export function shiftWorkingMinutes(shift) {
  const s = shift || DEFAULT_SHIFT;
  return Number(s.totalWorkingMinutes) || computeShiftWorkingMinutes(s);
}

// ----------------------------------------------------------------------------
// Full day / half day / overtime rules
//
// Example: 8 AM – 8 PM shift = 12h, excuse 60 min, window 20 min.
//   * FULL DAY (Present)  worked >= 12h − 1h excuse         = 11h
//   * HALF DAY            any punch-in + punch-out below that
//   * Extra hours = worked − 12h:
//       FULL-DAY OT  extra >= 12h − 20m                     = 11h 40m
//       HALF-DAY OT  extra >= 6h  − 20m                     = 5h 40m
//       below that   not OT — the extra minutes go into the
//                    month's balance to cover late login /
//                    short days, and show in the monthly report.
// ----------------------------------------------------------------------------

function minutesSetting(value, fallback) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || Number.isNaN(n))
    return fallback;
  return Math.max(0, Math.round(n));
}

export function lateExcuseMinutes(shift) {
  return minutesSetting(shift?.lateExcuseMinutes, DEFAULT_LATE_EXCUSE_MINUTES);
}

export function dayWindowMinutes(shift) {
  return minutesSetting(shift?.dayWindowMinutes, DEFAULT_DAY_WINDOW_MINUTES);
}

export function dayRules(shift) {
  const s = shift || DEFAULT_SHIFT;
  const working = shiftWorkingMinutes(s);
  const half = Math.round(working / 2);
  const excuse = lateExcuseMinutes(s);
  const window = dayWindowMinutes(s);
  return {
    workingMinutes: working,
    lateExcuseMinutes: excuse,
    dayWindowMinutes: window,
    fullDayMinutes: Math.max(0, working - excuse),
    halfDayMinutes: Math.max(0, half - window),
    otHalfMinutes: Math.max(1, half - window),
    otFullMinutes: Math.max(1, working - window),
    otHalfCredit: half, // minutes "used up" by a half-day OT
    otFullCredit: working, // minutes "used up" by a full-day OT
  };
}

// Kept for older imports.
export function requiredMinutesForFullDay(shift) {
  return dayRules(shift).fullDayMinutes;
}

// Splits the worked minutes of a completed day into status / OT / balance.
export function classifyWorkedDay(workingMinutes, shift) {
  const r = dayRules(shift);
  const w = Math.max(0, Number(workingMinutes) || 0);
  const status = w >= r.fullDayMinutes ? "PRESENT" : "HALF_DAY";
  const extra = Math.max(0, w - r.workingMinutes);

  let otDays = 0;
  let otCredit = 0;
  if (extra >= r.otFullMinutes) {
    otDays = 1;
    otCredit = Math.min(extra, r.otFullCredit);
  } else if (extra >= r.otHalfMinutes) {
    otDays = 0.5;
    otCredit = Math.min(extra, r.otHalfCredit);
  }

  return {
    status,
    overtimeMinutes: extra, // all hours beyond the shift length
    otDays, // 0 / 0.5 / 1
    extraMinutes: extra - otCredit, // not enough for OT -> monthly balance
    shortMinutes: Math.max(0, r.workingMinutes - w), // below the shift length
  };
}

// Compact, client-friendly description of a shift.
export function shiftSummary(shift, source = null) {
  const s = shift || DEFAULT_SHIFT;
  const r = dayRules(s);
  return {
    id: s.id || null,
    name: s.name,
    code: s.code,
    type: s.type,
    startTime: s.startTime,
    endTime: s.endTime,
    breakMinutes: Number(s.breakMinutes) || 0,
    graceAfterMinutes: Number(s.graceAfterMinutes) || 0,
    totalWorkingMinutes: r.workingMinutes,
    lateExcuseMinutes: r.lateExcuseMinutes,
    dayWindowMinutes: r.dayWindowMinutes,
    fullDayMinutes: r.fullDayMinutes,
    halfDayMinutes: r.halfDayMinutes,
    otHalfMinutes: r.otHalfMinutes,
    otFullMinutes: r.otFullMinutes,
    source,
  };
}

// ----------------------------------------------------------------------------
// Which "shift day" a punch belongs to.
//
// The off-duty gap runs from shift end to the next shift start. Punches in
// the first THREE QUARTERS of that gap still belong to the shift that just
// ended (that's where overtime happens); only the last quarter counts as
// arriving early for the next shift.
//
//   8 AM – 8 PM shift: gap 8 PM -> 8 AM (12h). Cut-off 5 AM.
//     A 2:10 AM punch-out after half-day OT stays on the previous day;
//     a 7:40 AM punch is an early arrival for today.
//   8 PM – 8 AM (night): gap 8 AM -> 8 PM. Cut-off 5 PM — a 7:55 AM or 2 PM
//     punch-out completes last night's row.
// ----------------------------------------------------------------------------
export function offDutyCutoffMinutes(shift) {
  const start = timeStringToMinutes(shift?.startTime);
  if (start === null) return 0;
  const gap = 1440 - shiftSpanMinutes(shift);
  return (((start - Math.floor(gap / 4)) % 1440) + 1440) % 1440;
}

export function resolveAttendanceDate(punchDateTime, shift) {
  const day = istDateKey(punchDateTime);
  const start = timeStringToMinutes(shift?.startTime);
  const end = timeStringToMinutes(shift?.endTime);
  if (start === null || end === null) return day;

  const cutoff = offDutyCutoffMinutes(shift);
  const t = istMinutesOfDay(punchDateTime);
  if (isOvernightShift(shift)) {
    // e.g. 20:00-08:00, cutoff 17:00: before 17:00 = last night's shift.
    return t < cutoff ? addDays(day, -1) : day;
  }
  // Same-day shift: only after-midnight punches before the cutoff (and
  // only when the cutoff itself is in the morning, before the shift start).
  return cutoff < start && t < cutoff ? addDays(day, -1) : day;
}

// Scheduled start/end instants of the shift for a given shift day.
export function shiftWindowForDate(dateKey, shift) {
  const start = timeStringToMinutes(shift?.startTime) ?? 0;
  const shiftStart = new Date(
    istDayStartInstant(dateKey).getTime() + start * MINUTE_MS,
  );
  const shiftEnd = new Date(
    shiftStart.getTime() + shiftSpanMinutes(shift) * MINUTE_MS,
  );
  return { shiftStart, shiftEnd };
}

// ----------------------------------------------------------------------------
// Day metrics
//
// Status rules:
//   no punch                                   -> ABSENT
//   punched in, no valid punch-out             -> HALF_DAY (shown as
//                                                 "No punch-out" in the UI)
//   worked >= shift hours − late/early excuse  -> PRESENT
//   worked less than that                      -> HALF_DAY
//   (overtime: see classifyWorkedDay above)
// ----------------------------------------------------------------------------
export function computeAttendanceMetrics(
  firstPunch,
  lastPunch,
  shift = DEFAULT_SHIFT,
  shiftDay = null,
) {
  const s = shift || DEFAULT_SHIFT;
  if (!firstPunch) {
    return {
      workingMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      otDays: 0,
      extraMinutes: 0,
      shortMinutes: 0,
      status: "ABSENT",
    };
  }

  const first = new Date(firstPunch);
  const day = shiftDay || resolveAttendanceDate(first, s);
  const { shiftStart, shiftEnd } = shiftWindowForDate(day, s);

  // Late: punching in after (shift start + grace-after).
  const graceAfter = Number(s.graceAfterMinutes) || 0;
  const onTimeDeadline = new Date(
    shiftStart.getTime() + graceAfter * MINUTE_MS,
  );
  const lateMinutes =
    first > onTimeDeadline ? minutesBetween(onTimeDeadline, first) : 0;

  if (!lastPunch) {
    return {
      workingMinutes: 0,
      lateMinutes,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      otDays: 0,
      extraMinutes: 0,
      shortMinutes: 0,
      status: "HALF_DAY",
    };
  }

  const last = new Date(lastPunch);
  const rawWorkingMinutes = minutesBetween(first, last);
  const workingMinutes = Math.max(
    0,
    rawWorkingMinutes - (Number(s.breakMinutes) || 0),
  );

  const earlyExitMinutes = last < shiftEnd ? minutesBetween(last, shiftEnd) : 0;

  // Overtime = hours worked beyond the shift length (late login is not
  // rewarded with OT just for leaving late).
  const c = classifyWorkedDay(workingMinutes, s);

  return {
    workingMinutes,
    lateMinutes,
    earlyExitMinutes,
    overtimeMinutes: c.overtimeMinutes,
    otDays: c.otDays,
    extraMinutes: c.extraMinutes,
    shortMinutes: c.shortMinutes,
    status: c.status,
  };
}

// Builds a full day from every raw punch of that shift day:
// first punch = punch-in, latest punch = punch-out (if far enough apart).
export function buildDayFromPunches(punchTimes, shift, dateKey) {
  const times = [
    ...new Set(
      (punchTimes || []).filter(Boolean).map((t) => new Date(t).getTime()),
    ),
  ]
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  if (!times.length) {
    return {
      firstPunch: null,
      lastPunch: null,
      punchCount: 0,
      ...computeAttendanceMetrics(null, null, shift, dateKey),
    };
  }

  const firstPunch = times[0];
  const latest = times[times.length - 1];
  const lastPunch =
    minutesBetween(firstPunch, latest) >= MIN_PUNCH_OUT_GAP_MINUTES
      ? latest
      : null;

  return {
    firstPunch,
    lastPunch,
    punchCount: times.length,
    ...computeAttendanceMetrics(firstPunch, lastPunch, shift, dateKey),
  };
}

// ----------------------------------------------------------------------------
// Which shift applies to a person on a given date.
//
// ctx = { shiftsById: Map, employeesById: Map, historyByEmployee: Map }
// (loaded by the service). Order of precedence:
//   1. Shift Assignment history row whose effective period covers the date
//   2. Employee's current shift, if its effective period covers the date
//   3. Shift set on the biometric mapping (used for staff Users)
//   4. Employee's current shift (date outside any recorded period)
//   5. DEFAULT_SHIFT
// ----------------------------------------------------------------------------
export function resolveShift(ctx, person, dateKey) {
  const t = new Date(dateKey).getTime();
  const covers = (from, to) =>
    (!from || new Date(from).getTime() <= t) &&
    (!to || new Date(to).getTime() >= t);
  const byId = (id) => (id && ctx?.shiftsById?.get(id)) || null;

  const employee = person?.employeeId
    ? ctx?.employeesById?.get(person.employeeId)
    : null;

  if (person?.employeeId) {
    const history = ctx?.historyByEmployee?.get(person.employeeId) || [];
    const match = history.find(
      (h) => h.effectiveFrom && covers(h.effectiveFrom, h.effectiveTo),
    );
    if (match && byId(match.newShiftId))
      return { shift: byId(match.newShiftId), source: "ASSIGNMENT" };

    if (
      !match &&
      employee?.shiftId &&
      byId(employee.shiftId) &&
      covers(employee.shiftEffectiveFrom, employee.shiftEffectiveTo)
    ) {
      return { shift: byId(employee.shiftId), source: "ASSIGNMENT" };
    }
  }

  if (byId(person?.mappingShiftId))
    return { shift: byId(person.mappingShiftId), source: "MAPPING" };
  if (employee?.shiftId && byId(employee.shiftId))
    return { shift: byId(employee.shiftId), source: "CURRENT" };

  return { shift: DEFAULT_SHIFT, source: "DEFAULT" };
}

// ----------------------------------------------------------------------------
// Week-off rules
//
// The hospital runs every day — no fixed Sunday off and no holidays. Instead
// each person gets a number of WEEK-OFFS PER MONTH:
//   * Ward boys & housekeeping: 2 (default)
//   * Everyone else:            4 (default)
// Both are editable from the "Week-offs" settings tab.
//
// Each month, the first N days a person doesn't punch (or is marked on leave)
// are shown as WEEK OFF. Only the days beyond N are shown as LEAVE.
//
// Group matching ignores case, spaces and punctuation, so "Ward boy",
// "WARD BOY", "Wardboy" and "ward-boy" all match the keyword "Ward Boy".
// ----------------------------------------------------------------------------

export const DEFAULT_WEEK_OFFS_PER_MONTH = 4;
export const MAX_WEEK_OFFS_PER_MONTH = 15;

export const DEFAULT_WEEK_OFF_POLICY = {
  defaultWeekOffs: DEFAULT_WEEK_OFFS_PER_MONTH,
  groups: [
    {
      id: "ward-housekeeping",
      name: "Ward Boy & Housekeeping",
      keywords: ["Ward Boy", "Housekeeping"],
      weekOffs: 2,
    },
  ],
};

// "Ward Boy" / "WARD-BOY" / "wardboy" -> "wardboy"
export function normalizeMatchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function clampWeekOffs(value, fallback) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || Number.isNaN(n))
    return fallback;
  return Math.min(MAX_WEEK_OFFS_PER_MONTH, Math.max(0, Math.round(n)));
}

// Cleans whatever was stored / sent into a safe policy object.
export function sanitizeWeekOffPolicy(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const groups = (Array.isArray(src.groups) ? src.groups : [])
    .map((g, i) => {
      const keywords = (
        Array.isArray(g?.keywords)
          ? g.keywords
          : String(g?.keywords ?? "").split(",")
      )
        .map((k) => String(k).trim())
        .filter((k) => normalizeMatchText(k));
      return {
        id: String(g?.id || `group-${i + 1}`),
        name: String(g?.name || "").trim() || `Group ${i + 1}`,
        keywords: [
          ...new Map(keywords.map((k) => [normalizeMatchText(k), k])).values(),
        ],
        weekOffs: clampWeekOffs(g?.weekOffs, DEFAULT_WEEK_OFFS_PER_MONTH),
      };
    })
    .filter((g) => g.keywords.length);

  return {
    defaultWeekOffs: clampWeekOffs(
      src.defaultWeekOffs,
      DEFAULT_WEEK_OFFS_PER_MONTH,
    ),
    groups,
  };
}

// Which rule applies to a person. Looks at designation, department and (for
// staff logins) role. First matching group wins.
export function weekOffRuleFor(policy, { designation, department, role } = {}) {
  const p = policy || DEFAULT_WEEK_OFF_POLICY;
  const haystacks = [designation, department, role]
    .map(normalizeMatchText)
    .filter(Boolean);
  for (const g of p.groups || []) {
    const hit = (g.keywords || []).some((k) => {
      const key = normalizeMatchText(k);
      return key && haystacks.some((h) => h.includes(key));
    });
    if (hit) return { groupId: g.id, name: g.name, perMonth: g.weekOffs };
  }
  return { groupId: null, name: "Everyone else", perMonth: p.defaultWeekOffs };
}

export function monthKeyOf(dateKey) {
  return dateKeyToString(dateKey).slice(0, 7); // "2026-10"
}

export function startOfMonthKey(dateKey) {
  const d = new Date(dateKey);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// ----------------------------------------------------------------------------
// Misc
// ----------------------------------------------------------------------------

export function toSafeDevice(device) {
  return device;
}

// "2026-10-05" -> UTC midnight of that date (an attendance date key).
export function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : istDateKey(value);
  const match = String(value)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match)
    return new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : istDateKey(d);
}

export function pagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

// Parses device timestamps into the real instant. The device clock is set to
// IST, so the wall-clock digits it sends are ALWAYS treated as IST — even if
// a gateway on the way tacked a "Z" / "+00:00" onto them (a common gateway
// bug that makes 12:15 PM show up as 5:45 PM). Never depends on the server's
// own time zone.
//
// Accepts e.g. "2026-10-05 12:15:00", "2026-10-05T12:15:00.000Z",
// "2026/10/05 12:15", "05-10-2026 12:15:00", "05/10/2026 12:15:00 PM".
// A real +05:30 offset is honoured as given.
export function parseIST(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  const toInstant = (y, mo, d, hh, mm, ss, ampm) => {
    let hours = Number(hh);
    if (ampm) {
      const pm = ampm.toUpperCase() === "PM";
      if (hours === 12) hours = pm ? 12 : 0;
      else if (pm) hours += 12;
    }
    return new Date(
      Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        hours,
        Number(mm),
        Number(ss || 0),
      ) - IST_OFFSET_MS,
    );
  };

  // Optional fractional seconds, optional AM/PM, optional zone suffix.
  const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp][Mm])?\s*(Z|[+-]\d{2}:?\d{2})?`;

  const ymd = str.match(
    new RegExp(
      String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T]+` + TIME + "$",
    ),
  );
  if (ymd) {
    const [, y, mo, d, hh, mm, ss, ampm, zone] = ymd;
    if (zone && /^\+05:?30$/.test(zone)) {
      return new Date(
        Date.UTC(+y, +mo - 1, +d, +hh, +mm, +(ss || 0)) - IST_OFFSET_MS,
      );
    }
    return toInstant(y, mo, d, hh, mm, ss, ampm);
  }

  const dmy = str.match(
    new RegExp(
      String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})[ T]+` + TIME + "$",
    ),
  );
  if (dmy) {
    const [, d, mo, y, hh, mm, ss, ampm] = dmy;
    return toInstant(y, mo, d, hh, mm, ss, ampm);
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Safety net: a punch can't happen in the future. If a parsed punch lands
// more than 15 min after the moment the server received it, but moving it
// back by 5h30m puts it at/before receipt, the device time was mislabelled
// as UTC — shift it back to the real IST instant.
export function normalizePunchInstant(punch, receivedAt = new Date()) {
  if (!punch) return punch;
  const p = new Date(punch).getTime();
  const r = new Date(receivedAt).getTime();
  const slack = 15 * MINUTE_MS;
  if (p > r + slack && p - IST_OFFSET_MS <= r + slack)
    return new Date(p - IST_OFFSET_MS);
  return new Date(p);
}

// Device timestamp field inside a stored rawData payload, whatever it's called.
export function rawPunchTimeField(rawData) {
  if (!rawData || typeof rawData !== "object") return null;
  return (
    rawData.PunchDateAndTime ??
    rawData.PunchDateTime ??
    rawData.punchDateAndTime ??
    rawData.punchTime ??
    rawData.LogTime ??
    rawData.DateTime ??
    null
  );
}
