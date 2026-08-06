import { useEffect, useState, useCallback } from "react";
import SearchRoundedIcon      from "@mui/icons-material/SearchRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon       from "@mui/icons-material/CloseRounded";
import BlockRoundedIcon       from "@mui/icons-material/BlockRounded";
import { Altaxios } from "../../Altaxios";   // 👈 same depth as the other admin files
import "../../../style/Admin/AdminCompanies.css";

/* ═══════════════════════════════════════════════════════════════
   AdminCompanies — /admin/companies
   Search + sort + paginated directory. Row click opens a detail
   modal with the suspend/unsuspend switch (two-click confirm).
═══════════════════════════════════════════════════════════════ */

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function AdminCompanies() {
  const [q,        setQ]        = useState("");
  const [debQ,     setDebQ]     = useState("");
  const [sort,     setSort]     = useState("newest");
  const [page,     setPage]     = useState(1);
  const [data,     setData]     = useState({ companies: [], total: 0, pages: 1 });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const [detail,     setDetail]     = useState(null);   // company object
  const [confirming, setConfirming] = useState(false);  // suspend confirm stage
  const [acting,     setActing]     = useState(false);

  // ── debounce the search box ─────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebQ(q); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // ── fetch list ──────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Altaxios.get("/admin/companies", { params: { q: debQ, sort, page } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load companies."))
      .finally(() => setLoading(false));
  }, [debQ, sort, page]);

  useEffect(() => { load(); }, [load]);

  // ── open detail (fresh fetch for live counts) ───────────────
  const openDetail = (id) => {
    setDetail({ _loading: true });
    setConfirming(false);
    Altaxios.get(`/admin/companies/${id}`)
      .then((res) => setDetail(res.data.company))
      .catch(() => setDetail(null));
  };

  // ── suspend / unsuspend ─────────────────────────────────────
  const toggleSuspend = async () => {
    if (!detail?._id) return;
    if (!detail.suspended && !confirming) { setConfirming(true); return; }

    setActing(true);
    try {
      const res = await Altaxios.patch(`/admin/companies/${detail._id}/suspend`, {
        suspended: !detail.suspended,
      });
      const updated = res.data.company;
      setDetail((d) => ({ ...d, suspended: updated.suspended }));
      setData((prev) => ({
        ...prev,
        companies: prev.companies.map((c) =>
          c._id === updated._id ? { ...c, suspended: updated.suspended } : c
        ),
      }));
      setConfirming(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update company.");
    } finally {
      setActing(false);
    }
  };

  const closeDetail = () => { setDetail(null); setConfirming(false); };

  return (
    <div>
      <h1 className="adm-page-title">Companies</h1>
      <p className="adm-page-sub">
        Every workspace on the platform — {data.total} total.
      </p>

      {/* ── toolbar: search + sort ─────────────────────────── */}
      <div className="adc-toolbar">
        <div className="adc-search">
          <SearchRoundedIcon style={{ fontSize: 18 }} />
          <input
            className="adc-search__input"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className="adc-sort"
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* ── table ──────────────────────────────────────────── */}
      {error ? (
        <div className="adc-error">
          <p>{error}</p>
          <button className="adc-retry" onClick={load}>Try again</button>
        </div>
      ) : loading ? (
        <div className="adm-ghost-grid adc-ghosts">
          {[...Array(4)].map((_, i) => <div className="adm-ghost" key={i} />)}
        </div>
      ) : data.companies.length === 0 ? (
        <div className="adc-empty">
          {debQ ? `No companies match “${debQ}”.` : "No companies yet."}
        </div>
      ) : (
        <div className="adc-table">
          <div className="adc-row adc-row--head">
            <span />
            <span>Company</span>
            <span className="adc-num">Employees</span>
            <span className="adc-num">Products</span>
            <span>Joined</span>
            <span>Status</span>
          </div>

          {data.companies.map((c) => (
            <button className="adc-row" key={c._id} onClick={() => openDetail(c._id)}>
              {c.logo ? (
                <img src={c.logo} alt="" className="adc-logo" />
              ) : (
                <span className="adc-logo adc-logo--fallback">
                  {c.name?.[0]?.toUpperCase() || "?"}
                </span>
              )}

              <span className="adc-who">
                <span className="adc-who__name">{c.name}</span>
                {c.email && <span className="adc-who__email">{c.email}</span>}
              </span>

              <span className="adc-num adc-mono">{c.employees}</span>
              <span className="adc-num adc-mono">{c.products}</span>
              <span className="adc-date">{fmtDate(c.createdAt)}</span>

              <span className="adc-status">
                {c.suspended ? (
                  <span className="adc-chip adc-chip--sus">Suspended</span>
                ) : c.verified ? (
                  <span className="adc-chip adc-chip--ok">Verified</span>
                ) : (
                  <span className="adc-chip adc-chip--pending">Pending</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── pagination ─────────────────────────────────────── */}
      {data.pages > 1 && (
        <div className="adc-pager">
          <button
            className="adc-pager__btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftRoundedIcon style={{ fontSize: 18 }} />
          </button>
          <span className="adc-pager__label adc-mono">
            Page {page} / {data.pages}
          </span>
          <button
            className="adc-pager__btn"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRightRoundedIcon style={{ fontSize: 18 }} />
          </button>
        </div>
      )}

      {/* ── detail modal ───────────────────────────────────── */}
      {detail && (
        <div className="adc-overlay" onClick={closeDetail}>
          <div className="adc-modal" onClick={(e) => e.stopPropagation()}>
            {detail._loading ? (
              <div className="adc-modal__loading adc-mono">LOADING…</div>
            ) : (
              <>
                <div className="adc-modal__head">
                  {detail.logo ? (
                    <img src={detail.logo} alt="" className="adc-modal__logo" />
                  ) : (
                    <span className="adc-modal__logo adc-logo--fallback">
                      {detail.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                  <div className="adc-modal__who">
                    <span className="adc-modal__name">{detail.name}</span>
                    {detail.email && <span className="adc-modal__email">{detail.email}</span>}
                  </div>
                  <button className="adc-modal__close" onClick={closeDetail} aria-label="Close">
                    <CloseRoundedIcon style={{ fontSize: 18 }} />
                  </button>
                </div>

                <div className="adc-modal__body">
                  <div className="adc-fact">
                    <span className="adc-fact__label adc-mono">Joined</span>
                    <span className="adc-fact__value">{fmtDate(detail.createdAt)}</span>
                  </div>
                  <div className="adc-fact">
                    <span className="adc-fact__label adc-mono">Email status</span>
                    <span className="adc-fact__value">
                      {detail.verified
                        ? <span className="adc-chip adc-chip--ok">Verified</span>
                        : <span className="adc-chip adc-chip--pending">Pending</span>}
                    </span>
                  </div>
                  <div className="adc-fact">
                    <span className="adc-fact__label adc-mono">Employees</span>
                    <span className="adc-fact__value adc-mono">{detail.employees}</span>
                  </div>
                  <div className="adc-fact">
                    <span className="adc-fact__label adc-mono">Products</span>
                    <span className="adc-fact__value adc-mono">{detail.products}</span>
                  </div>
                  <div className="adc-fact">
                    <span className="adc-fact__label adc-mono">Account</span>
                    <span className="adc-fact__value">
                      {detail.suspended
                        ? <span className="adc-chip adc-chip--sus">Suspended</span>
                        : <span className="adc-chip adc-chip--ok">Active</span>}
                    </span>
                  </div>
                </div>

                <div className="adc-modal__foot">
                  {detail.suspended ? (
                    <button
                      className="adc-btn adc-btn--restore"
                      onClick={toggleSuspend}
                      disabled={acting}
                    >
                      {acting ? "Working…" : "Unsuspend company"}
                    </button>
                  ) : (
                    <button
                      className={`adc-btn ${confirming ? "adc-btn--confirm" : "adc-btn--danger"}`}
                      onClick={toggleSuspend}
                      disabled={acting}
                    >
                      <BlockRoundedIcon style={{ fontSize: 16 }} />
                      {acting ? "Working…" : confirming ? "Confirm suspend — blocks all logins" : "Suspend company"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}