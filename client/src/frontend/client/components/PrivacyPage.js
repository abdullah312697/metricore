// ⚠️ BEFORE LAUNCH: (1) fill every [bracketed] placeholder with your real LLC
//    details once the company is registered, and (2) have this reviewed by a
//    lawyer or a reputable privacy-policy service. This draft is written to be
//    TRUTHFUL about how MetriCore actually handles data — it is not a
//    substitute for legal advice.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../../style/PrivacyPage.css";

// ── Last updated date ────────────────────────────────────────────
const LAST_UPDATED = "October 2026";   // set to the real date when you publish
const VERSION      = "1.0";

// ── Table of contents sections ───────────────────────────────────
const SECTIONS = [
  { id: "overview",     label: "Overview"                  },
  { id: "collect",      label: "Data We Collect"           },
  { id: "use",          label: "How We Use Your Data"      },
  { id: "store",        label: "Storage & Security"        },
  { id: "share",        label: "Who We Share Data With"    },
  { id: "retention",    label: "Data Retention"            },
  { id: "rights",       label: "Your Rights"               },
  { id: "cookies",      label: "Cookies"                   },
  { id: "children",     label: "Children's Privacy"        },
  { id: "changes",      label: "Policy Changes"            },
  { id: "contact",      label: "Contact Us"                },
];

// ── Scroll-spy hook ──────────────────────────────────────────────
const useActiveSection = (ids) => {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY + 120;
      let current   = ids[0];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) current = id;
      });
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);
  return active;
};

// ── Smooth scroll ────────────────────────────────────────────────
const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 90;
  window.scrollTo({ top, behavior: "smooth" });
};

// ════════════════════════════════════════════════════════════════
// REUSABLE CONTENT BLOCKS
// ════════════════════════════════════════════════════════════════
const Section = ({ id, title, children }) => (
  <section id={id} className="pp-section">
    <h2 className="pp-section__title">{title}</h2>
    <div className="pp-section__body">{children}</div>
  </section>
);

const P = ({ children }) => <p className="pp-p">{children}</p>;

const Highlight = ({ icon, children }) => (
  <div className="pp-highlight">
    <span className="pp-highlight__icon">{icon}</span>
    <p className="pp-highlight__text">{children}</p>
  </div>
);

const DataTable = ({ rows }) => (
  <div className="pp-table-wrap">
    <table className="pp-table">
      <thead>
        <tr>
          <th>Data Type</th>
          <th>What It Includes</th>
          <th>Why Collected</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="pp-table__type">{r.type}</td>
            <td>{r.includes}</td>
            <td>{r.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BulletList = ({ items }) => (
  <ul className="pp-list">
    {items.map((item, i) => (
      <li key={i} className="pp-list__item">
        <span className="pp-list__dot" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const RightCard = ({ icon, title, desc }) => (
  <div className="pp-right-card">
    <span className="pp-right-card__icon">{icon}</span>
    <div>
      <h4 className="pp-right-card__title">{title}</h4>
      <p  className="pp-right-card__desc">{desc}</p>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function PrivacyPage() {
  const sectionIds  = SECTIONS.map((s) => s.id);
  const activeId    = useActiveSection(sectionIds);
  const [tocOpen, setTocOpen] = useState(false);

  // Close mobile TOC on scroll
  useEffect(() => {
    const fn = () => { if (tocOpen) setTocOpen(false); };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [tocOpen]);

  return (
    <div className="pp-root">

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="pp-hero">
        <div className="pp-hero__grid" />
        <div className="pp-container pp-hero__inner">
          <span className="pp-eyebrow">Legal · Privacy</span>
          <h1 className="pp-hero__title">Privacy Policy</h1>
          <p  className="pp-hero__sub">
            We're a small operation that takes data seriously. This document
            explains exactly what we collect, why we collect it, where it's
            stored, and what we will never do with it.
          </p>
          <div className="pp-hero__meta">
            <div className="pp-meta-pill">
              <span className="pp-meta-pill__label">Last updated</span>
              <span className="pp-meta-pill__val">{LAST_UPDATED}</span>
            </div>
            <div className="pp-meta-pill">
              <span className="pp-meta-pill__label">Version</span>
              <span className="pp-meta-pill__val">{VERSION}</span>
            </div>
            <div className="pp-meta-pill">
              <span className="pp-meta-pill__label">Applies to</span>
              <span className="pp-meta-pill__val">MetriCore platform & API</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile TOC toggle ──────────────────────────────────── */}
      <div className="pp-toc-mobile">
        <button
          className="pp-toc-mobile__btn"
          onClick={() => setTocOpen((p) => !p)}
        >
          <span>Contents</span>
          <span className="pp-toc-mobile__arrow">{tocOpen ? "▲" : "▼"}</span>
        </button>
        {tocOpen && (
          <div className="pp-toc-mobile__drawer">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`pp-toc-mobile__link ${activeId === s.id ? "pp-toc-mobile__link--active" : ""}`}
                onClick={() => { scrollTo(s.id); setTocOpen(false); }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body: sidebar TOC + content ────────────────────────── */}
      <div className="pp-container pp-body">

        {/* Sidebar */}
        <aside className="pp-sidebar">
          <div className="pp-sidebar__sticky">
            <p className="pp-sidebar__heading">Contents</p>
            <nav className="pp-toc">
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  className={`pp-toc__item ${activeId === s.id ? "pp-toc__item--active" : ""}`}
                  onClick={() => scrollTo(s.id)}
                >
                  <span className="pp-toc__num pp-mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="pp-toc__label">{s.label}</span>
                </button>
              ))}
            </nav>

            {/* Quick contact box */}
            <div className="pp-sidebar__contact">
              <p className="pp-sidebar__contact-title">Privacy question?</p>
              <a href="mailto:support@metricore.app" className="pp-sidebar__contact-link">
                support@metricore.app
              </a>
              <p className="pp-sidebar__contact-note">
                We respond within 2 business days.
              </p>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="pp-content">

          {/* 01 — Overview */}
          <Section id="overview" title="01. Overview">
            <Highlight icon="🔒">
              MetriCore does not sell your data. We do not use it for
              advertising, and we run no third-party analytics or tracking.
              We collect only what is necessary to operate the service you
              signed up for.
            </Highlight>
            <P>
              This Privacy Policy applies to MetriCore ("we", "us", "our") and
              governs the collection, use, and protection of personal information
              submitted through our platform, website, API, and related services.
              By using MetriCore, you agree to the practices described here.
            </P>
            <P>
              We are the data controller for personal information collected
              through MetriCore. If you use MetriCore to run your own business,
              you remain the controller of the data you and your team enter into
              the platform, and we process that data on your behalf.
            </P>
          </Section>

          {/* 02 — Collect */}
          <Section id="collect" title="02. Data We Collect">
            <P>
              We collect three kinds of data: information you give us directly,
              information created by your use of the service, and basic technical
              information that helps us keep it running securely.
            </P>
            <DataTable
              rows={[
                {
                  type:     "Account data",
                  includes: "Name, email address, company name, hashed password",
                  reason:   "To create and manage your account",
                },
                {
                  type:     "Business data",
                  includes: "Product names and images, cost figures, goal targets, sales and return quantities",
                  reason:   "To provide the cost-tracking and analytics features you use",
                },
                {
                  type:     "Employee data",
                  includes: "Names, job roles, encrypted login credentials, online/offline status",
                  reason:   "To enable team accounts, role-based access, and real-time presence",
                },
                {
                  type:     "Technical data",
                  includes: "IP address, browser and device type, time zone",
                  reason:   "For security, rate-limiting, and diagnosing errors",
                },
                {
                  type:     "Communication data",
                  includes: "Messages you send us through the contact form or by email",
                  reason:   "To respond to your requests",
                },
              ]}
            />
            <P>
              We do not collect or store payment card numbers. All payments are
              processed by Stripe, and your card details are handled entirely by
              Stripe under their own privacy policy.
            </P>
          </Section>

          {/* 03 — Use */}
          <Section id="use" title="03. How We Use Your Data">
            <P>
              We use your data only for the purposes listed here:
            </P>
            <BulletList
              items={[
                "Provide, operate, and improve the MetriCore service",
                "Create and authenticate your account and your team's accounts",
                "Send essential transactional emails — email verification, password resets, and billing notices",
                "Diagnose technical problems and keep the service running reliably",
                "Detect and prevent fraud, abuse, and security threats",
                "Respond to your support requests",
                "Comply with legal obligations where required",
              ]}
            />
            <Highlight icon="📧">
              We never sell your data, and we never use your business data — your
              costs, products, or sales figures — to train AI models or to
              benchmark you against other customers. When you receive an email
              from MetriCore, it's from us and about your account.
            </Highlight>
          </Section>

          {/* 04 — Store */}
          <Section id="store" title="04. Storage & Security">
            <P>
              Your data is stored in MongoDB Atlas, hosted in Singapore. MongoDB
              Atlas encrypts all stored data at rest using AES-256, and data
              moving between your browser and our servers is protected in transit
              with TLS.
            </P>
            <P>
              Passwords are never stored in plaintext — they are hashed with
              bcrypt before being written to the database. Your login session is
              carried in encrypted cookies, so your account and company
              identifiers are never exposed in plain form in the browser.
            </P>
            <BulletList
              items={[
                "Database hosted on MongoDB Atlas (Singapore), encrypted at rest with AES-256",
                "TLS encryption for all data in transit between your browser and our servers",
                "Passwords hashed with bcrypt — we cannot see your password",
                "Session identifiers encrypted with AES inside cookies",
                "Access to production data is limited to authorized personnel only",
              ]}
            />
            <P>
              No system is perfectly secure. If we become aware of a data breach
              that affects your personal data, we will notify affected users by
              email without undue delay — and, where feasible, within 72 hours of
              becoming aware of it.
            </P>
          </Section>

          {/* 05 — Share */}
          <Section id="share" title="05. Who We Share Data With">
            <P>
              We share your data only with the service providers that help us run
              MetriCore, listed below. We do not share your data with advertisers,
              data brokers, or any partner for commercial purposes.
            </P>
            <DataTable
              rows={[
                {
                  type:     "Payment processing",
                  includes: "Stripe",
                  reason:   "To process subscription payments securely",
                },
                {
                  type:     "Database hosting",
                  includes: "MongoDB Atlas (Singapore)",
                  reason:   "To store and run the platform's data",
                },
                {
                  type:     "Image storage",
                  includes: "Cloudinary",
                  reason:   "To store the product images you upload",
                },
                {
                  type:     "Email delivery",
                  includes: "Brevo",
                  reason:   "To send transactional emails (verification, password resets, billing)",
                },
                {
                  type:     "Legal authorities",
                  includes: "Courts or regulators, only where required by law",
                  reason:   "To comply with a lawful order — we will notify you where permitted",
                },
              ]}
            />
            <P>
              Each provider processes data only to deliver its part of the
              service, under its own data-processing terms and privacy
              protections. If we change providers, we will update this policy.
            </P>
          </Section>

          {/* 06 — Retention */}
          <Section id="retention" title="06. Data Retention">
            <P>
              We keep your data for as long as your account is active.
            </P>
            <BulletList
              items={[
                "While your account is active, your business data (products, costs, goals) stays available so your history and reports remain intact",
                "If your plan or trial ends, your data is not deleted — it remains stored, and dashboard access and CSV export pause until you re-subscribe",
                "You can ask us to delete your account and all associated data at any time by emailing support@metricore.app; we will action deletion within 30 days",
                "Support messages are kept for up to 2 years so we can follow up on earlier requests",
              ]}
            />
            <P>
              Because CSV export requires an active plan or trial, we recommend
              exporting any data you want to keep before your access ends. If you
              need a copy afterwards, contact us and we'll help.
            </P>
          </Section>

          {/* 07 — Rights */}
          <Section id="rights" title="07. Your Rights">
            <P>
              Depending on where you live, you have certain rights over your
              personal data. We honour these rights for all users, regardless of
              jurisdiction.
            </P>
            <div className="pp-rights-grid">
              <RightCard
                icon="📋"
                title="Access"
                desc="Request a copy of the personal data we hold about you. We'll provide it within 30 days."
              />
              <RightCard
                icon="✏️"
                title="Correction"
                desc="Ask us to correct inaccurate or incomplete data. Most account data can be edited directly in your settings."
              />
              <RightCard
                icon="🗑️"
                title="Deletion"
                desc="Request that we delete your account and all associated data. We'll action this within 30 days."
              />
              <RightCard
                icon="📦"
                title="Portability"
                desc="Export your business data as CSV from your account (on the Growth and Scale plans), or ask us for a copy."
              />
              <RightCard
                icon="🚫"
                title="Objection"
                desc="Object to how we process your data for a specific purpose. We'll stop unless we have overriding legitimate grounds."
              />
              <RightCard
                icon="⏸️"
                title="Restriction"
                desc="Ask us to pause processing your data while a complaint is being resolved, rather than deleting it outright."
              />
            </div>
            <P>
              To exercise any of these rights, email{" "}
              <a href="mailto:support@metricore.app" className="pp-link">
                support@metricore.app
              </a>{" "}
              with the subject "Data Rights Request". We'll respond within 30
              days, and we'll never charge a fee for a first request.
            </P>
          </Section>

          {/* 08 — Cookies */}
          <Section id="cookies" title="08. Cookies">
            <P>
              MetriCore uses a minimal set of cookies. We do not use tracking
              cookies, advertising cookies, or third-party analytics.
            </P>
            <DataTable
              rows={[
                {
                  type:     "Session cookies",
                  includes: "Encrypted account and company identifiers",
                  reason:   "Required — keep you logged in during your session",
                },
              ]}
            />
            <P>
              Some display preferences — such as which fields you've hidden on a
              goal — are saved in your browser's local storage, not sent to our
              servers.
            </P>
            <P>
              We do not use Google Analytics, Facebook Pixel, Hotjar, or any other
              third-party tracking tool. The only JavaScript that runs on
              MetriCore is our own.
            </P>
          </Section>

          {/* 09 — Children */}
          <Section id="children" title="09. Children's Privacy">
            <P>
              MetriCore is a business tool intended for adults operating a
              business. We do not knowingly collect personal data from anyone
              under the age of 16.
            </P>
            <P>
              If you believe someone under 16 has created an account or given us
              personal data, please contact us at{" "}
              <a href="mailto:support@metricore.app" className="pp-link">
                support@metricore.app
              </a>{" "}
              and we will delete it.
            </P>
          </Section>

          {/* 10 — Changes */}
          <Section id="changes" title="10. Policy Changes">
            <P>
              We may update this Privacy Policy from time to time. When we make a
              significant change to how we collect or use your data, we will
              update the version number and "Last updated" date at the top of this
              page and notify active account holders by email.
            </P>
            <P>
              Continued use of MetriCore after a change takes effect means you
              accept the revised policy. If you disagree with a change, you can
              cancel your account at any time.
            </P>
          </Section>

          {/* 11 — Contact */}
          <Section id="contact" title="11. Contact Us">
            <P>
              If you have any questions about this Privacy Policy, a request about
              your personal data, or a concern about how we handle information, we
              want to hear from you.
            </P>
            <div className="pp-contact-grid">
              <div className="pp-contact-card">
                <div className="pp-contact-card__icon">📧</div>
                <h4 className="pp-contact-card__title">Email</h4>
                <a href="mailto:support@metricore.app" className="pp-link">
                  support@metricore.app
                </a>
                <p className="pp-contact-card__note">
                  For data-rights requests and privacy questions.
                  Response within 2 business days.
                </p>
              </div>
              <div className="pp-contact-card">
                <div className="pp-contact-card__icon">🏢</div>
                <h4 className="pp-contact-card__title">Postal address</h4>
                <address className="pp-contact-card__addr">
                  {/* ⚠️ Fill once your LLC is registered */}
                  [Your LLC legal name]<br />
                  [Registered street address]<br />
                  [City, State ZIP]<br />
                  United States
                </address>
              </div>
              <div className="pp-contact-card">
                <div className="pp-contact-card__icon">⚖️</div>
                <h4 className="pp-contact-card__title">Complaints</h4>
                <p className="pp-contact-card__note">
                  If you are unsatisfied with our response, you have the right to
                  lodge a complaint with your local data protection authority.
                </p>
              </div>
            </div>
          </Section>

          {/* Bottom rule */}
          <div className="pp-end-rule">
            <span className="pp-mono pp-end-rule__text">
              MetriCore Privacy Policy · Version {VERSION} · {LAST_UPDATED}
            </span>
            <div className="pp-end-rule__links">
              <Link to="/terms">Terms of Service</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/">Home</Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}