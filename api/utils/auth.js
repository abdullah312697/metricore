// utils/auth.js
//
// ONE shared auth + permission module for the whole backend.
//
// Consolidates:
//   • getRequester()   — decrypt cookies, load the employee, enforce
//                        company isolation (multi-tenant safety)
//   • isOwnerRecord()  — is this employee the actual company owner
//                        (matched by company email, not by role)
//   • role → tier → permission system for all job-title roles
//
// USAGE (inline, inside a route):
//   import { getRequester } from "../utils/auth.js";
//   const ctx = await getRequester(req);
//   if (!ctx) return res.status(401).json({ message: "Login/Register please!" });
//   if (!ctx.can("manageTeam")) return res.status(403).json({ message: "Not authorized." });
//   // ctx.requester, ctx.requesterId, ctx.companyId, ctx.role, ctx.tier all available
//
// USAGE (middleware, cleanest — see middleware/requirePermission.js):
//   router.post("/addemplyee", requirePermission("manageTeam"), handler);
//
// ⚠️ ADJUST the two paths below if your files live elsewhere:
//     ../models/Employee.js, ../models/Companies.js, ../verifyuser.js

import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Companies from "../models/Companies.js";
import { decryptUserData } from "../verifyuser.js";

/* ══════════════════════════════════════════════════════════════════
   ROLE → TIER
   Every job-title role maps to one of 5 access tiers. To add a new
   role later, just map it to a tier here — nothing else changes.
   Unknown/unmapped roles fall back to the most restrictive tier.
══════════════════════════════════════════════════════════════════ */
export const ROLE_TIERS = {
  // full access
  Admin:      "owner",
  CEO:        "owner",
  Owner: "owner",
  // management: operations + team, but not billing / settings / delete
  Manager:    "manager",
  Supervisor: "manager",
  HR:         "manager",

  // the money roles: financial visibility + billing
  Finance:    "finance",
  Accountant: "finance",

  // operational staff: limited financial visibility
  Sales:      "staff",
  Marketing:  "staff",
  Engineer:   "staff",
  Technician: "staff",
  Driver:     "staff",
  Worker:     "staff",
  Support:    "staff",

  // minimal / read-only
  Guest:      "viewer",
};

/* ══════════════════════════════════════════════════════════════════
   TIER → PERMISSIONS
   The single source of truth for "what can this tier do".
   Tune these true/false values to match your real business rules.

   Permission keys (extend as your features grow):
     viewFinancials  — company-wide revenue / profit / margins
     manageProducts  — create / edit / delete products & costs
     manageTeam      — add / remove employees, set roles
     manageBilling   — subscription / Stripe / plan changes
     manageSettings  — company settings
     deleteCompany   — delete the whole company (owner-only)
     useChat         — group / 1-to-1 chat
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
   HELPERS — pure, no DB. Safe to import anywhere (frontend too, if
   you copy the maps there).
══════════════════════════════════════════════════════════════════ */

// Resolve a role string to its tier (defaults to the safest tier).
export const tierOf = (role) => ROLE_TIERS[role] || "viewer";

// Does this role have this permission?
export const can = (role, permission) =>
  TIER_PERMISSIONS[tierOf(role)]?.[permission] === true;

/* ══════════════════════════════════════════════════════════════════
   getRequester(req)
   The system-wide gate. Returns null when the caller is not a valid,
   logged-in employee of the company in their cookie.

   On success returns:
     {
       requester,     // full Employee document
       requesterId,   // decrypted employee id (string)
       companyId,     // decrypted company id (string) — use to scope queries
       role,          // requester.EmplyeeRoal
       tier,          // resolved tier
       can(perm),     // convenience permission check bound to this role
     }
══════════════════════════════════════════════════════════════════ */
export const getRequester = async (req) => {
  const { employeeId, companyId } = req.cookies || {};
  if (!employeeId || !companyId) return null;

  const requesterId  = decryptUserData(employeeId);
  const reqCompanyId = decryptUserData(companyId);
  if (!requesterId || !reqCompanyId) return null;

  if (!mongoose.Types.ObjectId.isValid(requesterId)) return null;

  const requester = await Employee.findById(requesterId);
  if (!requester) return null;

  // 🔒 multi-tenant isolation: the employee must belong to the company
  //    named in the cookie. Prevents cross-company access.
  if (String(requester.companyId) !== String(reqCompanyId)) return null;

  return {
    requester,
    requesterId,
    companyId: reqCompanyId,
    role:  requester.EmplyeeRoal,
    tier:  tierOf(requester.EmplyeeRoal),
    can:   (permission) => can(requester.EmplyeeRoal, permission),
  };
};

/* ══════════════════════════════════════════════════════════════════
   isOwnerRecord(target)
   The REAL company owner is identified by matching the company's
   email — not by any role string (your role list has no "Owner").
   Use this for owner-only guards, e.g.:
     • only the owner can delete the company
     • an owner record cannot be removed / demoted by others
══════════════════════════════════════════════════════════════════ */
export const isOwnerRecord = async (target) => {
  if (!target?.companyId) return false;
  const company = await Companies.findById(String(target.companyId));
  return !!company && target.YemplyeeEmail === company.companyEmail;
};

/* ══════════════════════════════════════════════════════════════════
   requirePermission(permission)
   Express middleware wrapper around getRequester. Attaches the
   validated context to req.ctx for the route handler.

   router.post("/addemplyee", requirePermission("manageTeam"), handler);

   Inside handler:  const { companyId, requester } = req.ctx;
══════════════════════════════════════════════════════════════════ */
export const requirePermission = (permission) => async (req, res, next) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) {
      return res.status(401).json({ message: "Login/Register please!" });
    }
    if (permission && !ctx.can(permission)) {
      return res.status(403).json({ message: "You don't have permission for this action." });
    }
    req.ctx = ctx;
    next();
  } catch (err) {
    console.error("requirePermission error:", err);
    return res.status(500).json({ message: "Authorization check failed." });
  }
};

/* ══════════════════════════════════════════════════════════════════
   ROLE ASSIGNMENT GUARD (privilege-escalation protection)
   Added so a lower tier can't grant a role above its own level
   (e.g. a Manager assigning Admin/CEO, which are owner-tier).
══════════════════════════════════════════════════════════════════ */

// Roles that may be assigned to employees ("Owner" is never assignable —
// ownership comes only from company registration).
export const ASSIGNABLE_ROLES = [
  "Admin", "CEO",
  "Manager", "Supervisor", "HR",
  "Finance", "Accountant",
  "Sales", "Marketing", "Engineer", "Technician", "Driver", "Worker", "Support",
  "Guest",
];

// Higher rank = more privileged.
const TIER_RANK = {
  owner:   4,
  finance: 3,
  manager: 3,
  staff:   1,
  viewer:  0,
};

// Can a user with assignerRole assign targetRole to someone?
// Rule: target's tier rank must be <= assigner's, and the literal
// "Owner" role is never assignable through normal flows.
export const canAssignRole = (assignerRole, targetRole) => {
  if (targetRole === "Owner") return false;
  const aRank = TIER_RANK[tierOf(assignerRole)] ?? 0;
  const tRank = TIER_RANK[tierOf(targetRole)]   ?? 0;
  return tRank <= aRank;
};

// The roles this assigner is allowed to hand out (for filtering UI/validation).
export const assignableRolesFor = (assignerRole) =>
  ASSIGNABLE_ROLES.filter((r) => canAssignRole(assignerRole, r));