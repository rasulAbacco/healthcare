// server/src/biometric/biometric.helper.js
// Pure helper functions — no Prisma calls here, just time math and shaping.
// Kept separate from biometric.service.js so the calculation logic is easy
// to unit-test on its own later.

// ----------------------------------------------------------------------------
// Temporary defaults until a real Shift module exists (planned as a later
// addition). Every person is treated as being on one implicit default shift:
// 09:00 start, 8-hour (480 minute) working day. Once Shift/EmployeeShift
// models are added, computeAttendanceMetrics should take the person's actual
// shift instead of these constants.
// ----------------------------------------------------------------------------
export const DEFAULT_SHIFT_START_MINUTES = 9 * 60; // 09:00
export const DEFAULT_FULL_DAY_MINUTES = 8 * 60; // 480
export const DEFAULT_GRACE_MINUTES = 10; // no "late" penalty inside this window
export const HALF_DAY_THRESHOLD_MINUTES = 4 * 60; // < 4 hours worked => HALF_DAY

// Treat two punches from the same device+enrollmentId within this window as
// the same physical punch (duplicate press / device retry), not a new event.
export const DUPLICATE_PUNCH_WINDOW_SECONDS = 60;

// Midnight of the given date, in UTC-safe terms — used as the Attendance.date key.
export function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function minutesBetween(from, to) {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}

// Minutes since midnight (local to the stored DateTime) for a given punch.
function minutesSinceMidnight(date) {
  const d = new Date(date);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// Given the current first/last punch pair, compute workingMinutes,
// lateMinutes, overtimeMinutes, and a status.
export function computeAttendanceMetrics(firstPunch, lastPunch) {
  if (!firstPunch || !lastPunch) {
    return { workingMinutes: 0, lateMinutes: 0, overtimeMinutes: 0, status: "ABSENT" };
  }

  const workingMinutes = minutesBetween(firstPunch, lastPunch);

  const arrivalMinutes = minutesSinceMidnight(firstPunch);
  const lateBy = arrivalMinutes - DEFAULT_SHIFT_START_MINUTES - DEFAULT_GRACE_MINUTES;
  const lateMinutes = lateBy > 0 ? lateBy : 0;

  const overtimeMinutes = Math.max(0, workingMinutes - DEFAULT_FULL_DAY_MINUTES);

  let status = "PRESENT";
  if (workingMinutes === 0) status = "ABSENT";
  else if (workingMinutes < HALF_DAY_THRESHOLD_MINUTES) status = "HALF_DAY";

  return { workingMinutes, lateMinutes, overtimeMinutes, status };
}

// Strip nothing sensitive currently lives on these models, but keeping this
// helper mirrors the toSafeUser() pattern used elsewhere in the codebase in
// case fields like an API secret get added to BiometricDevice later.
export function toSafeDevice(device) {
  return device;
}

export function parseDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

export function pagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  return { page, limit, skip: (page - 1) * limit };
}
