import { useState, useEffect, useRef } from "react";
import "../../../style/LandingPage.css";

// ── Intersection Observer hook for scroll reveals ────────────────
const useReveal = (threshold = 0.15) => {
  const ref  = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el  = ref.current;
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

// ── Animated counter hook ────────────────────────────────────────
const useCounter = (target, duration = 1800, active = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start     = 0;
    const step    = target / (duration / 16);
    const timer   = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return count;
};

// ════════════════════════════════════════════════════════════════
// HERO
// ════════════════════════════════════════════════════════════════
const DashboardMockup = () => (
  <div className="lp-mockup">
    <div className="lp-mockup__bar">
      <span /><span /><span />
      <span className="lp-mockup__title">MetriCore · Dashboard</span>
    </div>
    <div className="lp-mockup__body">
      {/* Stat cards row */}
      <div className="lp-mockup__stats">
        {[
          { label: "Revenue", val: "$48,200", up: true  },
          { label: "Profit",  val: "$12,840", up: true  },
          { label: "Units",   val: "1,340",   up: false },
          { label: "Goals",   val: "7 / 10",  up: true  },
        ].map(s => (
          <div className="lp-mockup__stat" key={s.label}>
            <span className="lp-mockup__stat-label">{s.label}</span>
            <span className="lp-mockup__stat-val">{s.val}</span>
            <span className={`lp-mockup__stat-trend ${s.up ? "up" : "down"}`}>
              {s.up ? "▲" : "▼"}
            </span>
          </div>
        ))}
      </div>

      {/* Fake chart */}
      <div className="lp-mockup__chart-wrap">
        <span className="lp-mockup__chart-label">Revenue · Last 30 days</span>
        <svg className="lp-mockup__chart" viewBox="0 0 400 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#ffb100" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffb100" stopOpacity="0"   />
            </linearGradient>
          </defs>
          <path
            d="M0,60 C30,55 50,45 80,40 C110,35 130,50 160,30 C190,10 210,20 240,15 C270,10 290,25 320,10 C350,0 370,8 400,5"
            fill="none" stroke="#ffb100" strokeWidth="2"
          />
          <path
            d="M0,60 C30,55 50,45 80,40 C110,35 130,50 160,30 C190,10 210,20 240,15 C270,10 290,25 320,10 C350,0 370,8 400,5 L400,80 L0,80 Z"
            fill="url(#chartGrad)"
          />
        </svg>
      </div>

      {/* Product rows */}
      <div className="lp-mockup__products">
        {[
          { name: "Product Alpha", cost: "$2,400", profit: "$840",  pct: 72  },
          { name: "Product Beta",  cost: "$1,200", profit: "$420",  pct: 55  },
          { name: "Product Gamma", cost: "$3,100", profit: "$1,240", pct: 89 },
        ].map(p => (
          <div className="lp-mockup__product-row" key={p.name}>
            <span className="lp-mockup__product-name">{p.name}</span>
            <span className="lp-mockup__product-cost">{p.cost}</span>
            <span className="lp-mockup__product-profit">{p.profit}</span>
            <div className="lp-mockup__product-bar-wrap">
              <div className="lp-mockup__product-bar" style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Hero = () => (
  <section className="lp-hero" id="hero">
    <div className="lp-hero__bg-grid" />
    <div className="lp-container lp-hero__inner">
      <div className="lp-hero__copy">
        <div className="lp-hero__eyebrow">Product Cost & Margin Tracking</div>
        <h1 className="lp-hero__headline">
          Every cost tracked.<br />
          <span className="lp-accent">Every margin clear.</span>
        </h1>
        <p className="lp-hero__sub">
          MetriCore gives product businesses a real-time lens on costs,
          daily revenue, and goal progress — so you stop guessing your
          margins and start growing them.
        </p>
        <div className="lp-hero__ctas">
          <a href="/register" className="lp-btn lp-btn--lg">Start Free — No Card Needed</a>
          <a href="#howitworks" className="lp-btn lp-btn--ghost lp-btn--lg">See How It Works</a>
        </div>
        <p className="lp-hero__footnote">Free 14-day trial · Cancel anytime · Setup in under 10 minutes</p>
      </div>

      <div className="lp-hero__visual">
        <DashboardMockup />
      </div>
    </div>
  </section>
);

// ════════════════════════════════════════════════════════════════
// STATS TICKER
// ════════════════════════════════════════════════════════════════
// const STATS = [
//   { value: 2800,  suffix: "+", label: "Business Goals Tracked"   },
//   { value: 14500, suffix: "+", label: "Products Monitored"       },
//   { value: 98,    suffix: "%", label: "Customer Satisfaction"    },
//   { value: 42,    suffix: "M", label: "Revenue Processed ($)"    },
// ];

const StatsItem = ({ stat, index, visible }) => {
  const count = useCounter(
    stat.value,
    1600 + index * 200,
    visible
  );

  return (
    <div className="lp-stats__item">
      <div className="lp-stats__number">
        {count.toLocaleString()}
        {stat.suffix}
      </div>

      <div className="lp-stats__label">
        {stat.label}
      </div>
    </div>
  );
};

// const StatsTicker = () => {
//   const [ref, visible] = useReveal(0.3);

//   return (
//     <section className="lp-stats" ref={ref}>
//       <div className="lp-container lp-stats__inner">
//         {STATS.map((stat, index) => (
//           <StatsItem
//             key={stat.label}
//             stat={stat}
//             index={index}
//             visible={visible}
//           />
//         ))}
//       </div>
//     </section>
//   );
// };
// ════════════════════════════════════════════════════════════════
// PAIN POINTS
// ════════════════════════════════════════════════════════════════
const PAINS = [
  {
    icon: "📊",
    before: "Scattered spreadsheets with no single source of truth",
    after:  "All product costs and revenues in one real-time dashboard",
  },
  {
    icon: "🎯",
    before: "Setting goals with no way to track daily progress",
    after:  "Goal-based tracking with daily targets and achievement charts",
  },
  {
    icon: "💸",
    before: "Losing margin because hidden costs go unnoticed",
    after:  "Per-product cost breakdown: ads, delivery, packaging and more",
  },
];

const PainPoints = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="lp-pain" id="problem">
      <div className="lp-container">
        <div className="lp-section-header" ref={ref}>
          <span className="lp-eyebrow">The Problem</span>
          <h2 className="lp-section-title">
            Most businesses track revenue.<br />
            Few track <span className="lp-accent">what it actually cost</span> to make it.
          </h2>
        </div>
        <div className={`lp-pain__grid ${visible ? "lp-reveal" : ""}`}>
          {PAINS.map((p, i) => (
            <div className="lp-pain__card" key={i} style={{ animationDelay: `${i * 120}ms` }}>
              <div className="lp-pain__icon">{p.icon}</div>
              <div className="lp-pain__before">
                <span className="lp-pain__tag lp-pain__tag--before">Before</span>
                <p>{p.before}</p>
              </div>
              <div className="lp-pain__arrow">→</div>
              <div className="lp-pain__after">
                <span className="lp-pain__tag lp-pain__tag--after">After</span>
                <p>{p.after}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// FEATURES
// ════════════════════════════════════════════════════════════════
const FEATURES = [
  {
    icon: "⚡",
    title: "Goal-Based Tracking",
    desc: "Organise products under business goals. Set targets, track daily progress, and see exactly how far you are from each milestone.",
    tag: "Core",
  },
  {
    icon: "📦",
    title: "Per-Product Cost Breakdown",
    desc: "Track ad cost, delivery, packaging, buying cost, and shipping per product — every day. Know your real margin, not just revenue.",
    tag: "Core",
  },
  {
    icon: "📈",
    title: "Analytics & Charts",
    desc: "See revenue, profit, and units sold across any date range, plus a live achievement chart for every goal. View by day, month, or a custom window.",
    tag: "Analytics",
  },
  {
    icon: "🧩",
    title: "Custom Extra Fields",
    desc: "Every business is different. Add your own calculated fields — tax, discounts, commissions — with your own formula using existing data.",
    tag: "Flexible",
  },
  {
    icon: "👥",
    title: "Team & Role-Based Access",
    desc: "Add your team and control what each person can do — see financials, manage products and goals, or view only. See who's online right now with real-time presence across all sessions.",
    tag: "Team",
  },
  {
    icon: "🔒",
    title: "Target Lock System",
    desc: "Lock daily targets to prevent accidental edits. Unlock only when you need to adjust — your historical data stays intact.",
    tag: "Control",
  },
];

const Features = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="lp-features" id="features">
      <div className="lp-container">
        <div className="lp-section-header" ref={ref}>
          <span className="lp-eyebrow">What You Get</span>
          <h2 className="lp-section-title">
            Built for businesses that sell <span className="lp-accent">real products</span>
          </h2>
          <p className="lp-section-sub">
            Not a generic finance tool. MetriCore is designed specifically
            for product-based businesses that need daily cost clarity.
          </p>
        </div>
        <div className={`lp-features__grid ${visible ? "lp-reveal" : ""}`}>
          {FEATURES.map((f, i) => (
            <div
              className="lp-feature-card"
              key={f.title}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="lp-feature-card__top">
                <span className="lp-feature-card__icon">{f.icon}</span>
                <span className="lp-feature-card__tag">{f.tag}</span>
              </div>
              <h3 className="lp-feature-card__title">{f.title}</h3>
              <p  className="lp-feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// HOW IT WORKS
// ════════════════════════════════════════════════════════════════
const STEPS = [
  {
    num:   "01",
    title: "Set Your Goals",
    desc:  "Create business goals with start dates, end dates, and revenue targets. Add the products you want to track under each goal.",
  },
  {
    num:   "02",
    title: "Log Daily Costs",
    desc:  "Each day a fresh record is created automatically. Enter your ad spend, delivery costs, units sold, and returns — takes under 2 minutes.",
  },
  {
    num:   "03",
    title: "Read the Numbers",
    desc:  "Your dashboard calculates profit, cost-per-sale, and target achievement in real time. Filter by day, week, month or custom range.",
  },
];

const HowItWorks = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="lp-how" id="howitworks">
      <div className="lp-container">
        <div className="lp-section-header" ref={ref}>
          <span className="lp-eyebrow">How It Works</span>
          <h2 className="lp-section-title">Up and running in minutes</h2>
        </div>
        <div className={`lp-how__steps ${visible ? "lp-reveal" : ""}`}>
          {STEPS.map((s, i) => (
            <div className="lp-how__step" key={s.num} style={{ animationDelay: `${i * 150}ms` }}>
              <div className="lp-how__num">{s.num}</div>
              <div className="lp-how__connector" />
              <h3 className="lp-how__title">{s.title}</h3>
              <p  className="lp-how__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// PRICING
// ════════════════════════════════════════════════════════════════
const PLANS = [
  {
    name:     "Starter",
    price:    19,
    period:   "month",
    url:'/register',
    desc:     "Perfect for solo operators and small product lines.",
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
    cta:      "Start Free Trial",
    highlight: false,
  },
  {
    name:     "Growth",
    price:    49,
    period:   "month",
    url:'/register',
    desc:     "The most popular plan for growing businesses.",
    badge:    "Most Popular",
    features: [
      "Everything in Starter",
      "15 active goals",
      "Unlimited products",
      "25 team members",
      "CSV export — last 6 months",
      "Priority email support",
    ],
    cta:      "Start Free Trial",
    highlight: true,
  },
  {
    name:     "Scale",
    price:    99,
    period:   "month",
    url:'/contact',
    desc:     "For established businesses with multiple teams.",
    features: [
      "Everything in Growth",
      "Unlimited goals",
      "Unlimited products",
      "Unlimited team members",
      "CSV export — full history",
      "Priority support",
    ],
    cta:      "Contact Sales",
    highlight: false,
  },
];

const Pricing = () => {
  const [annual, setAnnual] = useState(false);
  const [ref, visible]      = useReveal();

  return (
    <section className="lp-pricing" id="pricing">
      <div className="lp-container">
        <div className="lp-section-header" ref={ref}>
          <span className="lp-eyebrow">Pricing</span>
          <h2 className="lp-section-title">
            Simple pricing, no surprises
          </h2>
          {/* Toggle */}
          <div className="lp-pricing__toggle">
            <span className={!annual ? "lp-toggle-active" : ""}>Monthly</span>
            <button
              className={`lp-toggle-switch ${annual ? "lp-toggle-switch--on" : ""}`}
              onClick={() => setAnnual(p => !p)}
              aria-label="Toggle annual pricing"
            >
              <span className="lp-toggle-knob" />
            </button>
            <span className={annual ? "lp-toggle-active" : ""}>
              Annual <span className="lp-save-badge">Save 20%</span>
            </span>
          </div>
        </div>

        <div className={`lp-pricing__grid ${visible ? "lp-reveal" : ""}`}>
          {PLANS.map((plan, i) => (
            <div
              className={`lp-plan ${plan.highlight ? "lp-plan--highlight" : ""}`}
              key={plan.name}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {plan.badge && (
                <div className="lp-plan__badge">{plan.badge}</div>
              )}
              <div className="lp-plan__header">
                <h3 className="lp-plan__name">{plan.name}</h3>
                <div className="lp-plan__price">
                  <span className="lp-plan__currency">$</span>
                  <span className="lp-plan__amount">
                    {annual ? Math.round(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="lp-plan__period">/ {plan.period}</span>
                </div>

                {/* When annual, show the full yearly price below the monthly rate */}
                {annual && (
                  <span
                    className="lp-plan__billed"
                    style={{ display: "block", fontSize: "0.85rem", opacity: 0.65, marginTop: "6px" }}
                  >
                    billed ${Math.round(plan.price * 0.8) * 12}/year
                  </span>
                )}

                <p className="lp-plan__desc">{plan.desc}</p>
              </div>
              <ul className="lp-plan__features">
                {plan.features.map(f => (
                  <li key={f}>
                    <span className="lp-plan__check">✓</span>
                    {f}
                  </li>
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
        <p className="lp-pricing__note">
          All plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════════════
const FAQS = [
  {
    q: "Do I need any technical skills to use MetriCore?",
    a: "None at all. If you can fill in a spreadsheet, you can use MetriCore. Setup takes under 10 minutes and we have onboarding guides for every step.",
  },
  {
    q: "Can one product belong to multiple goals?",
    a: "Yes. A product can be tracked under several goals at once. Its daily cost and sales records are stored per product, so the same product's numbers stay consistent across every goal it belongs to.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data isn't deleted — it stays stored in your account. Access to the dashboard and CSV export pauses when your plan or trial ends and resumes the moment you re-subscribe, so we recommend exporting anything you need while your plan is active.",
  },
  {
    q: "How does the custom extra fields system work?",
    a: "You define a field name (e.g. 'Tax') and optionally a formula that calculates it from existing data (e.g. 10% of Sold Amount). It then appears on every product record automatically.",
  },
  {
    q: "Can I export my data, and how far back?",
    a: "You can view your full history in the dashboard on every plan. CSV export is available on Growth (the last 6 months) and Scale (full history, up to 6 months per file). Starter doesn't include CSV export.",
  },
  {
    q: "Can multiple employees use the same account?",
    a: "Yes. Each plan includes a team member allowance (5 on Starter, 25 on Growth, unlimited on Scale). Employees log in with their own credentials, you control what each person can see and do with role-based access, and you can see who's online in real time.",
  },
];

const FAQ = () => {
  const [open, setOpen]    = useState(null);
  const [ref, visible]     = useReveal();

  return (
    <section className="lp-faq" id="faq">
      <div className="lp-container lp-faq__inner">
        <div className="lp-section-header" ref={ref}>
          <span className="lp-eyebrow">FAQ</span>
          <h2 className="lp-section-title">Common questions</h2>
        </div>
        <div className={`lp-faq__list ${visible ? "lp-reveal" : ""}`}>
          {FAQS.map((item, i) => (
            <div
              className={`lp-faq__item ${open === i ? "lp-faq__item--open" : ""}`}
              key={i}
            >
              <button
                className="lp-faq__question"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {item.q}
                <span className="lp-faq__icon">{open === i ? "−" : "+"}</span>
              </button>
              <div className="lp-faq__answer">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// FINAL CTA
// ════════════════════════════════════════════════════════════════
const FinalCTA = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="lp-finalcta">
      <div className={`lp-container lp-finalcta__inner ${visible ? "lp-reveal" : ""}`} ref={ref}>
        <div className="lp-finalcta__glow" />
        <span className="lp-eyebrow">Get Started</span>
        <h2 className="lp-finalcta__title">
          Start knowing your numbers<br />
          <span className="lp-accent">from day one.</span>
        </h2>
        <p className="lp-finalcta__sub">
          Free for 14 days. No card required. Takes 10 minutes to set up.
        </p>
        <a href="/register" className="lp-btn lp-btn--lg lp-btn--light">
          Create Free Account
        </a>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function LandingPage() {
  return (
    <div className="lp-root">
      <main>
        <Hero />
        {/* <StatsTicker /> */}
        <PainPoints />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
    </div>
  );
}