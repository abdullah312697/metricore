import crypto from "crypto";
import bcrypt from "bcryptjs";

const GCM_ALGO      = "aes-256-gcm";
const IV_LENGTH     = 16;
const BCRYPT_ROUNDS = 10;

/* ── key loading — clear error instead of a Buffer TypeError ───── */
function getKey() {
  const hex = process.env.PASS_SEC;
  if (!hex) {
    throw new Error(
      "PASS_SEC is missing from .env — generate one with: openssl rand -hex 32"
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("PASS_SEC must be 32 bytes (64 hex characters)");
  }
  return key;
}

/* ═══════════════════════════════════════════════════════════════
   COOKIE IDs — AES-256-GCM (authenticated encryption)
   Format: iv : authTag : ciphertext   (all hex)
═══════════════════════════════════════════════════════════════ */
export function encryptUserData(data) {
  if (!data) return null;

  const iv     = crypto.randomBytes(IV_LENGTH);
  const key    = getKey();
  const cipher = crypto.createCipheriv(GCM_ALGO, key, iv);

  let encrypted = cipher.update(String(data), "utf8", "hex");
  encrypted    += cipher.final("hex");
  const tag     = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptUserData(encryptedData) {
  try {
    if (!encryptedData) return null;

    const decoded = decodeURIComponent(encryptedData).trim();
    const parts   = decoded.split(":");
    if (parts.length !== 3) return null;   // old-format CBC cookies land here → 401 → re-login

    const [ivHex, tagHex, encryptedHex] = parts;

    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== IV_LENGTH) return null;

    const key      = getKey();
    const decipher = crypto.createDecipheriv(GCM_ALGO, key, iv);
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));   // 👈 tamper check

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted    += decipher.final("utf8");            // throws if forged
    return decrypted;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   PASSWORDS — bcrypt (one-way)
   Store what hashPassword returns; check with verifyPassword.
   Neither you nor an attacker with the DB can recover the original.
═══════════════════════════════════════════════════════════════ */
export async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("hashPassword: password is required");
  }
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  return await bcrypt.compare(password, storedHash);
}

/* ═══════════════════════════════════════════════════════════════
   LEGACY — AES password helpers (CBC)
   Kept ONLY so (a) nothing crashes before you finish swapping call
   sites, and (b) the one-time migration can decrypt old passwords.
   DELETE both after Migration 4 has run and call sites use bcrypt.
═══════════════════════════════════════════════════════════════ */
const CBC_ALGO = "aes-256-cbc";

export function encryptCompanyPassword(password) {   // ⚠️ deprecated
  if (!password) return null;
  const iv     = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(CBC_ALGO, getKey(), iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted    += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptCompanyPassword(encryptedPassword) {   // ⚠️ deprecated
  try {
    if (!encryptedPassword || !encryptedPassword.includes(":")) return null;
    const [ivHex, encryptedHex] = encryptedPassword.split(":");
    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== IV_LENGTH) return null;
    const decipher = crypto.createDecipheriv(CBC_ALGO, getKey(), iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted    += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}