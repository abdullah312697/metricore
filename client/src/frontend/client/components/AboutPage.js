import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../../style/AboutPage.css";

// ── Intersection Observer reveal hook ────────────────────────────
const useReveal = (threshold = 0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

// ════════════════════════════════════════════════════════════════
// NAV (shared brand nav — import your real one here)
// ════════════════════════════════════════════════════════════════
// const Nav = () => {
//   const [scrolled, setScrolled] = useState(false);
//   useEffect(() => {
//     const fn = () => setScrolled(window.scrollY > 40);
//     window.addEventListener("scroll", fn);
//     return () => window.removeEventListener("scroll", fn);
//   }, []);
//   return (
//     <nav className={`ab-nav ${scrolled ? "ab-nav--scrolled" : ""}`}>
//       <div className="ab-nav__inner">
//         <Link to="/" className="ab-nav__logo">
//           <span className="ab-logo__mark">M</span>
//           <span className="ab-logo__name">MetriCore</span>
//         </Link>
//         <div className="ab-nav__links">
//           <Link to="/#features">Features</Link>
//           <Link to="/#pricing">Pricing</Link>
//           <Link to="/about" className="ab-nav__active">About</Link>
//         </div>
//         <Link to="/signup" className="ab-btn ab-btn--sm">Start Free</Link>
//       </div>
//     </nav>
//   );
// };

// ════════════════════════════════════════════════════════════════
// HERO — origin statement, not a standard banner
// ════════════════════════════════════════════════════════════════
const Hero = () => (
  <section className="ab-hero">
    <div className="ab-hero__grid-bg" />
    <div className="ab-container ab-hero__inner">
      <div className="ab-hero__founded">
        <span className="ab-mono">FOUNDED</span>
        <span className="ab-hero__year">2022</span>
        <span className="ab-mono">DHAKA, BANGLADESH</span>
      </div>
      <div className="ab-hero__copy">
        <span className="ab-eyebrow">About MetriCore</span>
        <h1 className="ab-hero__headline">
          Built for the business owner<br />
          who knows their sales<br />
          but not their <span className="ab-amber">real profit.</span>
        </h1>
      </div>
      <p className="ab-hero__truth">
        Most businesses have a revenue number. Very few have a clear picture
        of what it cost per product, per day, to generate it. MetriCore was
        built specifically to close that gap — not with another spreadsheet,
        but with a system that does the work automatically.
      </p>
    </div>
    <div className="ab-hero__rule" />
  </section>
);

// ════════════════════════════════════════════════════════════════
// THE PROBLEM WE SAW
// ════════════════════════════════════════════════════════════════
const ProblemSection = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="ab-problem">
      <div className="ab-container">
        <div className="ab-problem__inner" ref={ref}>
          <div className={`ab-problem__text ${visible ? "ab-fade-up" : ""}`}>
            <span className="ab-eyebrow">Why We Exist</span>
            <h2 className="ab-section-title">
              The problem was hiding<br />in plain sight.
            </h2>
            <p>
              We watched a friend run a product business for two years. She
              celebrated her best sales month, then discovered it was her worst
              profit month — her delivery costs had quietly doubled, her ad
              spend had crept up, and packaging was eating margin she hadn't
              measured since she set it.
            </p>
            <p>
              The data existed. It sat in separate invoices, separate sheets,
              separate dashboards — never assembled in one place, never broken
              down per product, never updated automatically every day.
            </p>
            <p className="ab-problem__punchline">
              That experience became MetriCore's reason for existing.
            </p>
          </div>

          <div className={`ab-problem__compare ${visible ? "ab-fade-up ab-fade-up--delay" : ""}`}>
            {/* Before card */}
            <div className="ab-compare-card ab-compare-card--before">
              <div className="ab-compare-card__label ab-compare-card__label--before">
                Before MetriCore
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--red" />
                <span>Revenue tracked in one sheet</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--red" />
                <span>Ad costs logged separately</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--red" />
                <span>Delivery cost estimated monthly</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--red" />
                <span>Profit calculated at month-end</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--red" />
                <span>Goal progress: unknown</span>
              </div>
              <div className="ab-compare-outcome ab-compare-outcome--bad">
                Margin eroded. Nobody noticed until it was gone.
              </div>
            </div>

            {/* After card */}
            <div className="ab-compare-card ab-compare-card--after">
              <div className="ab-compare-card__label ab-compare-card__label--after">
                With MetriCore
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--green" />
                <span>All costs per product, per day</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--green" />
                <span>Real-time profit calculation</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--green" />
                <span>Delivery cost tracked per sale</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--green" />
                <span>Goal achievement visible daily</span>
              </div>
              <div className="ab-compare-row">
                <span className="ab-compare-row__dot ab-compare-row__dot--green" />
                <span>Custom fields for any cost type</span>
              </div>
              <div className="ab-compare-outcome ab-compare-outcome--good">
                Margin protected. Decisions made with real data.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// TIMELINE
// ════════════════════════════════════════════════════════════════
const MILESTONES = [
  {
    year:  "2022",
    month: "Mar",
    title: "The spreadsheet that started it all",
    desc:  "Our founder began manually tracking daily product costs for a small e-commerce business in Dhaka. Within three months, margins improved by 18% — purely from visibility.",
  },
  {
    year:  "2023",
    month: "Jan",
    title: "First version built for three businesses",
    desc:  "A working prototype shipped to three early test businesses. All three stayed. The feedback: they didn't want fewer features, they wanted more cost fields and better charts.",
  },
  {
    year:  "2024",
    month: "Feb",
    title: "Public launch with goal-based tracking",
    desc:  "MetriCore launched publicly with the core goal system — multiple products under one goal, daily targets, achievement tracking. 200 businesses signed up in the first month.",
  },
  {
    year:  "2025",
    month: "Jun",
    title: "Custom fields, real-time presence, charts",
    desc:  "The platform gained its most-requested features: custom calculated fields, real-time employee online status, and full analytics charts. The system grew into what it is today.",
  },
];

const Timeline = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="ab-timeline">
      <div className="ab-container">
        <div className="ab-section-header">
          <span className="ab-eyebrow">Our Journey</span>
          <h2 className="ab-section-title">How we got here</h2>
        </div>
        <div className={`ab-timeline__track ${visible ? "ab-reveal" : ""}`} ref={ref}>
          <div className="ab-timeline__line" />
          {MILESTONES.map((m, i) => (
            <div
              className="ab-milestone"
              key={m.year + m.month}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="ab-milestone__dot" />
              <div className="ab-milestone__date">
                <span className="ab-milestone__month">{m.month}</span>
                <span className="ab-milestone__year">{m.year}</span>
              </div>
              <div className="ab-milestone__content">
                <h3 className="ab-milestone__title">{m.title}</h3>
                <p  className="ab-milestone__desc">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// VALUES — concrete behaviors, not buzzwords
// ════════════════════════════════════════════════════════════════
const VALUES = [
  {
    label: "We build for the operator,\nnot the analyst.",
    desc:  "Our users should not need a finance degree or a data team. If understanding your numbers requires an expert, the product has failed.",
  },
  {
    label: "Yesterday's data is\nalready wrong.",
    desc:  "Real-time is not a premium feature. A business owner making a decision at 9 AM needs last night's numbers, not last month's report.",
  },
  {
    label: "Flexibility is our\nresponsibility.",
    desc:  "No two businesses track costs exactly the same way. Adding a custom field should take 30 seconds, not a support ticket and a developer.",
  },
  {
    label: "Honesty over\noptimism.",
    desc:  "If your goal is behind, the system should say so clearly. A dashboard that only shows good news is a dashboard that is hiding the truth.",
  },
];

const ValuesSection = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="ab-values">
      <div className="ab-container">
        <div className="ab-section-header">
          <span className="ab-eyebrow">What We Actually Believe</span>
          <h2 className="ab-section-title">
            Values are only useful if they<br />
            <span className="ab-amber">change how you build.</span>
          </h2>
        </div>
        <div
          className={`ab-values__grid ${visible ? "ab-reveal" : ""}`}
          ref={ref}
        >
          {VALUES.map((v, i) => (
            <div
              className="ab-value-card"
              key={i}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="ab-value-card__num ab-mono">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="ab-value-card__label">{v.label}</h3>
              <p  className="ab-value-card__desc">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// TEAM
// ════════════════════════════════════════════════════════════════
const TEAM = [
  { initials: "RK", name: "Rashid K.",  role: "Founder & CEO",       bio: "Former operations consultant. Spent 6 years watching product businesses lose margin to invisible costs." },
  { initials: "AN", name: "Ayesha N.", role: "Head of Product",      bio: "Previously built analytics tools at two fintech startups. Obsessed with making complex data feel obvious." },
  { initials: "TM", name: "Tanvir M.", role: "Lead Engineer",        bio: "Full-stack engineer with a background in real-time systems. Architect of MetriCore's aggregation pipeline." },
  { initials: "PS", name: "Priya S.",  role: "Customer Success",     bio: "Runs onboarding for every new business. Has personally helped 300+ operators set up their first goal." },
];

const TeamSection = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="ab-team">
      <div className="ab-container">
        <div className="ab-section-header">
          <span className="ab-eyebrow">The People</span>
          <h2 className="ab-section-title">Small team. Clear focus.</h2>
          <p className="ab-section-sub">
            We are a small, remote team. Every person here has used MetriCore
            for their own side business or helped someone who has.
          </p>
        </div>
        <div className={`ab-team__grid ${visible ? "ab-reveal" : ""}`} ref={ref}>
          {TEAM.map((member, i) => (
            <div
              className="ab-team-card"
              key={member.name}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="ab-team-card__avatar">{member.initials}</div>
              <h3 className="ab-team-card__name">{member.name}</h3>
              <div className="ab-team-card__role ab-mono">{member.role}</div>
              <p className="ab-team-card__bio">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// BY THE NUMBERS
// ════════════════════════════════════════════════════════════════
const NUMBERS = [
  { value: "2022",   label: "Year founded"            },
  { value: "2,800+", label: "Goals tracked"           },
  { value: "14",     label: "Countries active in"     },
  { value: "98%",    label: "Annual retention rate"   },
];

const ByTheNumbers = () => {
  const [ref, visible] = useReveal(0.3);
  return (
    <section className="ab-numbers" ref={ref}>
      <div className="ab-container">
        <div className="ab-section-header">
          <span className="ab-eyebrow">By the Numbers</span>
          <h2 className="ab-section-title">Small but growing — deliberately.</h2>
        </div>
        <div className={`ab-numbers__grid ${visible ? "ab-reveal" : ""}`}>
          {NUMBERS.map((n, i) => (
            <div className="ab-number-item" key={n.label} style={{ animationDelay: `${i * 100}ms` }}>
              <div className="ab-number-item__val">{n.value}</div>
              <div className="ab-number-item__label">{n.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════
// CLOSING CTA
// ════════════════════════════════════════════════════════════════
const ClosingCTA = () => {
  const [ref, visible] = useReveal();
  return (
    <section className="ab-cta">
      <div className={`ab-container ab-cta__inner ${visible ? "ab-fade-up" : ""}`} ref={ref}>
        <div className="ab-cta__glow" />
        <span className="ab-eyebrow">Ready?</span>
        <h2 className="ab-cta__title">
          See what your products<br />
          <span className="ab-amber">actually cost you.</span>
        </h2>
        <p className="ab-cta__sub">
          Free for 14 days. No card. No spreadsheet required.
        </p>
        <div className="ab-cta__actions">
          <Link to="/signup" className="ab-btn ab-btn--lg">
            Start Free Trial
          </Link>
          <Link to="/#features" className="ab-btn ab-btn--ghost ab-btn--lg">
            See Features
          </Link>
        </div>
      </div>
    </section>
  );
};


// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
export default function AboutPage() {
  return (
    <div className="ab-root">
      <main>
        <Hero />
        <ProblemSection />
        <Timeline />
        <ValuesSection />
        <TeamSection />
        <ByTheNumbers />
        <ClosingCTA />
      </main>
    </div>
  );
}