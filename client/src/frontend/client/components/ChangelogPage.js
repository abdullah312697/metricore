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
// Newest first. Public releases only — MetriCore went live in Aug 2026.
// Add a new entry here each time you ship something to users.
const RELEASES = [
  {
    version:  "1.1.0",
    date:     "October 2026",
    label:    "Data Export",
    summary:  "Export your numbers to CSV, plus refinements to plan limits and team permissions.",
    changes: [
      { tag: "new",      text: "CSV export of cost and sales data — Growth exports the last 6 months, Scale exports full history (up to 6 months per file)." },
      { tag: "improved", text: "Plan limits for goals, products, and team members are now enforced consistently across every entry point." },
      { tag: "improved", text: "Role-based access refined so the right people see financials, manage data, or view only." },
    ],
  },
  {
    version:  "1.0.0",
    date:     "August 2026",
    label:    "MetriCore 1.0 — Launch",
    summary:  "The first public release. Per-product, per-day cost and margin tracking, goal-based targets, analytics, and a multi-tenant team workspace — built over 2024–2026 and now live.",
    changes: [
      { tag: "new",      text: "Goal-based tracking — group multiple products under a goal with daily, weekly, monthly, and yearly targets and live achievement tracking." },
      { tag: "new",      text: "Per-product, per-day cost tracking: ad spend, delivery, packaging, buying cost, shipping, and returns." },
      { tag: "new",      text: "Real-time profit and margin calculation per product and across the whole goal." },
      { tag: "new",      text: "Analytics — revenue, profit, and units-sold charts across day, month, and custom ranges, plus a mini trend sparkline on every goal." },
      { tag: "new",      text: "Custom extra fields with a formula builder — add Tax, VAT, commission, or any cost and calculate it against existing metrics." },
      { tag: "new",      text: "Target lock — lock a daily target to prevent accidental edits, unlock only when you need to adjust." },
      { tag: "new",      text: "Team accounts with role-based access and real-time online presence via Socket.io." },
      { tag: "new",      text: "Product image uploads with automatic cloud storage (Cloudinary)." },
      { tag: "new",      text: "Multi-tenant architecture — every company sees only its own data." },
      { tag: "security", text: "AES-encrypted session cookies and backend field whitelisting on update routes." },
      { tag: "new",      text: "Responsive design across desktop, tablet, and mobile." },
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

          {/* Feedback pill */}
          <div className="cl-hero__subscribe">
            <span className="cl-hero__subscribe-icon">✉️</span>
            <div>
              <p className="cl-hero__subscribe-title">Have feedback?</p>
              <p className="cl-hero__subscribe-sub">
                Tell us what to build next — we read every message.
              </p>
            </div>
            <a href="mailto:support@metricore.app" className="cl-btn">Email us</a>
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
            <a href="mailto:support@metricore.app" className="cl-btn cl-btn--ghost">
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