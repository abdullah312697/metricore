import { useState, useEffect } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon       from "@mui/icons-material/Check";
import ConfirmDialog   from "./ConfirmDialog";
import { Altaxios }    from "../../Altaxios";
import "../../../style/ApiKeysCard.css";
import { Link } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════════
   ApiKeysCard — drop into CompanyProfile's main column:
     <ApiKeysCard />
   Backend enforces manager-only; non-managers see the error state.
═══════════════════════════════════════════════════════════════ */

// Derive the public API base from Altaxios so the examples are
// copy-paste correct in every environment
const API_BASE = (Altaxios?.defaults?.baseURL || "https://YOUR-API/api").replace(/\/$/, "");

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

export default function ApiKeysCard() {
  const [keys,      setKeys]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState("");

  // create flow
  const [formOpen, setFormOpen] = useState(false);
  const [name,     setName]     = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  // the one-time reveal
  const [newKey, setNewKey] = useState(null);   // { key, name }
  const [copied, setCopied] = useState(false);

  // revoke flow
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking,     setRevoking]     = useState(false);
  const [revokeError,  setRevokeError]  = useState("");

  useEffect(() => {
    Altaxios.get("/apikeys")
      .then((res) => setKeys(res.data.data || []))
      .catch((err) => setLoadError(err.response?.data?.message || "Failed to load API keys"))
      .finally(() => setLoading(false));
  }, []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — user can select manually */ }
  };

  const handleCreate = async () => {
    if (!name.trim()) { setCreateErr("Give the key a name — e.g. 'Website backend'."); return; }
    setCreating(true);
    setCreateErr("");
    try {
      const res = await Altaxios.post("/apikeys", { name: name.trim() });
      setKeys((prev) => [res.data.data, ...prev]);
      setNewKey({ key: res.data.apiKey, name: res.data.data.name });
      setName("");
      setFormOpen(false);
    } catch (err) {
      setCreateErr(err.response?.data?.message || "Failed to create key.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError("");
    try {
      await Altaxios.delete(`/apikeys/${revokeTarget._id}`);
      setKeys((prev) =>
        prev.map((k) => (k._id === revokeTarget._id ? { ...k, revoked: true } : k))
      );
      setRevokeTarget(null);
    } catch (err) {
      setRevokeError(err.response?.data?.message || "Failed to revoke key.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <section className="ak-card">
      <div className="ak-head">
        <div>
          <h2 className="ak-heading">API access</h2>
          <p className="ak-sub">
            Let your website or backend push daily sales and cost numbers
            into MetriCore automatically.
          </p>
        </div>
        {!formOpen && !newKey && (
          <button className="ak-btn ak-btn--primary ak-btn--sm" onClick={() => setFormOpen(true)}>
            + New key
          </button>
        )}
      </div>

      {/* ── One-time key reveal ────────────────────────────────── */}
      {newKey && (
        <div className="ak-reveal">
          <p className="ak-reveal__title">
            ⚠ Copy this key now — it will <strong>never be shown again</strong>.
          </p>
          <div className="ak-reveal__keyrow">
            <code className="ak-reveal__key ak-mono">{newKey.key}</code>
            <button className="ak-icon-btn" onClick={() => copy(newKey.key)} aria-label="Copy key">
              {copied ? <CheckIcon style={{ fontSize: 16 }} /> : <ContentCopyIcon style={{ fontSize: 16 }} />}
            </button>
          </div>
          <button className="ak-btn ak-btn--ghost ak-btn--sm" onClick={() => setNewKey(null)}>
            I've saved it securely
          </button>
        </div>
      )}

      {/* ── Create form ────────────────────────────────────────── */}
      {formOpen && (
        <div className="ak-form">
          <input
            className="ak-input"
            placeholder='Key name — e.g. "Website backend"'
            value={name}
            maxLength={60}
            onChange={(e) => { setName(e.target.value); setCreateErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          {createErr && <span className="ak-error">{createErr}</span>}
          <div className="ak-form__actions">
            <button className="ak-btn ak-btn--ghost ak-btn--sm" onClick={() => { setFormOpen(false); setCreateErr(""); }} disabled={creating}>
              Cancel
            </button>
            <button className="ak-btn ak-btn--primary ak-btn--sm" onClick={handleCreate} disabled={creating}>
              {creating && <span className="ak-spinner" />}
              Generate key
            </button>
          </div>
        </div>
      )}

      {/* ── Key list ───────────────────────────────────────────── */}
      {loading ? (
        <p className="ak-dim ak-mono">LOADING…</p>
      ) : loadError ? (
        <p className="ak-error">{loadError}</p>
      ) : keys.length === 0 ? (
        <p className="ak-dim">No API keys yet. Generate one to connect your system.</p>
      ) : (
        <div className="ak-list">
          {keys.map((k) => (
            <div className={`ak-row ${k.revoked ? "ak-row--revoked" : ""}`} key={k._id}>
              <div className="ak-row__main">
                <span className="ak-row__name">{k.name}</span>
                <code className="ak-row__prefix ak-mono">{k.keyPrefix}••••••••</code>
              </div>
              <div className="ak-row__meta ak-mono">
                <span>Created {fmtDate(k.createdAt)}</span>
                <span>{k.lastUsedAt ? `Last used ${fmtDate(k.lastUsedAt)}` : "Never used"}</span>
              </div>
              {k.revoked ? (
                <span className="ak-chip ak-chip--revoked ak-mono">REVOKED</span>
              ) : (
                <button className="ak-revoke" onClick={() => { setRevokeError(""); setRevokeTarget(k); }}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Quick-start docs ───────────────────────────────────── */}
      <details className="ak-docs">
        <summary className="ak-docs__summary">How to send data</summary>
        <div className="ak-docs__body">
          <p className="ak-docs__label ak-mono">1 · TEST YOUR KEY</p>
          <pre className="ak-pre ak-mono">{`curl ${API_BASE}/v1/ingest/ping \\
  -H "Authorization: Bearer mc_live_YOUR_KEY"`}</pre>

          <p className="ak-docs__label ak-mono">2 · PUSH TODAY'S NUMBERS</p>
          <pre className="ak-pre ak-mono">{`curl -X POST ${API_BASE}/v1/ingest/daily \\
  -H "Authorization: Bearer mc_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "products": [
      { "name": "Product Alpha",
        "soldQuantity": 47,
        "returns": 2,
        "adCost": 35.50 }
    ]
  }'`}</pre>

          <p className="ak-docs__note">
            Send <strong>cumulative totals for today</strong>, not increments —
            pushing the same numbers twice is harmless. Match products by
            <code className="ak-mono"> name</code>, <code className="ak-mono">sku</code>,
            or <code className="ak-mono">productId</code>. Available metrics:
            soldQuantity, returns, adCost, otherCost, deliveryCostPerSale,
            packagingCost, buyingCost, shippingCost.
          </p>
          <Link to="/developers" className="ak-btn ak-btn--ghost ak-btn--sm">
            Full developer guide →
          </Link>
        </div>
      </details>

      {/* ── Revoke confirmation ────────────────────────────────── */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke this API key?"
        message={`"${revokeTarget?.name}" will stop working immediately. Any system using it will start receiving 401 errors on its next request.`}
        error={revokeError}
        confirmLabel="Revoke key"
        loading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </section>
  );
}