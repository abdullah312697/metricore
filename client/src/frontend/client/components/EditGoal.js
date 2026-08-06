import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon    from "@mui/icons-material/Delete";
import ConfirmDialog from "./ConfirmDialog";
import { Altaxios }  from "../../Altaxios";
import "../../../style/EditGoal.css";
import { ddmmyyyyToISO, toDDMMYYYY } from "../../../utils/dateFormat";
/* ── Date helpers — THE FIX ──────────────────────────────────────
   Backend stores "dd/MM/yyyy". <input type="date"> ONLY accepts
   "yyyy-MM-dd" and silently renders EMPTY for anything else —
   that's why your dates weren't showing. Convert both ways.      */

const fmtMoney = (n) => `$${Math.round(n).toLocaleString()}`;

// Shared breakdown math — inclusive days, matches backend's
// differenceInDays + 1
const computeBreakdown = (startISO, endISO, amount) => {
  const amt = Number(amount);
  if (!startISO || !endISO || !Number.isFinite(amt) || amt <= 0) return null;
  const start = new Date(startISO);
  const end   = new Date(endISO);
  if (end < start) return null;
  const days  = Math.round((end - start) / 86_400_000) + 1;
  const daily = amt / days;
  return { days, daily, weekly: daily * 7, monthly: daily * 30, amount: amt };
};

export default function EditGoal() {
  const { companyName, goalId } = useParams();
  const navigate = useNavigate();

  // ── Server copy + editable draft ────────────────────────────────
  const [original, setOriginal] = useState(null); // { targetName, startISO, endISO, targetAmount }
  const [draft,    setDraft]    = useState({ targetName: "", startISO: "", endISO: "", targetAmount: "" });

  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");

  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);

  // ── Delete state (logic unchanged from your working version) ───
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ── Fetch goal ──────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Altaxios.get(`/setgole/getOneGoal/${goalId}`)
      .then((res) => {
        const g = res.data; // getOneGoal returns the raw goal object
        const loaded = {
          targetName:   g.targetName   || "",
          startISO:     ddmmyyyyToISO(g.targetStartDate),  // 👈 the fix
          endISO:       ddmmyyyyToISO(g.targetEndDate),    // 👈 the fix
          targetAmount: g.targetAmount ?? "",
        };
        setOriginal(loaded);
        setDraft({ ...loaded, targetAmount: String(loaded.targetAmount) });
      })
      .catch((err) =>
        setLoadError(err.response?.data?.message || "Failed to load this goal")
      )
      .finally(() => setLoading(false));
  }, [goalId]);

  // ── Dirty tracking — Update stays disabled until something changed
  const isDirty = useMemo(() => {
    if (!original) return false;
    return (
      draft.targetName.trim()        !== original.targetName ||
      draft.startISO                 !== original.startISO   ||
      draft.endISO                   !== original.endISO     ||
      Number(draft.targetAmount)     !== Number(original.targetAmount)
    );
  }, [draft, original]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "targetAmount" && value.length > 17) return; // keep your cap
    setDraft((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError)  setServerError("");
  };

  const handleDiscard = () => {
    setDraft({ ...original, targetAmount: String(original.targetAmount) });
    setErrors({});
    setServerError("");
  };

  // ── Live breakdowns: draft (new) vs original (current) ─────────
  const newBreakdown = useMemo(
    () => computeBreakdown(draft.startISO, draft.endISO, draft.targetAmount),
    [draft.startISO, draft.endISO, draft.targetAmount]
  );
  const currentBreakdown = useMemo(
    () => original
      ? computeBreakdown(original.startISO, original.endISO, original.targetAmount)
      : null,
    [original]
  );

  const dailyChanged =
    newBreakdown && currentBreakdown &&
    Math.round(newBreakdown.daily) !== Math.round(currentBreakdown.daily);

  // ── Validation — mirrors the backend ────────────────────────────
  const validate = () => {
    const e = {};
    if (!draft.targetName.trim()) e.targetName = "Goal name is required.";
    if (!draft.startISO)          e.startISO   = "Start date is required.";
    if (!draft.endISO)            e.endISO     = "End date is required.";
    if (draft.startISO && draft.endISO && draft.startISO > draft.endISO)
      e.endISO = "End date must be on or after the start date.";
    const amt = Number(draft.targetAmount);
    if (!draft.targetAmount || !Number.isFinite(amt) || amt <= 0)
      e.targetAmount = "Enter a revenue target greater than zero.";
    return e;
  };

  // ── Update ──────────────────────────────────────────────────────
  const handleUpdate = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError("");
    try {
      const res = await Altaxios.put(`/setgole/updateGoles/${goalId}`, {
        targetName:      draft.targetName.trim(),
        targetStartDate: toDDMMYYYY(draft.startISO),
        targetEndDate:   toDDMMYYYY(draft.endISO),
        targetAmount:    Number(draft.targetAmount),
      });

      // Backend returns { data, message } — sync both copies from data
      const g = res.data.data;
      const updated = {
        targetName:   g.targetName   || "",
        startISO:     ddmmyyyyToISO(g.targetStartDate),
        endISO:       ddmmyyyyToISO(g.targetEndDate),
        targetAmount: g.targetAmount ?? "",
      };
      setOriginal(updated);
      setDraft({ ...updated, targetAmount: String(updated.targetAmount) });

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      // Keep the user's edits so they can fix and retry —
      // wiping the form on error (the old behavior) loses their work
      setServerError(err.response?.data?.message || "Failed to update goal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete — your working logic, unchanged ─────────────────────
  const handleDeleteGoal = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await Altaxios.delete(`/setgole/deleteGoal/${goalId}`);
      navigate(`/company/${companyName}`, { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete goal. Please try again.");
      setDeleting(false); // only on failure — success navigates away
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="eg-root">
        <div className="eg-loading eg-mono">LOADING GOAL…</div>
      </div>
    );
  }

  if (loadError || !original) {
    return (
      <div className="eg-root">
        <div className="eg-load-error">
          <p>{loadError || "Goal not found."}</p>
          <Link to={`/company/${companyName}`} className="eg-btn eg-btn--ghost">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="eg-root">
      <div className="eg-container">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="eg-topbar">
          <Link to={`/company/${companyName}`} className="eg-back" aria-label="Back to dashboard">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </Link>
          <span className="eg-eyebrow eg-mono">Edit goal</span>
          <span className={`eg-saved-flash ${savedFlash ? "eg-saved-flash--show" : ""}`}>
            ✓ Saved
          </span>
        </div>

        <header className="eg-header">
          <h1 className="eg-title">{original.targetName}</h1>
          <p className="eg-sub">
            Adjust the target — the breakdown updates live as you type.
          </p>
        </header>

        <div className="eg-grid">

          {/* ══ FORM ═══════════════════════════════════════════ */}
          <div className="eg-form-card">

            <div className="eg-field">
              <label className="eg-label" htmlFor="eg-name">Goal name</label>
              <input
                id="eg-name"
                name="targetName"
                type="text"
                className={`eg-input ${errors.targetName ? "eg-input--error" : ""}`}
                value={draft.targetName}
                onChange={handleChange}
                maxLength={80}
              />
              {errors.targetName && <span className="eg-error">{errors.targetName}</span>}
            </div>

            <div className="eg-form-row">
              <div className="eg-field">
                <label className="eg-label" htmlFor="eg-start">Start date</label>
                <input
                  id="eg-start"
                  name="startISO"
                  type="date"
                  className={`eg-input ${errors.startISO ? "eg-input--error" : ""}`}
                  value={draft.startISO}
                  onChange={handleChange}
                />
                {errors.startISO && <span className="eg-error">{errors.startISO}</span>}
              </div>

              <div className="eg-field">
                <label className="eg-label" htmlFor="eg-end">End date</label>
                <input
                  id="eg-end"
                  name="endISO"
                  type="date"
                  className={`eg-input ${errors.endISO ? "eg-input--error" : ""}`}
                  value={draft.endISO}
                  onChange={handleChange}
                  min={draft.startISO || undefined}
                />
                {errors.endISO && <span className="eg-error">{errors.endISO}</span>}
              </div>
            </div>

            <div className="eg-field">
              <label className="eg-label" htmlFor="eg-amount">
                Revenue target
                <span className="eg-label__hint">Total amount to earn in this period</span>
              </label>
              <div className="eg-prefix-wrap">
                <span className="eg-prefix eg-mono">$</span>
                <input
                  id="eg-amount"
                  name="targetAmount"
                  type="number"
                  min="1"
                  className={`eg-input eg-input--prefixed ${errors.targetAmount ? "eg-input--error" : ""}`}
                  value={draft.targetAmount}
                  onChange={handleChange}
                />
              </div>
              {errors.targetAmount && <span className="eg-error">{errors.targetAmount}</span>}
            </div>

            {serverError && (
              <div className="eg-server-error" role="alert">{serverError}</div>
            )}

            <div className="eg-actions">
              {isDirty && (
                <button
                  className="eg-btn eg-btn--ghost"
                  onClick={handleDiscard}
                  disabled={saving}
                >
                  Discard changes
                </button>
              )}
              <button
                className="eg-btn eg-btn--primary"
                onClick={handleUpdate}
                disabled={!isDirty || saving}
              >
                {saving && <span className="eg-spinner" />}
                Update goal
              </button>
            </div>

          </div>

          {/* ══ LIVE BREAKDOWN — new vs current ════════════════ */}
          <aside className="eg-breakdown">
            <span className="eg-breakdown__label eg-mono">Target breakdown</span>

            {newBreakdown ? (
              <>
                <div className="eg-breakdown__hero">
                  <span className="eg-breakdown__hero-val eg-mono">
                    {fmtMoney(newBreakdown.daily)}
                  </span>
                  <span className="eg-breakdown__hero-key eg-mono">per day</span>
                  {dailyChanged && (
                    <span className="eg-breakdown__was eg-mono">
                      was ≈ {fmtMoney(currentBreakdown.daily)}/day
                    </span>
                  )}
                </div>

                <div className="eg-breakdown__rows">
                  <div className="eg-breakdown__row">
                    <span className="eg-breakdown__key eg-mono">DURATION</span>
                    <span className="eg-breakdown__val eg-mono">
                      {newBreakdown.days} day{newBreakdown.days !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="eg-breakdown__row">
                    <span className="eg-breakdown__key eg-mono">PER WEEK</span>
                    <span className="eg-breakdown__val eg-mono">≈ {fmtMoney(newBreakdown.weekly)}</span>
                  </div>
                  <div className="eg-breakdown__row">
                    <span className="eg-breakdown__key eg-mono">PER MONTH</span>
                    <span className="eg-breakdown__val eg-mono">≈ {fmtMoney(newBreakdown.monthly)}</span>
                  </div>
                  <div className="eg-breakdown__row eg-breakdown__row--total">
                    <span className="eg-breakdown__key eg-mono">TOTAL</span>
                    <span className="eg-breakdown__val eg-mono">{fmtMoney(newBreakdown.amount)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="eg-breakdown__empty">
                <span className="eg-breakdown__empty-icon">◎</span>
                <p>Fix the dates and amount to see the daily target.</p>
              </div>
            )}
          </aside>

        </div>

        {/* ══ DANGER ZONE ══════════════════════════════════════ */}
        <div className="eg-danger-zone">
          <div className="eg-danger-zone__copy">
            <h4>Delete this goal</h4>
            <p>Removes the goal and its custom field configuration. Products stay in your account.</p>
          </div>
          <button
            type="button"
            className="eg-danger-zone__btn"
            onClick={() => { setDeleteError(""); setConfirmOpen(true); }}
          >
            <DeleteIcon style={{ fontSize: 18 }} />
            Delete goal
          </button>
        </div>

      </div>

      {/* ── Confirm deletion ─────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this goal?"
        message={`"${original?.targetName || "This goal"}" and its custom field configuration will be permanently deleted. Products stay in your account but are detached from this goal.`}
        error={deleteError}
        confirmLabel="Delete goal"
        loading={deleting}
        onConfirm={handleDeleteGoal}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}