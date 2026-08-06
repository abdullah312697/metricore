import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VisibilityOutlinedIcon    from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LockOutlinedIcon          from "@mui/icons-material/LockOutlined";
import { useAdminAuth } from "./AdminAuthContext";
import "../../../style/Admin/AdminLogin.css";

/* ═══════════════════════════════════════════════════════════════
   AdminLogin — /admin/login
   Restricted platform-console entry. Rate-limited server-side
   (10 attempts / 15 min); errors stay generic on purpose.
═══════════════════════════════════════════════════════════════ */
export default function AdminLogin() {
  const { admin, checking, login } = useAdminAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Already signed in? Straight to the console.
  useEffect(() => {
    if (!checking && admin) navigate("/admin", { replace: true });
  }, [admin, checking, navigate]);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alg-root">
      <div className="alg-card">

        <span className="alg-eyebrow alg-mono">
          <LockOutlinedIcon style={{ fontSize: 13 }} />
          Platform console
        </span>

        <h1 className="alg-title">Sign in</h1>
        <p className="alg-sub">MetriCore operators only.</p>

        <div className="alg-field">
          <label className="alg-label" htmlFor="alg-email">Email</label>
          <input
            id="alg-email"
            type="email"
            className="alg-input"
            autoComplete="username"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        <div className="alg-field">
          <label className="alg-label" htmlFor="alg-pass">Password</label>
          <div className="alg-pass-wrap">
            <input
              id="alg-pass"
              type={showPass ? "text" : "password"}
              className="alg-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              type="button"
              className="alg-pass-toggle"
              onClick={() => setShowPass((p) => !p)}
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass
                ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} />
                : <VisibilityOutlinedIcon style={{ fontSize: 18 }} />}
            </button>
          </div>
        </div>

        {error && <div className="alg-error" role="alert">{error}</div>}

        <button className="alg-btn" onClick={handleSubmit} disabled={loading}>
          {loading && <span className="alg-spinner" />}
          Sign in
        </button>

        <p className="alg-foot">
          This area is restricted. All sign-in attempts are rate-limited.
        </p>
      </div>
    </div>
  );
}