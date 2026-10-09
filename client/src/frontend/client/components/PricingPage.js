import { useState, useEffect, useRef } from "react";
import "../../../style/LandingPage.css";   // 👈 reuses your landing brand styling

/* ════════════════════════════════════════════════════════════════
   PricingPage — dedicated /pricing route.
   Built from your LandingPage pricing section so it stays 100% on-brand
   (same lp- classes), plus the extras a standalone pricing page needs:
   a comparison table, a billing FAQ, a trust strip, and a final CTA.

   The ONLY new CSS is the small self-contained <style> block for the
   comparison table (pr-cmp- classes), tuned to your dark navy + gold
   theme. Everything else reuses LandingPage.css.
═══════════════════════════════════════════════════════════════════ */

// ── Scroll-reveal hook (copied from LandingPage) ─────────────────
const useReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

// ── Plans (same source of truth as your landing page) ────────────
const PLANS = [
  {
    name: "Starter", price: 19, period: "month", url: "/register",
    desc: "Perfect for solo operators and small product lines.",
    features: [
      "3 active goals",
      "Up to 10 products",
      "5 team members, role-based access",
      "Per-product cost & margin tracking",
      "Custom extra fields & formulas",
      "Analytics dashboard & goal charts",
      "API access",
      "Email support",
    ],
    cta: "Start Free Trial", highlight: false,
  },
  {
    name: "Growth", price: 49, period: "month", url: "/register",
    desc: "The most popular plan for growing businesses.",
    badge: "Most Popular",
    features: [
      "Everything in Starter",
      "15 active goals",
      "Unlimited products",
      "25 team members",
      "CSV export — last 6 months",
      "Priority email support",
    ],
    cta: "Start Free Trial", highlight: true,
  },
  {
    name: "Scale", price: 99, period: "month", url: "/contact",
    desc: "For established businesses with multiple teams.",
    features: [
      "Everything in Growth",
      "Unlimited goals",
      "Unlimited products",
      "Unlimited team members",
      "CSV export — full history",
      "Priority support",
    ],
    cta: "Contact Sales", highlight: false,
  },
];

// ── Comparison table rows ────────────────────────────────────────
// true → ✓ ·  false → —  ·  string → shown as text
const COMPARE = [
  { label: "Active goals",                     starter: "3",     growth: "15",            scale: "Unlimited" },
  { label: "Products",                         starter: "10",    growth: "Unlimited",     scale: "Unlimited" },
  { label: "Team members",                     starter: "5",     growth: "25",            scale: "Unlimited" },
  { label: "Role-based access & presence",     starter: true,    growth: true,            scale: true },
  { label: "Per-product cost & margin tracking", starter: true,  growth: true,            scale: true },
  { label: "Custom extra fields & formulas",   starter: true,    growth: true,            scale: true },
  { label: "Analytics dashboard & goal charts",starter: true,    growth: true,            scale: true },
  { label: "API access",                       starter: true,    growth: true,            scale: true },
  { label: "CSV export",                       starter: false,   growth: "Last 6 months", scale: "Full history" },
  { label: "Support",                          starter: "Email", growth: "Priority email",scale: "Priority" },
];

// ── Billing-focused FAQ ──────────────────────────────────────────
const PRICING_FAQS = [
  {
    q: "Is there a free trial, and do I need a card?",
    a: "Yes — every plan starts with a 14-day free trial, and no payment card is required to begin. You only enter payment details when you choose to subscribe.",
  },
  {
    q: "Can I change or cancel my plan later?",
    a: "Anytime, from your billing page. Upgrades and downgrades take effect for your next period, and if you cancel you keep full access until the end of the period you've paid for.",
  },
  {
    q: "What's your refund policy?",
    a: "Because of the free trial, subscription fees are generally non-refundable, but you can cancel anytime and keep access until your period ends. Genuine billing errors are always refunded — see our Refund Policy for the details.",
  },
  {
    q: "How are payments processed?",
    a: "Securely through Paddle, our Merchant of Record. Paddle handles the checkout, payment, and any applicable sales tax or VAT, and appears on your statement. We never store your card details.",
  },
  {
    q: "Which payment methods can I use?",
    a: "Major credit and debit cards, plus the other methods Paddle supports in your region. Prices are shown in US Dollars; any local taxes are calculated at checkout.",
  },
  {
    q: "What happens to my data if my plan ends?",
    a: "Your data isn't deleted — it stays stored in your account. Dashboard access and CSV export pause when your plan or trial ends and resume the moment you re-subscribe.",
  },
];

// ── Comparison cell renderer ─────────────────────────────────────
const Cell = ({ v }) => {
  if (v === true)  return <span className="pr-cmp__check">✓</span>;
  if (v === false) return <span className="pr-cmp__no">—</span>;
  return <span>{v}</span>;
};

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [open, setOpen]     = useState(null);
  const [gridRef, gridVis]  = useReveal();
  const [cmpRef, cmpVis]    = useReveal();
  const [faqRef, faqVis]    = useReveal();
  const [ctaRef, ctaVis]    = useReveal();

  const monthly = (p) => (annual ? Math.round(p * 0.8) : p);   // same logic as landing
  const yearly  = (p) => Math.round(p * 0.8) * 12;             // clean annual total

  return (
    <div className="lp-root">
      {/* Self-contained styles for the comparison table only */}
      <style>{`
        .pr-cmp { margin: 8px 0 8px; overflow-x: auto; }
        .pr-cmp__table { width: 100%; min-width: 640px; border-collapse: collapse; color: inherit; }
        .pr-cmp__table th, .pr-cmp__table td {
          padding: 15px 18px; text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.10); font-size: 0.95rem;
        }
        .pr-cmp__table thead th { font-size: 1.05rem; font-weight: 700; border-bottom-width: 2px; }
        .pr-cmp__table th:first-child, .pr-cmp__table td:first-child {
          text-align: left; font-weight: 500; white-space: nowrap;
        }
        .pr-cmp__sub { display: block; font-size: 0.78rem; font-weight: 500; opacity: 0.6; margin-top: 2px; }
        .pr-cmp__pop { color: #ffb100; }
        .pr-cmp__badge {
          display: inline-block; margin-left: 8px; font-size: 0.62rem; letter-spacing: .03em;
          background: #ffb100; color: #011626; padding: 2px 8px; border-radius: 999px;
          font-weight: 700; vertical-align: middle;
        }
        .pr-cmp__check { color: #ffb100; font-weight: 700; }
        .pr-cmp__no { opacity: 0.35; }
        .pr-cmp__row:hover td { background: rgba(255,255,255,0.03); }
        .pr-trust { display: flex; flex-wrap: wrap; gap: 10px 28px; justify-content: center; margin-top: 26px; }
        .pr-trust span { font-size: 0.9rem; opacity: 0.85; }
        .pr-trust b { color: #ffb100; margin-right: 6px; }
      `}</style>

      <main>

        {/* ── Pricing header + cards (reuses your lp- pricing styles) ── */}
        <section className="lp-pricing" id="pricing" style={{ paddingTop: "120px" }}>
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-eyebrow">Pricing</span>
              <h2 className="lp-section-title">Simple pricing, no surprises</h2>
              <p className="lp-section-sub">
                Start free for 14 days — no card required. Every plan includes
                full cost and margin tracking; bigger plans just raise the limits.
              </p>

              {/* Monthly / Annual toggle */}
              <div className="lp-pricing__toggle">
                <span className={!annual ? "lp-toggle-active" : ""}>Monthly</span>
                <button
                  className={`lp-toggle-switch ${annual ? "lp-toggle-switch--on" : ""}`}
                  onClick={() => setAnnual((p) => !p)}
                  aria-label="Toggle annual pricing"
                >
                  <span className="lp-toggle-knob" />
                </button>
                <span className={annual ? "lp-toggle-active" : ""}>
                  Annual <span className="lp-save-badge">Save 20%</span>
                </span>
              </div>
            </div>

            <div className={`lp-pricing__grid ${gridVis ? "lp-reveal" : ""}`} ref={gridRef}>
              {PLANS.map((plan, i) => (
                <div
                  className={`lp-plan ${plan.highlight ? "lp-plan--highlight" : ""}`}
                  key={plan.name}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {plan.badge && <div className="lp-plan__badge">{plan.badge}</div>}
                  <div className="lp-plan__header">
                    <h3 className="lp-plan__name">{plan.name}</h3>
                    <div className="lp-plan__price">
                      <span className="lp-plan__currency">$</span>
                      <span className="lp-plan__amount">{monthly(plan.price)}</span>
                      <span className="lp-plan__period">/ {plan.period}</span>
                    </div>
                    <p className="lp-plan__desc">
                      {annual ? `Billed $${yearly(plan.price)}/year` : plan.desc}
                    </p>
                  </div>
                  <ul className="lp-plan__features">
                    {plan.features.map((f) => (
                      <li key={f}><span className="lp-plan__check">✓</span>{f}</li>
                    ))}
                  </ul>
                  <a
                    href={plan.url}
                    className={`lp-btn lp-btn--block ${plan.highlight ? "" : "lp-btn--outline"}`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>

            {/* Trust strip */}
            <div className="pr-trust">
              <span><b>✓</b>14-day free trial</span>
              <span><b>✓</b>No card required to start</span>
              <span><b>✓</b>Cancel anytime</span>
              <span><b>✓</b>Secure checkout by Paddle</span>
            </div>
          </div>
        </section>

        {/* ── Comparison table ──────────────────────────────────── */}
        <section className="lp-features">
          <div className="lp-container">
            <div className="lp-section-header" ref={cmpRef}>
              <span className="lp-eyebrow">Compare Plans</span>
              <h2 className="lp-section-title">Everything side by side</h2>
            </div>

            <div className={`pr-cmp ${cmpVis ? "lp-reveal" : ""}`}>
              <table className="pr-cmp__table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Starter<span className="pr-cmp__sub">${monthly(19)}/mo</span></th>
                    <th className="pr-cmp__pop">
                      Growth
                      <span className="pr-cmp__badge">Popular</span>
                      <span className="pr-cmp__sub">${monthly(49)}/mo</span>
                    </th>
                    <th>Scale<span className="pr-cmp__sub">${monthly(99)}/mo</span></th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr className="pr-cmp__row" key={row.label}>
                      <td>{row.label}</td>
                      <td><Cell v={row.starter} /></td>
                      <td><Cell v={row.growth} /></td>
                      <td><Cell v={row.scale} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Billing FAQ (reuses your lp-faq accordion) ─────────── */}
        <section className="lp-faq" id="pricing-faq">
          <div className="lp-container lp-faq__inner">
            <div className="lp-section-header" ref={faqRef}>
              <span className="lp-eyebrow">Billing FAQ</span>
              <h2 className="lp-section-title">Questions about pricing</h2>
            </div>
            <div className={`lp-faq__list ${faqVis ? "lp-reveal" : ""}`}>
              {PRICING_FAQS.map((item, i) => (
                <div className={`lp-faq__item ${open === i ? "lp-faq__item--open" : ""}`} key={i}>
                  <button className="lp-faq__question" onClick={() => setOpen(open === i ? null : i)}>
                    {item.q}
                    <span className="lp-faq__icon">{open === i ? "−" : "+"}</span>
                  </button>
                  <div className="lp-faq__answer"><p>{item.a}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA (reuses your lp-finalcta) ────────────────── */}
        <section className="lp-finalcta">
          <div className={`lp-container lp-finalcta__inner ${ctaVis ? "lp-reveal" : ""}`} ref={ctaRef}>
            <div className="lp-finalcta__glow" />
            <span className="lp-eyebrow">Get Started</span>
            <h2 className="lp-finalcta__title">
              Try every feature free<br />
              <span className="lp-accent">for 14 days.</span>
            </h2>
            <p className="lp-finalcta__sub">No card required. Cancel anytime. Set up in under 10 minutes.</p>
            <a href="/register" className="lp-btn lp-btn--lg lp-btn--light">Create Free Account</a>
          </div>
        </section>

      </main>
    </div>
  );
}