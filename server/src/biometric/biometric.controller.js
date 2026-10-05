// server/src/biometric/biometric.controller.js
import * as biometricService from "./biometric.service.js";

// Small shared handler so every route follows the same
// try/respond/catch-with-status pattern used in admin.controller.js.
function handle(status, fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);
      return res.status(status).json(data);
    } catch (err) {
      const code = err.status || 500;
      if (code === 500) console.error("Biometric module error:", err);
      return res.status(code).json({ message: err.message || "Something went wrong." });
    }
  };
}

// ============================================================================
// Dashboard
// ============================================================================
export const getDashboard = handle(200, async () => {
  const dashboard = await biometricService.getDashboard();
  return { dashboard };
});

// ============================================================================
// Devices
// ============================================================================
export const listDevices = handle(200, async (req) => {
  const devices = await biometricService.listDevices({ search: req.query.search });
  return { devices };
});

export const createDevice = handle(201, async (req) => {
  const device = await biometricService.createDevice(req.body);
  return { device };
});

export const updateDevice = handle(200, async (req) => {
  const device = await biometricService.updateDevice(req.params.id, req.body);
  return { device };
});

export const toggleDevice = handle(200, async (req) => {
  const device = await biometricService.toggleDevice(req.params.id);
  return { device };
});

// ============================================================================
// Mappings
// ============================================================================
export const listMappings = handle(200, async (req) => {
  const mappings = await biometricService.listMappings({
    search: req.query.search,
    deviceId: req.query.deviceId,
    isActive: req.query.isActive,
  });
  return { mappings };
});

export const getMapping = handle(200, async (req) => {
  const mapping = await biometricService.getMappingById(req.params.id);
  return { mapping };
});

export const createMapping = handle(201, async (req) => {
  const mapping = await biometricService.createMapping(req.body);
  return { mapping };
});

export const updateMapping = handle(200, async (req) => {
  const mapping = await biometricService.updateMapping(req.params.id, req.body);
  return { mapping };
});

export const deactivateMapping = handle(200, async (req) => {
  const mapping = await biometricService.deactivateMapping(req.params.id);
  return { mapping };
});

// ============================================================================
// Search
// ============================================================================
export const searchUsers = handle(200, async (req) => {
  const users = await biometricService.searchUsers(req.query.search, req.query.id);
  return { users };
});

export const searchEmployees = handle(200, async (req) => {
  const employees = await biometricService.searchEmployees(req.query.search, req.query.id);
  return { employees };
});

// ============================================================================
// Logs
// ============================================================================
export const listLogs = handle(200, async (req) => {
  return biometricService.listLogs({
    date: req.query.date,
    deviceId: req.query.deviceId,
    mapped: req.query.mapped,
    page: req.query.page,
    limit: req.query.limit,
  });
});

// ============================================================================
// Attendance
// ============================================================================

// GET /attendance/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
export const attendanceOverview = handle(200, async (req) => {
  return biometricService.attendanceOverview({ from: req.query.from, to: req.query.to });
});

// GET /attendance/person?personType=EMPLOYEE|USER&personId=&from=&to=
export const personAttendance = handle(200, async (req) => {
  return biometricService.personAttendance({
    personType: req.query.personType,
    personId: req.query.personId,
    from: req.query.from,
    to: req.query.to,
  });
});

// POST /attendance/rebuild  { from, to }
export const rebuildAttendance = handle(200, async (req) => {
  return biometricService.rebuildAttendance({
    from: req.body?.from ?? req.query.from,
    to: req.body?.to ?? req.query.to,
  });
});

export const listAttendance = handle(200, async (req) => {
  return biometricService.listAttendance({
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    userId: req.query.userId,
    employeeId: req.query.employeeId,
    page: req.query.page,
    limit: req.query.limit,
  });
});

export const attendanceReport = handle(200, async (req) => {
  return biometricService.attendanceReport({
    from: req.query.from,
    to: req.query.to,
    userId: req.query.userId,
    employeeId: req.query.employeeId,
  });
});

// GET /api/biometric/punch — open it in a browser on the URL your device
// posts to. "engine" must say ist-v3; if the page 404s or shows anything
// else, that server is still running old punch code.
export const punchInfo = handle(200, async () => biometricService.punchEngineInfo());

// ============================================================================
// Punch (device-facing — not behind requireRole, see routes file)
// ============================================================================
export const punch = handle(200, async (req) => {
  console.log("[BIOMETRIC PUNCH] Incoming payload:", JSON.stringify(req.body));
  try {
    const result = await biometricService.processPunch(req.body);
    console.log("[BIOMETRIC PUNCH] Result:", result.status, result.recordedAs || "", result.message);
    return result;
  } catch (err) {
    console.error("[BIOMETRIC PUNCH] Failed:", err.status, err.message, "| payload was:", JSON.stringify(req.body));
    throw err;
  }
});