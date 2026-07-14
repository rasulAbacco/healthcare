// server/src/pharmacy/medicine.routes.js
import { Router } from "express";
import { requireAuth, requireModule } from "../auth/auth.middleware.js";
import {
  listMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  addStockEntry,
} from "./medicine.controller.js";

const router = Router();

router.use(requireAuth, requireModule("PHARMACY"));

router.get("/", listMedicines);
router.get("/:id", getMedicine);
router.post("/", createMedicine);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);
router.post("/:id/stock", addStockEntry);

export default router;