// api/routes/adminStatsRoutes.js
// Platform overview numbers for the admin console.
//
// Mount in index.js AFTER adminAuthRoutes (same base path is fine —
// Express stacks routers):
//
//     import adminStatsRoutes from "./routes/adminStatsRoutes.js";
//     app.use("/api/admin", adminStatsRoutes);
//
// Endpoint:  GET /api/admin/stats   (requireAdmin)
//
// ⚠️ TWO THINGS TO ADJUST TO YOUR CODEBASE (both marked 👈 below):
//   1. The two model imports — point them at YOUR Companies and
//      employee model files (the employee model is the one whose
//      documents have YemplyeeName / EmplyeeRoal).
//   2. VERIFIED_FIELD — the boolean field on Companies that marks a
//      completed email verification (e.g. "isVerified", "EmailVerify",
//      "verified"). Everything else keys off this one constant.
//
// NOTE: "new this week" and the recent-signups sort need
// { timestamps: true } on the Companies schema. If it's missing,
// add it — new registrations get createdAt automatically.

import { Router } from "express";
import Companies from "../models/Companies.js";   // 👈 adjust path/filename
import Employee  from "../models/Employee.js";    // 👈 adjust path/filename
import ClientProduct from "../models/ClientProduct.js";
import { requireAdmin } from "./adminAuthRoutes.js";
import Feedback from "../models/Feedback.js";

const router = Router();

const VERIFIED_FIELD = "isVerify";              // 👈 adjust to your schema

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies,
      newThisWeek,
      verifiedCompanies,
      totalEmployees,
      totalProducts,
      recentDocs,
    ] = await Promise.all([
      Companies.countDocuments({}),
      Companies.countDocuments({ createdAt: { $gte: weekAgo } }),
      Companies.countDocuments({ [VERIFIED_FIELD]: true }),
      Employee.countDocuments({}),
      ClientProduct.countDocuments({}),
      Companies.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Feedback.countDocuments({ status: { $ne: "resolved" } }),
    ]);

    const verifiedPct = totalCompanies
      ? Math.round((verifiedCompanies / totalCompanies) * 100)
      : 0;

    // Normalize the recent list so the frontend never touches raw
    // schema field names. 👈 adjust the three field reads if your
    // Companies schema names them differently.
    const recentSignups = recentDocs.map((c) => ({
      _id:       c._id,
      name:      c.companyName  || "—",
      email:     c.companyEmail || "",
      logo:      c.companyLogo  || "",
      verified:  Boolean(c[VERIFIED_FIELD]),
      createdAt: c.createdAt || null,
    }));

    return res.status(200).json({
      stats: {
        totalCompanies,
        newThisWeek,
        verifiedCompanies,
        verifiedPct,
        totalEmployees,
        totalProducts,
        // Wired for real in the feedback step — null renders as "—"
        // in the UI with a "soon" hint.
        openFeedback: "—",
      },
      recentSignups,
    });
  } catch (err) {
    console.error("❌ admin stats:", err.message);
    return res.status(500).json({ message: "Failed to load platform stats." });
  }
});

export default router;