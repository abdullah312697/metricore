// api/config/plans.js
// THE single source of truth for plans, prices, limits and features.
// The pricing page, the checkout, the webhook and every limit check
// all read from here — change a number once, it changes everywhere.

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