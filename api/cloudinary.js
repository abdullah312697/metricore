// api/cloudinary.js — drop-in replacement
// Same export signature: uploadImage(fileStream, public_id, fname, onProgress)
// Every existing call site (register, addNewProduct, updateCompanyLogo,
// updateProfile) keeps working unchanged.

import { v2 as cloudinary } from "cloudinary";
import { PassThrough } from "stream";

/* ═══════════════════════════════════════════════════════════════
   LAZY ONE-TIME CONFIG
   Runs on the FIRST upload call — not at import time. This makes
   the helper immune to two failure modes:
   1. Import order   — no longer depends on the delete helper
                       having configured the global first.
   2. dotenv hoisting — ES module imports execute before your
                       server entry calls dotenv's config(), so
                       module-level env reads see undefined. By
                       first call time, .env is always loaded.
═══════════════════════════════════════════════════════════════ */
let configured = false;

const ensureConfigured = () => {
  if (configured) return;

  const { CLOUD_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET } = process.env;

  // Fail fast with a readable message instead of "Must supply api_key"
  if (!CLOUD_NAME || !CLOUDINARY_KEY || !CLOUDINARY_SECRET) {
    throw new Error(
      "Cloudinary is not configured — check CLOUD_NAME, CLOUDINARY_KEY and CLOUDINARY_SECRET in api/.env"
    );
  }

  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key:    CLOUDINARY_KEY,
    api_secret: CLOUDINARY_SECRET,
    secure:     true,
  });

  configured = true;
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

// Strip characters that break Cloudinary paths/URLs.
// "/" would silently create sub-folders; spaces make ugly URLs.
const cleanPublicId = (id) =>
  String(id ?? "")
    .trim()
    .replace(/[\\/\s?&#%<>]+/g, "_");

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API
═══════════════════════════════════════════════════════════════ */
export const uploadImage = async (fileStream, public_id, fname, onProgress) => {
  ensureConfigured();

  // ── Input validation — clear errors instead of SDK mysteries ──
  if (!fileStream) {
    throw new Error("uploadImage: no file data received (fileStream is empty)");
  }

  const publicId = cleanPublicId(public_id);
  if (!publicId) {
    throw new Error("uploadImage: public_id is required");
  }

  // Guards against "flucash/undefined" folders
  const folderName = `flucash/${String(fname || "Misc").trim()}`;

  return await uploadStream(fileStream, publicId, folderName, onProgress);
};

/* ═══════════════════════════════════════════════════════════════
   INTERNAL — stream upload with optional progress
═══════════════════════════════════════════════════════════════ */
const uploadStream = (fileStream, publicId, folderName, onProgress) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:          folderName,
        public_id:       publicId,
        resource_type:   "auto",
        use_filename:    false,
        unique_filename: false,
        type:            "upload",
        timeout:         120_000,   // 2 min — never hang a request forever
      },
      (error, result) => {
        if (error) {
          // Add context so route logs say WHAT failed, not just why
          error.message = `Cloudinary upload failed (${folderName}/${publicId}): ${error.message}`;
          return reject(error);
        }
        onProgress?.(100);          // old version capped at 99 and never completed
        resolve(result);
      }
    );

    // ── No progress requested, or data isn't a Buffer → direct write ──
    if (!onProgress || !Buffer.isBuffer(fileStream)) {
      stream.end(fileStream);
      return;
    }

    // ── Progress branch (Buffer + onProgress callback) ─────────────
    const total    = fileStream.length;
    let   uploaded = 0;
    const pass     = new PassThrough();

    pass.on("data", (chunk) => {
      uploaded += chunk.length;
      onProgress(Math.min(Math.round((uploaded / total) * 100), 99));
      // 100 fires in the completion callback above, once Cloudinary
      // actually confirms — not when we merely finished sending
    });

    pass.on("error", reject);
    pass.pipe(stream);
    pass.end(fileStream);
  });
};