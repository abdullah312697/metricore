// src/utils/permissions.js
//
// FRONTEND mirror of the backend utils/auth.js.
// This drives UX only — hiding buttons/pages a role can't use.
// The BACKEND is what actually enforces security; never rely on this
// file for protection, only for a clean interface.
//
// ⚠️ KEEP IN SYNC WITH BACKEND auth.js
// The ROLE_TIERS and TIER_PERMISSIONS maps below must match the backend
// exactly. If you change a permission on one side, change it on both, or
// the UI will show/hide the wrong things (e.g. show a button the backend
// then rejects with 403).

/* ══════════════════════════════════════════════════════════════════
   ROLE → TIER  (all 15 roles + Owner)
══════════════════════════════════════════════════════════════════ */
export const ROLE_TIERS = {
  Owner:      "owner",   // created at company registration
  Admin:      "owner",
  CEO:        "owner",

  Manager:    "manager",
  Supervisor: "manager",
  HR:         "manager",

  Finance:    "finance",
  Accountant: "finance",

  Sales:      "staff",
  Marketing:  "staff",
  Engineer:   "staff",
  Technician: "staff",
  Driver:     "staff",
  Worker:     "staff",
  Support:    "staff",

  Guest:      "viewer",
};

/* ══════════════════════════════════════════════════════════════════
   TIER → PERMISSIONS  (must match backend auth.js)
══════════════════════════════════════════════════════════════════ */
export const TIER_PERMISSIONS = {
  owner: {
    viewFinancials: true,
    manageProducts: true,
    manageTeam:     true,
    manageBilling:  true,
    manageSettings: true,
    deleteCompany:  true,
    useChat:        true,
  },
  manager: {
    viewFinancials: true,
    manageProducts: true,
    manageTeam:     true,
    manageBilling:  false,
    manageSettings: false,
    deleteCompany:  false,
    useChat:        true,
  },
  finance: {
    viewFinancials: true,
    manageProducts: true,
    manageTeam:     false,
    manageBilling:  true,
    manageSettings: false,
    deleteCompany:  false,
    useChat:        true,
  },
  staff: {
    viewFinancials: false,
    manageProducts: false,
    manageTeam:     false,
    manageBilling:  false,
    manageSettings: false,
    deleteCompany:  false,
    useChat:        true,
  },
  viewer: {
    viewFinancials: false,
    manageProducts: false,
    manageTeam:     false,
    manageBilling:  false,
    manageSettings: false,
    deleteCompany:  false,
    useChat:        true,
  },
};

/* ══════════════════════════════════════════════════════════════════
   CORE HELPERS
══════════════════════════════════════════════════════════════════ */

// role string → tier (defaults to the most restrictive tier)
export const tierOf = (role) => ROLE_TIERS[role] || "viewer";

// does this role have this permission?
export const can = (role, permission) =>
  TIER_PERMISSIONS[tierOf(role)]?.[permission] === true;

// convenience: does this role have ANY of these permissions?
export const canAny = (role, permissions = []) =>
  permissions.some((p) => can(role, p));

/* ══════════════════════════════════════════════════════════════════
   HUMAN-READABLE METADATA — for the employee/role UI
   Use these to SHOW the person assigning a role what it grants,
   so roles aren't just opaque labels.
══════════════════════════════════════════════════════════════════ */

// One-line description per permission (plain language)
export const PERMISSION_LABELS = {
  viewFinancials: "See company financials (revenue, profit, margins, reports)",
  manageProducts: "Add and edit products, costs, goals, and targets",
  manageTeam:     "Add, edit, and remove team members",
  manageBilling:  "Manage the subscription and billing",
  manageSettings: "Change company settings and logo",
  deleteCompany:  "Delete the company",
  useChat:        "Use team chat",
};

// Short description + which permissions each TIER grants.
// Order matters — highest access first.
export const TIER_INFO = {
  owner: {
    label:       "Full access",
    description: "Can do everything, including billing, settings, and deleting the company.",
  },
  manager: {
    label:       "Management",
    description: "Runs day-to-day: sees financials, manages products and the team. No billing or company settings.",
  },
  finance: {
    label:       "Finance",
    description: "Handles money: sees financials, manages products and billing. Cannot manage the team.",
  },
  staff: {
    label:       "Staff",
    description: "Team chat only. Cannot see company financials or manage anything.",
  },
  viewer: {
    label:       "Limited",
    description: "Minimal access — team chat only.",
  },
};

// Every selectable role, grouped by tier, WITH what it grants —
// ready to render in the role picker on the employee page.
// (Owner is intentionally excluded: it's assigned at registration,
//  not something you pick for a new employee.)
export const ASSIGNABLE_ROLES = [
  "Admin", "CEO",
  "Manager", "Supervisor", "HR",
  "Finance", "Accountant",
  "Sales", "Marketing", "Engineer", "Technician", "Driver", "Worker", "Support",
  "Guest",
];

// Given a role, return the list of granted-permission labels (for the UI).
// e.g. describeRole("Sales") → ["Use team chat"]
//      describeRole("Manager") → ["See company financials …", "Add and edit products …", …]
export const describeRole = (role) => {
  const perms = TIER_PERMISSIONS[tierOf(role)] || {};
  return Object.entries(perms)
    .filter(([, allowed]) => allowed)
    .map(([key]) => PERMISSION_LABELS[key] || key);
};

// Given a role, return the tier meta (label + description) for a summary line.
// e.g. roleTierInfo("Finance") → { tier:"finance", label:"Finance", description:"…" }
export const roleTierInfo = (role) => {
  const tier = tierOf(role);
  return { tier, ...(TIER_INFO[tier] || { label: tier, description: "" }) };
};

/* ══════════════════════════════════════════════════════════════════
   ROLE ASSIGNMENT GUARD (must match backend auth.js)
   Prevents a lower tier from assigning a role above its own level.
══════════════════════════════════════════════════════════════════ */

// Higher rank = more privileged.
const TIER_RANK = {
  owner:   4,
  finance: 3,
  manager: 3,
  staff:   1,
  viewer:  0,
};

// Can a user with assignerRole assign targetRole to someone?
export const canAssignRole = (assignerRole, targetRole) => {
  if (targetRole === "Owner") return false;
  const aRank = TIER_RANK[tierOf(assignerRole)] ?? 0;
  const tRank = TIER_RANK[tierOf(targetRole)]   ?? 0;
  return tRank <= aRank;
};

// The roles this assigner may hand out — use to filter the pills.
export const assignableRolesFor = (assignerRole) =>
  ASSIGNABLE_ROLES.filter((r) => canAssignRole(assignerRole, r));