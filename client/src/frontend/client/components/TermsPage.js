import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../../style/TermsPage.css";

const LAST_UPDATED = "June 1, 2025";
const VERSION      = "2.0";
const EFFECTIVE    = "June 15, 2025";

const SECTIONS = [
  { id: "acceptance",     label: "Acceptance of Terms"         },
  { id: "definitions",    label: "Definitions"                 },
  { id: "account",        label: "Your Account"                },
  { id: "service",        label: "The Service"                 },
  { id: "payment",        label: "Payment & Billing"           },
  { id: "acceptable",     label: "Acceptable Use"              },
  { id: "prohibited",     label: "Prohibited Conduct"          },
  { id: "ip",             label: "Intellectual Property"       },
  { id: "data",           label: "Your Data"                   },
  { id: "availability",   label: "Service Availability"        },
  { id: "termination",    label: "Termination"                 },
  { id: "liability",      label: "Limitation of Liability"     },
  { id: "disputes",       label: "Disputes"                    },
  { id: "changes",        label: "Changes to Terms"            },
  { id: "contact",        label: "Contact"                     },
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
// REUSABLE BLOCKS
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
        <span>{typeof item === "string" ? item : item}</span>
      </li>
    ))}
  </ul>
);

const DefList = ({ defs }) => (
  <dl className="tp-deflist">
    {defs.map((d, i) => (
      <div key={i} className="tp-deflist__row">
        <dt className="tp-deflist__term">{d.term}</dt>
        <dd className="tp-deflist__def">{d.def}</dd>
      </div>
    ))}
  </dl>
);

const NumberedList = ({ items }) => (
  <ol className="tp-numbered">
    {items.map((item, i) => (
      <li key={i} className="tp-numbered__item">
        <span className="tp-numbered__n tp-mono">{String(i + 1).padStart(2, "0")}</span>
        <span>{item}</span>
      </li>
    ))}
  </ol>
);

const PlanTable = ({ rows }) => (
  <div className="tp-table-wrap">
    <table className="tp-table">
      <thead>
        <tr>
          <th>Plan</th>
          <th>Billing Cycle</th>
          <th>Price</th>
          <th>Renewal</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="tp-table__plan">{r.plan}</td>
            <td>{r.cycle}</td>
            <td className="tp-table__price">{r.price}</td>
            <td>{r.renewal}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
export default function TermsPage() {
  const ids         = SECTIONS.map((s) => s.id);
  const activeId    = useActiveSection(ids);
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
          <span className="tp-eyebrow">Legal · Terms</span>
          <h1 className="tp-hero__title">Terms of Service</h1>
          <p className="tp-hero__sub">
            These terms form the contract between you and MetriCore.
            They are written in plain language — not to hide anything,
            but because a contract both parties understand is a better contract.
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
        <button
          className="tp-toc-mobile__btn"
          onClick={() => setTocOpen((p) => !p)}
        >
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
              <Link to="/privacy" className="tp-sidebar__rel-link">
                Privacy Policy →
              </Link>
              <Link to="/contact" className="tp-sidebar__rel-link">
                Contact Us →
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="tp-content">

          {/* 01 */}
          <Section id="acceptance" title="01. Acceptance of Terms">
            <Notice type="info" icon="📄">
              By creating an account or using any part of the MetriCore
              service, you agree to be bound by these Terms of Service.
              If you do not agree, do not use the service.
            </Notice>
            <P>
              These Terms of Service ("Terms") constitute a legally binding
              agreement between you ("User", "you", or "your") and MetriCore
              Ltd ("MetriCore", "we", "us", or "our"). They govern your use
              of the MetriCore platform, website, API, and all related services
              (collectively, the "Service").
            </P>
            <P>
              If you are accepting these Terms on behalf of a company or
              other legal entity, you represent that you have the authority
              to bind that entity to these Terms. In that case, "you" refers
              to that entity.
            </P>
            <P>
              These Terms apply to all users of the Service, including
              account owners, administrators, and employees added to an
              account by an account owner.
            </P>
          </Section>

          {/* 02 */}
          <Section id="definitions" title="02. Definitions">
            <P>
              The following terms have specific meanings throughout this
              document:
            </P>
            <DefList
              defs={[
                { term: "Account",      def: "A registered MetriCore account created by a business owner or administrator." },
                { term: "User",         def: "Any person who accesses the Service, including account owners, administrators, and employees." },
                { term: "Business Data",def: "Product information, cost records, goal targets, sales figures, and any other data you enter into the Service." },
                { term: "Platform",     def: "The MetriCore web application, API, and all associated tools and features." },
                { term: "Subscription", def: "A paid plan that grants access to the Service for a defined period and at a defined tier." },
                { term: "Content",      def: "All text, data, information, and files submitted to or generated by the Service." },
                { term: "Third Party",  def: "Any entity other than you and MetriCore, including payment processors, infrastructure providers, and integration partners." },
              ]}
            />
          </Section>

          {/* 03 */}
          <Section id="account" title="03. Your Account">
            <P>
              To use MetriCore you must create an account. You are responsible
              for everything that happens under your account.
            </P>
            <BulletList
              items={[
                "You must provide accurate and complete information when creating your account and keep it current.",
                "You are responsible for choosing a strong password and keeping it confidential.",
                "You must notify us immediately at security@metricore.io if you suspect unauthorised access to your account.",
                "You may not share your account credentials with people outside your organisation.",
                "You may not create more than one account per individual without our written consent.",
                "You are responsible for all activity that occurs under your account, including actions taken by employees you add.",
                "Accounts must be registered to a human being. Accounts registered by automated means are prohibited.",
              ]}
            />
            <P>
              If you are an account owner, you are responsible for the
              conduct of all users you invite or add to your account.
              Ensure that anyone you add has read and agrees to these Terms
              before giving them access.
            </P>
          </Section>

          {/* 04 */}
          <Section id="service" title="04. The Service">
            <P>
              MetriCore provides a business analytics and cost tracking
              platform for product-based businesses. Subject to your
              compliance with these Terms and payment of applicable fees,
              we grant you a limited, non-exclusive, non-transferable,
              revocable licence to use the Service for your internal
              business purposes.
            </P>
            <P>
              The Service includes, but is not limited to:
            </P>
            <BulletList
              items={[
                "Goal-based product tracking and target management",
                "Daily cost entry and automatic aggregation",
                "Revenue, profit, and cost analytics and charts",
                "Employee access management and real-time presence",
                "Custom field configuration and calculation",
                "Data export in CSV format",
                "API access (where included in your plan)",
              ]}
            />
            <Notice type="info" icon="⚙️">
              We reserve the right to modify, suspend, or discontinue any
              feature of the Service at any time. We will provide at least
              30 days' notice before removing a feature that is central to
              the plan you are paying for.
            </Notice>
          </Section>

          {/* 05 */}
          <Section id="payment" title="05. Payment & Billing">
            <P>
              Access to paid features of MetriCore requires a valid
              subscription. All payments are processed by Stripe and
              are subject to Stripe's terms of service.
            </P>
            <PlanTable
              rows={[
                { plan: "Starter",  cycle: "Monthly or annual", price: "$19 / month", renewal: "Auto-renews unless cancelled" },
                { plan: "Growth",   cycle: "Monthly or annual", price: "$49 / month", renewal: "Auto-renews unless cancelled" },
                { plan: "Scale",    cycle: "Monthly or annual", price: "$99 / month", renewal: "Auto-renews unless cancelled" },
              ]}
            />
            <P>Annual plans are billed upfront and carry a 20% discount
              compared to the monthly equivalent.</P>
            <BulletList
              items={[
                "Subscriptions begin on the date your payment is successfully processed.",
                "Subscriptions renew automatically at the end of each billing period unless you cancel.",
                "You can cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period — you retain access until then.",
                "We do not offer refunds for partial billing periods or unused time on a plan.",
                "If your payment fails, we will retry three times over seven days before suspending your account.",
                "We will notify you by email at least 7 days before any price increase takes effect.",
                "Prices are listed in US Dollars and exclude any applicable local taxes.",
              ]}
            />
            <Notice type="warn" icon="⚠️">
              Downgrading your plan may result in loss of access to features
              or data that exceeds the limits of your new plan. Review plan
              limits carefully before downgrading.
            </Notice>
          </Section>

          {/* 06 */}
          <Section id="acceptable" title="06. Acceptable Use">
            <P>
              You may use the Service only for lawful business purposes
              and only in ways that comply with these Terms and all applicable
              laws and regulations.
            </P>
            <P>
              Acceptable use includes:
            </P>
            <BulletList
              items={[
                "Tracking your own business's product costs, revenues, and goals",
                "Adding and managing employees within your organisation",
                "Exporting your own business data for your own records",
                "Accessing the API to build internal tools connected to your own account",
                "Using the Service to produce reports for your own internal business decisions",
              ]}
            />
          </Section>

          {/* 07 */}
          <Section id="prohibited" title="07. Prohibited Conduct">
            <Notice type="danger" icon="🚫">
              Violations of this section may result in immediate account
              termination without refund and, where appropriate, referral
              to law enforcement.
            </Notice>
            <P>You must not, under any circumstances:</P>
            <NumberedList
              items={[
                "Use the Service for any illegal purpose or in violation of any local, national, or international law.",
                "Enter false, misleading, or fraudulent data into the Service.",
                "Attempt to gain unauthorised access to other users' accounts, data, or the underlying systems.",
                "Reverse-engineer, decompile, or disassemble any part of the Service.",
                "Use automated scripts, bots, or scrapers to access the Service without our express written consent.",
                "Resell, sublicense, or redistribute access to the Service without our written permission.",
                "Use the Service to store or transmit malicious code, viruses, or harmful files.",
                "Interfere with or disrupt the integrity or performance of the Service.",
                "Use the Service to track or manage businesses you do not own or have no authorised right to manage.",
                "Attempt to circumvent any rate limits, usage limits, or security measures.",
                "Use the Service to process data belonging to individuals who have not consented to that processing.",
                "Access or use another user's account without their explicit permission.",
              ]}
            />
          </Section>

          {/* 08 */}
          <Section id="ip" title="08. Intellectual Property">
            <P>
              MetriCore and its licensors own all intellectual property
              rights in the Service, including the platform, software,
              documentation, design, and branding. These Terms do not
              transfer any of those rights to you.
            </P>
            <P>
              You own all Business Data you enter into the Service.
              MetriCore does not claim any ownership over your data.
              You grant MetriCore a limited licence to store, process,
              and display your data solely for the purpose of providing
              the Service to you.
            </P>
            <BulletList
              items={[
                "You may not copy, reproduce, or create derivative works of the MetriCore platform.",
                "You may not use MetriCore's name, logo, or trademarks without written permission.",
                "Feedback or suggestions you provide about the Service may be used by MetriCore without obligation to you.",
                "If you believe any content on the Service infringes your intellectual property, contact legal@metricore.io.",
              ]}
            />
          </Section>

          {/* 09 */}
          <Section id="data" title="09. Your Data">
            <P>
              We treat your Business Data with care. Our practices are
              described in detail in our{" "}
              <Link to="/privacy" className="tp-link">Privacy Policy</Link>,
              which forms part of this agreement.
            </P>
            <BulletList
              items={[
                "You are the data controller for all Business Data you enter into the Service.",
                "MetriCore acts as a data processor on your behalf.",
                "We will not access your Business Data except to provide the Service, resolve support requests, or as required by law.",
                "We will not use your Business Data for any purpose other than operating the Service for your account.",
                "We will not sell, transfer, or share your Business Data with any third party except as described in our Privacy Policy.",
                "You may export all your Business Data at any time in CSV format.",
                "Following account termination, your data is retained for 60 days then permanently deleted.",
              ]}
            />
            <P>
              You are responsible for ensuring that any personal data
              you enter about your customers or employees complies with
              applicable data protection law, including obtaining any
              necessary consents.
            </P>
          </Section>

          {/* 10 */}
          <Section id="availability" title="10. Service Availability">
            <P>
              We aim for 99.9% uptime measured monthly, excluding
              scheduled maintenance. Our historical uptime is available
              at status.metricore.io.
            </P>
            <P>
              We will carry out scheduled maintenance during low-traffic
              periods and will provide at least 24 hours' notice for
              any maintenance window lasting longer than 30 minutes.
              Emergency maintenance may be carried out without notice
              to protect the security or integrity of the Service.
            </P>
            <Notice type="info" icon="📡">
              MetriCore does not guarantee that the Service will be
              available at all times. We are not liable for any loss
              caused by temporary unavailability, provided we act
              reasonably to restore service.
            </Notice>
            <P>
              In the event of significant outages (more than 4 cumulative
              hours in a calendar month), you may request a pro-rated
              service credit by contacting support@metricore.io within
              14 days. Credits are applied to your next billing cycle
              and are your sole remedy for service unavailability.
            </P>
          </Section>

          {/* 11 */}
          <Section id="termination" title="11. Termination">
            <P>
              Either party may terminate the agreement at any time and
              for any reason, subject to the conditions below.
            </P>
            <P><strong className="tp-strong">Termination by you:</strong></P>
            <BulletList
              items={[
                "You may cancel your subscription at any time from your account settings.",
                "Cancellation takes effect at the end of your current billing period.",
                "You retain full access to the Service until the end of the period you have paid for.",
                "No refund is issued for unused time within a billing period.",
              ]}
            />
            <P><strong className="tp-strong">Termination by MetriCore:</strong></P>
            <BulletList
              items={[
                "We may suspend or terminate your account immediately if you violate these Terms, particularly Section 07 (Prohibited Conduct).",
                "We may terminate your account with 30 days' notice if we decide to discontinue the Service entirely.",
                "We may suspend your account without notice if required to do so by law or to protect the security of other users.",
                "Where termination is for breach, no refund will be issued.",
              ]}
            />
            <P>
              On termination for any reason, your licence to use the
              Service ends. Your data remains accessible for export for
              60 days following termination, after which it is permanently
              deleted.
            </P>
          </Section>

          {/* 12 */}
          <Section id="liability" title="12. Limitation of Liability">
            <Notice type="warn" icon="⚖️">
              This section limits MetriCore's legal liability. Please
              read it carefully.
            </Notice>
            <P>
              To the maximum extent permitted by applicable law, MetriCore
              and its officers, directors, employees, and agents shall not
              be liable for any indirect, incidental, special, consequential,
              or punitive damages, including but not limited to loss of
              profits, revenue, data, goodwill, or business interruption,
              arising out of or in connection with your use of the Service.
            </P>
            <P>
              MetriCore's total aggregate liability to you for any claim
              arising out of or in connection with these Terms or your use
              of the Service shall not exceed the total amount you paid to
              MetriCore in the three months immediately preceding the event
              giving rise to the claim.
            </P>
            <P>
              The Service is provided "as is" and "as available". MetriCore
              makes no warranty, express or implied, that the Service will
              be error-free, uninterrupted, or fit for any particular purpose.
              You use the Service at your own risk.
            </P>
            <P>
              Nothing in these Terms excludes or limits liability for death
              or personal injury caused by negligence, fraud, or any other
              liability that cannot be lawfully excluded.
            </P>
          </Section>

          {/* 13 */}
          <Section id="disputes" title="13. Disputes">
            <P>
              We would like to resolve any dispute before it becomes a
              formal legal matter. If you have a concern, please contact
              us first at legal@metricore.io and give us 30 days to
              respond.
            </P>
            <P>
              These Terms are governed by the laws of Bangladesh, without
              regard to conflict of law provisions. Any dispute that cannot
              be resolved informally shall be submitted to the exclusive
              jurisdiction of the courts of Dhaka, Bangladesh.
            </P>
            <BulletList
              items={[
                "You agree to attempt good-faith resolution with MetriCore before initiating legal proceedings.",
                "Class action lawsuits against MetriCore are not permitted to the extent allowed by law.",
                "Any claim arising from these Terms must be brought within one year of the event giving rise to the claim.",
                "If any part of this Section is found unenforceable, the rest of the Section remains in effect.",
              ]}
            />
          </Section>

          {/* 14 */}
          <Section id="changes" title="14. Changes to Terms">
            <P>
              We may update these Terms at any time. The way we handle
              changes depends on how significant they are.
            </P>
            <P>
              <strong className="tp-strong">Material changes</strong> — changes
              that affect your rights, our obligations, pricing, or how
              the Service works — will be communicated:
            </P>
            <BulletList
              items={[
                "By email to all account holders at least 30 days before the change takes effect",
                "Via a notice on your MetriCore dashboard for 30 days",
                "By updating the version number and effective date at the top of this page",
              ]}
            />
            <P>
              <strong className="tp-strong">Minor changes</strong> — clarifications,
              grammar corrections, or restructuring that does not alter
              meaning — will be made without advance notice. The version
              number and last-updated date will still change.
            </P>
            <P>
              If you disagree with a change to these Terms, you may cancel
              your subscription before the new Terms take effect and receive
              a pro-rated refund for unused days in your current billing period.
              Continued use after the effective date constitutes acceptance.
            </P>
          </Section>

          {/* 15 */}
          <Section id="contact" title="15. Contact">
            <P>
              If you have any questions about these Terms, need to report
              a violation, or have a legal enquiry, contact us here:
            </P>
            <div className="tp-contact-grid">
              <div className="tp-contact-card">
                <span className="tp-contact-card__icon">📧</span>
                <h4 className="tp-contact-card__title">General enquiries</h4>
                <a href="mailto:hello@metricore.io" className="tp-link tp-mono">
                  hello@metricore.io
                </a>
              </div>
              <div className="tp-contact-card">
                <span className="tp-contact-card__icon">⚖️</span>
                <h4 className="tp-contact-card__title">Legal matters</h4>
                <a href="mailto:legal@metricore.io" className="tp-link tp-mono">
                  legal@metricore.io
                </a>
              </div>
              <div className="tp-contact-card">
                <span className="tp-contact-card__icon">🔒</span>
                <h4 className="tp-contact-card__title">Security & abuse</h4>
                <a href="mailto:security@metricore.io" className="tp-link tp-mono">
                  security@metricore.io
                </a>
              </div>
              <div className="tp-contact-card">
                <span className="tp-contact-card__icon">🏢</span>
                <h4 className="tp-contact-card__title">Postal</h4>
                <address className="tp-contact-card__addr">
                  MetriCore Ltd<br />
                  123 Business Road<br />
                  Dhaka 1212, Bangladesh
                </address>
              </div>
            </div>
          </Section>

          {/* End rule */}
          <div className="tp-end-rule">
            <span className="tp-mono tp-end-rule__text">
              MetriCore Terms of Service · v{VERSION} · Effective {EFFECTIVE}
            </span>
            <div className="tp-end-rule__links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/">Home</Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}