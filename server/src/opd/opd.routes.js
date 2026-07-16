// server/src/opd/opd.routes.js
import { Router } from "express";
import { requireAuth, requireModule } from "../auth/auth.middleware.js";
import {
  listPatients,
  listFollowUps,
  getPatient,
  getStats,
  createPatient,
  updatePatient,
  deletePatient,
  createPrescription,
  deletePrescription,
} from "./opd.controller.js";

const router = Router();

// Every route here requires a logged-in user assigned to the OPD module
// (covers both receptionists and doctors who work OPD).
router.use(requireAuth, requireModule("OPD"));

// IMPORTANT: /stats and /followups must be declared BEFORE /:id, otherwise
// Express would treat "stats"/"followups" as an :id value and hit
// getPatient instead.
router.get("/stats", getStats);
router.get("/followups", listFollowUps);

router.get("/", listPatients);
router.get("/:id", getPatient);
router.post("/", createPatient);
router.put("/:id", updatePatient);
router.delete("/:id", deletePatient);

// Structured prescriptions — both doctors and receptionists can add these.
router.post("/:id/prescriptions", createPrescription);
router.delete("/:id/prescriptions/:itemId", deletePrescription);

export default router;