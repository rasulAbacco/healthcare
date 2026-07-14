// server/src/pharmacy/category.routes.js
import { Router } from "express";
import { requireAuth, requireModule } from "../auth/auth.middleware.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./category.controller.js";

const router = Router();

router.use(requireAuth, requireModule("PHARMACY"));

router.get("/", listCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;