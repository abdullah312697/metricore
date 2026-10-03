import { ROLE_TIERS } from "./roles";

// utils/permissions.js
export const TIER_PERMISSIONS = {
  owner: {
    viewFinancials:   true,   // company-wide revenue/profit/margins
    manageProducts:   true,
    manageTeam:       true,   // add/remove employees, set roles
    manageBilling:    true,
    manageSettings:   true,
    deleteCompany:    true,
    useChat:          true,
  },
  manager: {
    viewFinancials:   true,   // can see margins/reports
    manageProducts:   true,
    manageTeam:       true,   // add employees, but not change owner
    manageBilling:    false,
    manageSettings:   false,
    deleteCompany:    false,
    useChat:          true,
  },
  finance: {
    viewFinancials:   true,   // the money people — full financial view
    manageProducts:   true,   // can edit costs
    manageTeam:       false,
    manageBilling:    true,   // often finance handles billing
    manageSettings:   false,
    deleteCompany:    false,
    useChat:          true,
  },
  staff: {
    viewFinancials:   false,  // ⚠️ cannot see company-wide financials
    manageProducts:   false,  // maybe view/enter their own data only
    manageTeam:       false,
    manageBilling:    false,
    manageSettings:   false,
    deleteCompany:    false,
    useChat:          true,
  },
  viewer: {
    viewFinancials:   false,
    manageProducts:   false,
    manageTeam:       false,
    manageBilling:    false,
    manageSettings:   false,
    deleteCompany:    false,
    useChat:          true,   // guest can at least chat
  },
};

export const can = (role, permission) => {
  const tier = ROLE_TIERS[role] || "viewer";
  return TIER_PERMISSIONS[tier]?.[permission] === true;
};