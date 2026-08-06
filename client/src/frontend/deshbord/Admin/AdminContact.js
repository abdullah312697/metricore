import { useEffect, useState, useCallback } from "react";
import ChevronLeftRoundedIcon  from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon        from "@mui/icons-material/CloseRounded";
import SendRoundedIcon         from "@mui/icons-material/SendRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MailOutlineRoundedIcon  from "@mui/icons-material/MailOutlineRounded";
import PhoneRoundedIcon        from "@mui/icons-material/PhoneRounded";
import { Altaxios } from "../../Altaxios";   // 👈 same depth as the other admin files
import "../../../style/Admin/AdminContact.css";

/* ═══════════════════════════════════════════════════════════════
   AdminContact — /admin/contact
   Public contact-form messages. Filter chips (all/unread/replied),
   detail modal with reply-by-email, mark read/unread, delete.
   Sibling of AdminFeedback — same shell classes (adm-page-title etc).
═══════════════════════════════════════════════════════════════ */

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const INTENT_LABEL = {
  support:  "Support",
  sales:    "Sales",
  security: "Security",
  other:    "Other",
};

export default function AdminContact() {
  const [filter, setFilter] = useState("all");
  const [page,   setPage]   = useState(1);

  const [data,    setData]    = useState({ messages: [], total: 0, pages: 1, counts: {} });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [detail,    setDetail]    = useState(null);
  const [replyText, setReplyText] = useState("");
  const [emailToo,  setEmailToo]  = useState(true);
  const [acting,    setActing]    = useState(false);
  const [note,      setNote]      = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Altaxios.get("/contact/getAllmessages", { params: { filter, page } })
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(typeof err.response?.data === "string" ? err.response.data : "Failed to load messages.")
      )
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  // opening a message marks it read if it wasn't
  const openDetail = (m) => {
    setDetail(m);
    setReplyText("");
    setEmailToo(true);
    setNote("");
    setConfirmDel(false);
    if (!m.isRead) {
      Altaxios.patch(`/contact/message/${m._id}/read`, { isRead: true })
        .then(() => {
          setData((prev) => ({
            ...prev,
            messages: prev.messages.map((x) => x._id === m._id ? { ...x, isRead: true } : x),
            counts: { ...prev.counts, unread: Math.max(0, (prev.counts.unread || 1) - 1) },
          }));
        })
        .catch(() => {});
    }
  };

  const sendReply = async () => {
    const text = replyText.trim();
    if (!text || !detail?._id) return;
    setActing(true);
    setNote("");
    try {
      const res = await Altaxios.put(`/contact/replayMessage/${detail._id}`, {
        sendReply: text,
        emailCustomer: emailToo,
      });
      const d = res.data.data;
      setDetail((prev) => ({ ...prev, ...d }));
      setNote(typeof res.data.message === "string" ? res.data.message : "Reply saved.");
      setReplyText("");
      load();
    } catch (err) {
      setNote(typeof err.response?.data === "string" ? err.response.data : "Failed to send reply.");
    } finally {
      setActing(false);
    }
  };

  const toggleRead = async () => {
    if (!detail?._id) return;
    try {
      const res = await Altaxios.patch(`/contact/message/${detail._id}/read`, { isRead: !detail.isRead });
      setDetail((prev) => ({ ...prev, isRead: res.data.data.isRead }));
      load();
    } catch { /* ignore */ }
  };

  const removeMessage = async () => {
    if (!detail?._id) return;
    if (!confirmDel) { setConfirmDel(true); return; }
    setActing(true);
    try {
      await Altaxios.delete(`/contact/deleteMessage/${detail._id}`);
      setDetail(null);
      load();
    } catch (err) {
      setNote(typeof err.response?.data === "string" ? err.response.data : "Failed to delete.");
    } finally {
      setActing(false);
    }
  };

  const chips = [
    { id: "all",     label: "All",     n: data.counts.all ?? 0 },
    { id: "unread",  label: "Unread",  n: data.counts.unread ?? 0 },
    { id: "replied", label: "Replied", n: data.counts.replied ?? 0 },
  ];

  return (
    <div>
      <h1 className="adm-page-title">Contact messages</h1>
      <p className="adm-page-sub">
        Messages from the public contact page — unread first, newest on top.
      </p>

      {/* ── filters ────────────────────────────────────────── */}
      <div className="acm-toolbar">
        {chips.map((c) => (
          <button
            key={c.id}
            className={`acm-filter ${filter === c.id ? "acm-filter--on" : ""}`}
            onClick={() => { setFilter(c.id); setPage(1); }}
          >
            {c.label}
            <span className="acm-filter__n acm-mono">{c.n}</span>
          </button>
        ))}
      </div>

      {/* ── list ───────────────────────────────────────────── */}
      {error ? (
        <div className="acm-error">
          <p>{error}</p>
          <button className="acm-retry" onClick={load}>Try again</button>
        </div>
      ) : loading ? (
        <div className="adm-ghost-grid acm-ghosts">
          {[...Array(4)].map((_, i) => <div className="adm-ghost" key={i} />)}
        </div>
      ) : data.messages.length === 0 ? (
        <div className="acm-empty">No messages here.</div>
      ) : (
        <div className="acm-table">
          {data.messages.map((m) => (
            <button className={`acm-row ${!m.isRead ? "acm-row--unread" : ""}`} key={m._id} onClick={() => openDetail(m)}>
              <span className="acm-dot-wrap">
                {!m.isRead && <span className="acm-dot" />}
              </span>

              <span className="acm-avatar">{m.fullname?.[0]?.toUpperCase() || "?"}</span>

              <span className="acm-who">
                <span className={`acm-who__name ${!m.isRead ? "acm-who__name--unread" : ""}`}>
                  {m.fullname}
                </span>
                <span className="acm-who__sub">
                  {m.subject || m.comment?.slice(0, 60) || m.email}
                </span>
              </span>

              {m.intent && (
                <span className={`acm-tag acm-tag--${m.intent}`}>
                  {INTENT_LABEL[m.intent] || m.intent}
                </span>
              )}

              {m.replay ? <span className="acm-replied acm-mono">Replied</span> : <span />}

              <span className="acm-date">{fmt(m.createdAt)}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── pager ──────────────────────────────────────────── */}
      {data.pages > 1 && (
        <div className="acm-pager">
          <button className="acm-pager__btn" disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
            <ChevronLeftRoundedIcon style={{ fontSize: 18 }} />
          </button>
          <span className="acm-pager__label acm-mono">Page {page} / {data.pages}</span>
          <button className="acm-pager__btn" disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)} aria-label="Next page">
            <ChevronRightRoundedIcon style={{ fontSize: 18 }} />
          </button>
        </div>
      )}

      {/* ── detail modal ───────────────────────────────────── */}
      {detail && (
        <div className="acm-overlay" onClick={() => setDetail(null)}>
          <div className="acm-modal" onClick={(e) => e.stopPropagation()}>

            <div className="acm-modal__head">
              <span className="acm-modal__avatar">{detail.fullname?.[0]?.toUpperCase() || "?"}</span>
              <div className="acm-modal__who">
                <span className="acm-modal__name">{detail.fullname}</span>
                <span className="acm-modal__meta">
                  {detail.intent ? `${INTENT_LABEL[detail.intent] || detail.intent} · ` : ""}{fmt(detail.createdAt)}
                </span>
              </div>
              <button className="acm-modal__close" onClick={() => setDetail(null)} aria-label="Close">
                <CloseRoundedIcon style={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="acm-modal__body">
              {/* contact chips */}
              <div className="acm-contacts">
                <a href={`mailto:${detail.email}`} className="acm-contact">
                  <MailOutlineRoundedIcon style={{ fontSize: 15 }} />
                  {detail.email}
                </a>
                {detail.phone && (
                  <a href={`tel:${detail.phone}`} className="acm-contact">
                    <PhoneRoundedIcon style={{ fontSize: 15 }} />
                    {detail.phone}
                  </a>
                )}
              </div>

              {detail.subject && <div className="acm-subject">{detail.subject}</div>}

              <p className="acm-message">{detail.comment}</p>

              {detail.replay && (
                <div className="acm-prev-reply">
                  <span className="acm-prev-reply__label acm-mono">
                    YOUR REPLY{detail.repliedAt ? ` · ${fmt(detail.repliedAt)}` : ""}
                  </span>
                  <p>{detail.replay}</p>
                </div>
              )}

              <textarea
                className="acm-replybox"
                rows={4}
                maxLength={3000}
                placeholder={detail.replay ? "Write an updated reply…" : "Write a reply…"}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />

              <label className="acm-emailcheck">
                <input type="checkbox" checked={emailToo} onChange={(e) => setEmailToo(e.target.checked)} />
                Email this reply to {detail.email}
              </label>

              {note && <p className="acm-note">{note}</p>}
            </div>

            <div className="acm-modal__foot">
              <button className="acm-ghostbtn" onClick={toggleRead} disabled={acting}>
                Mark {detail.isRead ? "unread" : "read"}
              </button>
              <button
                className={`acm-delbtn ${confirmDel ? "acm-delbtn--confirm" : ""}`}
                onClick={removeMessage}
                disabled={acting}
              >
                <DeleteOutlineRoundedIcon style={{ fontSize: 15 }} />
                {confirmDel ? "Confirm delete" : "Delete"}
              </button>
              <button className="acm-send" onClick={sendReply} disabled={acting || !replyText.trim()}>
                <SendRoundedIcon style={{ fontSize: 15 }} />
                {acting ? "Working…" : "Send reply"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}