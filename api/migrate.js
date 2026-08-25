// api/scripts/seedAdmin.js
//
// Creates (or updates) the single PlatformAdmin account — your owner login
// for the admin panel. This is the ONLY way a PlatformAdmin is created;
// there is no public registration route, so run this manually.
//
// ── HOW TO RUN ───────────────────────────────────────────────────────
//   From the api/ folder:
//     node -r dotenv/config scripts/seedAdmin.js
//
//   (the -r dotenv/config loads your .env so MONGO_URL + the admin
//    credentials below are available)
//
// ── REQUIRED .env VARS ───────────────────────────────────────────────
//   MONGO_URL         your database connection string (the NEW cluster)
//   ADMIN_EMAIL       the email you'll log in with
//   ADMIN_PASSWORD    the password you'll log in with
//   ADMIN_NAME        (optional) display name, defaults to "Admin"
//
// ── SAFE TO RE-RUN ───────────────────────────────────────────────────
//   If an admin with ADMIN_EMAIL already exists, this UPDATES their
//   password/name instead of creating a duplicate (email is unique).
//   So you can also use this to RESET the admin password.

import mongoose from "mongoose";
import PlatformAdmin from "./models/PlatformAdmin.js";

// hashPassword lives in verifyuser.js (same helper the app uses).
// ⚠️ ADJUST THIS IMPORT if the path/name differs. It must be the SAME
// hashing function your login's verifyPassword checks against, or the
// hash won't match and login will fail.
import { hashPassword } from "./verifyuser.js";

async function seedAdmin() {
  const MONGO_URL      = process.env.MONGO_URL;
  const ADMIN_EMAIL    = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
  const ADMIN_NAME     = String(process.env.ADMIN_NAME || "Admin").trim();

  // ── validate inputs ──────────────────────────────────────────────
  if (!MONGO_URL) {
    console.error("❌ MONGO_URL is not set in .env — cannot connect.");
    process.exit(1);
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.");
    console.error("   Add them to api/.env, e.g.:");
    console.error("     ADMIN_EMAIL=you@example.com");
    console.error("     ADMIN_PASSWORD=a-strong-password-here");
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.error("❌ ADMIN_PASSWORD should be at least 8 characters.");
    process.exit(1);
  }

  try {
    // ── connect ────────────────────────────────────────────────────
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to database.");

    // ── hash the password the SAME way the app does ────────────────
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    // ── create or update (idempotent) ──────────────────────────────
    const existing = await PlatformAdmin.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      existing.passwordHash = passwordHash;
      existing.name         = ADMIN_NAME;
      await existing.save();
      console.log(`🔁 Admin already existed — password/name UPDATED for: ${ADMIN_EMAIL}`);
      console.log("   (You can use this script to reset the admin password anytime.)");
    } else {
      await PlatformAdmin.create({
        email:        ADMIN_EMAIL,
        passwordHash,
        name:         ADMIN_NAME,
      });
      console.log(`🎉 Admin CREATED: ${ADMIN_EMAIL}`);
    }

    console.log("");
    console.log("   You can now log in to the admin panel with:");
    console.log(`     email:    ${ADMIN_EMAIL}`);
    console.log("     password: (the ADMIN_PASSWORD from your .env)");
    console.log("");

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected.");
  }
}

seedAdmin();