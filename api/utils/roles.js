// utils/roles.js — map each job title to an access tier
export const ROLE_TIERS = {
  // Full access — owner-level
  Admin:      "owner",
  CEO:        "owner",

  // Management — operational + team, no billing/company-delete
  Manager:    "manager",
  Supervisor: "manager",
  HR:         "manager",

  // Financial — can see financials/margins (the sensitive money data)
  Finance:    "finance",
  Accountant: "finance",

  // Staff — operational work, limited financial visibility
  Sales:      "staff",
  Marketing:  "staff",
  Engineer:   "staff",
  Technician: "staff",
  Driver:     "staff",
  Worker:     "staff",
  Support:    "staff",

  // Read-only / minimal
  Guest:      "viewer",
};

// helper
export const tierOf = (role) => ROLE_TIERS[role] || "viewer";