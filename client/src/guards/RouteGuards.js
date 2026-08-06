import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Altaxios } from "../frontend/Altaxios";

// ── Simple full-page loader ──────────────────────────────────────
const PageLoader = () => (
  <div style={{
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#011626",
    color: "#8899aa", fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "13px", letterSpacing: "2px",
  }}>
    LOADING…
  </div>
);

// ── Guard 1: must be logged in ───────────────────────────────────
// (If you already have a ProtectedRoute doing this, keep yours)
export const RequireAuth = () => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user)   return <Navigate to="/login" replace />;

  return <Outlet />;
};

// ── Guard 2: must be onboarded → wraps ALL app routes ────────────
export const RequireOnboarded = () => {
  const [state, setState] = useState({ loading: true, isOnboarded: true });

  useEffect(() => {
    let alive = true;
    Altaxios.get("/users/onboardingStatus")           // 👈 match your backend path
      .then((res) => alive && setState({ loading: false, isOnboarded: res.data.isOnboarded }))
      .catch(()   => alive && setState({ loading: false, isOnboarded: true })); // fail open — never trap users on an API error
    return () => { alive = false; };
  }, []);

  if (state.loading)      return <PageLoader />;
  if (!state.isOnboarded) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
};

// ── Guard 3: wraps /onboarding → blocks re-entry after done ─────
export const OnboardingRoute = () => {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, isOnboarded: false });

  useEffect(() => {
    let alive = true;
    Altaxios.get("/users/onboardingStatus")
      .then((res) => alive && setState({ loading: false, isOnboarded: res.data.isOnboarded }))
      .catch(()   => alive && setState({ loading: false, isOnboarded: false }));
    return () => { alive = false; };
  }, []);

  if (state.loading)     return <PageLoader />;
  if (state.isOnboarded) return <Navigate to={`/company/${user?.companyName}`} replace />;

  return <Outlet />;
};