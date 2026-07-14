// server/src/auth/jwt.js
import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  // Fail loudly at boot rather than silently signing tokens with `undefined`.
  console.warn(
    "⚠️  JWT_SECRET is not set in .env — tokens will be insecure. Set JWT_SECRET before deploying."
  );
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET || "dev-only-insecure-secret", {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET || "dev-only-insecure-secret");
}