// api/config/plans.js
// THE single source of truth for plans, prices, limits and features.
// The pricing page, the checkout, the webhook and every limit check
// all read from here — change a number once, it changes everywhere.
//
// ⚠️ THIS FILE REPLACES YOUR EXISTING api/config/plans.js — it's the
// same file with ONE addition: a `dataExport` block per plan (bottom
// of each plan object) + three new helpers at the bottom of the file.
// Nothing else changed; diff against your current copy if you want
// to confirm before overwriting.

const env = (k) => process.env[k] || "";

export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    monthly: 19,
    annual: 182,               // 19 × 12 × 0.8, rounded
    prices: {
      month: () => env("STRIPE_PRICE_STARTER_MONTHLY"),
      year:  () => env("STRIPE_PRICE_STARTER_ANNUAL"),
    },
    limits: { goals: 3,        products: 10,       employees: 5,        apiAccess: false },
    // No CSV export on Starter — it's an upsell lever toward Growth.
    dataExport: { enabled: false, historyMonths: 0, maxRangeMonths: 0 },
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthly: 49,
    annual: 470,
    prices: {
      month: () => env("STRIPE_PRICE_GROWTH_MONTHLY"),
      year:  () => env("STRIPE_PRICE_GROWTH_ANNUAL"),
    },
    limits: { goals: 15,       products: Infinity, employees: 25,       apiAccess: false },
    // Reachable history caps out at 6 months back; each export request
    // can span up to 6 months (so on Growth that's "everything, in one go").
    dataExport: { enabled: true, historyMonths: 6, maxRangeMonths: 6 },
  },
  scale: {
    id: "scale",
    name: "Scale",
    monthly: 99,
    annual: 950,
    prices: {
      month: () => env("STRIPE_PRICE_SCALE_MONTHLY"),
      year:  () => env("STRIPE_PRICE_SCALE_ANNUAL"),
    },
    limits: { goals: Infinity, products: Infinity, employees: Infinity, apiAccess: true },
    // Unlimited total history (never locked out of old data), but every
    // single export request is still capped to a 6-month span so a file
    // stays fast to generate — run multiple exports for a wider range.
    dataExport: { enabled: true, historyMonths: Infinity, maxRangeMonths: 6 },
  },
};

// What a company on the free trial gets. Growth = "the popular plan",
// so trials experience the product at its best without unlocking the
// Scale-only API.
export const TRIAL_PLAN_ID = "growth";
export const TRIAL_DAYS    = 14;

/* ── helpers ─────────────────────────────────────────────────── */

export const getPlan = (planId) => PLANS[planId] || null;

export const priceIdFor = (planId, interval) => {
  const plan = getPlan(planId);
  if (!plan) return null;
  const fn = plan.prices[interval === "year" ? "year" : "month"];
  return fn ? fn() : null;
};

// reverse lookup: Stripe price id → { planId, interval }
export const planFromPriceId = (priceId) => {
  for (const plan of Object.values(PLANS)) {
    if (plan.prices.month() === priceId) return { planId: plan.id, interval: "month" };
    if (plan.prices.year()  === priceId) return { planId: plan.id, interval: "year"  };
  }
  return null;
};

export const inTrial = (company) =>
  Boolean(company?.trialEndsAt && new Date(company.trialEndsAt) > new Date());

// Which plan's rules apply RIGHT NOW (null = no access)
export const effectivePlanId = (company) => {
  if (company?.subscriptionStatus === "active" && company?.planId && PLANS[company.planId]) {
    return company.planId;
  }
  if (inTrial(company)) return TRIAL_PLAN_ID;
  return null;
};

// limit for a kind ("goals" | "products" | "employees") under the
// company's current effective plan; 0 when they have no access at all
export const limitFor = (company, kind) => {
  const planId = effectivePlanId(company);
  if (!planId) return 0;
  const v = PLANS[planId].limits[kind];
  return v === undefined ? 0 : v;
};

export const hasApiAccess = (company) => {
  const planId = effectivePlanId(company);
  return Boolean(planId && PLANS[planId].limits.apiAccess);
};

/* ══════════════════════════════════════════════════════════════
   DATA EXPORT — new helpers backing the CSV export feature.
   Mirrors the limitFor()/hasApiAccess() pattern above so the
   export route (and the frontend) both read from this one place.
══════════════════════════════════════════════════════════════ */

// The company's current dataExport rules. No plan (trial expired,
// never subscribed) → export fully disabled.
export const exportConfigFor = (company) => {
  const planId = effectivePlanId(company);
  if (!planId) return { enabled: false, historyMonths: 0, maxRangeMonths: 0 };
  return PLANS[planId].dataExport;
};

export const canExportData = (company) => exportConfigFor(company).enabled === true;

// Earliest date (inclusive, UTC midnight) this company is allowed to
// export data from — null means no lower bound (full company history,
// i.e. Scale).
export const earliestExportDate = (company) => {
  const { historyMonths } = exportConfigFor(company);
  if (!Number.isFinite(historyMonths)) return null;
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - historyMonths);
  return d;
};

// ════════════════════════════════════════════════════════════════
//  ADD THESE EXPORTS TO YOUR EXISTING api/config/plans.js
//  (don't replace the file — just paste these in alongside getPlan,
//   priceIdFor, inTrial, effectivePlanId, TRIAL_DAYS, planFromPriceId).
//  You can delete the old Stripe priceIdFor / planFromPriceId once Paddle
//  is fully live and Stripe is gone.
// ════════════════════════════════════════════════════════════════

// Paddle price IDs, read from env so sandbox↔live is just an env swap.
// Never hardcode/commit the ids. Fill the env vars from your Paddle catalog
// (Part 2): the 6 pri_... ids you created for Starter/Growth/Scale × month/year.
export const PADDLE_PRICES = {
  starter: { month: process.env.PADDLE_PRICE_STARTER_M, year: process.env.PADDLE_PRICE_STARTER_Y },
  growth:  { month: process.env.PADDLE_PRICE_GROWTH_M,  year: process.env.PADDLE_PRICE_GROWTH_Y  },
  scale:   { month: process.env.PADDLE_PRICE_SCALE_M,   year: process.env.PADDLE_PRICE_SCALE_Y   },
};

// Paddle price id (pri_...) → { planId, interval }. Mirrors your Stripe
// planFromPriceId — the webhook uses it to set the company's plan.
export const planFromPaddlePriceId = (priceId) => {
  for (const [planId, ivals] of Object.entries(PADDLE_PRICES)) {
    if (ivals.month === priceId) return { planId, interval: "month" };
    if (ivals.year  === priceId) return { planId, interval: "year"  };
  }
  return null;
};