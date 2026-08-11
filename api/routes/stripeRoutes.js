// api/routes/stripeRoutes.js
// Checkout, billing portal, and subscription state — plus the
// requireActiveSubscription gate the business routers mount behind.
//
// Mount in index.js (normal position, AFTER express.json is fine —
// only the WEBHOOK needs the raw-body special case, see stripeWebhook.js):
//
//     import stripeRoutes from "./routes/stripeRoutes.js";
//     app.use("/api/stripe", stripeRoutes);
//
// Endpoints:
//     POST /api/stripe/create-checkout-session   { planId, interval }  (Owner only)
//     POST /api/stripe/create-portal-session                            (Owner only)
//     GET  /api/stripe/subscription               billing state for the Billing page
//
// 👈 Adjust: Companies + Employee model import filenames, and the
//    EmplyeeRoal / companyEmail / companyName field reads if yours
//    differ. FRONTEND_URL in .env drives the redirect URLs.

import { Router } from "express";
import Stripe from "stripe";
import Companies from "../models/Companies.js";     // 👈 adjust
import Employee  from "../models/Employee.js";      // 👈 adjust
import { decryptUserData } from "../verifyuser.js";
import {
  getPlan, priceIdFor, inTrial, effectivePlanId, TRIAL_DAYS,
} from "../config/plans.js";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ── auth helpers ────────────────────────────────────────────── */
const getAuth = (req) => {
  const employeeId = decryptUserData(req.cookies?.employeeId);
  const companyId  = decryptUserData(req.cookies?.companyId);
  if (!employeeId || !companyId) return null;
  return { employeeId, companyId };
};

// Billing actions are Owner-only — money is the owner's call.
const getOwnerAuth = async (req) => {
  const auth = getAuth(req);
  if (!auth) return { error: 401, message: "Login/Register please!" };

  const employee = await Employee.findById(auth.employeeId).lean();
  if (!employee) return { error: 401, message: "Login/Register please!" };
  if (employee.EmplyeeRoal !== "Owner") {                    // 👈 adjust field
    return { error: 403, message: "Only the company owner can manage billing." };
  }

  const company = await Companies.findById(auth.companyId);
  if (!company) return { error: 401, message: "Login/Register please!" };

  return { auth, company };
};

/* ═══════════════════════════════════════════════════════════════
   requireActiveSubscription — mount business routers behind this:
       app.use("/api/newproduct", requireActiveSubscription, productRoutes);
   Passes: active subscription OR inside the free-trial window.
   Blocks with 402 + a code the frontend can route to /billing on.
═══════════════════════════════════════════════════════════════ */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const companyId = decryptUserData(req.cookies?.companyId);
    if (!companyId) return res.status(401).json({ message: "Login/Register please!" });

    const company = await Companies.findById(companyId)
      .select("subscriptionStatus trialEndsAt planId isSuspended")
      .lean();

    if (!company) return res.status(401).json({ message: "Login/Register please!" });
    if (company.isSuspended)
      return res.status(403).json({ message: "This account has been suspended. Contact support." });

    if (company.subscriptionStatus === "active" || inTrial(company)) return next();

    if (company.subscriptionStatus === "past_due") {
      return res.status(402).json({
        code:    "PAYMENT_FAILED",
        message: "Your last payment failed. Update your billing details to continue.",
      });
    }

    return res.status(402).json({
      code:    "SUBSCRIPTION_REQUIRED",
      message: "Your free trial has ended. Choose a plan to keep using MetriCore.",
    });
  } catch (err) {
    console.error("❌ requireActiveSubscription:", err.message);
    return res.status(500).json({ message: "Subscription check failed." });
  }
};

/* ═══════════════════════════════════════════════════════════════
   POST /create-checkout-session
═══════════════════════════════════════════════════════════════ */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const gate = await getOwnerAuth(req);
    if (gate.error) return res.status(gate.error).json({ message: gate.message });
    const { company } = gate;

    const planId   = String(req.body?.planId || "");
    const interval = req.body?.interval === "year" ? "year" : "month";

    const plan    = getPlan(planId);
    const priceId = priceIdFor(planId, interval);
    console.log("🔎 planId:", planId, "interval:", interval, "→ priceId:", JSON.stringify(priceId));
    if (!plan || !priceId) {
      return res.status(400).json({ message: "Unknown plan — check the Stripe price ids in .env." });
    }
    // one Stripe customer per company, created lazily
    let customerId = company.stripeCustomerId;
    
  if (customerId) {
  try {
    const existing = await stripe.customers.retrieve(customerId);
    if (existing.deleted) customerId = null;
  } catch {
    customerId = null;
  }
}
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    company.companyEmail || undefined,   // 👈 adjust read
        name:     company.companyName  || undefined,   // 👈 adjust read
        metadata: { companyId: String(company._id) },
      });
      customerId = customer.id;
      company.stripeCustomerId = customerId;
      await company.save();
    }

    const base = process.env.FRONTEND_URL || "https://metricore.app";

    const session = await stripe.checkout.sessions.create({
      mode:     "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // metadata on BOTH the session and the subscription, so every
      // webhook event can find the company without guessing
      metadata: { companyId: String(company._id), planId },
      subscription_data: { metadata: { companyId: String(company._id), planId } },
      success_url: `${base}/billing-return?status=success`,
      cancel_url:  `${base}/billing-return?status=cancelled`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("❌ create-checkout-session:", err.message);
    return res.status(500).json({ message: "Could not start checkout. Please try again." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /create-portal-session — manage card / cancel / invoices
═══════════════════════════════════════════════════════════════ */
router.post("/create-portal-session", async (req, res) => {
  try {
    const gate = await getOwnerAuth(req);
    if (gate.error) return res.status(gate.error).json({ message: gate.message });
    const { company } = gate;

    if (!company.stripeCustomerId) {
      return res.status(400).json({ message: "No billing account yet — choose a plan first." });
    }

    const base = process.env.FRONTEND_URL || "https://metricore.app";
    const session = await stripe.billingPortal.sessions.create({
      customer:   company.stripeCustomerId,
      return_url: `${base}/billing-return?status=portal`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("❌ create-portal-session:", err.message);
    return res.status(500).json({ message: "Could not open the billing portal." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /subscription — state for the Billing page (any employee)
═══════════════════════════════════════════════════════════════ */
router.get("/subscription", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });

    const company = await Companies.findById(auth.companyId)
      .select("planId subscriptionStatus billingInterval currentPeriodEnd trialEndsAt stripeCustomerId")
      .lean();
    if (!company) return res.status(401).json({ message: "Login/Register please!" });

    const trialActive   = inTrial(company);
    const trialDaysLeft = trialActive
      ? Math.max(0, Math.ceil((new Date(company.trialEndsAt) - Date.now()) / 86400000))
      : 0;

    return res.status(200).json({
      planId:            company.planId || null,
      status:            company.subscriptionStatus || "none",
      interval:          company.billingInterval || null,
      currentPeriodEnd:  company.currentPeriodEnd || null,
      trialEndsAt:       company.trialEndsAt || null,
      trialActive,
      trialDaysLeft,
      trialTotalDays:    TRIAL_DAYS,
      effectivePlanId:   effectivePlanId(company),
      hasBillingAccount: Boolean(company.stripeCustomerId),
    });
  } catch (err) {
    console.error("❌ subscription state:", err.message);
    return res.status(500).json({ message: "Failed to load billing state." });
  }
});

export default router;