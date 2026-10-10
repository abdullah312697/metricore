// ⚠️ BEFORE LAUNCH: (1) fill every [bracketed] placeholder once your US LLC is
//    registered, and (2) have this reviewed by a lawyer. This draft is written to
//    be TRUTHFUL and internally consistent with how MetriCore actually bills
//    (14-day free trial, subscriptions billed in advance via Paddle as Merchant
//    of Record) and with your Terms of Service — it is NOT legal advice.
//
// STYLING: this page reuses TermsPage.css (the same `tp-` classes), so it needs
// NO new stylesheet. Just add the route and a footer link (see chat).

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../../style/TermsPage.css";   // 👈 reuses your Terms styling

const LAST_UPDATED = "October 2026";   // set to the real date when you publish
const VERSION      = "1.0";
const EFFECTIVE    = "October 2026";   // set to the real effective date when you publish

const SECTIONS = [
  { id: "overview",     label: "Overview"                  },
  { id: "trial",        label: "Free Trial"                },
  { id: "billing",      label: "Billing & Renewal"         },
  { id: "cancellation", label: "Cancellation"              },
  { id: "refunds",      label: "Refunds"                   },
  { id: "errors",       label: "Billing Errors"            },
  { id: "processor",    label: "How Payments Are Processed" },
  { id: "contact",      label: "Contact"                   },
];

// ── Scroll-spy ───────────────────────────────────────────────────
const useActiveSection = (ids) => {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const fn = () => {
      const y = window.scrollY + 120;
      let cur = ids[0];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      });
      setActive(cur);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [ids]);
  return active;
};

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
};

// ════════════════════════════════════════════════════════════════
// REUSABLE BLOCKS (same as TermsPage)
// ════════════════════════════════════════════════════════════════
const Section = ({ id, title, children }) => (
  <section id={id} className="tp-section">
    <h2 className="tp-section__title">{title}</h2>
    <div className="tp-section__body">{children}</div>
  </section>
);

const P = ({ children }) => <p className="tp-p">{children}</p>;

const Notice = ({ type = "info", icon, children }) => (
  <div className={`tp-notice tp-notice--${type}`}>
    <span className="tp-notice__icon">{icon}</span>
    <p className="tp-notice__text">{children}</p>
  </div>
);

const BulletList = ({ items }) => (
  <ul className="tp-list">
    {items.map((item, i) => (
      <li key={i} className="tp-list__item">
        <span className="tp-list__dot" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
export default function RefundPolicyPage() {
  const ids      = SECTIONS.map((s) => s.id);
  const activeId = useActiveSection(ids);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const fn = () => { if (tocOpen) setTocOpen(false); };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [tocOpen]);

  return (
    <div className="tp-root">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="tp-hero">
        <div className="tp-hero__grid" />
        <div className="tp-container tp-hero__inner">
          <span className="tp-eyebrow">Legal · Refunds</span>
          <h1 className="tp-hero__title">Refund &amp; Cancellation Policy</h1>
          <p className="tp-hero__sub">
            Clear and simple: every plan starts with a free trial, you can cancel
            anytime, and you only ever pay for the period ahead. This page explains
            exactly how billing, cancellations, and refunds work.
          </p>
          <div className="tp-hero__meta">
            <div className="tp-meta-pill">
              <span className="tp-meta-pill__label">Version</span>
              <span className="tp-meta-pill__val">{VERSION}</span>
            </div>
            <div className="tp-meta-pill">
              <span className="tp-meta-pill__label">Last updated</span>
              <span className="tp-meta-pill__val">{LAST_UPDATED}</span>
            </div>
            <div className="tp-meta-pill">
              <span className="tp-meta-pill__label">Effective</span>
              <span className="tp-meta-pill__val">{EFFECTIVE}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile TOC ────────────────────────────────────────── */}
      <div className="tp-toc-mobile">
        <button className="tp-toc-mobile__btn" onClick={() => setTocOpen((p) => !p)}>
          <span>Contents</span>
          <span className="tp-toc-mobile__arrow">{tocOpen ? "▲" : "▼"}</span>
        </button>
        {tocOpen && (
          <div className="tp-toc-mobile__drawer">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`tp-toc-mobile__link ${activeId === s.id ? "tp-toc-mobile__link--active" : ""}`}
                onClick={() => { scrollTo(s.id); setTocOpen(false); }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="tp-container tp-body">

        {/* Sidebar */}
        <aside className="tp-sidebar">
          <div className="tp-sidebar__sticky">
            <p className="tp-sidebar__heading">Contents</p>
            <nav className="tp-toc">
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  className={`tp-toc__item ${activeId === s.id ? "tp-toc__item--active" : ""}`}
                  onClick={() => scrollTo(s.id)}
                >
                  <span className="tp-toc__num tp-mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="tp-toc__label">{s.label}</span>
                </button>
              ))}
            </nav>

            <div className="tp-sidebar__links">
              <p className="tp-sidebar__links-title">Related</p>
              <Link to="/terms" className="tp-sidebar__rel-link">Terms of Service →</Link>
              <Link to="/privacy" className="tp-sidebar__rel-link">Privacy Policy →</Link>
              <Link to="/contact" className="tp-sidebar__rel-link">Contact Us →</Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="tp-content">

          {/* 01 */}
          <Section id="overview" title="01. Overview">
            <Notice type="info" icon="💳">
              In short: every plan starts with a 14-day free trial, so you can try
              MetriCore before paying. Subscription fees are billed in advance and
              are non-refundable — but you can cancel anytime and keep access until
              the end of the period you've already paid for.
            </Notice>
            <P>
              This Refund &amp; Cancellation Policy explains how billing,
              cancellations, and refunds work for MetriCore subscriptions. It forms
              part of, and should be read alongside, our{" "}
              <Link to="/terms" className="tp-link">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="tp-link">Privacy Policy</Link>.
            </P>
          </Section>

          {/* 02 */}
          <Section id="trial" title="02. Free Trial">
            <P>
              Every MetriCore plan includes a 14-day free trial. No payment card is
              required to start, and you are not charged during the trial. The trial
              gives you access so you can decide whether MetriCore is right for your
              business before you pay anything.
            </P>
            <P>
              Because no card is taken up front, you are never charged automatically
              when a trial ends. If you choose not to subscribe, your account simply
              moves to a limited state until you pick a plan.
            </P>
          </Section>

          {/* 03 */}
          <Section id="billing" title="03. Billing & Renewal">
            <P>
              Paid subscriptions are billed in advance — monthly or annually — from
              the date your first payment is processed. Annual plans are billed
              upfront at a 20% discount compared with paying monthly.
            </P>
            <BulletList
              items={[
                "Subscriptions renew automatically at the end of each billing period unless you cancel.",
                "You are charged at the start of each period for the period ahead.",
                "Prices are shown in US Dollars and exclude any local taxes, which are calculated and collected at checkout.",
                "We will notify you by email at least 7 days before any price increase takes effect.",
              ]}
            />
          </Section>

          {/* 04 */}
          <Section id="cancellation" title="04. Cancellation">
            <Notice type="info" icon="✅">
              You can cancel at any time from your billing page. There are no
              cancellation fees, and you don't need to contact us to do it.
            </Notice>
            <P>
              When you cancel, your subscription stops renewing. You keep full access
              to all paid features until the end of the billing period you have
              already paid for, and you are not charged again.
            </P>
            <BulletList
              items={[
                "Cancellation takes effect at the end of your current billing period — not immediately.",
                "You retain access to everything on your plan until that date.",
                "After that date, your account moves to a limited state, and you can re-subscribe anytime.",
              ]}
            />
          </Section>

          {/* 05 */}
          <Section id="refunds" title="05. Refunds">
            <P>
              Because every plan includes a 14-day free trial that lets you evaluate
              MetriCore before paying, subscription fees are generally
              non-refundable. Specifically:
            </P>
            <BulletList
              items={[
                "When you cancel, we do not refund the current billing period — instead, you keep access until the end of that period.",
                "We do not refund unused time, partial periods, or time where the service was available but not used.",
                "Annual plans are non-refundable once the billing period has begun, except where a refund is required by law.",
                "If your account is terminated for a breach of our Terms of Service, no refund is issued.",
              ]}
            />
            <P>
              The main exceptions are genuine billing errors (see below) and any
              rights you may have under applicable consumer-protection law. If the
              law where you live gives you a refund right that this policy doesn't
              cover, that legal right still applies.
            </P>
          </Section>

          {/* 06 */}
          <Section id="errors" title="06. Billing Errors">
            <P>
              If you think you were charged incorrectly — for example a duplicate
              charge, a charge after you cancelled, or an amount that doesn't match
              your plan — contact us within 60 days and we'll look into it.
            </P>
            <P>
              Where we confirm a genuine billing error, we will refund the incorrect
              amount to your original payment method. Reach us at{" "}
              <a href="mailto:support@metricore.app" className="tp-link tp-mono">
                support@metricore.app
              </a>.
            </P>
          </Section>

          {/* 07 */}
          <Section id="processor" title="07. How Payments Are Processed">
            <P>
              MetriCore's payments are handled by Paddle, our Merchant of Record.
              This means Paddle — not MetriCore — is the seller of record for your
              subscription: Paddle processes your payment, calculates and handles any
              applicable sales tax or VAT, and is the entity that appears on your card
              or bank statement.
            </P>
            <Notice type="info" icon="🧾">
              On your statement, the charge will usually appear as "Paddle" or
              "paddle.net" rather than "MetriCore" — this is still your MetriCore
              subscription.
            </Notice>
            <P>
              Where a refund is approved, it is processed back to your original
              payment method through Paddle and may take a few business days to
              appear, depending on your bank. Paddle's own Buyer Terms may also give
              you certain rights in addition to this policy.
            </P>
          </Section>

          {/* 08 */}
          <Section id="contact" title="08. Contact">
            <P>
              Questions about a charge, a cancellation, or a refund request? We're
              happy to help — please include your account email and, if you have it,
              the Paddle receipt or order number.
            </P>
            <div className="tp-contact-grid">
              <div className="tp-contact-card">
                <span className="tp-contact-card__icon">📧</span>
                <h4 className="tp-contact-card__title">Billing &amp; refunds</h4>
                <a href="mailto:support@metricore.app" className="tp-link tp-mono">
                  support@metricore.app
                </a>
              </div>
              {/* <div className="tp-contact-card">
                <span className="tp-contact-card__icon">🏢</span>
                <h4 className="tp-contact-card__title">Postal</h4>
                <address className="tp-contact-card__addr">
                  [Your LLC legal name], LLC<br />
                  [Registered street address]<br />
                  [City, State ZIP], United States
                </address>
              </div> */}
            </div>
          </Section>

          {/* End rule */}
          <div className="tp-end-rule">
            <span className="tp-mono tp-end-rule__text">
              MetriCore Refund &amp; Cancellation Policy · v{VERSION} · Effective {EFFECTIVE}
            </span>
            <div className="tp-end-rule__links">
              <Link to="/terms">Terms of Service</Link>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/">Home</Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}