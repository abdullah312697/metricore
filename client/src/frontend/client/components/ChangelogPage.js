import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "../../../style/ChangelogPage.css";

// ── Tag definitions ──────────────────────────────────────────────
const TAGS = {
  new:         { label: "New",         color: "#ffb100" },
  improved:    { label: "Improved",    color: "#3b82f6" },
  fixed:       { label: "Fixed",       color: "#22c55e" },
  security:    { label: "Security",    color: "#a855f7" },
  performance: { label: "Performance", color: "#f97316" },
  removed:     { label: "Removed",     color: "#ef4444" },
};

// ── Changelog entries ─────────────────────────────────────────────
// Newest first. Based on the real MetriCore build history.
const RELEASES = [
  {
    version:  "2.1.0",
    date:     "June 1, 2025",
    label:    "Extra Fields & Formula Builder",
    summary:  "The most-requested feature since launch. Define your own cost fields with formulas that calculate against any existing metric.",
    changes: [
      { tag: "new",      text: "Custom extra fields per goal — add Tax, Commission, VAT or any cost you track." },
      { tag: "new",      text: "Formula builder: chain operations (plus, minus, multiply, divide, percentage, percentof) against any existing field." },
      { tag: "new",      text: "Extra fields automatically pushed to all existing ProductsCost records when a new field is created." },
      { tag: "new",      text: "Percentage (%) and percentage-of (p%) display suffix on calculated fields." },
      { tag: "improved", text: "Goal sparklines now show green (on track) or red (behind) based on expected vs actual revenue at today's date." },
      { tag: "improved", text: "Chart tick density reduced — month view now shows 6 evenly spaced labels instead of 30 overlapping dates." },
      { tag: "fixed",    text: "DelibaryCostPersale field resetting to 0 on blur due to being treated as derived instead of raw." },
      { tag: "fixed",    text: "ExtraField configId undefined error causing BSONError on update when using fallback zero records." },
      { tag: "fixed",    text: "resolveExtraFields now preserves configId through the calculation chain so DB updates fire correctly." },
    ],
  },
  {
    version:  "2.0.0",
    date:     "April 15, 2025",
    label:    "Goal Architecture Rebuild",
    summary:  "A foundational rework of how goals, products, and cost records relate. Cleaner schema, faster queries, and lazy record creation.",
    changes: [
      { tag: "new",         text: "ExtraFieldConfig now stored as one document per company+goal — one config, all products." },
      { tag: "new",         text: "Lazy upsert system: ProductsCost records created automatically on first page visit each day." },
      { tag: "new",         text: "Previous day values carried forward on new record creation (DelibaryCostPersale, TargetSaleAmount, extraFields)." },
      { tag: "new",         text: "Field visibility manager — hide any default field per goal without affecting calculations." },
      { tag: "new",         text: "Real-time employee online/offline status via Socket.io presence tracking." },
      { tag: "improved",    text: "MongoDB aggregation now uses $setOnInsert — zero overwrites on existing daily records." },
      { tag: "improved",    text: "Merged product and cost data into a single mergedSummary response — one API call, one state." },
      { tag: "performance", text: "ExtraField aggregation replaced with fieldDefsByProduct lookup — removed a full aggregate pipeline per request." },
      { tag: "fixed",       text: "GoalIdentifire type mismatch: string vs ObjectId causing products to not appear under goals." },
      { tag: "security",    text: "All mongoose.Types.ObjectId constructors migrated to createFromHexString to remove deprecated number overload." },
    ],
  },
  {
    version:  "1.9.0",
    date:     "February 28, 2025",
    label:    "Analytics & Charts",
    summary:  "Revenue, profit, and quantity charts across any date range. Includes a company-wide overview chart and per-goal sparklines.",
    changes: [
      { tag: "new",         text: "Revenue chart with period selector: Today (hourly), Week, Month, Year, Full target, Custom range." },
      { tag: "new",         text: "Metric selector: switch between Revenue, Quantity, and Profit on the same chart." },
      { tag: "new",         text: "Daily summary route: total units sold, total revenue, and estimated profit per day across all products." },
      { tag: "new",         text: "Goal sparklines on the goals list page — each goal shows a mini trend line coloured by achievement." },
      { tag: "new",         text: "Stats row above chart: Total, Average, Peak, and data point count for the selected period." },
      { tag: "improved",    text: "Chart date labels shortened — year removed from day-view ticks (06 May not 06 May 2026)." },
      { tag: "improved",    text: "Chart tick values adaptive — month view skips to every 5th day automatically." },
      { tag: "fixed",       text: "$dateToString timezone field causing 500 error on older MongoDB versions — removed, UTC used instead." },
      { tag: "performance", text: "Company chart data route uses $lookup inline — no separate product price query per document." },
    ],
  },
  {
    version:  "1.8.0",
    date:     "January 10, 2025",
    label:    "Daily Cost Tracking System",
    summary:  "Per-product, per-day cost tracking with automatic calculations. The core of what MetriCore does.",
    changes: [
      { tag: "new",      text: "ProductsCost schema: daily record per product with SoldQuentity, Return, AdCost, OtherCost, Packaging, Buying, Shipping fields." },
      { tag: "new",      text: "All derived fields calculated in frontend via useProductMetrics hook — zero redundant DB reads." },
      { tag: "new",      text: "useTotalMetrics hook: sums all products across all days to produce a single total row." },
      { tag: "new",      text: "Target lock/unlock system — lock daily targets to prevent accidental edits." },
      { tag: "new",      text: "onBlur update system: inputs save to DB when user leaves the field, not on every keystroke." },
      { tag: "new",      text: "editValues local state — input shows typing value while focused, calculated value when blurred." },
      { tag: "improved", text: "Math.round applied at end of calculateMetrics — clean integers displayed throughout." },
      { tag: "improved", text: "Separate PATCH route for extraField values vs main fields — prevents overwriting wrong document field." },
      { tag: "fixed",    text: "DelibaryCost now derived as DelibaryCostPersale × SoldQuentity — total delivery cost correct across date ranges." },
    ],
  },
  {
    version:  "1.5.0",
    date:     "November 20, 2024",
    label:    "Goal & Product Management",
    summary:  "Set revenue targets, track multiple products per goal, and see real-time achievement against daily targets.",
    changes: [
      { tag: "new",      text: "Goal creation with start date, end date, and total revenue target." },
      { tag: "new",      text: "Products assigned to goals via GoalIdentifire array — one product can belong to multiple goals." },
      { tag: "new",      text: "Target calculation: daily, weekly, monthly and yearly targets derived from total goal amount." },
      { tag: "new",      text: "Progress bar showing current achievement percentage against calculated target for selected date range." },
      { tag: "new",      text: "Custom date range filter with calendar picker for start and end date." },
      { tag: "new",      text: "Product image upload to Cloudinary with automatic public ID storage for deletion." },
      { tag: "improved", text: "Goal list page shows sparkline trend and achievement percentage per goal." },
      { tag: "fixed",    text: "Date parsing for dd/MM/yyyy format — JS native Date misread as MM/DD/YYYY causing wrong expected revenue." },
    ],
  },
  {
    version:  "1.2.0",
    date:     "September 5, 2024",
    label:    "Team & Authentication",
    summary:  "Multi-employee accounts with role-based access and encrypted session management.",
    changes: [
      { tag: "new",      text: "Employee accounts under a company — invite team members with their own login." },
      { tag: "new",      text: "Cookie-based authentication with AES encrypted employeeId and companyId." },
      { tag: "new",      text: "Socket.io integration for real-time features — presence tracking groundwork." },
      { tag: "new",      text: "Companies schema with companyId linking all data — full multi-tenant isolation." },
      { tag: "security", text: "All cookies encrypted with AES before storage — raw IDs never exposed to client." },
      { tag: "security", text: "Backend field whitelist on PATCH routes — arbitrary field updates blocked at route level." },
      { tag: "fixed",    text: "Socket middleware setting user online before connection established — moved to connection handler." },
    ],
  },
  {
    version:  "1.0.0",
    date:     "June 14, 2024",
    label:    "Initial Launch",
    summary:  "The first public version of MetriCore. Core product tracking, daily costs, and a dashboard to see it all.",
    changes: [
      { tag: "new", text: "MetriCore platform launched publicly." },
      { tag: "new", text: "Product management with name, price, stock, and image." },
      { tag: "new", text: "Daily cost entry: ad spend, delivery, packaging, buying cost, shipping." },
      { tag: "new", text: "Goal creation and product assignment." },
      { tag: "new", text: "Dashboard overview with total revenue, profit, and cost breakdown." },
      { tag: "new", text: "Multi-tenant architecture — each company sees only its own data." },
      { tag: "new", text: "Responsive design supporting desktop, tablet, and mobile." },
    ],
  },
];

// ── Filter pills ─────────────────────────────────────────────────
const ALL_FILTERS = ["all", ...Object.keys(TAGS)];

// ════════════════════════════════════════════════════════════════
// TAG PILL
// ════════════════════════════════════════════════════════════════
const TagPill = ({ tag }) => {
  const t = TAGS[tag];
  if (!t) return null;
  return (
    <span
      className="cl-tag"
      style={{
        color:       t.color,
        borderColor: `${t.color}44`,
        background:  `${t.color}12`,
      }}
    >
      {t.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════
// RELEASE ENTRY
// ════════════════════════════════════════════════════════════════
const Release = ({ release, activeFilter }) => {
  const visibleChanges = activeFilter === "all"
    ? release.changes
    : release.changes.filter((c) => c.tag === activeFilter);

  if (!visibleChanges.length) return null;

  const isLatest = release === RELEASES[0];

  return (
    <article className="cl-release">

      {/* ── Left rail: version + date ─────────────────────── */}
      <div className="cl-release__rail">
        <div className="cl-release__dot-wrap">
          <div className={`cl-release__dot ${isLatest ? "cl-release__dot--latest" : ""}`} />
        </div>
        <div className="cl-release__version cl-mono">
          v{release.version}
        </div>
        <div className="cl-release__date cl-mono">{release.date}</div>
        {isLatest && (
          <span className="cl-release__latest-badge">Latest</span>
        )}
      </div>

      {/* ── Right: content ────────────────────────────────── */}
      <div className="cl-release__content">
        <h2 className="cl-release__title">{release.label}</h2>
        <p  className="cl-release__summary">{release.summary}</p>

        <ul className="cl-changes">
          {visibleChanges.map((change, i) => (
            <li key={i} className="cl-change">
              <TagPill tag={change.tag} />
              <span className="cl-change__text">{change.text}</span>
            </li>
          ))}
        </ul>
      </div>

    </article>
  );
};

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
export default function ChangelogPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  // Count per tag across all releases
  const tagCounts = useMemo(() => {
    const counts = { all: 0 };
    RELEASES.forEach((r) =>
      r.changes.forEach((c) => {
        counts[c.tag] = (counts[c.tag] || 0) + 1;
        counts.all++;
      })
    );
    return counts;
  }, []);

  const visibleReleases = useMemo(() => {
    if (activeFilter === "all") return RELEASES;
    return RELEASES.filter((r) =>
      r.changes.some((c) => c.tag === activeFilter)
    );
  }, [activeFilter]);

  return (
    <div className="cl-root">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="cl-hero">
        <div className="cl-hero__grid" />
        <div className="cl-container cl-hero__inner">
          <div className="cl-hero__copy">
            <span className="cl-eyebrow">Product Updates</span>
            <h1 className="cl-hero__title">Changelog</h1>
            <p className="cl-hero__sub">
              Every feature shipped, every bug fixed, every improvement made —
              documented here so you always know what changed and why.
            </p>
            <div className="cl-hero__meta">
              <div className="cl-meta-stat">
                <span className="cl-meta-stat__val cl-mono">
                  {RELEASES.length}
                </span>
                <span className="cl-meta-stat__label">Releases</span>
              </div>
              <div className="cl-meta-div" />
              <div className="cl-meta-stat">
                <span className="cl-meta-stat__val cl-mono">
                  {tagCounts.all}
                </span>
                <span className="cl-meta-stat__label">Total changes</span>
              </div>
              <div className="cl-meta-div" />
              <div className="cl-meta-stat">
                <span className="cl-meta-stat__val cl-mono">
                  v{RELEASES[0].version}
                </span>
                <span className="cl-meta-stat__label">Latest version</span>
              </div>
            </div>
          </div>

          {/* Subscribe pill */}
          <div className="cl-hero__subscribe">
            <span className="cl-hero__subscribe-icon">🔔</span>
            <div>
              <p className="cl-hero__subscribe-title">Get update emails</p>
              <p className="cl-hero__subscribe-sub">
                We email subscribers when significant changes ship.
              </p>
            </div>
            <a href="/signup" className="cl-btn">Subscribe</a>
          </div>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="cl-filter-bar">
        <div className="cl-container cl-filter-bar__inner">
          <span className="cl-filter-bar__label cl-mono">Filter</span>
          <div className="cl-filters">
            {ALL_FILTERS.map((f) => {
              const tag  = TAGS[f];
              const isActive = activeFilter === f;
              const count = tagCounts[f] || 0;
              return (
                <button
                  key={f}
                  className={`cl-filter ${isActive ? "cl-filter--active" : ""}`}
                  style={isActive && tag
                    ? { borderColor: tag.color, color: tag.color, background: `${tag.color}12` }
                    : isActive
                    ? { borderColor: "var(--cl-amber)", color: "var(--cl-amber)", background: "var(--cl-amber-dim)" }
                    : {}
                  }
                  onClick={() => setActiveFilter(f)}
                >
                  {f === "all" ? "All changes" : TAGS[f].label}
                  <span className="cl-filter__count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Timeline ──────────────────────────────────────── */}
      <div className="cl-container cl-timeline-wrap">
        <div className="cl-timeline">

          {/* Vertical spine line */}
          <div className="cl-spine" />

          {visibleReleases.length > 0 ? (
            visibleReleases.map((release) => (
              <Release
                key={release.version}
                release={release}
                activeFilter={activeFilter}
              />
            ))
          ) : (
            <div className="cl-empty">
              <p>No changes match this filter.</p>
              <button
                className="cl-btn cl-btn--ghost"
                onClick={() => setActiveFilter("all")}
              >
                Clear filter
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer CTA ────────────────────────────────────── */}
      <div className="cl-bottom">
        <div className="cl-container cl-bottom__inner">
          <p className="cl-bottom__text">
            Have a feature request or found a bug?
          </p>
          <div className="cl-bottom__links">
            <a href="mailto:hello@metricore.io" className="cl-btn cl-btn--ghost">
              Email us
            </a>
            <Link to="/privacy" className="cl-text-link">Privacy</Link>
            <Link to="/terms"   className="cl-text-link">Terms</Link>
            <Link to="/"        className="cl-text-link">Home</Link>
          </div>
        </div>
      </div>

    </div>
  );
}