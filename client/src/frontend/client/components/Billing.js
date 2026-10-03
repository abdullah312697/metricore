import { useEffect, useState, useCallback } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { Altaxios } from "../../Altaxios";   // 👈 adjust to your folder depth
import "../../../style/Billing.css";

/* ═══════════════════════════════════════════════════════════════
   Billing — company-side plan page (/company/:name/billing).
   Trial/active/expired banner + the three plan cards with a
   monthly/annual toggle. Checkout + portal are Owner-only on the
   backend; everyone can view.
   Mirrors api/config/plans.js — change prices in BOTH places.
   These feature lists also appear on LandingPage — keep them in sync.
═══════════════════════════════════════════════════════════════ */

const PLANS_UI = [
  {
    id: "starter",
    name: "Starter",
    monthly: 19,
    annual: 182,
    tagline: "Perfect for solo operators and small product lines.",
    features: [
      "3 active goals", "Up to 10 products", "5 team members, role-based access",
      "Per-product cost & margin tracking", "Custom extra fields & formulas",
      "Analytics dashboard & goal charts", "API access", "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 49,
    annual: 470,
    popular: true,
    tagline: "The most popular plan for growing businesses.",
    features: [
      "Everything in Starter", "15 active goals", "Unlimited products",
      "25 team members", "CSV export — last 6 months", "Priority email support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    monthly: 99,
    annual: 950,
    tagline: "For established businesses with multiple teams.",
    features: [
      "Everything in Growth", "Unlimited goals", "Unlimited products",
      "Unlimited team members", "CSV export — full history",
      "Priority support",
    ],
  },
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

export default function Billing() {
  const [sub,      setSub]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [interval, setInterval] = useState("month");
  const [busyPlan, setBusyPlan] = useState(null);   // planId being checked out
  const [busyPortal, setBusyPortal] = useState(false);
  const [error,    setError]    = useState("");

  const load = useCallback(() => {
    Altaxios.get("/stripe/subscription")
      .then((res) => setSub(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const choose = async (planId) => {
    setBusyPlan(planId);
    setError("");
    try {
      const res = await Altaxios.post("/stripe/create-checkout-session", { planId, interval });
      window.location.href = res.data.url;          // off to Stripe Checkout
    } catch (err) {
      setError(err.response?.data?.message || "Could not start checkout.");
      setBusyPlan(null);
    }
  };

  const openPortal = async () => {
    setBusyPortal(true);
    setError("");
    try {
      const res = await Altaxios.post("/stripe/create-portal-session");
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Could not open the billing portal.");
      setBusyPortal(false);
    }
  };

  if (loading) {
    return (
      <div className="bl-root"><div className="bl-container">
        <p className="bl-loading bl-mono">LOADING BILLING…</p>
      </div></div>
    );
  }

  const isActive = sub?.status === "active";

  return (
    <div className="bl-root">
      <div className="bl-container">

        <span className="bl-eyebrow bl-mono">Billing</span>
        <h1 className="bl-title">Simple pricing, no surprises</h1>

        {/* ── state banner ───────────────────────────────────── */}
        {sub?.trialActive && !isActive && (
          <div className="bl-banner bl-banner--trial">
            <strong>Free trial — {sub.trialDaysLeft} day{sub.trialDaysLeft === 1 ? "" : "s"} left.</strong>
            &nbsp;You have Growth-level access until {fmtDate(sub.trialEndsAt)}. No card needed yet.
          </div>
        )}
        {isActive && (
          <div className="bl-banner bl-banner--active">
            <strong>{PLANS_UI.find((p) => p.id === sub.planId)?.name || "Plan"} · {sub.interval === "year" ? "annual" : "monthly"}.</strong>
            &nbsp;Renews {fmtDate(sub.currentPeriodEnd)}.
            <button className="bl-portal" onClick={openPortal} disabled={busyPortal}>
              {busyPortal ? "Opening…" : "Manage billing"}
            </button>
          </div>
        )}
        {sub?.status === "past_due" && (
          <div className="bl-banner bl-banner--danger">
            <strong>Your last payment failed.</strong>&nbsp;Update your card to keep access.
            <button className="bl-portal" onClick={openPortal} disabled={busyPortal}>
              {busyPortal ? "Opening…" : "Update billing"}
            </button>
          </div>
        )}
        {!isActive && !sub?.trialActive && sub?.status !== "past_due" && (
          <div className="bl-banner bl-banner--danger">
            <strong>Your free trial has ended.</strong>&nbsp;Choose a plan below to continue.
          </div>
        )}

        {/* ── interval toggle ────────────────────────────────── */}
        <div className="bl-toggle">
          <button
            className={`bl-toggle__opt ${interval === "month" ? "bl-toggle__opt--on" : ""}`}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            className={`bl-toggle__opt ${interval === "year" ? "bl-toggle__opt--on" : ""}`}
            onClick={() => setInterval("year")}
          >
            Annual <span className="bl-save">Save 20%</span>
          </button>
        </div>

        {error && <div className="bl-error" role="alert">{error}</div>}

        {/* ── plan cards ─────────────────────────────────────── */}
        <div className="bl-grid">
          {PLANS_UI.map((p) => {
            const current = isActive && sub.planId === p.id && sub.interval === interval;
            const isBusy  = busyPlan === p.id;
            return (
              <div className={`bl-card ${p.popular ? "bl-card--popular" : ""}`} key={p.id}>
                {p.popular && <span className="bl-badge">Most popular</span>}

                <h2 className="bl-card__name">{p.name}</h2>

                <div className="bl-card__price">
                  {interval === "month" ? (
                    <><span className="bl-amount">${p.monthly}</span><span className="bl-per">/ month</span></>
                  ) : (
                    <><span className="bl-amount">${p.annual}</span><span className="bl-per">/ year</span></>
                  )}
                </div>
                {interval === "year" && (
                  <span className="bl-card__subprice">
                    ≈ ${(p.annual / 12).toFixed(0)}/month, billed yearly
                  </span>
                )}

                <p className="bl-card__tagline">{p.tagline}</p>

                <ul className="bl-features">
                  {p.features.map((f) => (
                    <li key={f}>
                      <CheckRoundedIcon style={{ fontSize: 15 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`bl-choose ${p.popular ? "bl-choose--popular" : ""}`}
                  onClick={() => choose(p.id)}
                  disabled={current || Boolean(busyPlan)}
                >
                  {current ? "Current plan" : isBusy ? "Redirecting…" : isActive ? "Switch to this plan" : "Choose plan"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="bl-footnote">
          All plans include a 14-day free trial. No credit card required to start.
          {sub?.hasBillingAccount && !isActive && (
            <> · <button className="bl-linkbtn" onClick={openPortal}>Billing history</button></>
          )}
        </p>

      </div>
    </div>
  );
}