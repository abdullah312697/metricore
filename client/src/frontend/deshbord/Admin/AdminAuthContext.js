import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Altaxios } from "../../Altaxios";   // 👈 adjust to your folder depth

/* ═══════════════════════════════════════════════════════════════
   AdminAuthContext — the admin twin of your company AuthContext,
   deliberately separate so the two sessions never mix.

   Usage (wired in App.js as a pathless provider route):
     const { admin, checking, login, logout } = useAdminAuth();
═══════════════════════════════════════════════════════════════ */
const AdminAuthContext = createContext(null);

export const useAdminAuth = () => useContext(AdminAuthContext);

export function AdminAuthProvider({ children }) {
  const [admin,    setAdmin]    = useState(null);
  const [checking, setChecking] = useState(true);

  // Session check on mount — the adminId cookie does the talking
  useEffect(() => {
    Altaxios.get("/admin/me")
      .then((res) => setAdmin(res.data.admin))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await Altaxios.post("/admin/login", { email, password });
    setAdmin(res.data.admin);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try { await Altaxios.post("/admin/logout"); }
    finally { setAdmin(null); }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, checking, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}