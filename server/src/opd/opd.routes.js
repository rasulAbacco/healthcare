// server/src/opd/opd.routes.js
import { Router } from "express";
import { requireAuth, requireModule } from "../auth/auth.middleware.js";
import {
  listPatients,
  listFollowUps,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} from "./opd.controller.js";

const router = Router();

// Every route here requires a logged-in user assigned to the OPD module
// (covers both receptionists and doctors who work OPD).
router.use(requireAuth, requireModule("OPD"));

// IMPORTANT: /followups must be declared BEFORE /:id, otherwise Express
// would treat "followups" as an :id value and hit getPatient instead.
router.get("/followups", listFollowUps);

router.get("/", listPatients);
router.get("/:id", getPatient);
router.post("/", createPatient);
router.put("/:id", updatePatient);
router.delete("/:id", deletePatient);

export default router;