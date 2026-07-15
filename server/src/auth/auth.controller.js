// server/src/auth/auth.controller.js
import prisma from "../lib/prisma.js";
import { hashPassword, comparePassword } from "./hash.js";
import { signToken } from "./jwt.js";
import {
  generateOtp,
  canResend,
  saveOtp,
  verifyOtp,
  secondsUntilResend,
  deleteOtp,
} from "./otp.store.js";
import { sendOtpSms, normalizePhone } from "./sms.service.js";

const VALID_ROLES = ["DOCTOR", "RECEPTIONIST", "PHARMACY"];
const VALID_MODULES = ["OPD", "IPD", "PHARMACY"];

// Dev/testing convenience: this code always passes OTP verification instead
// of checking against the real generated code, so you can log in without
// waiting on the SMS gateway. Password is still checked in sendOtp before
// this ever runs, so this does NOT bypass authentication — only the SMS step.
// Set ALLOW_OTP_BYPASS=false in production to disable it entirely.
const OTP_BYPASS_CODE = "969696";
const OTP_BYPASS_ENABLED = process.env.ALLOW_OTP_BYPASS !== "false";

// Strip password before ever sending a user object back to the client.
function toSafeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

// A phone might be stored with or without the "91" country-code prefix
// depending on how it was originally entered at registration time. Try both
// so lookups don't silently fail for older records.
async function findUserByPhone(rawPhone) {
  const normalized = normalizePhone(rawPhone);
  const digitsOnly = String(rawPhone || "").replace(/\D/g, "");

  return (
    (await prisma.user.findUnique({ where: { phone: normalized } })) ||
    (await prisma.user.findUnique({ where: { phone: digitsOnly } }))
  );
}

export async function register(req, res) {
  try {
    const { fullName, email, phone, password, role, modules } = req.body;

  if (!fullName || !email || !phone || !password || !role) {
    return res.status(400).json({
      message: "fullName, email, phone, password and role are required.",
    });
  }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `role must be one of ${VALID_ROLES.join(", ")}` });
    }

    const moduleList = Array.isArray(modules) ? modules : [];
    const invalidModule = moduleList.find((m) => !VALID_MODULES.includes(m));
    if (invalidModule) {
      return res.status(400).json({ message: `Invalid module: ${invalidModule}` });
    }

    const existingPhone = await prisma.user.findUnique({
      where: {
        phone: normalizePhone(phone),
      },
    });

    if (existingPhone) {
      return res.status(409).json({
        message: "Mobile number already exists.",
      });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone: normalizePhone(phone),
        password: hashed,
        role,
        modules: moduleList,
      },
    });

    return res.status(201).json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Something went wrong during registration." });
  }
}

// Existing email + password login — left intact in case you still need it
// anywhere (e.g. an admin backdoor), but the Login page now uses the OTP
// flow below instead.
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signToken({ id: user.id, role: user.role, modules: user.modules });

    return res.status(200).json({
      token,
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Something went wrong during login." });
  }
}

// Step 1 of OTP login: validate the phone + password belong to an active
// user assigned to the requested module, then send a 6-digit OTP over SMS.
// The OTP is only ever sent once the password has checked out, so knowing a
// phone number alone is no longer enough to trigger an SMS to someone else's
// device.
export async function sendOtp(req, res) {
  try {
    const { phone, password, module } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "phone and password are required." });
    }
    const moduleUpper = String(module || "").toUpperCase();
    if (!VALID_MODULES.includes(moduleUpper)) {
      return res.status(400).json({ message: `module must be one of ${VALID_MODULES.join(", ")}` });
    }

    const normalized = normalizePhone(phone);

    const user = await findUserByPhone(phone);
    if (!user || !user.isActive) {
      // Same message as a wrong password below, on purpose — don't reveal
      // whether the phone number is registered.
      return res.status(401).json({ message: "Invalid mobile number or password." });
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid mobile number or password." });
    }

    if (!user.modules.includes(moduleUpper)) {
      return res.status(403).json({ message: "This account is not assigned to the selected module." });
    }

    if (!canResend(normalized)) {
      return res.status(429).json({
        message: `Please wait ${secondsUntilResend(normalized)}s before requesting another OTP.`,
      });
    }

    const otp = generateOtp();
    saveOtp(normalized, otp);

    console.log(`[OTP] Generated OTP ${otp} for ${normalized} (module: ${moduleUpper})`);

    try {
      await sendOtpSms(normalized, otp);
      console.log(`[OTP] SMS gateway accepted the request for ${normalized}`);
   } catch (smsErr) {
      deleteOtp(normalized);

      console.error(
        `[OTP] SMS delivery FAILED for ${normalized}:`,
        smsErr.message
      );

      throw smsErr;
    }

    return res.status(200).json({ message: "OTP sent to your registered mobile number." });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ message: "Could not send OTP. Please try again." });
  }
}

// Step 2 of OTP login: verify the code and, if correct, issue a JWT exactly
// like the old email/password login did.
export async function verifyOtpAndLogin(req, res) {
  console.log("================================");
  console.log("VERIFY OTP API CALLED");
  console.log("Time:", new Date().toISOString());
  console.log("Body:", req.body);
  console.log("================================");
  try {
    const { phone, otp, module } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "phone and otp are required." });
    }
    const moduleUpper = String(module || "").toUpperCase();
    if (!VALID_MODULES.includes(moduleUpper)) {
      return res.status(400).json({ message: `module must be one of ${VALID_MODULES.join(", ")}` });
    }

    const normalized = normalizePhone(phone);

    console.log(`[OTP-VERIFY] Incoming request — phone raw: "${phone}", normalized: "${normalized}", otp: "${otp}", module: ${moduleUpper}`);

    const submittedOtp = String(otp).trim();
    const isBypass = OTP_BYPASS_ENABLED && submittedOtp === OTP_BYPASS_CODE;

    if (isBypass) {
      console.log(`[OTP-VERIFY] Bypass code used for ${normalized} — skipping real OTP check.`);
      deleteOtp(normalized); // clear any pending real OTP so it can't also be replayed
    } else {
      console.log("OTP Store BEFORE verify:", normalized);

      const result = verifyOtp(normalized, submittedOtp);

      console.log("verifyOtp result:", result);
      if (!result.ok) {
        console.warn(`[OTP-VERIFY] FAILED for ${normalized} — reason: ${result.reason}`);
        return res.status(401).json({ message: result.reason });
      }
      console.log(`[OTP-VERIFY] OTP matched for ${normalized}`);
    }

    console.log("Finding user...");

    const user = await findUserByPhone(phone);

    console.log("User:", user);
    if (!user || !user.isActive) {
      console.warn(`[OTP-VERIFY] No active user found for phone "${phone}" (normalized "${normalized}") after OTP matched.`);
      return res.status(401).json({ message: "Invalid credentials." });
    }
    if (!user.modules.includes(moduleUpper)) {
      console.warn(`[OTP-VERIFY] User ${user.id} is not assigned to module ${moduleUpper}. Their modules: ${user.modules}`);
      return res.status(403).json({ message: "This account is not assigned to the selected module." });
    }

    const token = signToken({ id: user.id, role: user.role, modules: user.modules });

    return res.status(200).json({ token, user: toSafeUser(user) });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "Something went wrong verifying the OTP." });
  }
}

export async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}