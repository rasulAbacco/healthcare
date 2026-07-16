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
  getMedicineStats,
} from "./medicine.controller.js";

const router = Router();

router.use(requireAuth);

// Must be registered BEFORE "/:id", otherwise Express treats "stats" as an
// :id value and this route is never reached.
router.get("/stats", requireModule("PHARMACY"), getMedicineStats);

// Read-only: OPD needs this to show medicine names/stock counts when
// prescribing. Pharmacy obviously needs it too.
router.get("/", requireModule("OPD", "PHARMACY"), listMedicines);
router.get("/:id", requireModule("OPD", "PHARMACY"), getMedicine);

// Mutating routes stay Pharmacy-only.
router.post("/", requireModule("PHARMACY"), createMedicine);
router.put("/:id", requireModule("PHARMACY"), updateMedicine);
router.delete("/:id", requireModule("PHARMACY"), deleteMedicine);
router.post("/:id/stock", requireModule("PHARMACY"), addStockEntry);

export default router;