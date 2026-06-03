const getBaseName = (name = "") => name.replace(/\.[^/.]+$/, "");
const cleanFileName = (name = "") => name.replace(/[^\w.-]/g, "_");
const getExt = (name = "") => name.includes(".") ? name.split(".").pop() : "";

export const generatePublicId = (originalName) => {
  const ext = getExt(originalName);
  const base = cleanFileName(getBaseName(originalName));
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return ext ? `${base}_${unique}.${ext}` : `${base}_${unique}`;
};
