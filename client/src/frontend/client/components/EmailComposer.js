import { useState, useEffect } from "react";
import { Altaxios } from "../../Altaxios";
import "../../../style/EmailComposer.css";

/* ═══════════════════════════════════════════════════════════════
   EmailComposer — one modal, two entry points.

   Group email (employee-list page):
     <EmailComposer open={open} onClose={close}
        recipients={selectedEmployees.map(e => ({ _id: e._id, name: e.YemplyeeName }))} />

   Single email (Employee profile page):
     <EmailComposer open={open} onClose={close}
        recipients={[{ _id: employee._id, name: employee.YemplyeeName }]} />

   Backend: POST /company/emailEmployees { employeeIds, subject, message }
   (manager-only; sends via mailer.js with recipients BCC'd for privacy).
═══════════════════════════════════════════════════════════════ */
export default function EmailComposer({ open, onClose, recipients = [] }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState(null);

  // Reset fields whenever the modal is opened fresh
  useEffect(() => {
    if (open) {
      setSubject("");
      setMessage("");
      setResult(null);
      setSending(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const count = recipients.length;

  const send = async () => {
    if (!count) {
      setResult({ ok: false, text: "No recipients selected." });
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setResult({ ok: false, text: "Subject and message are both required." });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const res = await Altaxios.post("/newemplyee/emailEmployees", {
        employeeIds: recipients.map((r) => r._id),
        subject:     subject.trim(),
        message:     message.trim(),
      });
      setResult({ ok: true, text: res.data.message || "Email sent." });
      setSubject("");
      setMessage("");
      setTimeout(onClose, 1500);
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.message || "Failed to send email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ec-overlay" onClick={onClose}>
      <div className="ec-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="ec-head">
          <h2 className="ec-title">
            {count === 1
              ? `Email ${recipients[0].name}`
              : `Email ${count} employee${count === 1 ? "" : "s"}`}
          </h2>
          <button className="ec-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Body (padded, scrollable) ──────────────────────── */}
        <div className="ec-body">
          <div className="ec-recipients">
            {recipients.slice(0, 6).map((r) => (
              <span className="ec-chip" key={r._id}>{r.name}</span>
            ))}
            {count > 6 && (
              <span className="ec-chip ec-chip--more">+{count - 6} more</span>
            )}
          </div>

          <input
            className="ec-input"
            type="text"
            placeholder="Subject"
            value={subject}
            maxLength={150}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
            autoFocus
          />

          <textarea
            className="ec-textarea"
            placeholder="Write your message…"
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />

          {result && (
            <p className={`ec-result ${result.ok ? "ec-result--ok" : "ec-result--err"}`}>
              {result.text}
            </p>
          )}
        </div>

        {/* ── Actions ────────────────────────────────────────── */}
        <div className="ec-actions">
          <button className="ec-btn ec-btn--ghost" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            className="ec-btn ec-btn--primary"
            onClick={send}
            disabled={sending || !subject.trim() || !message.trim()}
          >
            {sending ? "Sending…" : count > 1 ? `Send to ${count}` : "Send email"}
          </button>
        </div>

      </div>
    </div>
  );
}