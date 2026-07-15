// server/src/notifications/notifications.routes.js
import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { listReadKeys, markKeysRead } from "./notifications.controller.js";

const router = Router();

// No requireModule here — read-state is per-user, not per-module.
router.use(requireAuth);

router.get("/read", listReadKeys);
router.post("/read", markKeysRead);

export default router;