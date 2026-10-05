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
  for (let t = new Date(fromKey).getTime(); t <= end; t += DAY_MS) out.push(new Date(t));
  return out;
}

export function daysInclusive(fromKey, toKey) {
  return Math.round((new Date(toKey).getTime() - new Date(fromKey).getTime()) / DAY_MS) + 1;
}

export function minutesBetween(from, to) {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / MINUTE_MS));
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
  return Math.max(0, shiftSpanMinutes(shift) - (Number(shift?.breakMinutes) || 0));
}

// Expected working minutes for one day on this shift.
export function shiftWorkingMinutes(shift) {
  const s = shift || DEFAULT_SHIFT;
  return Number(s.totalWorkingMinutes) || computeShiftWorkingMinutes(s);
}

// Minimum minutes worked for the day to count as a FULL day (PRESENT).
// Anything less is a HALF_DAY. The "grace after" minutes are allowed off so
// someone who arrives within the grace window and leaves on time is still a
// full day.
export function requiredMinutesForFullDay(shift) {
  const s = shift || DEFAULT_SHIFT;
  return Math.max(0, shiftWorkingMinutes(s) - (Number(s.graceAfterMinutes) || 0));
}

// Compact, client-friendly description of a shift.
export function shiftSummary(shift, source = null) {
  const s = shift || DEFAULT_SHIFT;
  return {
    id: s.id || null,
    name: s.name,
    code: s.code,
    type: s.type,
    startTime: s.startTime,
    endTime: s.endTime,
    breakMinutes: Number(s.breakMinutes) || 0,
    graceAfterMinutes: Number(s.graceAfterMinutes) || 0,
    totalWorkingMinutes: shiftWorkingMinutes(s),
    fullDayMinutes: requiredMinutesForFullDay(s),
    source,
  };
}

// ----------------------------------------------------------------------------
// Which "shift day" a punch belongs to.
//
// Same-day shift: the IST calendar date of the punch.
// Overnight shift (e.g. 20:00 -> 08:00): the off-duty gap runs from the end
// time to the start time (08:00 -> 20:00). Punches before the middle of that
// gap (14:00 here) are the tail of the PREVIOUS evening's shift, so a 07:55
// punch-out completes last night's row instead of opening a new one.
// ----------------------------------------------------------------------------
export function resolveAttendanceDate(punchDateTime, shift) {
  const day = istDateKey(punchDateTime);
  if (!isOvernightShift(shift)) return day;

  const start = timeStringToMinutes(shift.startTime);
  const end = timeStringToMinutes(shift.endTime);
  const cutoff = end + Math.floor((start - end) / 2);
  return istMinutesOfDay(punchDateTime) < cutoff ? addDays(day, -1) : day;
}

// Scheduled start/end instants of the shift for a given shift day.
export function shiftWindowForDate(dateKey, shift) {
  const start = timeStringToMinutes(shift?.startTime) ?? 0;
  const shiftStart = new Date(istDayStartInstant(dateKey).getTime() + start * MINUTE_MS);
  const shiftEnd = new Date(shiftStart.getTime() + shiftSpanMinutes(shift) * MINUTE_MS);
  return { shiftStart, shiftEnd };
}

// ----------------------------------------------------------------------------
// Day metrics
//
// Status rules:
//   no punch                                   -> ABSENT
//   punched in, no valid punch-out             -> HALF_DAY (shown as
//                                                 "No punch-out" in the UI)
//   worked >= shift working hours (− grace)    -> PRESENT
//   worked less than that                      -> HALF_DAY
// ----------------------------------------------------------------------------
export function computeAttendanceMetrics(firstPunch, lastPunch, shift = DEFAULT_SHIFT, shiftDay = null) {
  const s = shift || DEFAULT_SHIFT;
  if (!firstPunch) {
    return { workingMinutes: 0, lateMinutes: 0, earlyExitMinutes: 0, overtimeMinutes: 0, status: "ABSENT" };
  }

  const first = new Date(firstPunch);
  const day = shiftDay || resolveAttendanceDate(first, s);
  const { shiftStart, shiftEnd } = shiftWindowForDate(day, s);

  // Late: punching in after (shift start + grace-after).
  const graceAfter = Number(s.graceAfterMinutes) || 0;
  const onTimeDeadline = new Date(shiftStart.getTime() + graceAfter * MINUTE_MS);
  const lateMinutes = first > onTimeDeadline ? minutesBetween(onTimeDeadline, first) : 0;

  if (!lastPunch) {
    return { workingMinutes: 0, lateMinutes, earlyExitMinutes: 0, overtimeMinutes: 0, status: "HALF_DAY" };
  }

  const last = new Date(lastPunch);
  const rawWorkingMinutes = minutesBetween(first, last);
  const workingMinutes = Math.max(0, rawWorkingMinutes - (Number(s.breakMinutes) || 0));

  const earlyExitMinutes = last < shiftEnd ? minutesBetween(last, shiftEnd) : 0;

  const otBuffer = Number(s.overtimeAfterMinutes) || 0;
  const otThreshold = new Date(shiftEnd.getTime() + otBuffer * MINUTE_MS);
  const overtimeMinutes = last > otThreshold ? minutesBetween(otThreshold, last) : 0;

  const status = workingMinutes >= requiredMinutesForFullDay(s) ? "PRESENT" : "HALF_DAY";

  return { workingMinutes, lateMinutes, earlyExitMinutes, overtimeMinutes, status };
}

// Builds a full day from every raw punch of that shift day:
// first punch = punch-in, latest punch = punch-out (if far enough apart).
export function buildDayFromPunches(punchTimes, shift, dateKey) {
  const times = [...new Set((punchTimes || []).filter(Boolean).map((t) => new Date(t).getTime()))]
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  if (!times.length) {
    return { firstPunch: null, lastPunch: null, punchCount: 0, ...computeAttendanceMetrics(null, null, shift, dateKey) };
  }

  const firstPunch = times[0];
  const latest = times[times.length - 1];
  const lastPunch = minutesBetween(firstPunch, latest) >= MIN_PUNCH_OUT_GAP_MINUTES ? latest : null;

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
    (!from || new Date(from).getTime() <= t) && (!to || new Date(to).getTime() >= t);
  const byId = (id) => (id && ctx?.shiftsById?.get(id)) || null;

  const employee = person?.employeeId ? ctx?.employeesById?.get(person.employeeId) : null;

  if (person?.employeeId) {
    const history = ctx?.historyByEmployee?.get(person.employeeId) || [];
    const match = history.find((h) => h.effectiveFrom && covers(h.effectiveFrom, h.effectiveTo));
    if (match && byId(match.newShiftId)) return { shift: byId(match.newShiftId), source: "ASSIGNMENT" };

    if (
      !match &&
      employee?.shiftId &&
      byId(employee.shiftId) &&
      covers(employee.shiftEffectiveFrom, employee.shiftEffectiveTo)
    ) {
      return { shift: byId(employee.shiftId), source: "ASSIGNMENT" };
    }
  }

  if (byId(person?.mappingShiftId)) return { shift: byId(person.mappingShiftId), source: "MAPPING" };
  if (employee?.shiftId && byId(employee.shiftId)) return { shift: byId(employee.shiftId), source: "CURRENT" };

  return { shift: DEFAULT_SHIFT, source: "DEFAULT" };
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
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : istDateKey(value);
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
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
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  const toInstant = (y, mo, d, hh, mm, ss, ampm) => {
    let hours = Number(hh);
    if (ampm) {
      const pm = ampm.toUpperCase() === "PM";
      if (hours === 12) hours = pm ? 12 : 0;
      else if (pm) hours += 12;
    }
    return new Date(
      Date.UTC(Number(y), Number(mo) - 1, Number(d), hours, Number(mm), Number(ss || 0)) - IST_OFFSET_MS
    );
  };

  // Optional fractional seconds, optional AM/PM, optional zone suffix.
  const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*([AaPp][Mm])?\s*(Z|[+-]\d{2}:?\d{2})?`;

  const ymd = str.match(new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T]+` + TIME + "$"));
  if (ymd) {
    const [, y, mo, d, hh, mm, ss, ampm, zone] = ymd;
    if (zone && /^\+05:?30$/.test(zone)) {
      return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +(ss || 0)) - IST_OFFSET_MS);
    }
    return toInstant(y, mo, d, hh, mm, ss, ampm);
  }

  const dmy = str.match(new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})[ T]+` + TIME + "$"));
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
  if (p > r + slack && p - IST_OFFSET_MS <= r + slack) return new Date(p - IST_OFFSET_MS);
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