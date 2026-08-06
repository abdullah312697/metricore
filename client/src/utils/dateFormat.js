// App-wide convention:
//   Backend/DB  → "dd/MM/yyyy"
//   <input type="date"> → "yyyy-MM-dd"
// Convert ONLY at fetch and submit boundaries.

export const ddmmyyyyToISO = (s) => {
  if (!s || typeof s !== "string") return "";
  const [d, m, y] = s.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

export const toDDMMYYYY = (iso) => {
  if (!iso || typeof iso !== "string") return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
};