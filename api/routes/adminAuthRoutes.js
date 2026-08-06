// api/routes/adminAuthRoutes.js
// Platform-owner authentication. Mount in index.js:
//
//     import adminAuthRoutes from "./routes/adminAuthRoutes.js";
//     app.use("/api/admin", adminAuthRoutes);
//
// Endpoints:  POST /api/admin/login    (rate-limited: 10 / 15 min / IP)
//             POST /api/admin/logout
//             GET  /api/admin/me       (session check for the frontend)
//
// Exports `requireAdmin` — every later admin step (stats, companies,
// feedback, announcements, billing) imports THIS middleware:
//
//     import { requireAdmin } from "./adminAuthRoutes.js";
//     router.get("/companies", requireAdmin, handler);
//
// Design notes:
//   • Its OWN cookie ("adminId") — zero collision with the company
//     cookies, so you can be logged into both apps in one browser.
//   • 7-day session, not 1 year: this account controls the platform,
//     so it re-authenticates weekly.
//   • Login errors are generic ("Invalid email or password") — no
//     email enumeration, same policy as password reset.
//   • No registration endpoint exists anywhere. Seeding only.

import { Router } from "express";
import mongoose from "mongoose";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import PlatformAdmin from "../models/PlatformAdmin.js";
import { encryptUserData, decryptUserData, verifyPassword } from "../verifyuser.js";

const router = Router();

const ADMIN_COOKIE = "adminId";
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: "none",
  path:     "/",
  maxAge:   7 * 24 * 60 * 60 * 1000,   // 7 days
};

/* ── brute-force shield on login only ───────────────────────── */
const loginLimiter = rateLimit({
  windowMs:        15 * 60_000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => ipKeyGenerator(req.ip),   // IPv6-safe
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

/* ═══════════════════════════════════════════════════════════════
   requireAdmin — the gate every admin route stands behind
═══════════════════════════════════════════════════════════════ */
export const requireAdmin = async (req, res, next) => {
  try {
    const id = decryptUserData(req.cookies?.[ADMIN_COOKIE]);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(401).json({ message: "Admin login required." });
    }

    const admin = await PlatformAdmin.findById(id);
    if (!admin) {
      return res.status(401).json({ message: "Admin login required." });
    }

    req.admin = { id: String(admin._id), email: admin.email, name: admin.name };
    next();
  } catch (err) {
    console.error("❌ requireAdmin:", err.message);
    return res.status(500).json({ message: "Auth check failed." });
  }
};

/* ═══════════════════════════════════════════════════════════════
   POST /api/admin/login
═══════════════════════════════════════════════════════════════ */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const email    = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const admin = await PlatformAdmin
      .findOne({ email })
      .select("+passwordHash");

    const ok = admin && (await verifyPassword(password, admin.passwordHash));
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // fire-and-forget
    PlatformAdmin.updateOne(
      { _id: admin._id },
      { $set: { lastLoginAt: new Date() } }
    ).catch(() => {});

    return res
      .status(200)
      .cookie(ADMIN_COOKIE, encryptUserData(String(admin._id)), COOKIE_OPTS)
      .json({
        message: "Welcome back.",
        admin:   { name: admin.name, email: admin.email },
      });
  } catch (err) {
    console.error("❌ admin login:", err.message);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/admin/logout — options must MATCH how the cookie was set
═══════════════════════════════════════════════════════════════ */
router.post("/logout", (req, res) => {
  return res
    .clearCookie(ADMIN_COOKIE, {
      httpOnly: true,
      secure:   true,
      sameSite: "none",
      path:     "/",
    })
    .status(200)
    .json({ message: "Logged out." });
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/admin/me — the frontend guard's session check
═══════════════════════════════════════════════════════════════ */
router.get("/me", requireAdmin, (req, res) => {
  return res.status(200).json({ admin: req.admin });
});

export default router;