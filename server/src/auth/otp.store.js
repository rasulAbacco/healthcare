// server/src/auth/otp.store.js

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = new Map();

export function generateOtp() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export function canResend(phone) {
  const entry = store.get(phone);
  if (!entry) return true;

  return Date.now() - entry.lastSentAt >= RESEND_COOLDOWN_MS;
}

export function secondsUntilResend(phone) {
  const entry = store.get(phone);
  if (!entry) return 0;

  const remaining =
    RESEND_COOLDOWN_MS - (Date.now() - entry.lastSentAt);

  return Math.max(0, Math.ceil(remaining / 1000));
}

export function saveOtp(phone, otp) {
  console.log("\n========== SAVE OTP ==========");
  console.log("Phone :", phone);
  console.log("OTP   :", otp);

  store.set(phone, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  });

  console.log("Store Keys :", [...store.keys()]);
  console.log("Store Data :", [...store.entries()]);
  console.log("==============================\n");
}

export function verifyOtp(phone, submittedOtp) {
  console.log("\n========== VERIFY STORE ==========");
  console.log("Looking For :", phone);
  console.log("Submitted OTP :", submittedOtp);
  console.log("Store Keys :", [...store.keys()]);
  console.log("Store Data :", [...store.entries()]);

  const entry = store.get(phone);

  console.log("Entry Found :", entry);

  if (!entry) {
    console.log("OTP NOT FOUND");
    console.log("=================================\n");

    return {
      ok: false,
      reason: "No OTP was requested for this number. Please request a new one.",
    };
  }

  if (Date.now() > entry.expiresAt) {
    console.log("OTP EXPIRED");

    store.delete(phone);

    return {
      ok: false,
      reason: "This OTP has expired. Please request a new one.",
    };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    console.log("MAX ATTEMPTS EXCEEDED");

    store.delete(phone);

    return {
      ok: false,
      reason: "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  if (entry.otp !== submittedOtp) {
    entry.attempts++;

    console.log("OTP MISMATCH");
    console.log("Attempts :", entry.attempts);

    return {
      ok: false,
      reason: "Incorrect OTP. Please try again.",
    };
  }

  console.log("OTP VERIFIED");

  store.delete(phone);

  console.log("Store After Delete :", [...store.entries()]);
  console.log("=================================\n");

  return {
    ok: true,
  };
}

export function deleteOtp(phone) {
  console.log("Deleting OTP for :", phone);

  store.delete(phone);

  console.log("Store After Delete :", [...store.entries()]);
}