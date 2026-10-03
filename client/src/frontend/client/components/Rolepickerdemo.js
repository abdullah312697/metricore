import React, { useState } from "react";

/* ────────────────────────────────────────────────────────────────
   permissions.js (inlined here for a self-contained demo).
   In your app, import these from "../utils/permissions".
──────────────────────────────────────────────────────────────── */
const ROLE_TIERS = {
  Owner: "owner", Admin: "owner", CEO: "owner",
  Manager: "manager", Supervisor: "manager", HR: "manager",
  Finance: "finance", Accountant: "finance",
  Sales: "staff", Marketing: "staff", Engineer: "staff", Technician: "staff",
  Driver: "staff", Worker: "staff", Support: "staff",
  Guest: "viewer",
};
const TIER_PERMISSIONS = {
  owner:   { viewFinancials: true,  manageProducts: true,  manageTeam: true,  manageBilling: true,  manageSettings: true,  deleteCompany: true,  useChat: true },
  manager: { viewFinancials: true,  manageProducts: true,  manageTeam: true,  manageBilling: false, manageSettings: false, deleteCompany: false, useChat: true },
  finance: { viewFinancials: true,  manageProducts: true,  manageTeam: false, manageBilling: true,  manageSettings: false, deleteCompany: false, useChat: true },
  staff:   { viewFinancials: false, manageProducts: false, manageTeam: false, manageBilling: false, manageSettings: false, deleteCompany: false, useChat: true },
  viewer:  { viewFinancials: false, manageProducts: false, manageTeam: false, manageBilling: false, manageSettings: false, deleteCompany: false, useChat: true },
};
const PERMISSION_LABELS = {
  viewFinancials: "See company financials (revenue, profit, margins)",
  manageProducts: "Add & edit products, costs, goals, targets",
  manageTeam:     "Add, edit & remove team members",
  manageBilling:  "Manage subscription & billing",
  manageSettings: "Change company settings & logo",
  deleteCompany:  "Delete the company",
  useChat:        "Use team chat",
};
const TIER_INFO = {
  owner:   { label: "Full access", description: "Everything, including billing, settings, and deleting the company." },
  manager: { label: "Management",  description: "Day-to-day operations: financials, products, and the team. No billing or settings." },
  finance: { label: "Finance",     description: "Money side: financials, products, and billing. Cannot manage the team." },
  staff:   { label: "Staff",       description: "Team chat only. Cannot see financials or manage anything." },
  viewer:  { label: "Limited",     description: "Minimal access — team chat only." },
};
const ASSIGNABLE_ROLES = [
  "Admin", "CEO", "Manager", "Supervisor", "HR", "Finance", "Accountant",
  "Sales", "Marketing", "Engineer", "Technician", "Driver", "Worker", "Support", "Guest",
];
const PERMISSION_ORDER = [
  "viewFinancials", "manageProducts", "manageTeam",
  "manageBilling", "manageSettings", "deleteCompany", "useChat",
];
const tierOf = (role) => ROLE_TIERS[role] || "viewer";

/* ────────────────────────────────────────────────────────────────
   Tier accent colors (map each tier to a brand-aligned hue)
──────────────────────────────────────────────────────────────── */
const TIER_ACCENT = {
  owner:   "#ffb100",
  manager: "#38bdf8",
  finance: "#34d399",
  staff:   "#8899aa",
  viewer:  "#6b7a8c",
};

export default function RolePickerDemo() {
  const [role, setRole] = useState("Sales");
  const tier = tierOf(role);
  const perms = TIER_PERMISSIONS[tier];
  const info = TIER_INFO[tier];
  const accent = TIER_ACCENT[tier];

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.eyebrow}>TEAM · ROLE</div>
          <h1 style={s.title}>Assign a role</h1>
          <p style={s.sub}>
            Pick a role for this team member. What they can see and manage
            updates below — so you always know what you're granting.
          </p>
        </div>

        {/* Role selector */}
        <label style={s.fieldLabel}>Role</label>
        <div style={s.selectWrap}>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={s.select}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <span style={s.selectArrow}>▾</span>
        </div>

        {/* Tier summary */}
        <div style={{ ...s.tierBar, borderColor: accent }}>
          <div style={{ ...s.tierDot, background: accent }} />
          <div>
            <div style={{ ...s.tierLabel, color: accent }}>
              {info.label} <span style={s.tierName}>· {tier}</span>
            </div>
            <div style={s.tierDesc}>{info.description}</div>
          </div>
        </div>

        {/* Permission list */}
        <div style={s.permHeader}>This role can</div>
        <ul style={s.permList}>
          {PERMISSION_ORDER.map((key) => {
            const allowed = perms[key];
            return (
              <li key={key} style={s.permItem}>
                <span style={{ ...s.check, color: allowed ? accent : "#3a4654" }}>
                  {allowed ? "✓" : "✕"}
                </span>
                <span style={{ ...s.permText, color: allowed ? "#dde6ee" : "#5c6b7a", textDecoration: allowed ? "none" : "line-through" }}>
                  {PERMISSION_LABELS[key]}
                </span>
              </li>
            );
          })}
        </ul>

        <button style={{ ...s.saveBtn, background: accent }}>
          Save role
        </button>
        <p style={s.footnote}>
          The owner is set when the company is created and isn't assignable here.
          Changes take effect the next time this person signs in.
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh", background: "#011626", display: "flex",
    alignItems: "center", justifyContent: "center", padding: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    width: "100%", maxWidth: 460, background: "#071e30",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16,
    padding: 28,
  },
  header: { marginBottom: 22 },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 3,
    color: "#ffb100", marginBottom: 10,
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700,
    color: "#fff", margin: "0 0 8px",
  },
  sub: { fontSize: 13.5, lineHeight: 1.6, color: "#8899aa", margin: 0 },
  fieldLabel: {
    display: "block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    letterSpacing: 1.5, textTransform: "uppercase", color: "#4d6070", marginBottom: 8,
  },
  selectWrap: { position: "relative", marginBottom: 18 },
  select: {
    width: "100%", appearance: "none", WebkitAppearance: "none",
    background: "#040f1a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "12px 14px", fontSize: 14, cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  selectArrow: {
    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
    color: "#ffb100", pointerEvents: "none", fontSize: 12,
  },
  tierBar: {
    display: "flex", gap: 12, alignItems: "flex-start",
    background: "rgba(255,255,255,0.02)", border: "1px solid", borderLeftWidth: 3,
    borderRadius: 8, padding: "14px 16px", marginBottom: 22,
  },
  tierDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0 },
  tierLabel: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 },
  tierName: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4d6070", fontWeight: 400 },
  tierDesc: { fontSize: 12.5, lineHeight: 1.55, color: "#8899aa", marginTop: 3 },
  permHeader: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1.5,
    textTransform: "uppercase", color: "#4d6070", marginBottom: 10,
  },
  permList: { listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 9 },
  permItem: { display: "flex", alignItems: "flex-start", gap: 11, fontSize: 13.5, lineHeight: 1.4 },
  check: { flexShrink: 0, fontWeight: 700, width: 14, textAlign: "center" },
  permText: {},
  saveBtn: {
    width: "100%", border: "none", borderRadius: 8, padding: "12px",
    color: "#011626", fontWeight: 700, fontSize: 14, cursor: "pointer",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  footnote: { fontSize: 11.5, lineHeight: 1.5, color: "#4d6070", marginTop: 14, marginBottom: 0 },
};