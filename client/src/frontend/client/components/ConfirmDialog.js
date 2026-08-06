import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../../../style/ConfirmDialog.css";

/* ═══════════════════════════════════════════════════════════════
   ConfirmDialog — reusable confirmation for ANY destructive action
   Rendered via a portal to document.body so it always sits above
   scroll containers, sticky columns, and overflow:hidden parents.

   Props:
   open          boolean   — dialog visible
   title         string    — heading (e.g. 'Delete this goal?')
   message       string    — explains exactly what will happen
   error         string    — optional server error shown in red
   confirmLabel  string    — action button text (default "Delete")
   cancelLabel   string    — default "Cancel"
   variant       "danger" | "primary"  — danger = red confirm button
   loading       boolean   — disables buttons + shows spinner
   onConfirm     () => void
   onCancel      () => void
═══════════════════════════════════════════════════════════════ */
export default function ConfirmDialog({
  open,
  title        = "Are you sure?",
  message      = "",
  error        = "",
  confirmLabel = "Delete",
  cancelLabel  = "Cancel",
  variant      = "danger",
  loading      = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  // ── Escape closes (never while a request is in flight) ────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  // ── Lock body scroll while open ────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ── Focus lands on Cancel — the safe default for destructive UI ─
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="cfd-overlay"
      onMouseDown={(e) => {
        // click on the dark backdrop closes; click inside card does not
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        className="cfd-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cfd-title"
        aria-describedby={message ? "cfd-message" : undefined}
      >
        {/* Icon badge */}
        <div className={`cfd-icon cfd-icon--${variant}`}>
          {variant === "danger" ? "!" : "?"}
        </div>

        <h3 id="cfd-title" className="cfd-title">{title}</h3>

        {message && (
          <p id="cfd-message" className="cfd-message">{message}</p>
        )}

        {error && <p className="cfd-error">{error}</p>}

        <div className="cfd-actions">
          <button
            ref={cancelRef}
            className="cfd-btn cfd-btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            className={`cfd-btn cfd-btn--${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="cfd-spinner" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}