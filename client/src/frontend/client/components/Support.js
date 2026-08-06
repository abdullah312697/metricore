import { useEffect, useState, useCallback } from "react";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Altaxios } from "../../Altaxios";   // 👈 adjust to your folder depth
import "../../../style/Support.css";

/* ═══════════════════════════════════════════════════════════════
   Support — company-side ticket page (/company/:name/support).
   Left: submit a ticket. Right: your tickets + admin replies.
═══════════════════════════════════════════════════════════════ */

const TYPES = [
  { id: "complaint", label: "Complaint" },
  { id: "bug",       label: "Bug"       },
  { id: "feature",   label: "Feature"   },
  { id: "other",     label: "Other"     },
];

const STATUS_LABEL = { open: "Open", in_progress: "In progress", resolved: "Resolved" };

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function Support() {
  const [type,    setType]    = useState("complaint");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors,  setErrors]  = useState({});
  const [sending, setSending] = useState(false);
  const [flash,   setFlash]   = useState(false);

  const [tickets,     setTickets]     = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadTickets = useCallback(() => {
    setLoadingList(true);
    Altaxios.get("/feedback/myFeedback")
      .then((res) => setTickets(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const submit = async () => {
    const e = {};
    if (!subject.trim()) e.subject = "Subject is required.";
    if (!message.trim()) e.message = "Tell us what's going on.";
    if (Object.keys(e).length) { setErrors(e); return; }

    setSending(true);
    setErrors({});
    try {
      await Altaxios.post("/feedback/submitFeedback", {
        type,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject("");
      setMessage("");
      setType("complaint");
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
      loadTickets();
    } catch (err) {
      setErrors({ server: err.response?.data?.message || "Failed to submit. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sp-root">
      <div className="sp-container">

        <div className="sp-topbar">
          <span className="sp-eyebrow sp-mono">Support</span>
          <span className={`sp-flash ${flash ? "sp-flash--show" : ""}`}>✓ Ticket sent</span>
        </div>

        <div className="sp-grid">

          {/* ══ LEFT — submit ═══════════════════════════════ */}
          <div className="sp-form-card">
            <h1 className="sp-title">Contact the MetriCore team</h1>
            <p className="sp-sub">
              Found a bug, have a complaint, or want a feature? Send it here —
              replies appear on this page and by email.
            </p>

            <div className="sp-field">
              <label className="sp-label">Type</label>
              <div className="sp-types">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`sp-type ${type === t.id ? "sp-type--on" : ""}`}
                    onClick={() => setType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-subject">Subject</label>
              <input
                id="sp-subject"
                className={`sp-input ${errors.subject ? "sp-input--error" : ""}`}
                maxLength={120}
                placeholder="Short summary…"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: "" })); }}
              />
              {errors.subject && <span className="sp-error">{errors.subject}</span>}
            </div>

            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-message">Message</label>
              <textarea
                id="sp-message"
                className={`sp-input sp-textarea ${errors.message ? "sp-input--error" : ""}`}
                rows={7}
                maxLength={3000}
                placeholder="Describe it with as much detail as you can…"
                value={message}
                onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: "" })); }}
              />
              {errors.message && <span className="sp-error">{errors.message}</span>}
            </div>

            {errors.server && <div className="sp-server-error" role="alert">{errors.server}</div>}

            <button className="sp-btn" onClick={submit} disabled={sending || !subject.trim() || !message.trim()}>
              {sending ? <span className="sp-spinner" /> : <SendRoundedIcon style={{ fontSize: 17 }} />}
              Send ticket
            </button>
          </div>

          {/* ══ RIGHT — your tickets ════════════════════════ */}
          <aside className="sp-list-card">
            <div className="sp-list-head">
              <h2 className="sp-list-title">Your tickets</h2>
              {tickets.length > 0 && <span className="sp-count sp-mono">{tickets.length}</span>}
            </div>

            {loadingList ? (
              <p className="sp-list-empty sp-mono">LOADING…</p>
            ) : tickets.length === 0 ? (
              <p className="sp-list-empty">Nothing yet — your submitted tickets and our replies will appear here.</p>
            ) : (
              <div className="sp-list">
                {tickets.map((t) => (
                  <div className="sp-ticket" key={t._id}>
                    <div className="sp-ticket__top">
                      <span className={`sp-tag sp-tag--${t.type}`}>{t.type}</span>
                      <span className={`sp-status sp-status--${t.status}`}>
                        {STATUS_LABEL[t.status] || t.status}
                      </span>
                    </div>

                    <span className="sp-ticket__subject">{t.subject}</span>
                    <span className="sp-ticket__date">{fmtDate(t.createdAt)}</span>
                    <p className="sp-ticket__msg">{t.message}</p>

                    {t.adminReply && (
                      <div className="sp-reply">
                        <span className="sp-reply__label sp-mono">REPLY FROM METRICORE</span>
                        <p className="sp-reply__text">{t.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}