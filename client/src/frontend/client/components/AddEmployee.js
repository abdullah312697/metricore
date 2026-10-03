import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackIcon        from "@mui/icons-material/ArrowBack";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import VisibilityOutlinedIcon    from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { Altaxios } from "../../Altaxios";
import "../../../style/AddEmployee.css";
import { describeRole, roleTierInfo, assignableRolesFor } from "../../../utils/permissions";
import { useAuth } from "../../../context/AuthContext";


const EMAIL_RE =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function AddEmployee() {
  const { companyName } = useParams();
  const { user } = useAuth();
  const allowedRoles = assignableRolesFor(user?.employeeRoal);
  
  const [form, setForm] = useState({
    YemplyeeName:           "",
    YemplyeePhone:          "",
    YemplyeeEmail:          "",
    YemplyeeLeaving:        "",
    EmplyeeSellary:         "",
    EmplyeeJoinDate:        "",
    EmplyeeRoal:            "Worker",
    employeeAccessPassword: "",
  });

  useEffect(() => { 
    if (allowedRoles.length && !allowedRoles.includes(form.EmplyeeRoal)) {
       setForm((p) => ({ ...p, EmplyeeRoal: allowedRoles[allowedRoles.length - 1] })); 
      } }, [form.EmplyeeRoal, allowedRoles]);

  const [imgFile,    setImgFile]    = useState(null);
  const [imgPreview, setImgPreview] = useState("");
  const [showPass,   setShowPass]   = useState(false);

  const [team,        setTeam]        = useState([]);
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);

  // ── Load existing team for the roster ───────────────────────────
  useEffect(() => {
    Altaxios.get("/newemplyee/getAllEmployee/")
      .then((res) => setTeam(res.data.data || res.data.employees || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (serverError)  setServerError("");
  };

  // ── Photo ───────────────────────────────────────────────────────
  const pickPhoto = (e) => {
    const f = e.currentTarget.files[0];
    if (!f) return;
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) {
      setErrors((p) => ({ ...p, image: "Use a JPG, PNG or WEBP image." }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, image: "Image must be under 5MB." }));
      return;
    }
    setErrors((p) => ({ ...p, image: "" }));
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    setImgFile(null);
    setImgPreview("");
  };

  // ── Validation — mirrors the hardened backend ───────────────────
  const validate = () => {
    const e = {};
    if (!form.YemplyeeName.trim())  e.YemplyeeName = "Employee name is required.";
    if (!form.YemplyeeEmail.trim()) e.YemplyeeEmail = "Email is required.";
    else if (!EMAIL_RE.test(form.YemplyeeEmail)) e.YemplyeeEmail = "Enter a valid email address.";
    if (!form.employeeAccessPassword) e.employeeAccessPassword = "Set a login password for this employee.";
    else if (form.employeeAccessPassword.length < 8) e.employeeAccessPassword = "Password must be at least 8 characters.";
    if (form.EmplyeeSellary !== "" && Number(form.EmplyeeSellary) < 0) e.EmplyeeSellary = "Salary can't be negative.";
    if (!form.EmplyeeRoal) e.EmplyeeRoal = "Pick a role.";
    return e;
  };

  const canSubmit = useMemo(
    () =>
      form.YemplyeeName.trim() &&
      form.YemplyeeEmail.trim() &&
      form.employeeAccessPassword.length >= 8 &&
      form.EmplyeeRoal,
    [form]
  );
const roleGrants = describeRole(form.EmplyeeRoal);   // array of "can do" strings
const roleTier   = roleTierInfo(form.EmplyeeRoal);   // { tier, label, description }
  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setServerError("");
    try {
      const fd = new FormData();
      fd.append("YemplyeeName",           form.YemplyeeName.trim());
      fd.append("YemplyeePhone",          form.YemplyeePhone.trim());
      fd.append("YemplyeeEmail",          form.YemplyeeEmail.trim());
      fd.append("YemplyeeLeaving",        form.YemplyeeLeaving.trim());
      fd.append("EmplyeeSellary",         form.EmplyeeSellary);
      fd.append("EmplyeeJoinDate",        form.EmplyeeJoinDate);
      fd.append("EmplyeeRoal",            form.EmplyeeRoal);
      fd.append("employeeAccessPassword", form.employeeAccessPassword);  // 👈 required now
      if (imgFile) fd.append("files", imgFile);

      const res = await Altaxios.post("/newemplyee/addemplyee", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 200 || res.status === 201) {
        const newEmp = res.data.data;
        if (newEmp) setTeam((prev) => [...prev, newEmp]);

        setForm({
          YemplyeeName: "", YemplyeePhone: "", YemplyeeEmail: "",
          YemplyeeLeaving: "", EmplyeeSellary: "", EmplyeeJoinDate: "",
          EmplyeeRoal: "Worker", employeeAccessPassword: "",
        });
        clearPhoto();

        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to add employee. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ae-root">
      <div className="ae-container">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="ae-topbar">
          <Link to={`/company/${companyName}`} className="ae-back" aria-label="Back to dashboard">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </Link>
          <span className="ae-eyebrow ae-mono">Team</span>
          <span className={`ae-saved-flash ${savedFlash ? "ae-saved-flash--show" : ""}`}>
            ✓ Employee added
          </span>
        </div>

        <div className="ae-grid">

          {/* ══ LEFT — form ════════════════════════════════════ */}
          <div className="ae-form-card">
            <h1 className="ae-title">Add a team member</h1>
            <p className="ae-sub">
              Create a login for a new employee and set their role. They'll
              sign in with the email and password you set here.
            </p>

            {/* Photo + name side by side */}
            <div className="ae-identity-row">
              <div className="ae-photo">
                {imgPreview ? (
                  <img src={imgPreview} alt="Employee" className="ae-photo__img" />
                ) : (
                  <label className="ae-photo__drop">
                    <AddPhotoAlternateIcon style={{ fontSize: 22, color: "#ffb100" }} />
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="ae-file-hidden" onChange={pickPhoto} />
                  </label>
                )}
                {imgPreview && (
                  <button type="button" className="ae-photo__remove" onClick={clearPhoto} aria-label="Remove photo">×</button>
                )}
              </div>

              <div className="ae-field ae-identity-name">
                <label className="ae-label" htmlFor="ae-name">Full name</label>
                <input
                  id="ae-name" name="YemplyeeName" type="text"
                  className={`ae-input ${errors.YemplyeeName ? "ae-input--error" : ""}`}
                  placeholder="e.g. Sara Ahmed"
                  value={form.YemplyeeName} onChange={handleChange} maxLength={80}
                />
                {errors.YemplyeeName && <span className="ae-error">{errors.YemplyeeName}</span>}
              </div>
            </div>
            {errors.image && <span className="ae-error">{errors.image}</span>}

            {/* Contact */}
            <div className="ae-row">
              <div className="ae-field">
                <label className="ae-label" htmlFor="ae-email">Email (login)</label>
                <input
                  id="ae-email" name="YemplyeeEmail" type="email"
                  className={`ae-input ${errors.YemplyeeEmail ? "ae-input--error" : ""}`}
                  placeholder="sara@company.com"
                  value={form.YemplyeeEmail} onChange={handleChange}
                />
                {errors.YemplyeeEmail && <span className="ae-error">{errors.YemplyeeEmail}</span>}
              </div>
              <div className="ae-field">
                <label className="ae-label" htmlFor="ae-phone">Phone</label>
                <input
                  id="ae-phone" name="YemplyeePhone" type="text"
                  className="ae-input"
                  placeholder="Optional"
                  value={form.YemplyeePhone} onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div className="ae-field">
              <label className="ae-label" htmlFor="ae-pass">
                Login password
                <span className="ae-label__hint">The employee can change this later from their profile</span>
              </label>
              <div className="ae-pass-wrap">
                <input
                  id="ae-pass" name="employeeAccessPassword"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  className={`ae-input ${errors.employeeAccessPassword ? "ae-input--error" : ""}`}
                  placeholder="At least 8 characters"
                  value={form.employeeAccessPassword} onChange={handleChange}
                />
                <button type="button" className="ae-pass-toggle" onClick={() => setShowPass((p) => !p)} aria-label={showPass ? "Hide" : "Show"}>
                  {showPass ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon style={{ fontSize: 18 }} />}
                </button>
              </div>
              {errors.employeeAccessPassword && <span className="ae-error">{errors.employeeAccessPassword}</span>}
            </div>

            {/* Salary + join date */}
            <div className="ae-row">
              <div className="ae-field">
                <label className="ae-label" htmlFor="ae-salary">Salary</label>
                <div className="ae-prefix-wrap">
                  <span className="ae-prefix ae-mono">$</span>
                  <input
                    id="ae-salary" name="EmplyeeSellary" type="number" min="0"
                    className={`ae-input ae-input--prefixed ${errors.EmplyeeSellary ? "ae-input--error" : ""}`}
                    placeholder="Optional"
                    value={form.EmplyeeSellary} onChange={handleChange}
                  />
                </div>
                {errors.EmplyeeSellary && <span className="ae-error">{errors.EmplyeeSellary}</span>}
              </div>
              <div className="ae-field">
                <label className="ae-label" htmlFor="ae-join">Joining date</label>
                <input
                  id="ae-join" name="EmplyeeJoinDate" type="date"
                  className="ae-input"
                  value={form.EmplyeeJoinDate} onChange={handleChange}
                />
              </div>
            </div>

            {/* Address */}
            <div className="ae-field">
              <label className="ae-label" htmlFor="ae-address">Address</label>
              <input
                id="ae-address" name="YemplyeeLeaving" type="text"
                className="ae-input"
                placeholder="Optional"
                value={form.YemplyeeLeaving} onChange={handleChange}
              />
            </div>

{/* Role pills */}
<div className="ae-field">
  <label className="ae-label">Role</label>
  <div className="ae-roles">
    {allowedRoles.map((r) => (
      <button
        type="button" key={r}
        className={`ae-role ${form.EmplyeeRoal === r ? "ae-role--on" : ""}`}
        onClick={() => setForm((p) => ({ ...p, EmplyeeRoal: r }))}
      >
        {r}
      </button>
    ))}
  </div>
  {errors.EmplyeeRoal && <span className="ae-error">{errors.EmplyeeRoal}</span>}

  {/* NEW — what this role can do (updates as you pick) */}
  <div className="ae-role-summary">
    <div className="ae-role-summary__head">
      <span className="ae-role-summary__tier">{roleTier.label}</span>
      <span className="ae-role-summary__desc">{roleTier.description}</span>
    </div>
    <ul className="ae-role-summary__list">
      {roleGrants.map((g) => (
        <li key={g} className="ae-role-summary__item">
          <span className="ae-role-summary__check">✓</span>
          {g}
        </li>
      ))}
    </ul>
  </div>
</div>
            {serverError && <div className="ae-server-error" role="alert">{serverError}</div>}

            <button className="ae-btn ae-btn--primary" onClick={handleSubmit} disabled={!canSubmit || saving}>
              {saving && <span className="ae-spinner" />}
              Add employee
            </button>
          </div>

          {/* ══ RIGHT — team roster ════════════════════════════ */}
          <aside className="ae-list-card">
            <div className="ae-list-head">
              <h2 className="ae-list-title">Your team</h2>
              <span className="ae-count ae-mono">{team.length}</span>
            </div>

            {team.length > 0 ? (
              <div className="ae-list">
                {team.map((m) => (
                  <Link className="ae-member" to={`/company/${companyName}/theemployee/${m._id}`} key={m._id}>
                    <img
                      className="ae-member__img"
                      src={m.EmplyeeProfile || "https://via.placeholder.com/44"}
                      alt={m.YemplyeeName}
                    />
                    <div className="ae-member__info">
                      <span className="ae-member__name">{m.YemplyeeName}</span>
                      <span className="ae-member__role ae-mono">{m.EmplyeeRoal}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="ae-empty">
                <span className="ae-empty__icon">👥</span>
                <p>No team members yet. Add your first on the left.</p>
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}