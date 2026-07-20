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

export const createMapping = handle(201, async (req) => {
  const mapping = await biometricService.createMapping(req.body);
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
  const users = await biometricService.searchUsers(req.query.search);
  return { users };
});

export const searchEmployees = handle(200, async (req) => {
  const employees = await biometricService.searchEmployees(req.query.search);
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

// ============================================================================
// Punch (device-facing — not behind requireRole("ADMIN"), see routes file)
// ============================================================================
export const punch = handle(200, async (req) => {
  const result = await biometricService.processPunch(req.body);
  return result;
});
