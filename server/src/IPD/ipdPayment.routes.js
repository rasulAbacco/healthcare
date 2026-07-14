// server/src/IPD/ipdPayment.routes.js
import { Router } from "express";
import {
  listPaymentSummary,
  getPatientPayments,
  listAllPayments,
  addPayment,
  updatePayment,
  deletePayment,
} from "./ipdPayment.controller.js";

const router = Router();

// Registered before "/" and any param routes so they aren't swallowed
router.get("/summary", listPaymentSummary);
router.get("/patient/:patientId", getPatientPayments);

router.get("/", listAllPayments);
router.post("/", addPayment);
router.put("/:id", updatePayment);
router.delete("/:id", deletePayment); // intended for admin-only use in the frontend

export default router;