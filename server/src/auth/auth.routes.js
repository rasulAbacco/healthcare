// server/src/auth/auth.routes.js
import { Router } from "express";
import { register, login, me, sendOtp, verifyOtpAndLogin } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

const router = Router();

router.post("/register", register);

// Legacy email/password login — kept for backward compatibility.
router.post("/login", login);

// Phone + OTP login (used by the current Login page).
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpAndLogin);

router.get("/me", requireAuth, me); // handy for "am I still logged in?" checks on app load

export default router;