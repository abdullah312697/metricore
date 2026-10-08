// api/middleware/requireActiveSubscription.js
//
// Provider-agnostic subscription gate. This used to live in stripeRoutes.js;
// moved into its own file so it SURVIVES the Stripe→Paddle switch untouched.
// It reads ONLY company.subscriptionStatus / trialEndsAt / isSuspended, so it
// doesn't care whether Stripe or Paddle wrote those fields.
//
// Mount business routers behind it in index.js (same as before):
//     app.use("/api/newproduct", requireActiveSubscription, productRoutes);
//
// ⚠️ ONE import change: in index.js, import this from here instead of
//    from stripeRoutes.js:
//        import { requireActiveSubscription } from "./middleware/requireActiveSubscription.js";
//
// NOTE: this is a SUBSCRIPTION-STATUS gate, not a role gate — every employee
// of a paid/trialing company must pass it regardless of role. Do NOT add a
// permission check here or you'll lock non-owners out of the whole app.

import Companies from "../models/Companies.js";        // 👈 adjust path/filename
import { decryptUserData } from "../verifyuser.js";     // 👈 adjust path
import { inTrial } from "../config/plans.js";           // 👈 adjust path

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