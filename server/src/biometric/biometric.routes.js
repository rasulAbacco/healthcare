// server/src/biometric/biometric.routes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as biometric from "./biometric.controller.js";
import * as shift from "./shift.controller.js";

const router = Router();

// ── Device punch — device-facing, NOT behind JWT auth. The device
// authenticates itself by sending its own registered, active serialNumber;
// biometricService.processPunch() rejects anything else. Registered BEFORE
// router.use(requireAuth) below so it's exempt from it. ──
router.post("/punch", biometric.punch);
router.get("/punch", biometric.punchInfo); // version check, no data exposed

// Everything below requires an authenticated user.
router.use(requireAuth);

// Working Timings & Shift Management — ADMIN and MANAGER.
router.get("/shifts", requireRole("ADMIN", "MANAGER"), shift.listShifts);
router.get("/shifts/:id", requireRole("ADMIN", "MANAGER"), shift.getShift);
router.post("/shifts", requireRole("ADMIN", "MANAGER"), shift.createShift);
router.put("/shifts/:id", requireRole("ADMIN", "MANAGER"), shift.updateShift);
router.patch("/shifts/:id/toggle", requireRole("ADMIN", "MANAGER"), shift.toggleShift);
router.delete("/shifts/:id", requireRole("ADMIN", "MANAGER"), shift.deleteShift);

// Everything else (Dashboard, Devices, Mappings, Search, Logs, Attendance)
// is open to ADMIN and MANAGER.
router.use(requireRole("ADMIN", "MANAGER"));

// Dashboard
router.get("/dashboard", biometric.getDashboard);

// Devices
router.get("/devices", biometric.listDevices);
router.post("/devices", biometric.createDevice);
router.put("/devices/:id", biometric.updateDevice);
router.patch("/devices/:id/toggle", biometric.toggleDevice);

// Mappings
router.get("/mappings", biometric.listMappings);
router.post("/mappings", biometric.createMapping);
router.get("/mappings/:id", biometric.getMapping);
router.put("/mappings/:id", biometric.updateMapping);
router.patch("/mappings/:id/deactivate", biometric.deactivateMapping);
router.patch("/mappings/:id/shift", shift.assignMappingShift);

// Search
router.get("/users", biometric.searchUsers);
router.get("/employees", biometric.searchEmployees);

// Logs
router.get("/logs", biometric.listLogs);

// Attendance
router.get("/attendance", biometric.listAttendance);
router.get("/attendance/report", biometric.attendanceReport);
router.get("/attendance/overview", biometric.attendanceOverview);
router.get("/attendance/person", biometric.personAttendance);
router.post("/attendance/rebuild", biometric.rebuildAttendance);

export default router;