import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";   // 👈 adjust path if needed
import Loading from './Loading';

/**
 * AuthGuard
 *
 * Props:
 *   allowedRoles       (string[])  — legacy role gate (kept working)
 *   requirePermission  (string)    — NEW: a single permission key, e.g. "viewFinancials"
 *   requireAnyPermission (string[])— NEW: pass if the user has ANY of these
 *
 * Order of checks: loading → logged in → email verified → permission/role.
 * A blocked user is bounced to their dashboard (not shown the page).
 *
 * NOTE: this is UX only. The BACKEND enforces real security on every
 * route — this just avoids showing pages a role can't use.
 */
const AuthGuard = ({
  children,
  allowedRoles = [],
  requirePermission = null,
  requireAnyPermission = null,
}) => {
  const { user, loading } = useAuth();

  if (loading) return <Loading/>;                              // Wait for auth check
  if (!user) return <Navigate to="/login" replace />;          // Not logged in
  if (!user?.isVerify) return <Navigate to="/verifyemail" replace />; // Email not verified

  const role = user.employeeRoal;

  // ── Legacy role gate (unchanged behavior) ───────────────────────
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={`/company/${user.companyName}`} replace />;
  }

  // ── Permission gate: must have this one permission ──────────────
  if (requirePermission && !can(role, requirePermission)) {
    return <Navigate to={`/company/${user.companyName}`} replace />;
  }
  if (
    Array.isArray(requireAnyPermission) &&
    requireAnyPermission.length > 0 &&
    !requireAnyPermission.some((p) => can(role, p))
  ) {
    return <Navigate to={`/company/${user.companyName}`} replace />;
  }

  return children;   // Everything OK → render page
};

export default AuthGuard;