// api/routes/adminBillingRoutes.js
// Platform revenue view for the admin console — read-only, computed
// live from the company billing fields the Stripe webhooks maintain.
//
// Mount in index.js (same base path):
//     import adminBillingRoutes from "./routes/adminBillingRoutes.js";
//     app.use("/api/admin", adminBillingRoutes);
//
// Endpoint: GET /api/admin/billing   (requireAdmin)
//
// MRR is normalized to a MONTHLY figure: an annual subscription
// contributes annualPrice / 12, so mixing intervals stays honest.
// Everything reads from api/config/plans.js, so prices never drift.
//
// 👈 Adjust the Companies import filename + the companyName/logo
//    reads if your schema differs (same knobs as the other routes).

import { Router } from "express";
import Companies from "../models/Companies.js";     // 👈 adjust
import { requireAdmin } from "./adminAuthRoutes.js";
import { PLANS, getPlan, TRIAL_PLAN_ID, inTrial } from "../config/plans.js";

const router = Router();

// monthly-equivalent price for a plan+interval
const monthlyValue = (planId, interval) => {
  const plan = getPlan(planId);
  if (!plan) return 0;
  return interval === "year" ? plan.annual / 12 : plan.monthly;
};

router.get("/billing", requireAdmin, async (req, res) => {
  try {
    const companies = await Companies.find({})
      .select("companyName companyLogo planId subscriptionStatus billingInterval currentPeriodEnd trialEndsAt updatedAt")
      .lean();

    // per-plan tallies + MRR
    const planStats = {};
    Object.values(PLANS).forEach((p) => {
      planStats[p.id] = { id: p.id, name: p.name, active: 0, mrr: 0 };
    });

    let activeCount = 0;
    let pastDueCount = 0;
    let trialingCount = 0;
    let canceledCount = 0;
    let mrr = 0;

    companies.forEach((c) => {
      const status = c.subscriptionStatus || "none";

      if (status === "active" && c.planId && planStats[c.planId]) {
        const v = monthlyValue(c.planId, c.billingInterval);
        planStats[c.planId].active += 1;
        planStats[c.planId].mrr += v;
        mrr += v;
        activeCount += 1;
      } else if (status === "past_due") {
        pastDueCount += 1;
      } else if (inTrial(c)) {
        trialingCount += 1;
      } else if (status === "canceled") {
        canceledCount += 1;
      }
    });

    // recent subscription activity — most recently changed active/past_due first
    const recent = companies
      .filter((c) => ["active", "past_due", "canceled"].includes(c.subscriptionStatus))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 8)
      .map((c) => ({
        _id:              c._id,
        name:             c.companyName || "—",     // 👈 adjust read
        logo:             c.companyLogo || "",       // 👈 adjust read
        planId:           c.planId || null,
        planName:         c.planId && PLANS[c.planId] ? PLANS[c.planId].name : "—",
        status:           c.subscriptionStatus,
        interval:         c.billingInterval || null,
        currentPeriodEnd: c.currentPeriodEnd || null,
      }));

    return res.status(200).json({
      mrr:  Math.round(mrr),
      arr:  Math.round(mrr * 12),
      counts: {
        active:   activeCount,
        trialing: trialingCount,
        pastDue:  pastDueCount,
        canceled: canceledCount,
        total:    companies.length,
      },
      planStats: Object.values(planStats).map((p) => ({ ...p, mrr: Math.round(p.mrr) })),
      recent,
    });
  } catch (err) {
    console.error("❌ admin billing:", err.message);
    return res.status(500).json({ message: "Failed to load billing overview." });
  }
});

export default router;