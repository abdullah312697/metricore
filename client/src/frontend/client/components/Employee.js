import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon        from "@mui/icons-material/ArrowBack";
import EmailOutlinedIcon    from "@mui/icons-material/EmailOutlined";
import CallIcon             from "@mui/icons-material/Call";
import EditIcon             from "@mui/icons-material/Edit";
import AddAPhotoIcon        from "@mui/icons-material/AddAPhoto";
import VisibilityIcon       from "@mui/icons-material/Visibility";
import VisibilityOffIcon    from "@mui/icons-material/VisibilityOff";
import LiveChats            from "./LiveChats";
import ConfirmDialog        from "./ConfirmDialog";
import { Altaxios }         from "../../Altaxios";
import { useAuth }          from "../../../context/AuthContext";
import "../../../style/Employee.css";
import EmailComposer from "./EmailComposer";
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';


const MANAGER_ROLES = ["Owner", "Admin"];

// Which draft fields each mode may edit
const EDITABLE_BY_MODE = {
  manager: [
    "YemplyeeName", "YemplyeePhone", "YemplyeeEmail", "YemplyeeLeaving",
    "employeePosition", "EmplyeeRoal", "EmplyeeJoinDate",
    "FirstSelarry", "EmplyeeSellary", "lsatPaid", "TotalSeavings",
  ],
  self: ["YemplyeeName", "YemplyeePhone", "YemplyeeLeaving"],
  peer: [],
};

// Info sections — visibility + editability are data, not JSX
const SECTIONS = [
  {
    title: "Contact",
    visibleTo: ["manager", "self", "peer"],
    fields: [
      { key: "YemplyeeEmail",   label: "Email",    type: "text", visibleTo: ["manager", "self", "peer"] },
      { key: "YemplyeePhone",   label: "Phone",    type: "text", visibleTo: ["manager", "self"] },
      { key: "YemplyeeLeaving", label: "Address",  type: "text", visibleTo: ["manager", "self"] },
    ],
  },
  {
    title: "Employment",
    visibleTo: ["manager", "self", "peer"],
    fields: [
      { key: "employeePosition", label: "Position",  type: "text", visibleTo: ["manager", "self", "peer"] },
      { key: "EmplyeeRoal",      label: "Role",      type: "text", visibleTo: ["manager", "self", "peer"] },
      { key: "EmplyeeJoinDate",  label: "Join date", type: "date", visibleTo: ["manager", "self", "peer"] },
    ],
  },
  {
    title: "Compensation",
    visibleTo: ["manager", "self"],   // hidden from peers entirely
    fields: [
      { key: "FirstSelarry",  label: "First salary",   type: "text", visibleTo: ["manager", "self"] },
      { key: "EmplyeeSellary",label: "Current salary", type: "text", visibleTo: ["manager", "self"] },
      { key: "lsatPaid",      label: "Last paid",      type: "text", visibleTo: ["manager", "self"] },
      { key: "TotalSeavings", label: "Savings",        type: "text", visibleTo: ["manager", "self"] },
    ],
  },
];

// Status pills — color worn by the avatar ring (the signature)
const STATUSES = [
  { value: "Active",    color: "#22c55e" },
  { value: "Suspended", color: "#ffb100" },
  { value: "Warned",    color: "#eab308" },
  { value: "Blocked",   color: "#ef4444" },
  { value: "Cancel",    color: "#8899aa" },
];

const statusColor = (status) =>
  STATUSES.find((s) => s.value === status)?.color || "#8899aa";

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Employee() {
  const { employeeId, companyName } = useParams();
  const navigate = useNavigate();
  const { user, updateEmployee, updateProfile } = useAuth();

  // ── Viewer identity → mode ──────────────────────────────────────
  const viewerId   = user?.employeeId || user?._id;          // 👈 adjust to your AuthContext key
  const viewerRole = user?.EmplyeeRoal || user?.role || "";  // 👈 adjust to your AuthContext key
  const isSelf     = String(viewerId || "") === String(employeeId);
  const isManager  = MANAGER_ROLES.includes(viewerRole);
  const mode       = isManager ? "manager" : isSelf ? "self" : "peer";

  const editableKeys = EDITABLE_BY_MODE[mode];
  const canEditData  = editableKeys.length > 0;
  const canChangePhoto = mode === "manager" || mode === "self";
  const [currentPass, setCurrentPass] = useState("");
  // ── Server data ─────────────────────────────────────────────────
  const [employeeData, setEmployeeData] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── Edit state ──────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { text, ok }

  // ── Photo state ─────────────────────────────────────────────────
  const fileRef = useRef(null);
  const [photoFile,      setPhotoFile]      = useState(null);
  const [photoPreview,   setPhotoPreview]   = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg,       setPhotoMsg]       = useState("");

  // ── Manager action state ────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState("Active");
  const [statusSaving,   setStatusSaving]   = useState(false);
  const [statusMsg,      setStatusMsg]      = useState(null);

  const [passOpen,   setPassOpen]   = useState(false);
  const [passValue,  setPassValue]  = useState("");
  const [passShow,   setPassShow]   = useState(false);
  const [passSaving, setPassSaving] = useState(false);
  const [passMsg,    setPassMsg]    = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  // ── Flash helper ────────────────────────────────────────────────
  const flash = (setter, text, ok) => {
    setter({ text, ok });
    setTimeout(() => setter(null), 3000);
  };

  // ── Fetch employee ──────────────────────────────────────────────
  useEffect(() => {
    if (!employeeId) return;
    const ac = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const res = await Altaxios.get(
          `/newemplyee/getSingleEmployee/${encodeURIComponent(employeeId)}`,
          { signal: ac.signal, timeout: 15000 }
        );
        const emp = res.data?.employee;
        setEmployeeData(emp);
        setSelectedStatus(emp?.EmployeeProfileStatus || "Active");
      } catch (err) {
        if (ac.signal.aborted) return;
        setLoadError(err.response?.data?.message || "Failed to load employee");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [employeeId]);

  // ── Enter / leave edit mode ─────────────────────────────────────
  const startEdit = () => {
    const initial = {};
    editableKeys.forEach((k) => { initial[k] = employeeData?.[k] ?? ""; });
    setDraft(initial);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft({}); };

  const isDirty = useMemo(
    () => editableKeys.some((k) => (draft[k] ?? "") !== (employeeData?.[k] ?? "")),
    [draft, employeeData, editableKeys]
  );

  // ── Save edited fields — sends ONLY changed, allowed keys ───────
  const handleSave = async () => {
    const changed = {};
    editableKeys.forEach((k) => {
      if ((draft[k] ?? "") !== (employeeData?.[k] ?? "")) changed[k] = draft[k];
    });
    if (!Object.keys(changed).length) { setEditing(false); return; }

    setSaving(true);
    try {
      const res = await updateEmployee(employeeId, changed);
      if (res.status === 200) {
        setEmployeeData((prev) => ({ ...prev, ...(res.data?.data || changed) }));
        flash(setSaveMsg, res.data?.message || "Profile updated", true);
        setEditing(false);
      }
    } catch (err) {
      flash(setSaveMsg, err.response?.data?.message || "Failed to update profile", false);
    } finally {
      setSaving(false);
    }
  };

  // ── Photo handlers ──────────────────────────────────────────────
  const pickPhoto = (e) => {
    const f = e.currentTarget.files[0];
    if (!f) return;
    if (!/\.(jpe?g|png|gif|webp)$/i.test(f.name)) {
      setPhotoMsg("Please choose a JPG, PNG, GIF or WEBP image");
      return;
    }
    setPhotoMsg("");
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const cancelPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    setPhotoUploading(true);
    setPhotoMsg("");
    try {
      const fd = new FormData();
      fd.append("files",   photoFile);                          // 👈 keys your backend expects
      fd.append("CloudeId", employeeData?.CloudinaryPublicId);  //    (unchanged from old page)
      const res = await updateProfile(employeeId, fd);
      if (res.status === 200) {
        const upd = res.data.data;
        setEmployeeData((prev) => ({
          ...prev,
          EmplyeeProfile:     upd.EmplyeeProfile,
          CloudinaryPublicId: upd.CloudinaryPublicId,
        }));
        cancelPhoto();
      }
    } catch (err) {
      setPhotoMsg(err.response?.data?.message || "Failed to update photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── Manager: status ─────────────────────────────────────────────
  const saveStatus = async () => {
    setStatusSaving(true);
    try {
      const res = await Altaxios.put(
        `/newemplyee/updateEmployeeStatus/${encodeURIComponent(employeeId)}`,
        { EmployeeProfileStatus: selectedStatus }
      );
      if (res.status === 200) {
        setEmployeeData((prev) => ({ ...prev, EmployeeProfileStatus: selectedStatus }));
        flash(setStatusMsg, res.data?.message || "Status updated", true);
      }
    } catch (err) {
      flash(setStatusMsg, err.response?.data?.message || "Failed to update status", false);
    } finally {
      setStatusSaving(false);
    }
  };

  // ── Password (manager sets · self changes own) ─────────────────
  const savePassword = async () => {
    if (!passValue.trim()) {
      flash(setPassMsg, "Password cannot be empty", false);
      return;
    }
    setPassSaving(true);
    try {
      const body = { employeeAccessPassword: passValue };
if (mode === "self") body.currentPassword = currentPass;
    const res = await Altaxios.put(
        `/newemplyee/updateEmployeePassword/${encodeURIComponent(employeeId)}`,
        body
      );
      if (res.status === 200) {
        flash(setPassMsg, res.data?.message || "Password updated", true);
        setPassValue("");
        setPassOpen(false);
      }
    } catch (err) {
      flash(setPassMsg, err.response?.data?.message || "Failed to update password", false);
    } finally {
      setPassSaving(false);
    }
  };

  // ── Manager: delete ─────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await Altaxios.delete(
        `/newemplyee/deleteEmployee/${encodeURIComponent(employeeId)}`,
        { withCredentials: true }
      );
      navigate(`/company/${companyName || user?.companyName}`, { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete employee");
      setDeleting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="ep-root">
        <div className="ep-loading ep-mono">LOADING PROFILE…</div>
      </div>
    );
  }

  if (loadError || !employeeData) {
    return (
      <div className="ep-root">
        <div className="ep-load-error">
          <p>{loadError || "Employee not found."}</p>
          <Link to={`/company/${companyName || user?.companyName}`} className="ep-btn ep-btn--ghost">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const status    = employeeData.EmployeeProfileStatus || "Active";
  const ringColor = statusColor(status);
  const showStatusBadge = mode !== "peer"; // status is sensitive — hidden from peers

  return (
    <div className="ep-root">
      <div className="ep-container">

        {/* ── Top bar ───────────────────────────────────────────── */}
        <div className="ep-topbar">
          <Link to={`/company/${companyName || user?.companyName}`} className="ep-back" aria-label="Back">
            <ArrowBackIcon style={{ fontSize: 22 }} />
          </Link>
          <span className={`ep-mode-chip ep-mono ep-mode-chip--${mode}`}>
            {mode === "manager" ? "Manager view" : mode === "self" ? "Your profile" : "Team member"}
          </span>
        </div>

        <div className="ep-grid">

          {/* ══ LEFT — identity card ══════════════════════════════ */}
          <aside className="ep-identity">

            {/* Avatar — ring wears the status color */}
            <div className="ep-avatar-wrap">
              <div
                className="ep-avatar"
                style={showStatusBadge ? { borderColor: '#738495', boxShadow: `rgb(197 197 197 / 13%) 0px 0px 0px 4px` } : {}}
              >
                {
                  !photoPreview && !employeeData.EmplyeeProfile ? (
                    <PersonOutlineRoundedIcon style={{width:'100%', height:'100%', color:'#637689'}}/>
                  ) : (
                    <img
                      src={photoPreview || employeeData.EmplyeeProfile}
                      alt={employeeData.YemplyeeName || "Employee"}
                    />
                  )
                }
                {canChangePhoto && !photoUploading && (
                  <button
                    className="ep-avatar__change"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Change photo"
                  >
                    <AddAPhotoIcon style={{ fontSize: 18 }} />
                  </button>
                )}
                {photoUploading && (
                  <span className="ep-avatar__busy"><span className="ep-spinner" /></span>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="ep-file-hidden"
                onChange={pickPhoto}
              />
            </div>

            {/* Pending photo confirm */}
            {photoFile && !photoUploading && (
              <div className="ep-photo-pending">
                <button className="ep-btn ep-btn--ghost ep-btn--sm" onClick={cancelPhoto}>Cancel</button>
                <button className="ep-btn ep-btn--primary ep-btn--sm" onClick={savePhoto}>Save photo</button>
              </div>
            )}
            {photoMsg && <p className="ep-flash ep-flash--err">{photoMsg}</p>}

            {/* Name — editable inline when in edit mode */}
            {editing && editableKeys.includes("YemplyeeName") ? (
              <input
                className="ep-input ep-name-input"
                value={draft.YemplyeeName ?? ""}
                onChange={(e) => setDraft((p) => ({ ...p, YemplyeeName: e.target.value }))}
                placeholder="Employee name"
              />
            ) : (
              <h1 className="ep-name">{employeeData.YemplyeeName || "Employee"}</h1>
            )}

            <p className="ep-position">{employeeData.employeePosition || "—"}</p>

            {showStatusBadge && (
              <span className="ep-status-badge ep-mono" style={{ color: ringColor, borderColor: `${ringColor}55`, background: `${ringColor}14` }}>
                ● {status}
              </span>
            )}

            {/* Contact icons — only when viewing SOMEONE ELSE */}
            {!isSelf && (
              <div className="ep-contact">
                <div
                  className="ep-contact__btn"
                  title="Send email"
                  aria-label="Send email"
                >
                  <EmailOutlinedIcon  onClick={() => setEmailOpen(true)} style={{ fontSize: 20, color: "#ffb100" }} />
                </div>
                    <LiveChats employeeData={employeeData} />

                <a
                  href={employeeData.YemplyeePhone ? `tel:${employeeData.YemplyeePhone}` : undefined}
                  className={`ep-contact__btn ${!employeeData.YemplyeePhone ? "ep-contact__btn--disabled" : ""}`}
                  title="Call"
                  aria-label="Call"
                >
                  <CallIcon style={{ fontSize: 20, color: "#48ff00" }} />
                </a>
              </div>
            )}

          </aside>

          {/* ══ RIGHT — info sections ═════════════════════════════ */}
          <main className="ep-main">

            {/* Edit controls */}
            {canEditData && (
              <div className="ep-edit-row">
                {saveMsg && (
                  <span className={`ep-flash ${saveMsg.ok ? "ep-flash--ok" : "ep-flash--err"}`}>
                    {saveMsg.text}
                  </span>
                )}
                {!editing ? (
                  <button className="ep-btn ep-btn--ghost ep-btn--sm" onClick={startEdit}>
                    <EditIcon style={{ fontSize: 16 }} /> Edit profile
                  </button>
                ) : (
                  <div className="ep-edit-actions">
                    <button className="ep-btn ep-btn--ghost ep-btn--sm" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </button>
                    <button className="ep-btn ep-btn--primary ep-btn--sm" onClick={handleSave} disabled={saving || !isDirty}>
                      {saving && <span className="ep-spinner ep-spinner--dark" />}
                      Save changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Data sections — rendered from config */}
            {SECTIONS.filter((s) => s.visibleTo.includes(mode)).map((section) => {
              const fields = section.fields.filter((f) => f.visibleTo.includes(mode));
              if (!fields.length) return null;
              return (
                <section className="ep-card" key={section.title}>
                  <h2 className="ep-card__heading">{section.title}</h2>
                  <div className="ep-fields">
                    {fields.map((f) => {
                      const editable = editing && editableKeys.includes(f.key);
                      return (
                        <div className="ep-field" key={f.key}>
                          <span className="ep-field__label ep-mono">{f.label}</span>
                          {editable ? (
                            <input
                              type={f.type}
                              className="ep-input"
                              value={draft[f.key] ?? ""}
                              onChange={(e) =>
                                setDraft((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                            />
                          ) : (
                            <span className="ep-field__value">
                              {employeeData[f.key] || <span className="ep-empty">—</span>}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* ── Self: change own password ──────────────────────── */}
            {mode === "self" && (
              <section className="ep-card">
                <h2 className="ep-card__heading">Security</h2>
                {!passOpen ? (
                  <button className="ep-btn ep-btn--ghost ep-btn--sm" onClick={() => setPassOpen(true)}>
                    Change my password
                  </button>
                ) : (
                  <PasswordForm
                    value={passValue} setValue={setPassValue}
                    show={passShow}   setShow={setPassShow}
                    saving={passSaving} msg={passMsg}
                    onSave={savePassword}
                    mode={mode}
                    currentPass={currentPass}
                    setCurrentPass={setCurrentPass}
                    onCancel={() => { setPassOpen(false); setPassValue(""); }}
                  />
                )}
                {!passOpen && passMsg && (
                  <span className={`ep-flash ${passMsg.ok ? "ep-flash--ok" : "ep-flash--err"}`}>{passMsg.text}</span>
                )}
              </section>
            )}

            {/* ── Manager actions ────────────────────────────────── */}
            {mode === "manager" && (
              <section className="ep-card ep-card--actions">
                <h2 className="ep-card__heading">Manage employee</h2>

                {/* Status pills */}
                <div className="ep-action-block">
                  <span className="ep-action-label ep-mono">Profile status</span>
                  <div className="ep-status-pills">
                    {STATUSES.map((s) => (
                      <button
                        key={s.value}
                        className={`ep-status-pill ${selectedStatus === s.value ? "ep-status-pill--active" : ""}`}
                        style={selectedStatus === s.value
                          ? { color: s.color, borderColor: `${s.color}66`, background: `${s.color}14` }
                          : {}}
                        onClick={() => setSelectedStatus(s.value)}
                      >
                        <span className="ep-status-pill__dot" style={{ background: s.color }} />
                        {s.value}
                      </button>
                    ))}
                  </div>
                  <div className="ep-action-foot">
                    {statusMsg && (
                      <span className={`ep-flash ${statusMsg.ok ? "ep-flash--ok" : "ep-flash--err"}`}>{statusMsg.text}</span>
                    )}
                    <button
                      className="ep-btn ep-btn--primary ep-btn--sm"
                      onClick={saveStatus}
                      disabled={statusSaving || selectedStatus === status}
                    >
                      {statusSaving && <span className="ep-spinner ep-spinner--dark" />}
                      Update status
                    </button>
                  </div>
                </div>

                <div className="ep-divider" />

                {/* Set password */}
                <div className="ep-action-block">
                  <span className="ep-action-label ep-mono">Access password</span>
                  {!passOpen ? (
                    <button className="ep-btn ep-btn--ghost ep-btn--sm" onClick={() => setPassOpen(true)}>
                      Set / update password
                    </button>
                  ) : (
                    <PasswordForm
                      value={passValue} setValue={setPassValue}
                      show={passShow}   setShow={setPassShow}
                      saving={passSaving} msg={passMsg}
                      onSave={savePassword}
                      mode={mode}
                      currentPass={currentPass}
                      setCurrentPass={setCurrentPass}
                      onCancel={() => { setPassOpen(false); setPassValue(""); }}
                    />
                  )}
                  {!passOpen && passMsg && (
                    <span className={`ep-flash ${passMsg.ok ? "ep-flash--ok" : "ep-flash--err"}`}>{passMsg.text}</span>
                  )}
                </div>

                <div className="ep-divider" />

                {/* Danger zone — self-deletion blocked in UI */}
                {!isSelf && (
                  <div className="ep-danger">
                    <div>
                      <h4 className="ep-danger__title">Delete this employee</h4>
                      <p className="ep-danger__desc">
                        Removes the profile and revokes their access permanently.
                      </p>
                    </div>
                    <button className="ep-danger__btn" onClick={() => { setDeleteError(""); setConfirmDelete(true); }}>
                      Delete profile
                    </button>
                  </div>
                )}
              </section>
            )}

<EmailComposer
  open={emailOpen}
  onClose={() => setEmailOpen(false)}
  recipients={[{ _id: employeeData._id, name: employeeData.YemplyeeName }]}
/>
          </main>
        </div>
      </div>

      {/* ── Delete confirmation — the reusable dialog ───────────── */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this employee?"
        message={`"${employeeData.YemplyeeName || "This employee"}" will lose all access immediately and their profile will be permanently removed.`}
        error={deleteError}
        confirmLabel="Delete employee"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/* ── Small shared password form (manager + self reuse it) ───────── */
function PasswordForm({ mode, currentPass, setCurrentPass, value, setValue, show, setShow, saving, msg, onSave, onCancel }) {
  return (
    <div className="ep-pass-form">
      <div className="ep-pass-input-wrap">
        <input
          type={show ? "text" : "password"}
          className="ep-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New password…"
          autoComplete="new-password"
        />
          {mode === "self" && (
            <input
              type="password"
              className="ep-input"
              placeholder="Current password…"
              autoComplete="current-password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
            />
          )}
        <button
          type="button"
          className="ep-pass-toggle"
          onClick={() => setShow((p) => !p)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <VisibilityOffIcon style={{ fontSize: 17 }} /> : <VisibilityIcon style={{ fontSize: 17 }} />}
        </button>
      </div>

      {msg && (
        <span className={`ep-flash ${msg.ok ? "ep-flash--ok" : "ep-flash--err"}`}>{msg.text}</span>
      )}

      <div className="ep-pass-actions">
        <button className="ep-btn ep-btn--ghost ep-btn--sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="ep-btn ep-btn--primary ep-btn--sm" onClick={onSave} disabled={saving}>
          {saving && <span className="ep-spinner ep-spinner--dark" />}
          Save password
        </button>
      </div>
    </div>
  );
}