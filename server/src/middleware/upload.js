// server/src/middleware/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "ipd-documents");

// Make sure the upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(req, file, cb) {
  const allowed = /pdf|png|jpe?g|webp/i;
  if (allowed.test(path.extname(file.originalname))) return cb(null, true);
  cb(new Error("Only PDF and image files (png, jpg, jpeg, webp) are allowed"));
}

export const uploadIpdDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const UPLOAD_URL_PREFIX = "/uploads/ipd-documents";