import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import VisibilityOutlinedIcon    from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useAuth } from "../../../context/AuthContext";
import "../../../style/Login.css";
import logo from '../../../images/logo/metricore-icon-transparent.svg';

const EMAIL_RE =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form,        setForm]        = useState({ email: "", password: "" });
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [capsOn,      setCapsOn]      = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError)  setServerError("");
  };

  // ── Caps Lock detector — fires on any key inside the password ──
  const detectCaps = (e) => {
    if (e.getModifierState) setCapsOn(e.getModifierState("CapsLock"));
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim())            e.email    = "Email is required.";
    else if (!EMAIL_RE.test(form.email)) e.email  = "That doesn't look like a valid email address.";
    if (!form.password)                e.password = "Password is required.";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError("");
    try {
      const user = await login(form.email.trim(), form.password);

      // Navigate straight into the guarded area — RequireOnboarded
      // decides between the wizard and the dashboard from here.
      navigate(`/company/${user.companyName}`);
    } catch (error) {
      setServerError(
        error?.response?.data?.message ||
        "Unable to log in. Check your connection and try again."
      );
      setLoading(false); // only on failure — success navigates away
    }
  };

  // Enter submits from either field
  const onEnter = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="lg-root">

      {/* ══ LEFT — brand panel ═══════════════════════════════════ */}
      <aside className="lg-side">
        <div className="lg-side__grid" />

        <Link to="/" className="lg-brand">
          <img src={logo} alt="metricore logo" className="lg-brand__mark"/>
          <span className="lg-brand__name">MetriCore</span>
        </Link>

        <div className="lg-side__copy">
          <h2 className="lg-side__title">Welcome back.</h2>
          <p className="lg-side__sub">
            Your goals, costs, and profit — exactly where you left them.
          </p>

          <div className="lg-side__plate lg-mono">
            <div className="lg-plate-row">
              <span className="lg-plate-row__key">GOALS</span>
              <span className="lg-plate-row__val">Daily targets, live progress</span>
            </div>
            <div className="lg-plate-row">
              <span className="lg-plate-row__key">COSTS</span>
              <span className="lg-plate-row__val">Every expense, per sale</span>
            </div>
            <div className="lg-plate-row">
              <span className="lg-plate-row__key">PROFIT</span>
              <span className="lg-plate-row__val">The real number, not revenue</span>
            </div>
          </div>
        </div>

        <div className="lg-side__foot lg-mono">
          <span>© {new Date().getFullYear()} MetriCore</span>
          <div className="lg-side__foot-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </aside>

      {/* ══ RIGHT — form ═════════════════════════════════════════ */}
      <main className="lg-main">
        <div className="lg-card">

          <div className="lg-card__head">
            <h1 className="lg-title">Log in to your workspace</h1>
            <p className="lg-sub">
              New to MetriCore?{" "}
              <Link to="/register" className="lg-link">Create an account</Link>
            </p>
          </div>

          <div className="lg-form">

            {/* Email */}
            <div className="lg-field">
              <label className="lg-label" htmlFor="lg-email">Email</label>
              <input
                id="lg-email"
                name="email"
                type="email"
                autoComplete="email"
                className={`lg-input ${errors.email ? "lg-input--error" : ""}`}
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                onKeyDown={onEnter}
                autoFocus
              />
              {errors.email && <span className="lg-error">{errors.email}</span>}
            </div>

            {/* Password — label row carries the Forgot link */}
            <div className="lg-field">
              <div className="lg-label-row">
                <label className="lg-label" htmlFor="lg-pass">Password</label>
                <Link to="/forgot-password" className="lg-forgot">
                  Forgot password?
                </Link>
              </div>

              <div className="lg-pass-wrap">
                <input
                  id="lg-pass"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  className={`lg-input ${errors.password ? "lg-input--error" : ""}`}
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange}
                  onKeyDown={(e) => { detectCaps(e); onEnter(e); }}
                  onKeyUp={detectCaps}
                />
                <button
                  type="button"
                  className="lg-pass-toggle"
                  onClick={() => setShowPass((p) => !p)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass
                    ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} />
                    : <VisibilityOutlinedIcon    style={{ fontSize: 18 }} />}
                </button>
              </div>

              {/* Caps Lock warning — quiet but lifesaving */}
              {capsOn && (
                <span className="lg-caps" role="status">
                  ⇪ Caps Lock is on
                </span>
              )}

              {errors.password && <span className="lg-error">{errors.password}</span>}
            </div>

            {serverError && (
              <div className="lg-server-error" role="alert">{serverError}</div>
            )}

            <button
              className="lg-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading && <span className="lg-spinner" />}
              Log in
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}