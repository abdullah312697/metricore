import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import VisibilityOutlinedIcon    from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { Altaxios } from "../../Altaxios";
import "../../../style/PasswordFlow.css";

/* Same rules as Register — mirrors the backend regex exactly */
const PASSWORD_RULES = [
  { re: /.{8,}/,     label: "At least 8 characters" },
  { re: /[A-Z]/,     label: "One uppercase letter (A–Z)" },
  { re: /[a-z]/,     label: "One lowercase letter (a–z)" },
  { re: /\d/,        label: "One number (0–9)" },
  { re: /[@$!%*?&]/, label: "One special character (@ $ ! % * ? &)" },
];

const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function ResetPassword() {
  const { token } = useParams();          // /reset-password/:token
  const navigate  = useNavigate();

  const [password,    setPassword]    = useState("");
  const [rePassword,  setRePassword]  = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);

  const validate = () => {
    const e = {};
    if (!password)                          e.password   = "Password is required.";
    else if (!STRONG_PASSWORD.test(password))
      e.password = "Password doesn't meet all the requirements below.";
    if (password !== rePassword)            e.rePassword = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError("");
    try {
      await Altaxios.post("/users/resetPassword", {
        token,
        newPassword: password,
      });
      setDone(true);
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
        "Couldn't reset your password. Please try again."
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
          {done ? (
            /* ── Success ───────────────────────────────────────── */
            <div className="pr-success">
              <span className="pr-success__icon">✓</span>
              <h1 className="pr-title">Password updated</h1>
              <p className="pr-text">
                Your password has been changed. Log in with your new
                password to get back to your workspace.
              </p>
              <button
                className="pr-btn pr-btn--primary pr-btn--full"
                onClick={() => navigate("/login")}
              >
                Go to login
              </button>
            </div>
          ) : (
            /* ── Form ──────────────────────────────────────────── */
            <>
              <h1 className="pr-title">Choose a new password</h1>
              <p className="pr-sub">
                Set a new password for your company account. This link
                works once and expires 30 minutes after it was sent.
              </p>

              {/* New password */}
              <div className="pr-field">
                <label className="pr-label" htmlFor="pr-pass">New password</label>
                <div className="pr-pass-wrap">
                  <input
                    id="pr-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    className={`pr-input ${errors.password ? "pr-input--error" : ""}`}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((p) => ({ ...p, password: "" }));
                      setServerError("");
                    }}
                    onKeyDown={onEnter}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="pr-pass-toggle"
                    onClick={() => setShowPass((p) => !p)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass
                      ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} />
                      : <VisibilityOutlinedIcon    style={{ fontSize: 18 }} />}
                  </button>
                </div>
                {errors.password && <span className="pr-error">{errors.password}</span>}

                {/* Live checklist */}
                {password && (
                  <ul className="pr-checklist">
                    {PASSWORD_RULES.map((rule) => {
                      const pass = rule.re.test(password);
                      return (
                        <li key={rule.label} className={`pr-check ${pass ? "pr-check--pass" : ""}`}>
                          <span className="pr-check__dot">{pass ? "✓" : ""}</span>
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Confirm */}
              <div className="pr-field">
                <label className="pr-label" htmlFor="pr-repass">Confirm new password</label>
                <input
                  id="pr-repass"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  className={`pr-input ${errors.rePassword ? "pr-input--error" : ""}`}
                  placeholder="Retype your password"
                  value={rePassword}
                  onChange={(e) => {
                    setRePassword(e.target.value);
                    setErrors((p) => ({ ...p, rePassword: "" }));
                  }}
                  onKeyDown={onEnter}
                />
                {errors.rePassword && <span className="pr-error">{errors.rePassword}</span>}
              </div>

              {serverError && (
                <div className="pr-server-error" role="alert">
                  {serverError}{" "}
                  <Link to="/forgot-password" className="pr-link">Request a new link</Link>
                </div>
              )}

              <button className="pr-btn pr-btn--primary pr-btn--full" onClick={handleSubmit} disabled={loading}>
                {loading && <span className="pr-spinner" />}
                Update password
              </button>

              <p className="pr-foot">
                <Link to="/login" className="pr-link">Back to login</Link>
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}