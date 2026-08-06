import { useEffect, useState, useCallback } from "react";
import ApartmentRoundedIcon  from "@mui/icons-material/ApartmentRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TaskAltRoundedIcon    from "@mui/icons-material/TaskAltRounded";
import GroupsRoundedIcon     from "@mui/icons-material/GroupsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ForumRoundedIcon      from "@mui/icons-material/ForumRounded";
import { Altaxios } from "../../Altaxios";   // 👈 same depth as AdminAuthContext
import "../../../style/Admin/AdminHome.css";

/* ═══════════════════════════════════════════════════════════════
   AdminHome — the real Overview (replaces the ghost placeholder).
   One fetch: GET /admin/stats → stat cards + recent signups.
═══════════════════════════════════════════════════════════════ */

// "2h ago" / "3d ago" / "Jul 12"
const timeAgo = (d) => {
  if (!d) return "—";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600)  return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function AdminHome() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Altaxios.get("/admin/stats")
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load platform stats.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── loading: keep the ghost look from the shell ───────────── */
  if (loading) {
    return (
      <div>
        <h1 className="adm-page-title">Overview</h1>
        <div className="adm-ghost-grid">
          {[...Array(6)].map((_, i) => <div className="adm-ghost" key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="adm-page-title">Overview</h1>
        <div className="adh-error">
          <p>{error}</p>
          <button className="adh-retry" onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const s = data.stats;

  const cards = [
    { label: "Companies",     value: s.totalCompanies,  icon: <ApartmentRoundedIcon /> },
    { label: "New this week", value: s.newThisWeek,     icon: <TrendingUpRoundedIcon />,
      accent: s.newThisWeek > 0 },
    { label: "Verified",      value: `${s.verifiedPct}%`, icon: <TaskAltRoundedIcon />,
      sub: `${s.verifiedCompanies} of ${s.totalCompanies}` },
    { label: "Employees",     value: s.totalEmployees,  icon: <GroupsRoundedIcon /> },
    { label: "Products",      value: s.totalProducts,   icon: <Inventory2RoundedIcon /> },
    { label: "Open feedback", value: s.openFeedback ?? "—", icon: <ForumRoundedIcon />,
      sub: s.openFeedback == null ? "arrives with the feedback step" : undefined },
  ];

  return (
    <div>
      <h1 className="adm-page-title">Overview</h1>
      <p className="adm-page-sub">The platform at a glance.</p>

      {/* ── stat cards ─────────────────────────────────────── */}
      <div className="adh-grid">
        {cards.map((c) => (
          <div className="adh-card" key={c.label}>
            <span className={`adh-card__icon ${c.accent ? "adh-card__icon--accent" : ""}`}>
              {c.icon}
            </span>
            <span className="adh-card__value">{c.value}</span>
            <span className="adh-card__label adh-mono">{c.label}</span>
            {c.sub && <span className="adh-card__sub">{c.sub}</span>}
          </div>
        ))}
      </div>

      {/* ── recent signups ─────────────────────────────────── */}
      <div className="adh-recent">
        <div className="adh-recent__head">
          <h2 className="adh-recent__title">Recent signups</h2>
        </div>

        {data.recentSignups.length > 0 ? (
          <div className="adh-recent__list">
            {data.recentSignups.map((c) => (
              <div className="adh-row" key={c._id}>
                {c.logo ? (
                  <img src={c.logo} alt={c.name} className="adh-row__logo" />
                ) : (
                  <span className="adh-row__logo adh-row__logo--fallback">
                    {c.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}

                <div className="adh-row__meta">
                  <span className="adh-row__name">{c.name}</span>
                  {c.email && <span className="adh-row__email">{c.email}</span>}
                </div>

                <span className={`adh-chip ${c.verified ? "adh-chip--ok" : "adh-chip--pending"}`}>
                  {c.verified ? "Verified" : "Pending"}
                </span>

                <span className="adh-row__time adh-mono">{timeAgo(c.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="adh-recent__empty">No companies yet — your first signup will appear here.</p>
        )}
      </div>
    </div>
  );
}