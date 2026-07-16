// server/src/lib/r2.js
//
// Thin wrapper around the AWS SDK v3 S3 client, pointed at Cloudflare R2.
// This is the ONLY place that talks to R2 — controllers just call these
// helpers and never touch the SDK directly.
//
// Required env vars (backend .env only — never exposed to the frontend):
//   R2_ENDPOINT     e.g. https://<accountid>.r2.cloudflarestorage.com
//   R2_ACCESS_KEY
//   R2_SECRET_KEY
//   R2_BUCKET       e.g. healthcare
//   R2_REGION       auto
//   R2_PUBLIC_URL   e.g. https://pub-xxxxxxxx.r2.dev  (no trailing slash)

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_REGION = process.env.R2_REGION || "auto";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  // Don't throw at import time — just warn loudly, so the rest of the app
  // (auth, OPD, pharmacy, etc.) still boots even if R2 isn't configured yet.
  console.warn(
    "[r2] Missing one or more R2_* environment variables. " +
      "Document upload/delete will fail until R2_ENDPOINT, R2_ACCESS_KEY, " +
      "R2_SECRET_KEY, R2_BUCKET and R2_PUBLIC_URL are all set."
  );
}

const s3 = new S3Client({
  region: R2_REGION,
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

const DOCS_ROOT = "IPD documents";

// ---------- key / url building ----------

// Turns a patient name into a safe path segment: strips anything that isn't
// a word char/space/hyphen, collapses whitespace, and caps the length so a
// very long name can't blow up the object key.
export function sanitizeFolderName(name = "") {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return cleaned || "Unknown";
}

// "IPD documents/IPD-001-Henry"
export function buildPatientFolder(serialNumber, patientName) {
  return `${DOCS_ROOT}/${serialNumber}-${sanitizeFolderName(patientName)}`;
}

// "IPD documents/IPD-001-Henry/1737000000000-a1b2c3-report.pdf"
// A short timestamp+random prefix is added to the filename (not the folder)
// so two uploads of "report.pdf" for the same patient never collide/overwrite.
export function buildDocumentKey(serialNumber, patientName, originalFilename) {
  const safeFile = (originalFilename || "file").replace(/[^\w.\-]/g, "_");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${buildPatientFolder(serialNumber, patientName)}/${unique}-${safeFile}`;
}

// Encodes each path segment individually so spaces become %20 (matching the
// R2_PUBLIC_URL example in the spec) without also encoding the "/" separators.
export function keyToPublicUrl(key) {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${encoded}`;
}

// ---------- object operations ----------

export async function uploadBufferToR2({ key, buffer, contentType }) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );
  return keyToPublicUrl(key);
}

export async function deleteObjectFromR2(key) {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch (err) {
    // Best-effort: a failed delete shouldn't block the DB record from being removed,
    // but it should be visible in logs so an orphaned object can be cleaned up manually.
    console.error(`[r2] Failed to delete object "${key}":`, err.message);
  }
}

// Bulk delete (used when a whole patient is removed). Falls back to
// sequential single deletes if the batch call itself fails for some reason.
export async function deleteManyObjectsFromR2(keys = []) {
  const validKeys = [...new Set(keys.filter(Boolean))];
  if (!validKeys.length) return;

  try {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: validKeys.map((Key) => ({ Key })) },
      })
    );
  } catch (err) {
    console.error("[r2] Bulk delete failed, falling back to individual deletes:", err.message);
    await Promise.all(validKeys.map((k) => deleteObjectFromR2(k)));
  }
}

export { R2_BUCKET, R2_PUBLIC_URL };