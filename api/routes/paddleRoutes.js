// api/routes/paddleRoutes.js
//
// Billing state + customer portal for Paddle. The Paddle twin of
// stripeRoutes.js — BUT there is NO create-checkout-session endpoint:
// Paddle's overlay checkout is opened client-side with Paddle.js, so the
// frontend calls paddle.Checkout.open() directly (see Billing.jsx).
//
// Mount in index.js (normal position, AFTER express.json is fine — only the
// WEBHOOK needs the raw-body special case, see paddleWebhook.js):
//     import paddleRoutes from "./routes/paddleRoutes.js";
//     app.use("/api/paddle", paddleRoutes);
//
// Endpoints:
//     GET  /api/paddle/subscription           billing state for the Billing page (any employee)
//     POST /api/paddle/create-portal-session  manage card / cancel / invoices (manageBilling)
//     GET  /api/paddle/prices                 public Paddle price ids for the frontend
//
// requireActiveSubscription now lives in ../middleware/requireActiveSubscription.js.

import { Router } from "express";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import Companies from "../models/Companies.js";                 // 👈 adjust
import { getRequester } from "../utils/auth.js";
import {
  inTrial, effectivePlanId, TRIAL_DAYS, PADDLE_PRICES,
} from "../config/plans.js";

const router = Router();
const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment:
    process.env.PADDLE_ENV === "production"
      ? Environment.production
      : Environment.sandbox,
});

/* ── billing gate ─────────────────────────────────────────────
   Same manageBilling permission as before (owner + finance tiers). */
const getBillingAuth = async (req) => {
  const ctx = await getRequester(req);
  if (!ctx) return { error: 401, message: "Login/Register please!" };
  if (!ctx.can("manageBilling"))
    return { error: 403, message: "You don't have permission to manage billing." };
  const company = await Companies.findById(ctx.companyId);
  if (!company) return { error: 401, message: "Login/Register please!" };
  return { ctx, company };
};

/* ═══════════════════════════════════════════════════════════════
   POST /create-portal-session — Paddle-hosted customer portal.
   Replaces Stripe's billingPortal. Lets the owner update their card,
   cancel, or see invoices. The link's token is temporary — don't cache it.
═══════════════════════════════════════════════════════════════ */
router.post("/create-portal-session", async (req, res) => {
  try {
    const gate = await getBillingAuth(req);
    if (gate.error) return res.status(gate.error).json({ message: gate.message });
    const { company } = gate;

    if (!company.paddleCustomerId)
      return res.status(400).json({ message: "No billing account yet — choose a plan first." });

    const session = await paddle.customerPortalSessions.create(
      company.paddleCustomerId,
      company.paddleSubscriptionId ? [company.paddleSubscriptionId] : []
    );

    return res.status(200).json({ url: session.urls.general.overview });
  } catch (err) {
    console.error("❌ create-portal-session:", err.message);
    return res.status(500).json({ message: "Could not open the billing portal." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /subscription — state for the Billing page (any employee).
   SAME response shape as your Stripe version, so Billing.jsx needs no
   change to how it reads state — only the request path changes to /paddle.
═══════════════════════════════════════════════════════════════ */
router.get("/subscription", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

    const company = await Companies.findById(ctx.companyId)
      .select("companyEmail planId subscriptionStatus billingInterval currentPeriodEnd trialEndsAt paddleCustomerId")
      .lean();
    if (!company) return res.status(401).json({ message: "Login/Register please!" });

    const trialActive   = inTrial(company);
    const trialDaysLeft = trialActive
      ? Math.max(0, Math.ceil((new Date(company.trialEndsAt) - Date.now()) / 86400000))
      : 0;

    return res.status(200).json({
      // the frontend needs these two to open the Paddle overlay (customData):
      companyId:         String(company._id),
      email:             company.companyEmail || null,
      planId:            company.planId || null,
      status:            company.subscriptionStatus || "none",
      interval:          company.billingInterval || null,
      currentPeriodEnd:  company.currentPeriodEnd || null,
      trialEndsAt:       company.trialEndsAt || null,
      trialActive,
      trialDaysLeft,
      trialTotalDays:    TRIAL_DAYS,
      effectivePlanId:   effectivePlanId(company),
      hasBillingAccount: Boolean(company.paddleCustomerId),
    });
  } catch (err) {
    console.error("❌ subscription state:", err.message);
    return res.status(500).json({ message: "Failed to load billing state." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /prices — the Paddle price ids the checkout needs. These are NOT
   secret (they're used in the browser), so serving them lets the frontend
   stay in sync with the backend instead of hardcoding ids in two places.
═══════════════════════════════════════════════════════════════ */
router.get("/prices", (_req, res) => res.status(200).json(PADDLE_PRICES));

export default router;