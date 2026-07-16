// server/src/middleware/upload.js
//
// Documents are streamed straight into memory and handed to the R2 helper
// in the controller — nothing is ever written to local disk. There is no
// `uploads/` folder, no diskStorage(), and no UPLOAD_URL_PREFIX anymore.

import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error("Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, GIF."));
}

export const uploadIpdDocument = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter,
});