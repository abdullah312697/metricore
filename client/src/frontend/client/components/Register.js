import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import VisibilityOutlinedIcon    from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useAuth } from "../../../context/AuthContext";
import "../../../style/Register.css";
import logo from '../../../images/logo/metricore-icon-transparent.svg';

/* ── Option data ─────────────────────────────────────────────────
   Industry values are IDENTICAL strings to your old <select> so
   existing company records stay consistent.                       */
const INDUSTRIES = [
  "Technology and IT", "Healthcare and Pharmaceuticals", "Finance and Banking",
  "Energy", "Retail and E-commerce", "Manufacturing", "Food and Beverage",
  "Media and Entertainment", "Transportation and Logistics",
  "Real Estate and Construction", "Tourism and Hospitality", "Telecommunications",
  "Education and Training", "Environmental and Sustainability Services",
  "Aerospace and Defense", "Agriculture and Agribusiness", "Fashion and Apparel",
  "Professional Services", "Personal Care and Wellness", "Automotive and Mobility",
  "Mining and Natural Resources", "Insurance", "Supply Chain and Procurement",
  "Public Sector and Government Services", "Nonprofits and Social Enterprises",
  "Sports and Recreation", "Luxury and High-End Markets",
  "Cybersecurity and Data Protection",
];

// Same ranges as the Company Settings page — one taxonomy everywhere
const TEAM_SIZES = ["Just me", "2-10", "11-50", "51-200", "200+"];

/* ── Password rules — EXACTLY mirror the backend regex ───────────
   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
   so the checklist can never pass while the server would reject.  */
const PASSWORD_RULES = [
  { re: /.{8,}/,       label: "At least 8 characters" },
  { re: /[A-Z]/,       label: "One uppercase letter (A–Z)" },
  { re: /[a-z]/,       label: "One lowercase letter (a–z)" },
  { re: /\d/,          label: "One number (0–9)" },
  { re: /[@$!%*?&]/,   label: "One special character (@ $ ! % * ? &)" },
];

const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const EMAIL_RE =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    companyName:       "",
    industry:          "",
    numberofEmployees: "",
    companyEmail:      "",
    companyPassword:   "",
    rePassword:        "",
  });

  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError)  setServerError("");
  };

  // ── Logo pick + preview (React state — no DOM manipulation) ───
  const pickLogo = (e) => {
    const f = e.currentTarget.files[0];
    if (!f) return;
    if (!/\.(jpe?g|png|gif|webp)$/i.test(f.name)) {
      setErrors((p) => ({ ...p, logo: "Please choose a JPG, PNG, GIF or WEBP image" }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, logo: "Image must be under 5MB" }));
      return;
    }
    setErrors((p) => ({ ...p, logo: "" }));
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Validation — mirrors every backend check ──────────────────
  const validate = () => {
    const e = {};
    if (!form.companyName.trim())       e.companyName       = "Company name is required.";
    if (!form.industry)                 e.industry          = "Please select your industry.";
    if (!form.numberofEmployees)        e.numberofEmployees = "Please select your team size.";
    if (!form.companyEmail.trim())      e.companyEmail      = "Email is required.";
    else if (!EMAIL_RE.test(form.companyEmail))
      e.companyEmail = "That doesn't look like a valid email address.";
    if (!form.companyPassword)          e.companyPassword   = "Password is required.";
    else if (!STRONG_PASSWORD.test(form.companyPassword))
      e.companyPassword = "Password doesn't meet all the requirements below.";
    if (form.companyPassword !== form.rePassword)
      e.rePassword = "Passwords do not match.";
    if (!logoFile)                      e.logo              = "Company logo is required.";
    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError("");
    try {

      // ── FormData keys are IDENTICAL to your backend contract ──
      const fd = new FormData();
      fd.append("files",             logoFile);
      fd.append("companyName",       form.companyName.trim());
      fd.append("industry",          form.industry);
      fd.append("numberofEmployees", form.numberofEmployees);
      fd.append("companyEmail",      form.companyEmail.trim());
      fd.append("companyPassword",   form.companyPassword);
      fd.append("rePassword",        form.rePassword);

      const res = await register(fd);

      // Keep your existing session bootstrap
      localStorage.setItem("AccessData", JSON.stringify(res.data.AccessData));

      setSuccess(true);
      setTimeout(() => navigate("/verifyemail"), 1200);
    } catch (error) {
      if (error.response?.status === 409) {
        // Email already exists → attach to the field, not a banner
        setErrors((p) => ({ ...p, companyEmail: error.response.data.message }));
      } else {
        setServerError(
          error.response?.data?.message ||
          "Network error or server issue. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rg-root">

      {/* ══ LEFT — brand panel ═══════════════════════════════════ */}
      <aside className="rg-side">
        <div className="rg-side__grid" />

        <Link to="/" className="rg-brand">
          <img src={logo} alt="metricore logo" className="rg-brand__mark"/>
          <span className="rg-brand__name">MetriCore</span>
        </Link>

        <div className="rg-side__copy">
          <h2 className="rg-side__title">
            Know your real profit,<br />not just your revenue.
          </h2>

          <div className="rg-side__points">
            {[
              { n: "01", t: "Set revenue goals",   d: "MetriCore breaks them into daily targets." },
              { n: "02", t: "Track every cost",    d: "Ads, delivery, packaging, buying, shipping." },
              { n: "03", t: "See profit live",     d: "Charts and breakdowns update as you sell." },
            ].map((p) => (
              <div className="rg-point" key={p.n}>
                <span className="rg-point__n rg-mono">{p.n}</span>
                <div>
                  <div className="rg-point__t">{p.t}</div>
                  <div className="rg-point__d">{p.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rg-side__foot rg-mono">
          <span>© {new Date().getFullYear()} MetriCore</span>
          <div className="rg-side__foot-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </aside>

      {/* ══ RIGHT — form ═════════════════════════════════════════ */}
      <main className="rg-main">
        <div className="rg-card">

          <div className="rg-card__head">
            <div>
              <h1 className="rg-title">Create your company account</h1>
              <p className="rg-sub">
                Already have an account? <Link to="/login" className="rg-link">Log in</Link>
              </p>
            </div>
          </div>

          {success ? (
            <div className="rg-success">
              <span className="rg-success__icon">✓</span>
              <h3>Account created</h3>
              <p>We've emailed a verification code to <strong>{form.companyEmail}</strong>. Taking you there…</p>
            </div>
          ) : (
            <div className="rg-form">

              {/* Company name */}
              <div className="rg-field">
                <label className="rg-label" htmlFor="rg-companyName">Company name</label>
                <input
                  id="rg-companyName"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  className={`rg-input ${errors.companyName ? "rg-input--error" : ""}`}
                  placeholder="e.g. MetriCore Ltd"
                  value={form.companyName}
                  onChange={handleChange}
                  maxLength={80}
                />
                {errors.companyName && <span className="rg-error">{errors.companyName}</span>}
              </div>

              {/* Industry + team size */}
              <div className="rg-row">
                <div className="rg-field">
                  <label className="rg-label" htmlFor="rg-industry">Industry</label>
                  <select
                    id="rg-industry"
                    name="industry"
                    className={`rg-input rg-select ${errors.industry ? "rg-input--error" : ""}`}
                    value={form.industry}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select industry…</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                  {errors.industry && <span className="rg-error">{errors.industry}</span>}
                </div>

                <div className="rg-field">
                  <label className="rg-label" htmlFor="rg-team">Team size</label>
                  <select
                    id="rg-team"
                    name="numberofEmployees"
                    className={`rg-input rg-select ${errors.numberofEmployees ? "rg-input--error" : ""}`}
                    value={form.numberofEmployees}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select…</option>
                    {TEAM_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.numberofEmployees && <span className="rg-error">{errors.numberofEmployees}</span>}
                </div>
              </div>

              {/* Email */}
              <div className="rg-field">
                <label className="rg-label" htmlFor="rg-email">Work email</label>
                <input
                  id="rg-email"
                  name="companyEmail"
                  type="email"
                  autoComplete="email"
                  className={`rg-input ${errors.companyEmail ? "rg-input--error" : ""}`}
                  placeholder="you@company.com"
                  value={form.companyEmail}
                  onChange={handleChange}
                />
                {errors.companyEmail && <span className="rg-error">{errors.companyEmail}</span>}
              </div>

              {/* Password */}
              <div className="rg-field">
                <label className="rg-label" htmlFor="rg-pass">Password</label>
                <div className="rg-pass-wrap">
                  <input
                    id="rg-pass"
                    name="companyPassword"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    className={`rg-input ${errors.companyPassword ? "rg-input--error" : ""}`}
                    placeholder="Create a strong password"
                    value={form.companyPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="rg-pass-toggle"
                    onClick={() => setShowPass((p) => !p)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass
                      ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} />
                      : <VisibilityOutlinedIcon    style={{ fontSize: 18 }} />}
                  </button>
                </div>
                {errors.companyPassword && <span className="rg-error">{errors.companyPassword}</span>}

                {/* Live checklist — mirrors the backend regex */}
                {form.companyPassword && (
                  <ul className="rg-checklist">
                    {PASSWORD_RULES.map((rule) => {
                      const pass = rule.re.test(form.companyPassword);
                      return (
                        <li key={rule.label} className={`rg-check ${pass ? "rg-check--pass" : ""}`}>
                          <span className="rg-check__dot">{pass ? "✓" : ""}</span>
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Confirm password */}
              <div className="rg-field">
                <label className="rg-label" htmlFor="rg-repass">Confirm password</label>
                <input
                  id="rg-repass"
                  name="rePassword"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  className={`rg-input ${errors.rePassword ? "rg-input--error" : ""}`}
                  placeholder="Retype your password"
                  value={form.rePassword}
                  onChange={handleChange}
                />
                {errors.rePassword && <span className="rg-error">{errors.rePassword}</span>}
              </div>

              {/* Logo upload */}
              <div className="rg-field">
                <label className="rg-label">
                  Company logo
                  <span className="rg-label__hint">Shown in your workspace header · JPG, PNG, GIF or WEBP, max 5MB</span>
                </label>

                {!logoPreview ? (
                  <button
                    type="button"
                    className={`rg-drop ${errors.logo ? "rg-drop--error" : ""}`}
                    onClick={() => fileRef.current?.click()}
                  >
                    <span className="rg-drop__icon">🖼</span>
                    <span className="rg-drop__text">Click to upload your logo</span>
                  </button>
                ) : (
                  <div className="rg-logo-preview">
                    <img src={logoPreview} alt="Logo preview" />
                    <div className="rg-logo-preview__meta">
                      <span className="rg-logo-preview__name rg-mono">{logoFile?.name}</span>
                      <button type="button" className="rg-logo-remove" onClick={removeLogo}>
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="rg-file-hidden"
                  onChange={pickLogo}
                />
                {errors.logo && <span className="rg-error">{errors.logo}</span>}
              </div>

              {serverError && (
                <div className="rg-server-error" role="alert">{serverError}</div>
              )}

              <button
                className="rg-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading && <span className="rg-spinner" />}
                Create account
              </button>

              <p className="rg-agree">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="rg-link">Terms of Service</Link> and{" "}
                <Link to="/privacy" className="rg-link">Privacy Policy</Link>.
              </p>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}