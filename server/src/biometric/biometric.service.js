// server/src/biometric/biometric.service.js
import prisma from "../lib/prisma.js";
import {
  istDateKey,
  addDays,
  dateKeyToString,
  dateKeyWeekday,
  istDayStartInstant,
  eachDateKey,
  daysInclusive,
  parseIST,
  normalizePunchInstant,
  rawPunchTimeField,
  parseDateOnly,
  pagination,
  toSafeDevice,
  resolveAttendanceDate,
  resolveShift,
  buildDayFromPunches,
  shiftWorkingMinutes,
  shiftSummary,
  DUPLICATE_PUNCH_WINDOW_SECONDS,
  MAX_REPORT_RANGE_DAYS,
  DEFAULT_WEEK_OFF_POLICY,
  sanitizeWeekOffPolicy,
  weekOffRuleFor,
  monthKeyOf,
  startOfMonthKey,
} from "./biometric.helper.js";

const HOUR_MS = 60 * 60 * 1000;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ============================================================================
// Devices
// ============================================================================

export async function listDevices({ search = "" } = {}) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { deviceCode: { contains: search, mode: "insensitive" } },
          { serialNumber: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const devices = await prisma.biometricDevice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return devices.map(toSafeDevice);
}

export async function getDeviceById(id) {
  return prisma.biometricDevice.findUnique({ where: { id } });
}

export async function createDevice({
  name,
  deviceCode,
  serialNumber,
  location,
}) {
  if (!name || !deviceCode || !serialNumber) {
    throw httpError(400, "name, deviceCode, and serialNumber are required.");
  }
  return prisma.biometricDevice.create({
    data: { name, deviceCode, serialNumber, location: location || null },
  });
}

export async function updateDevice(id, data) {
  const existing = await prisma.biometricDevice.findUnique({ where: { id } });
  if (!existing) throw httpError(404, "Device not found.");

  const update = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.deviceCode !== undefined) update.deviceCode = data.deviceCode;
  if (data.serialNumber !== undefined) update.serialNumber = data.serialNumber;
  if (data.location !== undefined) update.location = data.location || null;
  if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);

  return prisma.biometricDevice.update({ where: { id }, data: update });
}

export async function toggleDevice(id) {
  const existing = await prisma.biometricDevice.findUnique({ where: { id } });
  if (!existing) throw httpError(404, "Device not found.");
  return prisma.biometricDevice.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
}

// ============================================================================
// Mappings
//
// RULE: one biometric ID can be ACTIVE for only one person at a time.
//   * Making a mapping INACTIVE never checks anything.
//   * Making a mapping ACTIVE (or creating an active one, or changing the ID
//     of an active one) checks for another ACTIVE mapping with the same ID.
//     If one exists the request is refused with 409 + the list of conflicts,
//     unless the caller sends deactivateConflicts: true — then those other
//     mappings are made inactive in the same transaction.
//   * An inactive mapping keeps its ID, so the same ID can be handed to a
//     new person once the old mapping is inactive.
// The database backs this up with a partial unique index (see migration.sql).
// ============================================================================

const MAPPING_EMPLOYEE_SELECT = {
  id: true,
  fullName: true,
  designation: true,
  phone: true,
  shiftId: true,
  shift: {
    select: {
      id: true,
      name: true,
      type: true,
      startTime: true,
      endTime: true,
    },
  },
};

async function attachMappingPeople(mappings, db = prisma) {
  const userIds = mappings.filter((m) => m.userId).map((m) => m.userId);
  const employeeIds = mappings
    .filter((m) => m.employeeId)
    .map((m) => m.employeeId);

  const [users, employees] = await Promise.all([
    userIds.length
      ? db.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        })
      : [],
    employeeIds.length
      ? db.employee.findMany({
          where: { id: { in: employeeIds } },
          select: MAPPING_EMPLOYEE_SELECT,
        })
      : [],
  ]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  return mappings.map((m) => ({
    ...m,
    user: m.userId ? userMap[m.userId] || null : null,
    employee: m.employeeId ? employeeMap[m.employeeId] || null : null,
  }));
}

function describeConflict(m) {
  return {
    id: m.id,
    biometricId: m.biometricId,
    personType: m.userId ? "USER" : "EMPLOYEE",
    personName: m.user?.fullName || m.employee?.fullName || "Unknown person",
    deviceName: m.device?.name || null,
  };
}

// Other ACTIVE mappings that use this biometric ID.
async function findActiveConflicts(db, biometricId, excludeId = null) {
  const value = String(biometricId ?? "").trim();
  if (!value) return [];
  const rows = await db.biometricMapping.findMany({
    where: {
      biometricId: value,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { device: true },
  });
  if (!rows.length) return [];
  return (await attachMappingPeople(rows, db)).map(describeConflict);
}

function conflictError(biometricId, conflicts) {
  const names = conflicts.map((c) => c.personName).join(", ");
  const err = httpError(
    409,
    `Biometric ID "${biometricId}" is already active for ${names}. Make that mapping Inactive first, then activate this one.`,
  );
  err.conflicts = conflicts;
  return err;
}

// Throws 409 on conflicts, or deactivates them when the caller confirmed.
async function clearConflicts(tx, biometricId, excludeId, deactivateConflicts) {
  const conflicts = await findActiveConflicts(tx, biometricId, excludeId);
  if (!conflicts.length) return [];
  if (!deactivateConflicts) throw conflictError(biometricId, conflicts);
  await tx.biometricMapping.updateMany({
    where: { id: { in: conflicts.map((c) => c.id) } },
    data: { isActive: false },
  });
  return conflicts;
}

function mappingWriteError(err) {
  if (err.code === "P2002") {
    return httpError(
      409,
      "Another active mapping already uses this biometric ID. Make it Inactive first.",
    );
  }
  return err;
}

const asBool = (v) => v === true || v === "true";

export async function listMappings({ search = "", deviceId, isActive } = {}) {
  const where = {};
  if (deviceId) where.deviceId = deviceId;
  if (isActive !== undefined) where.isActive = asBool(isActive);
  if (search) where.biometricId = { contains: search, mode: "insensitive" };

  const mappings = await prisma.biometricMapping.findMany({
    where,
    include: { device: true, shift: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return attachMappingPeople(mappings);
}

export async function getMappingById(id) {
  const mapping = await prisma.biometricMapping.findUnique({
    where: { id },
    include: { device: true, shift: true },
  });
  if (!mapping) throw httpError(404, "Mapping not found.");
  const [withPeople] = await attachMappingPeople([mapping]);
  return withPeople;
}

// GET /mappings/conflicts?biometricId=&excludeId=
export async function getMappingConflicts({ biometricId, excludeId } = {}) {
  if (!String(biometricId ?? "").trim())
    throw httpError(400, "biometricId is required.");
  return findActiveConflicts(prisma, biometricId, excludeId || null);
}

export async function createMapping({
  biometricId,
  deviceId,
  userId,
  employeeId,
  shiftId,
  isActive,
  deactivateConflicts,
} = {}) {
  const bio = String(biometricId ?? "").trim();
  if (!bio || !deviceId)
    throw httpError(400, "biometricId and deviceId are required.");
  if ((userId && employeeId) || (!userId && !employeeId)) {
    throw httpError(
      400,
      "Provide exactly one of userId or employeeId, never both or neither.",
    );
  }

  const device = await prisma.biometricDevice.findUnique({
    where: { id: deviceId },
  });
  if (!device) throw httpError(404, "Device not found.");

  if (shiftId) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw httpError(404, "Shift not found.");
  }
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw httpError(404, "User not found.");
  }
  if (employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw httpError(404, "Employee not found.");
  }

  const active = isActive === undefined ? true : asBool(isActive);

  try {
    return await prisma.$transaction(async (tx) => {
      const deactivated = active
        ? await clearConflicts(tx, bio, null, asBool(deactivateConflicts))
        : [];
      const mapping = await tx.biometricMapping.create({
        data: {
          biometricId: bio,
          deviceId,
          userId: userId || null,
          employeeId: employeeId || null,
          shiftId: shiftId || null,
          isActive: active,
        },
      });
      return { mapping, deactivated };
    });
  } catch (err) {
    throw mappingWriteError(err);
  }
}

export async function updateMapping(id, body = {}) {
  const existing = await prisma.biometricMapping.findUnique({ where: { id } });
  if (!existing) throw httpError(404, "Mapping not found.");

  const data = {};
  if (body.biometricId !== undefined) {
    const value = String(body.biometricId || "").trim();
    if (!value) throw httpError(400, "Biometric ID can't be empty.");
    data.biometricId = value;
  }
  if (body.deviceId !== undefined) {
    const device = await prisma.biometricDevice.findUnique({
      where: { id: body.deviceId },
    });
    if (!device) throw httpError(404, "Device not found.");
    data.deviceId = body.deviceId;
  }
  if (body.isActive !== undefined) data.isActive = asBool(body.isActive);
  if (body.shiftId !== undefined) {
    if (body.shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: body.shiftId },
      });
      if (!shift) throw httpError(404, "Shift not found.");
    }
    data.shiftId = body.shiftId || null;
  }

  const nextBio = data.biometricId ?? existing.biometricId;
  const nextActive = data.isActive ?? existing.isActive;

  try {
    return await prisma.$transaction(async (tx) => {
      const deactivated = nextActive
        ? await clearConflicts(
            tx,
            nextBio,
            id,
            asBool(body.deactivateConflicts),
          )
        : [];
      const mapping = await tx.biometricMapping.update({ where: { id }, data });
      return { mapping, deactivated };
    });
  } catch (err) {
    throw mappingWriteError(err);
  }
}

// PATCH /mappings/:id/status  { isActive, deactivateConflicts }
export async function setMappingStatus(
  id,
  { isActive, deactivateConflicts } = {},
) {
  if (isActive === undefined) throw httpError(400, "isActive is required.");
  const existing = await prisma.biometricMapping.findUnique({ where: { id } });
  if (!existing) throw httpError(404, "Mapping not found.");

  const active = asBool(isActive);

  // Going inactive: no checks at all.
  if (!active) {
    const mapping = existing.isActive
      ? await prisma.biometricMapping.update({
          where: { id },
          data: { isActive: false },
        })
      : existing;
    return { mapping, deactivated: [] };
  }

  if (existing.isActive) return { mapping: existing, deactivated: [] };

  try {
    return await prisma.$transaction(async (tx) => {
      const deactivated = await clearConflicts(
        tx,
        existing.biometricId,
        id,
        asBool(deactivateConflicts),
      );
      const mapping = await tx.biometricMapping.update({
        where: { id },
        data: { isActive: true },
      });
      return { mapping, deactivated };
    });
  } catch (err) {
    throw mappingWriteError(err);
  }
}

// Kept for older clients.
export async function deactivateMapping(id) {
  const { mapping } = await setMappingStatus(id, { isActive: false });
  return mapping;
}

// ============================================================================
// Search (Staff Mapping / Employee Mapping tabs)
// ============================================================================

export async function searchUsers(search = "", id = null) {
  const where = id
    ? { id }
    : search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
  return prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
    take: 20,
    orderBy: { fullName: "asc" },
  });
}

export async function searchEmployees(search = "", id = null) {
  const where = id
    ? { id }
    : search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { designation: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
  return prisma.employee.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      designation: true,
      phone: true,
      isActive: true,
    },
    take: 20,
    orderBy: { fullName: "asc" },
  });
}

// ============================================================================
// Week-off settings (Week-offs tab)
//
// Stored as a single row in AttendancePolicy (id "default"). If the table
// doesn't exist yet (migration not run) the built-in defaults are used, so
// reports keep working — saving then tells the admin to run the migration.
// ============================================================================

const POLICY_ID = "default";

function isMissingTable(err) {
  return (
    err?.code === "P2021" ||
    err?.code === "P2022" ||
    /does not exist/i.test(err?.message || "")
  );
}

export async function getWeekOffPolicy(db = prisma) {
  try {
    const row = await db.attendancePolicy.findUnique({
      where: { id: POLICY_ID },
    });
    if (!row)
      return {
        ...sanitizeWeekOffPolicy(DEFAULT_WEEK_OFF_POLICY),
        isDefault: true,
        updatedAt: null,
      };
    return {
      ...sanitizeWeekOffPolicy({
        defaultWeekOffs: row.defaultWeekOffs,
        groups: row.groups,
      }),
      isDefault: false,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    if (isMissingTable(err) || !db.attendancePolicy) {
      return {
        ...sanitizeWeekOffPolicy(DEFAULT_WEEK_OFF_POLICY),
        isDefault: true,
        updatedAt: null,
        needsMigration: true,
      };
    }
    throw err;
  }
}

// GET /settings/week-offs — the rules plus everyone they apply to, so the
// admin can check that every ward boy / housekeeping person is matched.
export async function getWeekOffSettings() {
  const [policy, employees, users] = await Promise.all([
    getWeekOffPolicy(),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, designation: true, department: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const people = [
    ...employees.map((e) => ({
      key: `EMPLOYEE:${e.id}`,
      personType: "EMPLOYEE",
      fullName: e.fullName,
      designation: e.designation || "",
      department: e.department || "",
      role: "",
    })),
    ...users.map((u) => ({
      key: `USER:${u.id}`,
      personType: "USER",
      fullName: u.fullName,
      designation: "",
      department: "",
      role: u.role || "",
    })),
  ];

  return { policy, people };
}

// PUT /settings/week-offs  { defaultWeekOffs, groups: [{ name, keywords, weekOffs }] }
export async function saveWeekOffPolicy(body = {}, userId = null) {
  const clean = sanitizeWeekOffPolicy(body);
  try {
    await prisma.attendancePolicy.upsert({
      where: { id: POLICY_ID },
      create: {
        id: POLICY_ID,
        defaultWeekOffs: clean.defaultWeekOffs,
        groups: clean.groups,
        updatedById: userId,
      },
      update: {
        defaultWeekOffs: clean.defaultWeekOffs,
        groups: clean.groups,
        updatedById: userId,
      },
    });
  } catch (err) {
    if (isMissingTable(err) || !prisma.attendancePolicy) {
      throw httpError(
        503,
        "Week-off settings table is missing. Run `npx prisma migrate dev --name attendance_policy` on the server, then save again.",
      );
    }
    throw err;
  }
  return getWeekOffPolicy();
}

// ============================================================================
// Shared attendance plumbing
// ============================================================================

const EMPLOYEE_CTX_SELECT = {
  id: true,
  fullName: true,
  designation: true,
  department: true,
  phone: true,
  joiningDate: true,
  isActive: true,
  shiftId: true,
  shiftEffectiveFrom: true,
  shiftEffectiveTo: true,
};

// Loads everything resolveShift() needs: all shifts, the employees'
// current shift + effective dates, and their Shift Assignment history.
async function loadShiftContext(db, employeeIds = []) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  const [shifts, employees, history] = await Promise.all([
    db.shift.findMany(),
    ids.length
      ? db.employee.findMany({
          where: { id: { in: ids } },
          select: EMPLOYEE_CTX_SELECT,
        })
      : [],
    ids.length
      ? db.shiftAssignmentHistory.findMany({
          where: { employeeId: { in: ids } },
          orderBy: [{ effectiveFrom: "desc" }, { changedAt: "desc" }],
        })
      : [],
  ]);

  const historyByEmployee = new Map();
  for (const h of history) {
    if (!historyByEmployee.has(h.employeeId))
      historyByEmployee.set(h.employeeId, []);
    historyByEmployee.get(h.employeeId).push(h);
  }

  return {
    shiftsById: new Map(shifts.map((s) => [s.id, s])),
    employeesById: new Map(employees.map((e) => [e.id, e])),
    historyByEmployee,
  };
}

function toPerson(mapping) {
  return {
    userId: mapping?.userId || null,
    employeeId: mapping?.employeeId || null,
    mappingShiftId: mapping?.shiftId || null,
  };
}

function personKey(person) {
  return person.userId
    ? `USER:${person.userId}`
    : `EMPLOYEE:${person.employeeId}`;
}

function personWhere(person) {
  return person.userId
    ? { userId: person.userId }
    : { employeeId: person.employeeId };
}

function attendanceWhere(person, date) {
  return {
    userId: person.userId || null,
    employeeId: person.employeeId || null,
    date,
  };
}

// ----------------------------------------------------------------------------
// Which mapping owned a punch log.
//
// A biometric ID can now belong to different people over time (old mapping
// made inactive, ID handed to someone new). New logs store the mappingId that
// was active when the punch arrived. Older logs (no mappingId) go to the
// mapping with that ID created most recently before the punch.
// ----------------------------------------------------------------------------
function indexMappingsForLogs(mappings) {
  const byId = new Map(mappings.map((m) => [m.id, m]));
  const byBio = new Map();
  const sorted = [...mappings].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  for (const m of sorted) {
    if (!byBio.has(m.biometricId)) byBio.set(m.biometricId, []);
    byBio.get(m.biometricId).push(m);
  }
  return { byId, byBio };
}

function mappingForLog(index, log) {
  if (log.mappingId) {
    const owner = index.byId.get(log.mappingId);
    if (owner) return owner;
  }
  const list = index.byBio.get(log.enrollmentId) || [];
  if (list.length <= 1) return list[0] || null;
  const t = new Date(log.punchTime).getTime();
  let pick = null;
  for (const m of list) if (new Date(m.createdAt).getTime() <= t) pick = m;
  return pick || list[0];
}

const MAPPING_OWNER_SELECT = {
  id: true,
  biometricId: true,
  userId: true,
  employeeId: true,
  shiftId: true,
  createdAt: true,
};

// Decides which shift day a punch belongs to, and which shift applies.
function resolveShiftAndDate(ctx, person, punchTime) {
  const calendarDay = istDateKey(punchTime);
  const { shift } = resolveShift(ctx, person, calendarDay);
  const date = resolveAttendanceDate(punchTime, shift);
  if (date.getTime() === calendarDay.getTime()) return { date, shift };

  // Early-morning punch on an overnight shift: it belongs to the previous
  // evening, but only if the shift on THAT day is also overnight.
  const prevShift = resolveShift(ctx, person, date).shift;
  if (
    resolveAttendanceDate(punchTime, prevShift).getTime() === date.getTime()
  ) {
    return { date, shift: prevShift };
  }
  return { date: calendarDay, shift };
}

// All raw punches (every device the person is mapped on) for one shift day.
async function collectPersonPunches(db, person, date, ctx) {
  const own = await db.biometricMapping.findMany({
    where: personWhere(person),
    select: { biometricId: true },
  });
  const ids = [...new Set(own.map((m) => m.biometricId))];
  if (!ids.length) return [];

  const sharing = await db.biometricMapping.findMany({
    where: { biometricId: { in: ids } },
    select: MAPPING_OWNER_SELECT,
  });
  const index = indexMappingsForLogs(sharing);
  const key = personKey(person);

  const dayStart = istDayStartInstant(date);
  const logs = await db.biometricLog.findMany({
    where: {
      enrollmentId: { in: ids },
      punchTime: {
        gte: new Date(dayStart.getTime() - 12 * HOUR_MS),
        lt: new Date(dayStart.getTime() + 48 * HOUR_MS),
      },
    },
    select: { enrollmentId: true, punchTime: true, mappingId: true },
    orderBy: { punchTime: "asc" },
  });

  return logs
    .filter((l) => {
      const owner = mappingForLog(index, l);
      return owner && personKey(toPerson(owner)) === key;
    })
    .map((l) => l.punchTime)
    .filter(
      (t) =>
        resolveShiftAndDate(ctx, person, t).date.getTime() === date.getTime(),
    );
}

function attendanceDataFromDay(
  person,
  { mappingId, deviceId, date, shift },
  day,
) {
  return {
    userId: person.userId || null,
    employeeId: person.employeeId || null,
    mappingId: mappingId || null,
    deviceId: deviceId || null,
    shiftId: shift?.id || null,
    date,
    firstPunch: day.firstPunch,
    lastPunch: day.lastPunch,
    workingMinutes: day.workingMinutes,
    lateMinutes: day.lateMinutes,
    earlyExitMinutes: day.earlyExitMinutes,
    overtimeMinutes: day.overtimeMinutes,
    status: day.status,
  };
}

// Recomputes one person/day from scratch and upserts it. Also removes any
// duplicate rows for the same person/day left behind by the old bug
// (@@unique doesn't stop duplicates when userId or employeeId is NULL).
async function saveAttendanceDay(
  db,
  { person, mappingId, deviceId, date, shift, punches },
) {
  const day = buildDayFromPunches(punches, shift, date);
  const data = attendanceDataFromDay(
    person,
    { mappingId, deviceId, date, shift },
    day,
  );

  const existing = await db.attendance.findMany({
    where: attendanceWhere(person, date),
    orderBy: { createdAt: "asc" },
  });
  if (existing.length > 1) {
    await db.attendance.deleteMany({
      where: { id: { in: existing.slice(1).map((r) => r.id) } },
    });
  }

  return existing.length
    ? db.attendance.update({ where: { id: existing[0].id }, data })
    : db.attendance.create({ data });
}

// An Attendance row's createdAt is when its first punch reached the server,
// updatedAt when its latest punch did. A punch time later than that (by
// ~5h30m) was saved by out-of-date code that read IST digits as UTC.
function correctedRecordPunches(r) {
  const firstPunch = r.firstPunch
    ? normalizePunchInstant(r.firstPunch, r.createdAt)
    : null;
  const lastPunch = r.lastPunch
    ? normalizePunchInstant(r.lastPunch, r.updatedAt)
    : null;
  const moved = (a, b) =>
    a && b && new Date(a).getTime() !== new Date(b).getTime();
  return {
    firstPunch,
    lastPunch,
    skewed: Boolean(
      moved(firstPunch, r.firstPunch) || moved(lastPunch, r.lastPunch),
    ),
  };
}

// Bump this whenever punch handling changes; GET /api/biometric/punch shows it
// so you can confirm which code the device is really talking to.
export const PUNCH_ENGINE = "ist-v4";

export function punchEngineInfo() {
  const now = new Date();
  return {
    engine: PUNCH_ENGINE,
    serverTimeUTC: now.toISOString(),
    serverTimeIST: now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    }),
    processTZ:
      process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function parseRange(from, to) {
  const today = istDateKey(new Date());
  const fromKey = parseDateOnly(from) || today;
  const toKey = parseDateOnly(to) || fromKey;
  if (toKey < fromKey)
    throw httpError(400, '"To" date can\'t be before the "From" date.');
  if (daysInclusive(fromKey, toKey) > MAX_REPORT_RANGE_DAYS) {
    throw httpError(
      400,
      `Please choose a range of ${MAX_REPORT_RANGE_DAYS} days or less.`,
    );
  }
  return { fromKey, toKey, today };
}

// ============================================================================
// Punch ingestion — the core of the module
// ============================================================================

// Devices authenticate by sending their own registered serial number; a punch
// is accepted only if it matches an ACTIVE, registered device.
//
// Field names from the device / gateway:
//   SerialNo            -> deviceSerial
//   EnrollmentId/ID     -> enrollmentId
//   PunchMode           -> punchMode
//   PunchDateAndTime    -> punchTime (IST wall clock, see parseIST)
// The internal names (deviceSerial, enrollmentId, punchTime, punchMode) are
// still accepted as a fallback.
export async function processPunch(payload = {}) {
  const deviceSerial =
    payload.SerialNo ??
    payload.serialNo ??
    payload.SerialNumber ??
    payload.deviceSerial ??
    null;
  const enrollmentId =
    payload.EnrollmentId ??
    payload.EnrollmentID ??
    payload.ID ??
    payload.enrollmentId ??
    null;
  const punchModeRaw = payload.PunchMode ?? payload.punchMode ?? null;
  const punchTimeRaw = payload.PunchDateAndTime ?? payload.punchTime ?? null;
  const raw = payload.raw ?? payload;

  console.log("[processPunch] extracted:", {
    deviceSerial,
    enrollmentId,
    punchModeRaw,
    punchTimeRaw,
    receivedKeys: Object.keys(payload),
  });

  if (
    !deviceSerial ||
    enrollmentId === null ||
    enrollmentId === undefined ||
    enrollmentId === ""
  ) {
    console.error(
      "[processPunch] REJECTED — missing deviceSerial or enrollmentId.",
      {
        deviceSerial,
        enrollmentId,
        receivedKeys: Object.keys(payload),
        fullPayload: payload,
      },
    );
    throw httpError(
      400,
      "deviceSerial (SerialNo) and enrollmentId (EnrollmentId) are required.",
    );
  }

  const device = await prisma.biometricDevice.findUnique({
    where: { serialNumber: String(deviceSerial) },
  });
  if (!device || !device.isActive)
    throw httpError(403, "Unknown or inactive device.");

  const receivedAt = new Date();
  const parsedPunch = punchTimeRaw ? parseIST(punchTimeRaw) : receivedAt;
  if (!parsedPunch) throw httpError(400, "punchTime is not a valid date.");
  const punchDateTime = normalizePunchInstant(parsedPunch, receivedAt);
  console.log("[processPunch] time:", {
    sent: punchTimeRaw,
    storedUTC: punchDateTime.toISOString(),
    IST: punchDateTime.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    }),
  });

  const modeUpper = String(punchModeRaw ?? "").toUpperCase();
  const punchMode = ["IN", "OUT"].includes(modeUpper) ? modeUpper : "UNKNOWN";
  const enrollmentIdStr = String(enrollmentId).trim();

  // ---- Duplicate punch guard ----
  const windowMs = DUPLICATE_PUNCH_WINDOW_SECONDS * 1000;
  const duplicate = await prisma.biometricLog.findFirst({
    where: {
      deviceId: device.id,
      enrollmentId: enrollmentIdStr,
      punchTime: {
        gte: new Date(punchDateTime.getTime() - windowMs),
        lte: new Date(punchDateTime.getTime() + windowMs),
      },
    },
  });
  if (duplicate) {
    return {
      status: "duplicate",
      message: "Duplicate punch ignored.",
      log: duplicate,
    };
  }

  // Only the ACTIVE mapping for this ID receives the punch.
  const mapping = await prisma.biometricMapping.findFirst({
    where: { biometricId: enrollmentIdStr, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  const result = await prisma.$transaction(
    async (tx) => {
      const log = await tx.biometricLog.create({
        data: {
          deviceId: device.id,
          deviceSerial: device.serialNumber,
          enrollmentId: enrollmentIdStr,
          mappingId: mapping?.id || null,
          punchTime: punchDateTime,
          punchMode,
          rawData: raw || {},
          isProcessed: Boolean(mapping),
        },
      });

      if (!mapping) {
        return {
          status: "unmapped",
          message: "Punch logged, but no active mapping exists for this ID.",
          log,
        };
      }

      const person = toPerson(mapping);
      const ctx = await loadShiftContext(tx, [mapping.employeeId]);
      const { date, shift } = resolveShiftAndDate(ctx, person, punchDateTime);

      // Recompute the whole day from every punch, so the punch-out is always
      // the latest punch of the shift day — never a copy of the punch-in.
      const punches = await collectPersonPunches(tx, person, date, ctx);
      const attendance = await saveAttendanceDay(tx, {
        person,
        mappingId: mapping.id,
        deviceId: device.id,
        date,
        shift,
        punches,
      });

      const recordedAs =
        attendance.lastPunch &&
        new Date(attendance.lastPunch).getTime() === punchDateTime.getTime()
          ? "OUT"
          : attendance.firstPunch &&
              new Date(attendance.firstPunch).getTime() ===
                punchDateTime.getTime()
            ? "IN"
            : "MIDDLE";

      return {
        status: "ok",
        engine: PUNCH_ENGINE,
        message: "Punch processed.",
        recordedAs,
        log,
        attendance,
      };
    },
    { timeout: 20000 },
  );

  return result;
}

// ============================================================================
// Rebuild attendance from raw punch logs
//
// Re-reads the device's own timestamp from each log (fixing logs stored with
// the old server-time-zone parsing), then recalculates every attendance day
// in the range from scratch using the current Shift Assignments. Rows marked
// ON_LEAVE are kept. Safe to run any number of times.
// ============================================================================
export async function rebuildAttendance({ from, to } = {}) {
  const { fromKey, toKey } = parseRange(from, to);

  const mappings = await prisma.biometricMapping.findMany({
    orderBy: { createdAt: "asc" },
  });
  if (!mappings.length) {
    return {
      message: "No biometric mappings exist yet — nothing to rebuild.",
      rebuilt: 0,
      logsCorrected: 0,
    };
  }

  const index = indexMappingsForLogs(mappings);

  const windowStart = new Date(
    istDayStartInstant(fromKey).getTime() - 12 * HOUR_MS,
  );
  const windowEnd = new Date(
    istDayStartInstant(addDays(toKey, 1)).getTime() + 20 * HOUR_MS,
  );

  const logs = await prisma.biometricLog.findMany({
    where: {
      enrollmentId: { in: [...index.byBio.keys()] },
      punchTime: { gte: windowStart, lt: windowEnd },
    },
    orderBy: { punchTime: "asc" },
  });

  // 1) Correct stored punch instants from what the device actually sent.
  const corrections = [];
  for (const log of logs) {
    const sent = rawPunchTimeField(log.rawData);
    const reparsed = normalizePunchInstant(
      sent ? parseIST(sent) || log.punchTime : log.punchTime,
      log.createdAt,
    );
    if (reparsed && reparsed.getTime() !== new Date(log.punchTime).getTime()) {
      corrections.push({ id: log.id, punchTime: reparsed });
      log.punchTime = reparsed;
    }
  }
  for (let i = 0; i < corrections.length; i += 200) {
    const chunk = corrections.slice(i, i + 200);
    await prisma.$transaction(
      chunk.map((c) =>
        prisma.biometricLog.update({
          where: { id: c.id },
          data: { punchTime: c.punchTime },
        }),
      ),
    );
  }
  if (logs.length) {
    await prisma.biometricLog.updateMany({
      where: {
        id: { in: logs.filter((l) => !l.isProcessed).map((l) => l.id) },
      },
      data: { isProcessed: true },
    });
  }

  // 2) Group punches by person + shift day.
  const ctx = await loadShiftContext(
    prisma,
    mappings.map((m) => m.employeeId),
  );
  const groups = new Map();
  for (const log of logs) {
    const mapping = mappingForLog(index, log);
    if (!mapping) continue;
    const person = toPerson(mapping);
    const { date, shift } = resolveShiftAndDate(ctx, person, log.punchTime);
    if (date < fromKey || date > toKey) continue;
    const key = `${personKey(person)}|${dateKeyToString(date)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        person,
        mappingId: mapping.id,
        deviceId: log.deviceId,
        date,
        shift,
        punches: [],
      });
    }
    groups.get(key).punches.push(log.punchTime);
  }

  const rows = [...groups.values()].map((g) =>
    attendanceDataFromDay(
      g.person,
      g,
      buildDayFromPunches(g.punches, g.shift, g.date),
    ),
  );

  // 3) Replace the range in one transaction.
  const userIds = [...new Set(mappings.map((m) => m.userId).filter(Boolean))];
  const employeeIds = [
    ...new Set(mappings.map((m) => m.employeeId).filter(Boolean)),
  ];
  const personOr = [
    userIds.length ? { userId: { in: userIds } } : null,
    employeeIds.length ? { employeeId: { in: employeeIds } } : null,
  ].filter(Boolean);

  await prisma.$transaction(
    async (tx) => {
      const leaveRows = await tx.attendance.findMany({
        where: {
          date: { gte: fromKey, lte: toKey },
          status: "ON_LEAVE",
          OR: personOr,
        },
        select: { userId: true, employeeId: true, date: true },
      });
      const leaveKeys = new Set(
        leaveRows.map((r) => `${personKey(r)}|${dateKeyToString(r.date)}`),
      );

      await tx.attendance.deleteMany({
        where: {
          date: { gte: fromKey, lte: toKey },
          status: { not: "ON_LEAVE" },
          OR: personOr,
        },
      });

      const toCreate = [];
      for (const row of rows) {
        const key = `${personKey(row)}|${dateKeyToString(row.date)}`;
        if (leaveKeys.has(key)) {
          await tx.attendance.updateMany({
            where: attendanceWhere(row, row.date),
            data: row,
          });
        } else {
          toCreate.push(row);
        }
      }
      if (toCreate.length) await tx.attendance.createMany({ data: toCreate });
    },
    { timeout: 120000 },
  );

  return {
    message:
      `Recalculated ${rows.length} attendance day(s) from ${logs.length} punch(es)` +
      (corrections.length
        ? `, corrected the time on ${corrections.length} punch log(s).`
        : "."),
    rebuilt: rows.length,
    punches: logs.length,
    logsCorrected: corrections.length,
  };
}

// ============================================================================
// Punch logs (Attendance Logs tab)
// ============================================================================

export async function listLogs({
  date,
  deviceId,
  mapped,
  page: pageQ,
  limit: limitQ,
} = {}) {
  const where = {};
  if (date) {
    const day = parseDateOnly(date);
    if (day) {
      const start = istDayStartInstant(day);
      where.punchTime = {
        gte: start,
        lt: new Date(start.getTime() + 24 * HOUR_MS),
      };
    }
  }
  if (deviceId) where.deviceId = deviceId;
  if (mapped === "true") where.isProcessed = true;
  if (mapped === "false") where.isProcessed = false;

  const { page, limit, skip } = pagination({ page: pageQ, limit: limitQ });

  const [logs, total] = await Promise.all([
    prisma.biometricLog.findMany({
      where,
      include: { device: true },
      orderBy: { punchTime: "desc" },
      skip,
      take: limit,
    }),
    prisma.biometricLog.count({ where }),
  ]);

  return { logs, total, page, limit };
}

// ============================================================================
// Attendance reports
// ============================================================================

// Core builder used by both the overview (everyone) and the per-person view.
//
// WEEK-OFF RULES (see biometric.helper.js):
//   * No fixed Sunday off and no holidays — every day is a working day.
//   * Each person gets N week-offs per month (ward boys / housekeeping 2,
//     everyone else 4, editable in the Week-offs tab).
//   * Days with no punch (and days marked ON_LEAVE) are counted in date
//     order from the 1st of the month: the first N become WEEK OFF, any more
//     become LEAVE.
// To count correctly, days are always evaluated from the 1st of the month of
// `fromKey`, even when the report itself starts mid-month (e.g. a week view).
async function buildAttendanceData({
  fromKey,
  toKey,
  today,
  onlyPerson = null,
  withPunches = false,
}) {
  const evalFrom = startOfMonthKey(fromKey);

  const [mappings, records, policy] = await Promise.all([
    prisma.biometricMapping.findMany({
      where: onlyPerson ? personWhere(onlyPerson) : { isActive: true },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    prisma.attendance.findMany({
      where: {
        date: { gte: evalFrom, lte: toKey },
        ...(onlyPerson ? personWhere(onlyPerson) : {}),
      },
    }),
    getWeekOffPolicy(),
  ]);

  // ---- Who is in this report ----
  const people = new Map();
  const addPerson = (userId, employeeId, mapping) => {
    const p = { userId: userId || null, employeeId: employeeId || null };
    if (!p.userId && !p.employeeId) return;
    const key = personKey(p);
    if (!people.has(key))
      people.set(key, { ...p, mappingShiftId: null, biometricIds: [] });
    const entry = people.get(key);
    if (mapping) {
      if (!entry.biometricIds.includes(mapping.biometricId))
        entry.biometricIds.push(mapping.biometricId);
      if (!entry.mappingShiftId && mapping.shiftId)
        entry.mappingShiftId = mapping.shiftId;
    }
  };
  for (const m of mappings) addPerson(m.userId, m.employeeId, m);
  for (const r of records) {
    // Only pull in extra people who actually have a record inside the range.
    if (r.date >= fromKey || onlyPerson)
      addPerson(r.userId, r.employeeId, null);
  }
  if (onlyPerson && !people.size)
    addPerson(onlyPerson.userId, onlyPerson.employeeId, null);

  const allPeople = [...people.values()];
  const userIds = allPeople.filter((p) => p.userId).map((p) => p.userId);
  const employeeIds = allPeople
    .filter((p) => p.employeeId)
    .map((p) => p.employeeId);

  const [users, ctx] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
            phone: true,
            isActive: true,
          },
        })
      : [],
    loadShiftContext(prisma, employeeIds),
  ]);
  const usersById = new Map(users.map((u) => [u.id, u]));

  // ---- Index records ----
  const recordsByKey = new Map();
  for (const r of records) {
    const key = `${personKey(r)}|${dateKeyToString(r.date)}`;
    if (!recordsByKey.has(key)) recordsByKey.set(key, []);
    recordsByKey.get(key).push(r);
  }

  // ---- Raw punches (per-person view only) ----
  const punchesByKey = new Map();
  if (withPunches) {
    const ids = [...new Set(allPeople.flatMap((p) => p.biometricIds))];
    if (ids.length) {
      const [logs, sharing] = await Promise.all([
        prisma.biometricLog.findMany({
          where: {
            enrollmentId: { in: ids },
            punchTime: {
              gte: new Date(
                istDayStartInstant(fromKey).getTime() - 12 * HOUR_MS,
              ),
              lt: new Date(
                istDayStartInstant(addDays(toKey, 1)).getTime() + 20 * HOUR_MS,
              ),
            },
          },
          select: {
            enrollmentId: true,
            punchTime: true,
            punchMode: true,
            createdAt: true,
            mappingId: true,
          },
          orderBy: { punchTime: "asc" },
        }),
        prisma.biometricMapping.findMany({
          where: { biometricId: { in: ids } },
          select: MAPPING_OWNER_SELECT,
        }),
      ]);
      for (const log of logs)
        log.punchTime = normalizePunchInstant(log.punchTime, log.createdAt);

      const index = indexMappingsForLogs(sharing);
      const peopleByKey = new Map(allPeople.map((p) => [personKey(p), p]));
      for (const log of logs) {
        const owner = mappingForLog(index, log);
        if (!owner) continue;
        const p = peopleByKey.get(personKey(toPerson(owner)));
        if (!p) continue;
        const { date } = resolveShiftAndDate(ctx, p, log.punchTime);
        const key = `${personKey(p)}|${dateKeyToString(date)}`;
        if (!punchesByKey.has(key)) punchesByKey.set(key, []);
        punchesByKey
          .get(key)
          .push({ time: log.punchTime, mode: log.punchMode });
      }
    }
  }

  const evalDates = eachDateKey(evalFrom, toKey);
  const shiftRefDate =
    toKey < today ? toKey : today < fromKey ? fromKey : today;
  // Month whose week-off balance is shown (the latest month in the range,
  // or the current month if the range runs into the future).
  const balanceMonth = monthKeyOf(shiftRefDate);

  const reports = allPeople.map((p) => {
    const user = p.userId ? usersById.get(p.userId) : null;
    const employee = p.employeeId ? ctx.employeesById.get(p.employeeId) : null;
    const current = resolveShift(ctx, p, shiftRefDate);
    const rule = weekOffRuleFor(policy, {
      designation: employee?.designation,
      department: employee?.department,
      role: user?.role,
    });

    const personInfo = {
      key: personKey(p),
      personType: p.userId ? "USER" : "EMPLOYEE",
      id: p.userId || p.employeeId,
      fullName: user?.fullName || employee?.fullName || "Unknown person",
      subtitle: user ? user.role : employee?.designation || "",
      department: employee?.department || null,
      phone: user?.phone || employee?.phone || null,
      isActive: user ? user.isActive : employee ? employee.isActive : true,
      joiningDate: employee?.joiningDate || null,
      biometricIds: p.biometricIds,
      currentShift: shiftSummary(current.shift, current.source),
      weekOffRule: rule,
    };

    const joining = employee?.joiningDate
      ? new Date(employee.joiningDate).getTime()
      : null;

    // Week-offs used so far, per month ("2026-10" -> n).
    const usedByMonth = new Map();

    const allDays = evalDates.map((date) => {
      const ds = dateKeyToString(date);
      const mk = ds.slice(0, 7);
      const weekday = dateKeyWeekday(date);
      const { shift, source } = resolveShift(ctx, p, date);

      let dayType = "WORKING";
      if (joining && date.getTime() < joining) dayType = "BEFORE_JOINING";
      else if (date > today) dayType = "FUTURE";

      const recs = recordsByKey.get(`${personInfo.key}|${ds}`) || [];

      let firstPunch = null;
      let lastPunch = null;
      let workingMinutes = 0;
      let lateMinutes = 0;
      let earlyExitMinutes = 0;
      let overtimeMinutes = 0;
      let otDays = 0;
      let extraMinutes = 0;
      let shortMinutes = 0;
      let status;

      // Punch times from the stored row(s) (5h30m-skew corrected). The day
      // is always re-evaluated with the CURRENT shift rules, so changing the
      // excuse / window on a shift updates past days without a rebuild.
      const punchTimes = recs.flatMap((r) => {
        const f = correctedRecordPunches(r);
        return [f.firstPunch, f.lastPunch];
      });

      if (punchTimes.some(Boolean)) {
        ({
          firstPunch,
          lastPunch,
          workingMinutes,
          lateMinutes,
          earlyExitMinutes,
          overtimeMinutes,
          otDays,
          extraMinutes,
          shortMinutes,
          status,
        } = buildDayFromPunches(punchTimes, shift, date));
      } else if (recs.some((r) => r.status === "ON_LEAVE")) {
        status = "ON_LEAVE";
      } else if (dayType === "WORKING") {
        status = date.getTime() === today.getTime() ? "NOT_YET" : "ABSENT";
      } else {
        status = dayType;
      }

      // ---- Week-off allowance: first N days off in the month ----
      let weekOffNumber = null;
      if (
        dayType === "WORKING" &&
        (status === "ABSENT" || status === "ON_LEAVE")
      ) {
        const used = usedByMonth.get(mk) || 0;
        if (used < rule.perMonth) {
          usedByMonth.set(mk, used + 1);
          weekOffNumber = used + 1;
          status = "WEEK_OFF";
        } else {
          status = "LEAVE";
        }
      }

      const expectedMinutes =
        dayType === "WORKING" && status !== "WEEK_OFF"
          ? shiftWorkingMinutes(shift)
          : 0;

      return {
        date: ds,
        weekday,
        dayType,
        shift: shiftSummary(shift, source),
        expectedMinutes,
        hasRecord: recs.length > 0,
        firstPunch,
        lastPunch,
        missingPunchOut: Boolean(firstPunch && !lastPunch),
        workingMinutes,
        lateMinutes,
        earlyExitMinutes,
        overtimeMinutes,
        otDays,
        extraMinutes,
        shortMinutes,
        status,
        weekOffNumber,
        weekOffAllowance: rule.perMonth,
        punches: withPunches
          ? punchesByKey.get(`${personInfo.key}|${ds}`) || []
          : undefined,
      };
    });

    // Only the requested range is returned / summarised.
    const fromStr = dateKeyToString(fromKey);
    const days = allDays.filter((d) => d.date >= fromStr);

    const summary = days.reduce(
      (acc, d) => {
        if (d.dayType === "WORKING") acc.workingDays += 1;
        acc.expectedMinutes += d.expectedMinutes;
        acc.workedMinutes += d.workingMinutes || 0;
        acc.overtimeMinutes += d.overtimeMinutes || 0;
        acc.otDays += d.otDays || 0;
        acc.extraMinutes += d.extraMinutes || 0;
        acc.shortMinutes += d.shortMinutes || 0;
        acc.lateMinutes += d.lateMinutes || 0;
        acc.earlyExitMinutes += d.earlyExitMinutes || 0;
        if (d.lateMinutes > 0) acc.lateDays += 1;
        if (d.missingPunchOut) acc.missingPunchOuts += 1;
        if (d.status === "PRESENT") acc.presentDays += 1;
        else if (d.status === "HALF_DAY") acc.halfDays += 1;
        else if (d.status === "WEEK_OFF") acc.weekOffDays += 1;
        else if (d.status === "LEAVE") acc.leaveDays += 1;
        else if (d.status === "NOT_YET") acc.notYetDays += 1;
        return acc;
      },
      {
        workingDays: 0,
        expectedMinutes: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
        otDays: 0,
        extraMinutes: 0,
        shortMinutes: 0,
        lateMinutes: 0,
        earlyExitMinutes: 0,
        lateDays: 0,
        missingPunchOuts: 0,
        presentDays: 0,
        halfDays: 0,
        weekOffDays: 0,
        leaveDays: 0,
        notYetDays: 0,
      },
    );
    // Older screens read absentDays — it now means "leave beyond week-offs".
    summary.absentDays = summary.leaveDays;
    summary.differenceMinutes = summary.workedMinutes - summary.expectedMinutes;
    // Extra hours that didn't reach half-day OT make up for late login /
    // short days in the same period.
    summary.coveredMinutes = Math.min(
      summary.extraMinutes,
      summary.shortMinutes,
    );
    summary.balanceMinutes = summary.extraMinutes - summary.shortMinutes;
    summary.weekOffsPerMonth = rule.perMonth;
    summary.weekOffBalanceMonth = balanceMonth;
    summary.weekOffsUsed = usedByMonth.get(balanceMonth) || 0;
    summary.weekOffsLeft = Math.max(0, rule.perMonth - summary.weekOffsUsed);

    const countable = summary.workingDays - summary.notYetDays;
    summary.attendancePercent =
      countable > 0
        ? Math.min(
            100,
            Math.round(
              ((summary.presentDays +
                summary.halfDays * 0.5 +
                summary.weekOffDays) /
                countable) *
                100,
            ),
          )
        : null;

    return { person: personInfo, summary, days };
  });

  reports.sort((a, b) => a.person.fullName.localeCompare(b.person.fullName));

  return {
    reports,
    holidays: [],
    policy: {
      defaultWeekOffs: policy.defaultWeekOffs,
      groups: policy.groups,
    },
  };
}

// GET /attendance/overview?from=&to=
// Per-person summary + flattened daily rows for the whole range.
export async function attendanceOverview({ from, to } = {}) {
  const { fromKey, toKey, today } = parseRange(from, to);
  const { reports, holidays, policy } = await buildAttendanceData({
    fromKey,
    toKey,
    today,
  });

  const days = [];
  for (const r of reports) {
    for (const d of r.days) {
      if (d.dayType === "WORKING" || d.hasRecord) {
        const { punches, ...rest } = d;
        days.push({ personKey: r.person.key, ...rest });
      }
    }
  }

  return {
    from: dateKeyToString(fromKey),
    to: dateKeyToString(toKey),
    today: dateKeyToString(today),
    holidays,
    policy,
    people: reports.map(({ person, summary }) => ({ person, summary })),
    days,
  };
}

// GET /attendance/person?personType=EMPLOYEE|USER&personId=&from=&to=
// Every day of the range for one person, with all raw punches of each day.
export async function personAttendance({
  personType,
  personId,
  from,
  to,
} = {}) {
  if (!personId) throw httpError(400, "personId is required.");
  const type = String(personType || "").toUpperCase();
  if (!["USER", "EMPLOYEE"].includes(type))
    throw httpError(400, "personType must be USER or EMPLOYEE.");

  const exists =
    type === "USER"
      ? await prisma.user.findUnique({
          where: { id: personId },
          select: { id: true },
        })
      : await prisma.employee.findUnique({
          where: { id: personId },
          select: { id: true },
        });
  if (!exists)
    throw httpError(
      404,
      type === "USER" ? "User not found." : "Employee not found.",
    );

  const { fromKey, toKey, today } = parseRange(from, to);
  const onlyPerson =
    type === "USER"
      ? { userId: personId, employeeId: null }
      : { userId: null, employeeId: personId };
  const { reports, holidays, policy } = await buildAttendanceData({
    fromKey,
    toKey,
    today,
    onlyPerson,
    withPunches: true,
  });
  const report = reports[0];

  return {
    from: dateKeyToString(fromKey),
    to: dateKeyToString(toKey),
    today: dateKeyToString(today),
    holidays,
    policy,
    person: report.person,
    summary: report.summary,
    days: report.days,
  };
}

// ---- Older endpoints, kept for anything still calling them ----

export async function listAttendance({
  date,
  from,
  to,
  userId,
  employeeId,
  page: pageQ,
  limit: limitQ,
} = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (employeeId) where.employeeId = employeeId;

  if (date) {
    const day = parseDateOnly(date);
    if (day) where.date = day;
  } else if (from || to) {
    where.date = {};
    if (from) where.date.gte = parseDateOnly(from);
    if (to) where.date.lte = parseDateOnly(to);
  }

  const { page, limit, skip } = pagination({ page: pageQ, limit: limitQ });

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return { records: await attachPersonNames(records), total, page, limit };
}

export async function attendanceReport({ from, to, userId, employeeId } = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (employeeId) where.employeeId = employeeId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = parseDateOnly(from);
    if (to) where.date.lte = parseDateOnly(to);
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: "asc" },
  });
  const withNames = await attachPersonNames(records);

  const summary = withNames.reduce(
    (acc, r) => {
      acc.totalWorkingMinutes += r.workingMinutes;
      acc.totalLateMinutes += r.lateMinutes;
      acc.totalOvertimeMinutes += r.overtimeMinutes;
      if (r.status === "PRESENT") acc.presentDays += 1;
      else if (r.status === "ABSENT") acc.absentDays += 1;
      else if (r.status === "HALF_DAY") acc.halfDays += 1;
      else if (r.status === "ON_LEAVE") acc.leaveDays += 1;
      return acc;
    },
    {
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      totalWorkingMinutes: 0,
      totalLateMinutes: 0,
      totalOvertimeMinutes: 0,
    },
  );

  return { records: withNames, summary };
}

async function attachPersonNames(records) {
  const userIds = [
    ...new Set(records.filter((r) => r.userId).map((r) => r.userId)),
  ];
  const employeeIds = [
    ...new Set(records.filter((r) => r.employeeId).map((r) => r.employeeId)),
  ];

  const [users, employees] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, role: true },
        })
      : [],
    employeeIds.length
      ? prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, fullName: true, designation: true },
        })
      : [],
  ]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  return records.map((r) => ({
    ...r,
    person: r.userId
      ? userMap[r.userId] || null
      : r.employeeId
        ? employeeMap[r.employeeId] || null
        : null,
    personType: r.userId ? "USER" : r.employeeId ? "EMPLOYEE" : null,
  }));
}

// ============================================================================
// Dashboard
// ============================================================================

export async function getDashboard() {
  const today = istDateKey(new Date());
  const dayStart = istDayStartInstant(today);
  const dayEnd = new Date(dayStart.getTime() + 24 * HOUR_MS);

  const [
    totalDevices,
    activeDevices,
    mappedUsers,
    mappedEmployees,
    todaysPunches,
    fullDayToday,
    halfDayToday,
  ] = await Promise.all([
    prisma.biometricDevice.count(),
    prisma.biometricDevice.count({ where: { isActive: true } }),
    prisma.biometricMapping.count({
      where: { isActive: true, userId: { not: null } },
    }),
    prisma.biometricMapping.count({
      where: { isActive: true, employeeId: { not: null } },
    }),
    prisma.biometricLog.count({
      where: { punchTime: { gte: dayStart, lt: dayEnd } },
    }),
    prisma.attendance.count({ where: { date: today, status: "PRESENT" } }),
    prisma.attendance.count({ where: { date: today, status: "HALF_DAY" } }),
  ]);

  const presentToday = fullDayToday + halfDayToday;
  const totalMapped = mappedUsers + mappedEmployees;
  const absentToday = Math.max(0, totalMapped - presentToday);

  return {
    totalDevices,
    activeDevices,
    mappedUsers,
    mappedEmployees,
    todaysPunches,
    presentToday,
    fullDayToday,
    halfDayToday,
    absentToday,
  };
}
