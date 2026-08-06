import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../../style/PrivacyPage.css";

// ── Last updated date ────────────────────────────────────────────
const LAST_UPDATED = "June 1, 2025";
const VERSION      = "2.1";

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
            We are a small team that takes data seriously. This document
            explains exactly what we collect, why we collect it, and what
            we will never do with it.
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
              <a href="mailto:privacy@metricore.io" className="pp-sidebar__contact-link">
                privacy@metricore.io
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
              advertising. We collect only what is necessary to operate
              the service you signed up for.
            </Highlight>
            <P>
              This Privacy Policy applies to MetriCore ("we", "us", "our") and
              governs the collection, use, and protection of personal information
              submitted through our platform, website, API, and related services.
              By using MetriCore, you agree to the practices described here.
            </P>
            <P>
              We are the data controller for information collected through
              MetriCore. If you are a business using MetriCore to manage your
              own data, your employees' data within the platform is processed
              under your authority as the data controller.
            </P>
          </Section>

          {/* 02 — Collect */}
          <Section id="collect" title="02. Data We Collect">
            <P>
              We collect three categories of data: information you give us
              directly, information generated by your use of the service, and
              technical information that helps us keep the service running.
            </P>
            <DataTable
              rows={[
                {
                  type:     "Account data",
                  includes: "Name, email address, company name, password (hashed)",
                  reason:   "To create and manage your account",
                },
                {
                  type:     "Business data",
                  includes: "Product names, cost figures, goal targets, sales quantities",
                  reason:   "To provide the analytics and tracking features you use",
                },
                {
                  type:     "Employee data",
                  includes: "Names, roles, login credentials (encrypted), online status",
                  reason:   "To enable team access and real-time collaboration features",
                },
                {
                  type:     "Usage data",
                  includes: "Pages visited, features used, session duration, click patterns",
                  reason:   "To improve the product and diagnose issues",
                },
                {
                  type:     "Technical data",
                  includes: "IP address, browser type, device type, time zone",
                  reason:   "For security, fraud prevention, and error diagnosis",
                },
                {
                  type:     "Communication data",
                  includes: "Emails and messages you send to our support team",
                  reason:   "To respond to your requests and improve support quality",
                },
              ]}
            />
            <P>
              We do not collect payment card numbers directly. All payments
              are processed by our payment provider (Stripe) and governed by
              their privacy policy.
            </P>
          </Section>

          {/* 03 — Use */}
          <Section id="use" title="03. How We Use Your Data">
            <P>
              We use your data only for the purposes listed here. We do not
              use your business data to train AI models, benchmark against
              other customers, or produce any external reports.
            </P>
            <BulletList
              items={[
                "Provide, maintain, and improve the MetriCore service",
                "Create and authenticate your account and employee accounts",
                "Send transactional emails — receipts, password resets, critical alerts",
                "Send product update emails (you can opt out of these at any time)",
                "Diagnose technical issues and monitor service reliability",
                "Detect and prevent fraud, abuse, or security threats",
                "Comply with legal obligations where required",
                "Respond to support requests and improve documentation",
              ]}
            />
            <Highlight icon="📧">
              We will never send you marketing emails from third-party
              partners. When you receive an email from MetriCore, it is from
              us and about your account.
            </Highlight>
          </Section>

          {/* 04 — Store */}
          <Section id="store" title="04. Storage & Security">
            <P>
              Your data is stored on servers located in the European Union
              (primary) with encrypted backups in a secondary region.
              Business data entered into MetriCore — costs, products, goals —
              is encrypted at rest using AES-256 and in transit using TLS 1.3.
            </P>
            <P>
              Employee session data is protected using encrypted cookies.
              Passwords are never stored in plaintext — they are hashed using
              bcrypt with a work factor of 12 before being written to any
              database.
            </P>
            <BulletList
              items={[
                "AES-256 encryption at rest for all stored business data",
                "TLS 1.3 for all data in transit between your browser and our servers",
                "bcrypt password hashing — we cannot see your password",
                "Encrypted cookies for session authentication",
                "Access to production databases is restricted to two senior engineers",
                "Infrastructure is audited for security vulnerabilities quarterly",
              ]}
            />
            <P>
              No security system is perfect. If we discover a breach that
              affects your data, we will notify you by email within 72 hours
              of becoming aware of it — ahead of any legal requirement to do so.
            </P>
          </Section>

          {/* 05 — Share */}
          <Section id="share" title="05. Who We Share Data With">
            <P>
              We share your data only with the categories of service
              providers listed below. We do not share your data with
              advertisers, data brokers, or any partner for commercial
              purposes.
            </P>
            <DataTable
              rows={[
                {
                  type:     "Payment processing",
                  includes: "Stripe Inc.",
                  reason:   "To process subscription payments securely",
                },
                {
                  type:     "Infrastructure",
                  includes: "AWS (Amazon Web Services)",
                  reason:   "To host and run the platform",
                },
                {
                  type:     "Email delivery",
                  includes: "Resend / Amazon SES",
                  reason:   "To send transactional emails to your account",
                },
                {
                  type:     "Error monitoring",
                  includes: "Sentry (anonymised stack traces only)",
                  reason:   "To detect and diagnose software errors",
                },
                {
                  type:     "Legal authorities",
                  includes: "Courts, regulators if required by law",
                  reason:   "To comply with a lawful order — we will notify you if permitted",
                },
              ]}
            />
            <P>
              Every third party we use is bound by a Data Processing Agreement
              (DPA). We review these agreements annually and will update this
              policy if providers change.
            </P>
          </Section>

          {/* 06 — Retention */}
          <Section id="retention" title="06. Data Retention">
            <P>
              We keep your data for as long as you have an active account.
              When you cancel your account:
            </P>
            <BulletList
              items={[
                "Your business data (products, costs, goals) is retained for 60 days — long enough to change your mind",
                "After 60 days, all business data is permanently deleted from our primary database",
                "Encrypted backups are rotated and overwritten within 90 days",
                "Account identity data (email, company name) is deleted after 60 days unless we have a legal obligation to retain it",
                "Anonymous, aggregated usage statistics may be retained indefinitely — these cannot be linked back to you",
                "Support correspondence is retained for 2 years to enable follow-up",
              ]}
            />
            <P>
              During the 60-day window after cancellation, you can export
              all of your data in CSV format from your account settings
              page. After that window closes, recovery is not possible.
            </P>
          </Section>

          {/* 07 — Rights */}
          <Section id="rights" title="07. Your Rights">
            <P>
              Depending on where you are located, you have certain rights
              over your personal data. We honour these rights for all users,
              regardless of jurisdiction.
            </P>
            <div className="pp-rights-grid">
              <RightCard
                icon="📋"
                title="Access"
                desc="Request a copy of all personal data we hold about you. We will provide it within 14 days in a machine-readable format."
              />
              <RightCard
                icon="✏️"
                title="Correction"
                desc="Ask us to correct inaccurate or incomplete data. Most account data can be corrected directly in your settings."
              />
              <RightCard
                icon="🗑️"
                title="Deletion"
                desc="Request that we delete your account and all associated data. We will action this within 7 days."
              />
              <RightCard
                icon="📦"
                title="Portability"
                desc="Export your business data (products, costs, goals) in CSV format at any time from your account settings."
              />
              <RightCard
                icon="🚫"
                title="Objection"
                desc="Object to how we process your data for specific purposes. We will stop unless we have overriding legitimate grounds."
              />
              <RightCard
                icon="⏸️"
                title="Restriction"
                desc="Ask us to pause processing your data while a complaint is being resolved, rather than deleting it immediately."
              />
            </div>
            <P>
              To exercise any of these rights, email{" "}
              <a href="mailto:privacy@metricore.io" className="pp-link">
                privacy@metricore.io
              </a>{" "}
              with the subject "Data Rights Request". We will respond within
              14 days. We will never charge a fee for a first request.
            </P>
          </Section>

          {/* 08 — Cookies */}
          <Section id="cookies" title="08. Cookies">
            <P>
              MetriCore uses a minimal set of cookies. We do not use
              tracking cookies, advertising cookies, or third-party
              analytics cookies.
            </P>
            <DataTable
              rows={[
                {
                  type:     "Session cookie",
                  includes: "Encrypted authentication token",
                  reason:   "Required — keeps you logged in during your session",
                },
                {
                  type:     "Preference cookie",
                  includes: "UI preferences (dark/light mode, field visibility)",
                  reason:   "Functional — remembers your display settings",
                },
                {
                  type:     "CSRF token",
                  includes: "Single-use security token",
                  reason:   "Required — protects your account from cross-site attacks",
                },
              ]}
            />
            <P>
              We do not use Google Analytics, Facebook Pixel, Hotjar, or
              any other third-party tracking tool on our platform. The only
              JavaScript that runs on MetriCore pages is our own.
            </P>
          </Section>

          {/* 09 — Children */}
          <Section id="children" title="09. Children's Privacy">
            <P>
              MetriCore is a business management platform designed for adult
              business operators. We do not knowingly collect personal data
              from anyone under the age of 16.
            </P>
            <P>
              If you believe a person under 16 has created an account or
              submitted personal data to us, please contact us at{" "}
              <a href="mailto:privacy@metricore.io" className="pp-link">
                privacy@metricore.io
              </a>{" "}
              and we will delete the data immediately.
            </P>
          </Section>

          {/* 10 — Changes */}
          <Section id="changes" title="10. Policy Changes">
            <P>
              We may update this Privacy Policy from time to time. When we
              make a significant change — one that affects how we collect
              or use your data — we will:
            </P>
            <BulletList
              items={[
                "Email every active account holder at least 14 days before the change takes effect",
                "Display a notice on your dashboard for 30 days",
                "Update the version number and 'Last updated' date at the top of this page",
                "Maintain an archive of previous policy versions accessible on request",
              ]}
            />
            <P>
              Minor changes — such as clarifications that do not change our
              practices — will be made without advance notice. The version
              number will still be updated and the date will change.
            </P>
            <P>
              Continued use of MetriCore after a policy change takes effect
              constitutes your acceptance of the revised policy. If you
              disagree with any change, you may cancel your account at any
              time.
            </P>
          </Section>

          {/* 11 — Contact */}
          <Section id="contact" title="11. Contact Us">
            <P>
              If you have any questions about this Privacy Policy, a request
              about your personal data, or a concern about how we handle
              information, we want to hear from you.
            </P>
            <div className="pp-contact-grid">
              <div className="pp-contact-card">
                <div className="pp-contact-card__icon">📧</div>
                <h4 className="pp-contact-card__title">Email</h4>
                <a href="mailto:privacy@metricore.io" className="pp-link">
                  privacy@metricore.io
                </a>
                <p className="pp-contact-card__note">
                  For data rights requests and privacy questions.
                  Response within 2 business days.
                </p>
              </div>
              <div className="pp-contact-card">
                <div className="pp-contact-card__icon">🏢</div>
                <h4 className="pp-contact-card__title">Postal address</h4>
                <address className="pp-contact-card__addr">
                  MetriCore Ltd<br />
                  123 Business Road<br />
                  Dhaka 1212<br />
                  Bangladesh
                </address>
              </div>
              <div className="pp-contact-card">
                <div className="pp-contact-card__icon">⚖️</div>
                <h4 className="pp-contact-card__title">Complaints</h4>
                <p className="pp-contact-card__note">
                  If you are unsatisfied with our response, you have
                  the right to lodge a complaint with your local data
                  protection authority.
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