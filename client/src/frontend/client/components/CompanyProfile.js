import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Altaxios } from "../../Altaxios";
import { useAuth } from "../../../context/AuthContext";
import "../../../style/CompanyProfile.css";
import ApiKeysCard from "./ApiKeysCard";
import CreditCardRoundedIcon      from "@mui/icons-material/CreditCardRounded";
import ChevronRightRoundedIcon    from "@mui/icons-material/ChevronRightRounded";

// ── Team size options — current value is injected if non-standard ─
const TEAM_SIZES = ["Just me", "2-10", "11-50", "51-200", "200+"];

export default function CompanyProfile() {
  const navigate = useNavigate();
  const { companyName: urlCompanyName } = useParams();
  const {user, setUser } = useAuth(); // if your AuthContext doesn't expose setUser, see the note in handleSave
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);
  // ── Server state + editable draft ───────────────────────────────
  const [company, setCompany] = useState(null);
  const [draft,   setDraft]   = useState({
    companyName:       "",
    industry:          "",
    numberofEmployees: "",
  });
const [plan, setPlan] = useState(null);
useEffect(() => {
  Altaxios.get("/stripe/subscription")
    .then((res) => setPlan(res.data))
    .catch(() => {});
}, []);

  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");

  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // ── Logo state ──────────────────────────────────────────────────
  const fileRef = useRef(null);
  const [logoFile,      setLogoFile]      = useState(null);
  const [logoPreview,   setLogoPreview]   = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError,     setLogoError]     = useState("");

  // ── Fetch profile on mount ──────────────────────────────────────
  useEffect(() => {
    Altaxios.get("/users/getCompanyProfile")
      .then((res) => {
        const c = res.data.data;
        setCompany(c);
        setDraft({
          companyName:       c.companyName       || "",
          industry:          c.industry          || "",
          numberofEmployees: c.numberofEmployees || "",
        });
      })
      .catch((err) =>
        setLoadError(err.response?.data?.message || "Failed to load company profile")
      )
      .finally(() => setLoading(false));
  }, []);

  // ── Dirty tracking — which fields differ from the server copy ──
  const changedFields = useMemo(() => {
    if (!company) return [];
    return Object.keys(draft).filter(
      (k) => (draft[k] ?? "") !== (company[k] ?? "")
    );
  }, [draft, company]);

  const isDirty = changedFields.length > 0;

  const handleChange = (e) => {
    setSaveError("");
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleDiscard = () => {
    setSaveError("");
    setDraft({
      companyName:       company.companyName       || "",
      industry:          company.industry          || "",
      numberofEmployees: company.numberofEmployees || "",
    });
  };

  // ── Save profile fields ─────────────────────────────────────────
  const handleSave = async () => {
    if (!draft.companyName.trim()) {
      setSaveError("Company name cannot be empty");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await Altaxios.patch("/users/updateCompanyProfile", {
        companyName:       draft.companyName.trim(),
        industry:          draft.industry.trim(),
        numberofEmployees: draft.numberofEmployees,
      });

      const updated = res.data.data;
      setCompany(updated);
      setDraft({
        companyName:       updated.companyName       || "",
        industry:          updated.industry          || "",
        numberofEmployees: updated.numberofEmployees || "",
      });

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);

      // ── Renaming the company changes every URL in the app ───────
      // Sync auth context + move to the new address.
      if (updated.companyName !== urlCompanyName) {
        setUser?.((prev) => ({ ...prev, companyName: updated.companyName }));
        // ^ if your AuthContext has no setUser, add one, or refetch
        //   the session user here — links elsewhere read user.companyName
        navigate(
          `/company/${encodeURIComponent(updated.companyName)}/settings`,
          { replace: true }
        );
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // ── Logo handlers ───────────────────────────────────────────────
  const pickLogo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLogoError("");
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const cancelLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    setLogoError("");
    try {
      const fd = new FormData();
      // ⚠️ field name must match your multerProcess config —
      // same lesson as the product upload
      fd.append("files", logoFile);

      const res = await Altaxios.patch("/users/updateCompanyLogo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCompany((prev) => ({ ...prev, companyLogo: res.data.data.companyLogo }));
      cancelLogo();
    } catch (err) {
      setLogoError(err.response?.data?.message || "Failed to upload logo");
    } finally {
      setLogoUploading(false);
    }
  };

  // ── Derived display values ──────────────────────────────────────
  const memberSince = company?.createdAt
    ? new Date(company.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

  const shortId = company?._id ? `…${company._id.slice(-6)}` : "—";

  const teamOptions = TEAM_SIZES.includes(draft.numberofEmployees) || !draft.numberofEmployees
    ? TEAM_SIZES
    : [draft.numberofEmployees, ...TEAM_SIZES];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="cp-root">
        <div className="cp-loading cp-mono">LOADING PROFILE…</div>
      </div>
    );
  }

  if (loadError || !company) {
    return (
      <div className="cp-root">
        <div className="cp-load-error">
          <p>{loadError || "Company not found."}</p>
          <button className="cp-btn cp-btn--ghost" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-root">
      <div className="cp-container">

        {/* ── Page header ─────────────────────────────────────── */}
        <header className="cp-header">
          <div>
            <span className="cp-eyebrow">Settings</span>
            <h1 className="cp-title">Company profile</h1>
          </div>
          <span className={`cp-saved-flash ${savedFlash ? "cp-saved-flash--show" : ""}`}>
            ✓ Saved
          </span>
        </header>

        <div className="cp-grid">

          {/* ══ LEFT — identity ══════════════════════════════════ */}
          <aside className="cp-aside">

            {/* Logo card */}
            <div className="cp-logo-card">
              <span className="cp-card-label cp-mono">Company logo</span>

              <button
                type="button"
                className="cp-logo"
                onClick={() => !logoUploading && fileRef.current?.click()}
                aria-label="Change company logo"
              >
                {logoPreview || company.companyLogo ? (
                  <img
                    src={logoPreview || company.companyLogo}
                    alt={`${company.companyName} logo`}
                    className="cp-logo__img"
                  />
                ) : (
                  <span className="cp-logo__fallback">
                    {company.companyName?.[0]?.toUpperCase() || "?"}
                  </span>
                )}

                {logoUploading ? (
                  <span className="cp-logo__overlay cp-logo__overlay--busy">
                    <span className="cp-spinner" />
                  </span>
                ) : (
                  <span className="cp-logo__overlay">Change logo</span>
                )}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="cp-file-hidden"
                onChange={pickLogo}
              />

              {/* Pending logo confirm row */}
              {logoFile && !logoUploading && (
                <div className="cp-logo-pending">
                  <span className="cp-logo-pending__name cp-mono">{logoFile.name}</span>
                  <div className="cp-logo-pending__actions">
                    <button className="cp-btn cp-btn--ghost cp-btn--sm" onClick={cancelLogo}>
                      Cancel
                    </button>
                    <button className="cp-btn cp-btn--primary cp-btn--sm" onClick={uploadLogo}>
                      Upload
                    </button>
                  </div>
                </div>
              )}

              {logoError && <p className="cp-field-error">{logoError}</p>}
            </div>

            {/* Account facts — mono record plate */}
            <div className="cp-facts">
              <div className="cp-fact">
                <span className="cp-fact__key cp-mono">MEMBER SINCE</span>
                <span className="cp-fact__val cp-mono">{memberSince}</span>
              </div>
              <div className="cp-fact">
                <span className="cp-fact__key cp-mono">COMPANY ID</span>
                <span className="cp-fact__val cp-mono">{shortId}</span>
              </div>
              <div className="cp-fact">
                <span className="cp-fact__key cp-mono">STATUS</span>
                <span className={`cp-fact__val cp-mono ${company.isVerify ? "cp-verified" : "cp-unverified"}`}>
                  {company.isVerify ? "● Verified" : "○ Unverified"}
                </span>
              </div>
            </div>

          </aside>

          {/* ══ RIGHT — editable details ═════════════════════════ */}
          <main className="cp-main">

            {/* Company details */}
            <section className="cp-card">
              <h2 className="cp-card__heading">Company details</h2>

              <div className="cp-field">
                <label className="cp-label" htmlFor="cp-name">
                  Company name
                  <span className="cp-label__hint">
                    Also your workspace address: /company/{draft.companyName || "…"}
                  </span>
                </label>
                <input
                  id="cp-name"
                  name="companyName"
                  type="text"
                  className="cp-input"
                  value={draft.companyName}
                  onChange={handleChange}
                  maxLength={80}
                  placeholder="Your company name"
                />
              </div>

              <div className="cp-form-row">
                <div className="cp-field">
                  <label className="cp-label" htmlFor="cp-industry">Industry</label>
                  <input
                    id="cp-industry"
                    name="industry"
                    type="text"
                    className="cp-input"
                    value={draft.industry}
                    onChange={handleChange}
                    maxLength={60}
                    placeholder="e.g. E-commerce, Retail"
                  />
                </div>

                <div className="cp-field">
                  <label className="cp-label" htmlFor="cp-team">Team size</label>
                  <select
                    id="cp-team"
                    name="numberofEmployees"
                    className="cp-input cp-select"
                    value={draft.numberofEmployees}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select team size</option>
                    {teamOptions.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Account */}
            <section className="cp-card">
              <h2 className="cp-card__heading">Account</h2>

              <div className="cp-field">
                <label className="cp-label" htmlFor="cp-email">
                  Login email
                  <span className="cp-label__hint">
                    This is your sign-in address. Contact support to change it.
                  </span>
                </label>
                <div className="cp-locked-wrap">
                  <input
                    id="cp-email"
                    type="email"
                    className="cp-input cp-input--locked"
                    value={company.companyEmail || ""}
                    readOnly
                    tabIndex={-1}
                  />
                  <span className="cp-locked-icon" title="Locked">🔒</span>
                </div>
              </div>
            </section>
          {/* Security — owner password change */}
          <Link to={`/company/${user?.companyName || urlCompanyName}/billing`} className="bb-row">
            <span className="bb-icon">
              <CreditCardRoundedIcon />
            </span>
            <span className="bb-text">
              <span className="bb-label">Billing & plan</span>
              <span className="bb-sub">Manage your subscription and payment method</span>
            </span>
            {plan && (
              plan.status === "active" ? (
                <span className="bb-chip bb-chip--active">
                  {plan.planId?.charAt(0).toUpperCase() + plan.planId?.slice(1)}
                </span>
              ) : plan.trialActive ? (
                <span className="bb-chip">Trial · {plan.trialDaysLeft}d</span>
              ) : null
            )}
            <ChevronRightRoundedIcon className="bb-chevron" style={{ fontSize: 20 }} />
        </Link>
          <section className="cp-card">
            <h2 className="cp-card__heading">Security</h2>
            <div className="cp-field">
              <label className="cp-label">Current password</label>
              <input type="password" className="cp-input" autoComplete="current-password"
                value={pw.current} onChange={(e) => setPw(p => ({ ...p, current: e.target.value }))} />
            </div>
            <div className="cp-form-row">
              <div className="cp-field">
                <label className="cp-label">New password
                  <span className="cp-label__hint">8+ chars, upper & lower case, number, special (@$!%*?&)</span>
                </label>
                <input type="password" className="cp-input" autoComplete="new-password"
                  value={pw.next} onChange={(e) => setPw(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div className="cp-field">
                <label className="cp-label">Confirm new password</label>
                <input type="password" className="cp-input" autoComplete="new-password"
                  value={pw.confirm} onChange={(e) => setPw(p => ({ ...p, confirm: e.target.value }))} />
              </div>
            </div>
            {pwMsg && <p className="cp-field-error" style={pwMsg.ok ? { color: "#22c55e" } : {}}>{pwMsg.text}</p>}
            <button className="cp-btn cp-btn--primary cp-btn--sm" disabled={pwSaving} style={{ alignSelf: "flex-start" }}
              onClick={async () => {
                if (pw.next !== pw.confirm) return setPwMsg({ text: "Passwords do not match.", ok: false });
                setPwSaving(true); setPwMsg(null);
                try {
                  const res = await Altaxios.patch("/company/changeCompanyPassword", {
                    currentPassword: pw.current, newPassword: pw.next,
                  });
                  setPwMsg({ text: res.data.message, ok: true });
                  setPw({ current: "", next: "", confirm: "" });
                } catch (err) {
                  setPwMsg({ text: err.response?.data?.message || "Failed to change password.", ok: false });
                } finally { setPwSaving(false); }
              }}>
              {pwSaving ? "Changing…" : "Change password"}
            </button>
          </section>
          <ApiKeysCard />
          </main>
        </div>
      </div>

      {/* ══ SIGNATURE — unsaved-changes bar ═══════════════════════ */}
      <div className={`cp-savebar ${isDirty ? "cp-savebar--visible" : ""}`} role="status">
        <span className="cp-savebar__dot" />
        <span className="cp-savebar__text cp-mono">
          {changedFields.length} unsaved change{changedFields.length !== 1 ? "s" : ""}
        </span>

        {saveError && <span className="cp-savebar__error">{saveError}</span>}

        <div className="cp-savebar__actions">
          <button
            className="cp-btn cp-btn--ghost cp-btn--sm"
            onClick={handleDiscard}
            disabled={saving}
          >
            Discard
          </button>
          <button
            className="cp-btn cp-btn--primary cp-btn--sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <span className="cp-spinner cp-spinner--dark" />}
            Save changes
          </button>
        </div>
      </div>

    </div>
  );
}