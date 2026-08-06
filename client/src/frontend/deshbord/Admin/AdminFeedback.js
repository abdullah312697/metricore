import { useEffect, useState, useCallback } from "react";
import ChevronLeftRoundedIcon  from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon        from "@mui/icons-material/CloseRounded";
import SendRoundedIcon         from "@mui/icons-material/SendRounded";
import { Altaxios } from "../../Altaxios";   // 👈 same depth as the other admin files
import "../../../style/Admin/AdminFeedback.css";

/* ═══════════════════════════════════════════════════════════════
   AdminFeedback — /admin/feedback
   Queue sorted unresolved-newest-first (server-side). Status filter
   chips with live counts, type filter, pager, and a detail modal
   with status control + reply (optionally emailed to the company).
═══════════════════════════════════════════════════════════════ */

const STATUS_META = {
  open:        { label: "Open" },
  in_progress: { label: "In progress" },
  resolved:    { label: "Resolved" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function AdminFeedback() {
  const [status, setStatus] = useState("all");
  const [type,   setType]   = useState("all");
  const [page,   setPage]   = useState(1);

  const [data,    setData]    = useState({ tickets: [], total: 0, pages: 1, counts: {} });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [detail,    setDetail]    = useState(null);
  const [replyText, setReplyText] = useState("");
  const [emailToo,  setEmailToo]  = useState(true);
  const [acting,    setActing]    = useState(false);
  const [note,      setNote]      = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Altaxios.get("/admin/feedback", { params: { status, type, page } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load tickets."))
      .finally(() => setLoading(false));
  }, [status, type, page]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (t) => {
    setDetail(t);
    setReplyText("");
    setEmailToo(true);
    setNote("");
  };

  const patchTicket = async (body, successNote) => {
    if (!detail?._id) return;
    setActing(true);
    setNote("");
    try {
      const res = await Altaxios.patch(`/admin/feedback/${detail._id}`, body);
      const t = res.data.ticket;
      setDetail((d) => ({ ...d, ...t }));
      setNote(successNote || res.data.message);
      load();   // refresh list + counts (sort may have changed)
    } catch (err) {
      setNote(err.response?.data?.message || "Failed to update ticket.");
    } finally {
      setActing(false);
    }
  };

  const setTicketStatus = (s) => {
    if (detail?.status === s) return;
    patchTicket({ status: s });
  };

  const sendReply = () => {
    const text = replyText.trim();
    if (!text) return;
    patchTicket({ reply: text, emailCompany: emailToo });
    setReplyText("");
  };

  const chips = [
    { id: "all",         label: "All",         n: data.total },
    { id: "open",        label: "Open",        n: data.counts.open ?? 0 },
    { id: "in_progress", label: "In progress", n: data.counts.in_progress ?? 0 },
    { id: "resolved",    label: "Resolved",    n: data.counts.resolved ?? 0 },
  ];

  return (
    <div>
      <h1 className="adm-page-title">Feedback</h1>
      <p className="adm-page-sub">
        Complaints, bugs and requests from your companies — unresolved first, newest on top.
      </p>

      {/* ── filters ────────────────────────────────────────── */}
      <div className="adf-toolbar">
        <div className="adf-chips">
          {chips.map((c) => (
            <button
              key={c.id}
              className={`adf-filter ${status === c.id ? "adf-filter--on" : ""}`}
              onClick={() => { setStatus(c.id); setPage(1); }}
            >
              {c.label}
              <span className="adf-filter__n adf-mono">{c.n}</span>
            </button>
          ))}
        </div>

        <select
          className="adf-type"
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
        >
          <option value="all">All types</option>
          <option value="complaint">Complaints</option>
          <option value="bug">Bugs</option>
          <option value="feature">Features</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* ── queue ──────────────────────────────────────────── */}
      {error ? (
        <div className="adf-error">
          <p>{error}</p>
          <button className="adf-retry" onClick={load}>Try again</button>
        </div>
      ) : loading ? (
        <div className="adm-ghost-grid adf-ghosts">
          {[...Array(4)].map((_, i) => <div className="adm-ghost" key={i} />)}
        </div>
      ) : data.tickets.length === 0 ? (
        <div className="adf-empty">No tickets here. Quiet is good.</div>
      ) : (
        <div className="adf-table">
          {data.tickets.map((t) => (
            <button className="adf-row" key={t._id} onClick={() => openDetail(t)}>
              {t.company.logo ? (
                <img src={t.company.logo} alt="" className="adf-logo" />
              ) : (
                <span className="adf-logo adf-logo--fallback">
                  {t.company.name?.[0]?.toUpperCase() || "?"}
                </span>
              )}

              <span className="adf-what">
                <span className="adf-what__subject">{t.subject}</span>
                <span className="adf-what__company">
                  {t.company.name}{t.employeeName ? ` · ${t.employeeName}` : ""}
                </span>
              </span>

              <span className={`adf-tag adf-tag--${t.type}`}>{t.type}</span>
              <span className="adf-date">{fmt(t.createdAt)}</span>
              <span className={`adf-status adf-status--${t.status}`}>
                {STATUS_META[t.status]?.label || t.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── pager ──────────────────────────────────────────── */}
      {data.pages > 1 && (
        <div className="adf-pager">
          <button className="adf-pager__btn" disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
            <ChevronLeftRoundedIcon style={{ fontSize: 18 }} />
          </button>
          <span className="adf-pager__label adf-mono">Page {page} / {data.pages}</span>
          <button className="adf-pager__btn" disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)} aria-label="Next page">
            <ChevronRightRoundedIcon style={{ fontSize: 18 }} />
          </button>
        </div>
      )}

      {/* ── detail modal ───────────────────────────────────── */}
      {detail && (
        <div className="adf-overlay" onClick={() => setDetail(null)}>
          <div className="adf-modal" onClick={(e) => e.stopPropagation()}>

            <div className="adf-modal__head">
              <div className="adf-modal__who">
                <span className="adf-modal__subject">{detail.subject}</span>
                <span className="adf-modal__meta">
                  {detail.company.name}
                  {detail.employeeName ? ` · ${detail.employeeName}` : ""} · {fmt(detail.createdAt)}
                </span>
              </div>
              <button className="adf-modal__close" onClick={() => setDetail(null)} aria-label="Close">
                <CloseRoundedIcon style={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="adf-modal__body">
              <span className={`adf-tag adf-tag--${detail.type}`}>{detail.type}</span>

              <p className="adf-message">{detail.message}</p>

              {detail.adminReply && (
                <div className="adf-prev-reply">
                  <span className="adf-prev-reply__label adf-mono">
                    YOUR REPLY · {fmt(detail.adminRepliedAt)}
                  </span>
                  <p>{detail.adminReply}</p>
                </div>
              )}

              {/* status control */}
              <div className="adf-statusrow">
                {Object.entries(STATUS_META).map(([id, m]) => (
                  <button
                    key={id}
                    className={`adf-statusbtn adf-statusbtn--${id} ${detail.status === id ? "adf-statusbtn--on" : ""}`}
                    onClick={() => setTicketStatus(id)}
                    disabled={acting}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* reply */}
              <textarea
                className="adf-replybox"
                rows={4}
                maxLength={3000}
                placeholder={detail.adminReply ? "Write an updated reply…" : "Write a reply…"}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />

              <label className="adf-emailcheck">
                <input
                  type="checkbox"
                  checked={emailToo}
                  onChange={(e) => setEmailToo(e.target.checked)}
                />
                Also email this reply to {detail.company.email || "the company"}
              </label>

              {note && <p className="adf-note">{note}</p>}
            </div>

            <div className="adf-modal__foot">
              <button
                className="adf-send"
                onClick={sendReply}
                disabled={acting || !replyText.trim()}
              >
                <SendRoundedIcon style={{ fontSize: 16 }} />
                {acting ? "Working…" : "Send reply"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}