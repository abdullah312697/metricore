import { useEffect, useState, useCallback } from "react";
import PaymentsRoundedIcon    from "@mui/icons-material/PaymentsRounded";
import TrendingUpRoundedIcon  from "@mui/icons-material/TrendingUpRounded";
import PeopleRoundedIcon      from "@mui/icons-material/PeopleRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import { Altaxios } from "../../Altaxios";   // 👈 same depth as the other admin files
import "../../../style/Admin/AdminBilling.css";

/* ═══════════════════════════════════════════════════════════════
   AdminBilling — /admin/billing
   Read-only revenue view: MRR/ARR, subscription counts, per-plan
   breakdown with share bars, and recent subscription activity.
   All numbers come from the webhook-synced company fields.
═══════════════════════════════════════════════════════════════ */

const money = (n) => `$${(n || 0).toLocaleString()}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const STATUS_LABEL = { active: "Active", past_due: "Past due", canceled: "Canceled" };

export default function AdminBilling() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Altaxios.get("/admin/billing")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load billing overview."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <h1 className="adm-page-title">Billing</h1>
        <div className="adm-ghost-grid">
          {[...Array(4)].map((_, i) => <div className="adm-ghost" key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="adm-page-title">Billing</h1>
        <div className="adb-error">
          <p>{error}</p>
          <button className="adb-retry" onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const maxPlanMrr = Math.max(1, ...data.planStats.map((p) => p.mrr));

  const cards = [
    { label: "MRR",             value: money(data.mrr),          icon: <PaymentsRoundedIcon />,    accent: true,
      sub: "monthly recurring" },
    { label: "ARR",             value: money(data.arr),          icon: <TrendingUpRoundedIcon />,
      sub: "annual run-rate" },
    { label: "Active subs",     value: data.counts.active,       icon: <PeopleRoundedIcon /> },
    { label: "On trial",        value: data.counts.trialing,     icon: <HourglassEmptyRoundedIcon /> },
  ];

  return (
    <div>
      <h1 className="adm-page-title">Billing</h1>
      <p className="adm-page-sub">Revenue and subscriptions across the platform.</p>

      {/* ── headline cards ─────────────────────────────────── */}
      <div className="adb-grid">
        {cards.map((c) => (
          <div className="adb-card" key={c.label}>
            <span className={`adb-card__icon ${c.accent ? "adb-card__icon--accent" : ""}`}>
              {c.icon}
            </span>
            <span className="adb-card__value">{c.value}</span>
            <span className="adb-card__label adb-mono">{c.label}</span>
            {c.sub && <span className="adb-card__sub">{c.sub}</span>}
          </div>
        ))}
      </div>

      {/* small status strip */}
      <div className="adb-strip">
        <span className="adb-strip__item">
          <span className="adb-dot adb-dot--pastdue" /> {data.counts.pastDue} past due
        </span>
        <span className="adb-strip__item">
          <span className="adb-dot adb-dot--canceled" /> {data.counts.canceled} canceled
        </span>
        <span className="adb-strip__item adb-mono">{data.counts.total} companies total</span>
      </div>

      {/* ── per-plan breakdown ─────────────────────────────── */}
      <div className="adb-section">
        <h2 className="adb-section__title">By plan</h2>
        <div className="adb-plans">
          {data.planStats.map((p) => (
            <div className="adb-plan" key={p.id}>
              <div className="adb-plan__head">
                <span className="adb-plan__name">{p.name}</span>
                <span className="adb-plan__mrr adb-mono">{money(p.mrr)}/mo</span>
              </div>
              <div className="adb-bar">
                <div
                  className="adb-bar__fill"
                  style={{ width: `${(p.mrr / maxPlanMrr) * 100}%` }}
                />
              </div>
              <span className="adb-plan__count">
                {p.active} active subscription{p.active === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── recent activity ────────────────────────────────── */}
      <div className="adb-section">
        <h2 className="adb-section__title">Recent subscription activity</h2>

        {data.recent.length === 0 ? (
          <div className="adb-empty">No subscriptions yet — paid plans will appear here.</div>
        ) : (
          <div className="adb-table">
            {data.recent.map((r) => (
              <div className="adb-row" key={r._id}>
                {r.logo ? (
                  <img src={r.logo} alt="" className="adb-logo" />
                ) : (
                  <span className="adb-logo adb-logo--fallback">
                    {r.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}

                <span className="adb-row__name">{r.name}</span>

                <span className="adb-row__plan">
                  {r.planName}
                  {r.interval && <span className="adb-row__interval"> · {r.interval === "year" ? "annual" : "monthly"}</span>}
                </span>

                <span className="adb-row__renew">{fmtDate(r.currentPeriodEnd)}</span>

                <span className={`adb-status adb-status--${r.status}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}