import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loading from "./Loading";

/* Wraps login / signup / public marketing pages.
   If the user is ALREADY logged in, send them to their dashboard
   instead of showing the login/signup/landing page again. */
const GuestGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;          // wait for auth check

  // Logged in + verified → straight to their company dashboard
  if (user && user.isVerify) {
    return <Navigate to={`/company/${user.companyName}`} replace />;
  }

  // Logged in but NOT verified → send to verify page
  if (user && !user.isVerify) {
    return <Navigate to="/verifyemail" replace />;
  }

  // Not logged in → show the public/auth page as normal
  return children;
};

export default GuestGuard;