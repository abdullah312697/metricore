import { useState } from "react";
import { Link } from "react-router-dom";
import { Altaxios } from "../../Altaxios";
import "../../../style/PasswordFlow.css";

const EMAIL_RE =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function ForgotPassword() {
  const [email,       setEmail]       = useState("");
  const [error,       setError]       = useState("");
  const [serverError, setServerError] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [sentTo,      setSentTo]      = useState("");   // non-empty = success state

  const handleSubmit = async () => {
    if (!email.trim())            { setError("Email is required."); return; }
    if (!EMAIL_RE.test(email))    { setError("That doesn't look like a valid email address."); return; }

    setLoading(true);
    setServerError("");
    try {
      await Altaxios.post("/users/requestPasswordReset", { email: email.trim() });
      // Backend always answers 200 whether or not the account exists —
      // so this state never leaks which emails are registered.
      setSentTo(email.trim());
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
        "Couldn't send the reset email. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="pr-root">
      <div className="pr-wrap">

        <Link to="/" className="pr-brand">
          <span className="pr-brand__mark">M</span>
          <span className="pr-brand__name">MetriCore</span>
        </Link>

        <div className="pr-card">
          {sentTo ? (
            /* ── Success state ─────────────────────────────────── */
            <div className="pr-success">
              <span className="pr-success__icon">✉</span>
              <h1 className="pr-title">Check your email</h1>
              <p className="pr-text">
                If an account exists for <strong>{sentTo}</strong>, a password
                reset link is on its way. The link expires in <strong>30 minutes</strong>.
              </p>
              <p className="pr-text pr-text--dim">
                Nothing arriving? Check your spam folder, or send it again.
              </p>
              <div className="pr-actions">
                <button
                  className="pr-btn pr-btn--ghost"
                  onClick={() => { setSentTo(""); }}
                  disabled={loading}
                >
                  Send again
                </button>
                <Link to="/login" className="pr-btn pr-btn--primary">
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            /* ── Request form ──────────────────────────────────── */
            <>
              <h1 className="pr-title">Reset your password</h1>
              <p className="pr-sub">
                Enter your company account email and we'll send you a link
                to set a new password.
              </p>

              <div className="pr-field">
                <label className="pr-label" htmlFor="pr-email">Email</label>
                <input
                  id="pr-email"
                  type="email"
                  autoComplete="email"
                  className={`pr-input ${error ? "pr-input--error" : ""}`}
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); setServerError(""); }}
                  onKeyDown={onEnter}
                  autoFocus
                />
                {error && <span className="pr-error">{error}</span>}
              </div>

              {serverError && (
                <div className="pr-server-error" role="alert">{serverError}</div>
              )}

              <button className="pr-btn pr-btn--primary pr-btn--full" onClick={handleSubmit} disabled={loading}>
                {loading && <span className="pr-spinner" />}
                Send reset link
              </button>

              <div className="pr-note">
                <strong>Employee account?</strong> Password resets for employee
                logins are done by your workspace Owner or Admin from your
                profile page.
              </div>

              <p className="pr-foot">
                Remembered it after all?{" "}
                <Link to="/login" className="pr-link">Back to login</Link>
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}