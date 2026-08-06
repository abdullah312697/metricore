import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Altaxios } from "../../Altaxios";
import "../../../style/SetTarget.css";
import { toDDMMYYYY } from "../../../utils/dateFormat";

const fmtMoney = (n) =>
  `$${Math.round(n).toLocaleString()}`;

export default function SetTarget() {
  const { companyName } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    targetName:   "",
    startDate:    "",
    endDate:      "",
    targetAmount: "",
  });
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [saving,      setSaving]      = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError)  setServerError("");
  };

  /* ── THE SIGNATURE — live target breakdown ─────────────────────
     Recomputes as the user types: duration + what they must earn
     per day / week / month to hit the goal. The page teaches the
     product's core idea before the goal even exists.              */
  const breakdown = useMemo(() => {
    const amount = Number(form.targetAmount);
    if (!form.startDate || !form.endDate) return null;
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const start = new Date(form.startDate);
    const end   = new Date(form.endDate);
    if (end < start) return null;

    // inclusive day count — matches the backend's differenceInDays + 1
    const days  = Math.round((end - start) / 86_400_000) + 1;
    const daily = amount / days;

    return {
      days,
      daily:   daily,
      weekly:  daily * 7,
      monthly: daily * 30,
      amount,
    };
  }, [form.startDate, form.endDate, form.targetAmount]);

  // ── Client validation — mirrors the backend rules ─────────────
  const validate = () => {
    const e = {};
    if (!form.targetName.trim()) e.targetName = "Goal name is required.";
    if (!form.startDate)         e.startDate  = "Start date is required.";
    if (!form.endDate)           e.endDate    = "End date is required.";
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      e.endDate = "End date must be on or after the start date.";
    const amt = Number(form.targetAmount);
    if (!form.targetAmount || !Number.isFinite(amt) || amt <= 0)
      e.targetAmount = "Enter a revenue target greater than zero.";
    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError("");
    try {
      // New API shape: { message, data } — we navigate, so no
      // rendering of the response object (the old crash source)
      await Altaxios.post("/setgole/addNewGoles", {
        targetName:      form.targetName.trim(),
        targetStartDate: toDDMMYYYY(form.startDate),
        targetEndDate:   toDDMMYYYY(form.endDate),
        targetAmount:    Number(form.targetAmount),
      });
      navigate(`/company/${companyName}`); // goals list refetches on mount
    } catch (err) {
      setServerError(
        err.response?.data?.message || "Failed to create goal. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sg-root">
      <div className="sg-container">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="sg-topbar">
          <Link to={`/company/${companyName}`} className="sg-back" aria-label="Back to dashboard">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </Link>
          <span className="sg-eyebrow sg-mono">New goal</span>
        </div>

        <header className="sg-header">
          <h1 className="sg-title">Create a goal</h1>
          <p className="sg-sub">
            Set a revenue target with a timeframe — MetriCore breaks it
            down into what you need to earn each day.
          </p>
        </header>

        <div className="sg-grid">

          {/* ══ FORM ═══════════════════════════════════════════ */}
          <div className="sg-form-card">

            <div className="sg-field">
              <label className="sg-label" htmlFor="sg-name">Goal name</label>
              <input
                id="sg-name"
                name="targetName"
                type="text"
                className={`sg-input ${errors.targetName ? "sg-input--error" : ""}`}
                placeholder='e.g. "Q3 Revenue Target" or "Eid Campaign"'
                value={form.targetName}
                onChange={handleChange}
                maxLength={80}
                autoFocus
              />
              {errors.targetName && <span className="sg-error">{errors.targetName}</span>}
            </div>

            <div className="sg-form-row">
              <div className="sg-field">
                <label className="sg-label" htmlFor="sg-start">Start date</label>
                <input
                  id="sg-start"
                  name="startDate"
                  type="date"
                  className={`sg-input ${errors.startDate ? "sg-input--error" : ""}`}
                  value={form.startDate}
                  onChange={handleChange}
                />
                {errors.startDate && <span className="sg-error">{errors.startDate}</span>}
              </div>

              <div className="sg-field">
                <label className="sg-label" htmlFor="sg-end">End date</label>
                <input
                  id="sg-end"
                  name="endDate"
                  type="date"
                  className={`sg-input ${errors.endDate ? "sg-input--error" : ""}`}
                  value={form.endDate}
                  onChange={handleChange}
                  min={form.startDate || undefined}
                />
                {errors.endDate && <span className="sg-error">{errors.endDate}</span>}
              </div>
            </div>

            <div className="sg-field">
              <label className="sg-label" htmlFor="sg-amount">
                Revenue target
                <span className="sg-label__hint">Total amount to earn in this period</span>
              </label>
              <div className="sg-prefix-wrap">
                <span className="sg-prefix sg-mono">$</span>
                <input
                  id="sg-amount"
                  name="targetAmount"
                  type="number"
                  min="1"
                  className={`sg-input sg-input--prefixed ${errors.targetAmount ? "sg-input--error" : ""}`}
                  placeholder="10000"
                  value={form.targetAmount}
                  onChange={handleChange}
                />
              </div>
              {errors.targetAmount && <span className="sg-error">{errors.targetAmount}</span>}
            </div>

            {serverError && (
              <div className="sg-server-error" role="alert">{serverError}</div>
            )}

            <button
              className="sg-btn sg-btn--primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving && <span className="sg-spinner" />}
              Create goal
            </button>

          </div>

          {/* ══ LIVE BREAKDOWN ═════════════════════════════════ */}
          <aside className="sg-breakdown">
            <span className="sg-breakdown__label sg-mono">Target breakdown</span>

            {breakdown ? (
              <>
                <div className="sg-breakdown__hero">
                  <span className="sg-breakdown__hero-val sg-mono">
                    {fmtMoney(breakdown.daily)}
                  </span>
                  <span className="sg-breakdown__hero-key sg-mono">per day</span>
                </div>

                <div className="sg-breakdown__rows">
                  <div className="sg-breakdown__row">
                    <span className="sg-breakdown__key sg-mono">DURATION</span>
                    <span className="sg-breakdown__val sg-mono">
                      {breakdown.days} day{breakdown.days !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="sg-breakdown__row">
                    <span className="sg-breakdown__key sg-mono">PER WEEK</span>
                    <span className="sg-breakdown__val sg-mono">≈ {fmtMoney(breakdown.weekly)}</span>
                  </div>
                  <div className="sg-breakdown__row">
                    <span className="sg-breakdown__key sg-mono">PER MONTH</span>
                    <span className="sg-breakdown__val sg-mono">≈ {fmtMoney(breakdown.monthly)}</span>
                  </div>
                  <div className="sg-breakdown__row sg-breakdown__row--total">
                    <span className="sg-breakdown__key sg-mono">TOTAL</span>
                    <span className="sg-breakdown__val sg-mono">{fmtMoney(breakdown.amount)}</span>
                  </div>
                </div>

                <p className="sg-breakdown__note">
                  Weekly and monthly figures are 7-day / 30-day estimates.
                </p>
              </>
            ) : (
              <div className="sg-breakdown__empty">
                <span className="sg-breakdown__empty-icon">◎</span>
                <p>Fill in the dates and target amount to see what you need to earn per day.</p>
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}