import { v2 as cloudinary } from "cloudinary";

// ── Configure ONCE at module load — not on every delete call ─────
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure:     true,
});

// ── Map mimetype (or shorthand) → Cloudinary resource_type ───────
// Returns null when unknown, which triggers the fallback cascade.
const toResourceType = (fileType) => {
  if (!fileType || typeof fileType !== "string") return null;
  if (/video\//.test(fileType) || fileType === "video") return "video";
  if (/image\//.test(fileType) || fileType === "image") return "image";
  return "raw"; // pdf, docs, anything else
};

const destroyAs = (publicId, resourceType) =>
  cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate:    true,           // purge CDN cache too
  });

// ── Same export name — every existing call site keeps working ────
export const deleteResorce = async (publicId, fileType) => {
  if (!publicId) return { result: "skipped", reason: "no publicId" };

  const known = toResourceType(fileType);

  // fileType provided → one targeted delete
  if (known) return await destroyAs(publicId, known);

  // fileType NOT provided → try each type until one succeeds.
  // Image first — that's ~100% of what your app uploads.
  for (const type of ["image", "video", "raw"]) {
    const res = await destroyAs(publicId, type);
    if (res.result === "ok") return { ...res, resource_type: type };
  }

  return { result: "not found" };
};