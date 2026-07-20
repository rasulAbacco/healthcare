// server/src/biometric/biometric.routes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as biometric from "./biometric.controller.js";

const router = Router();

// ── Device punch — device-facing, NOT behind admin JWT auth. The device
// authenticates itself by sending its own registered, active serialNumber;
// biometricService.processPunch() rejects anything else. Registered here
// BEFORE the router.use(requireAuth, ...) below so it's exempt from it. ──
router.post("/punch", biometric.punch);

// Everything below requires an authenticated ADMIN — same pattern as
// admin.routes.js.
router.use(requireAuth, requireRole("ADMIN"));

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
router.patch("/mappings/:id/deactivate", biometric.deactivateMapping);

// Search
router.get("/users", biometric.searchUsers);
router.get("/employees", biometric.searchEmployees);

// Logs
router.get("/logs", biometric.listLogs);

// Attendance
router.get("/attendance", biometric.listAttendance);
router.get("/attendance/report", biometric.attendanceReport);

export default router;
