import { NavLink, Navigate, Outlet } from "react-router-dom";
import GridViewRoundedIcon   from "@mui/icons-material/GridViewRounded";
import ApartmentRoundedIcon  from "@mui/icons-material/ApartmentRounded";
import ForumRoundedIcon      from "@mui/icons-material/ForumRounded";
import CampaignRoundedIcon   from "@mui/icons-material/CampaignRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import LogoutRoundedIcon     from "@mui/icons-material/LogoutRounded";
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import { useAdminAuth } from "./frontend/deshbord/Admin/AdminAuthContext";
import "./style/Admin/AdminLayout.css";

/* ═══════════════════════════════════════════════════════════════
   AdminLayout — the guarded console shell.
   Sidebar nav lists ALL planned sections; unbuilt ones render as
   disabled rows with a SOON chip. As each step lands (companies,
   feedback, announcements, billing), convert its row to a NavLink
   like the Overview one.
═══════════════════════════════════════════════════════════════ */
export default function AdminLayout() {
  const { admin, checking, logout } = useAdminAuth();

  if (checking) {
    return (
      <div className="adm-boot">
        <span className="adm-boot__text adm-mono">CHECKING SESSION…</span>
      </div>
    );
  }

  if (!admin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="adm-root">

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      <aside className="adm-side">

        <div className="adm-brand">
          <span className="adm-brand__tile">M</span>
          <div className="adm-brand__meta">
            <span className="adm-brand__name">MetriCore</span>
            <span className="adm-brand__tag adm-mono">CONSOLE</span>
          </div>
        </div>

        <nav className="adm-nav">
          <NavLink to="/admin" end className={({ isActive }) =>
            `adm-nav__link ${isActive ? "adm-nav__link--active" : ""}`}>
            <GridViewRoundedIcon className="adm-nav__icon" />
            Overview
          </NavLink>

          {/* convert each to a NavLink as its step is built */}
          <NavLink to="/admin/companies" className={({ isActive }) =>
            `adm-nav__link ${isActive ? "adm-nav__link--active" : ""}`}>
            <ApartmentRoundedIcon className="adm-nav__icon" />
            Companies
          </NavLink>
          <NavLink to="/admin/feedback" className={({ isActive }) =>
            `adm-nav__link ${isActive ? "adm-nav__link--active" : ""}`}>
            <ForumRoundedIcon className="adm-nav__icon" />
            Feedback
          </NavLink>
          <NavLink to="/admin/announcements" className={({ isActive }) =>
            `adm-nav__link ${isActive ? "adm-nav__link--active" : ""}`}>
            <CampaignRoundedIcon className="adm-nav__icon" />
            Announcements
          </NavLink>
          <NavLink to="/admin/billing" className={({ isActive }) =>
            `adm-nav__link ${isActive ? "adm-nav__link--active" : ""}`}>
            <CreditCardRoundedIcon className="adm-nav__icon" />
            Billing
          </NavLink>
          <NavLink to="/admin/contact" className={({ isActive }) =>
            `adm-nav__link ${isActive ? "adm-nav__link--active" : ""}`}>
            <MarkEmailReadRoundedIcon className="adm-nav__icon" />
            Contact
          </NavLink>
        </nav>

        {/* admin identity + logout */}
        <div className="adm-side__bottom">
          <div className="adm-me">
            <span className="adm-me__avatar">{admin.name?.[0]?.toUpperCase() || "A"}</span>
            <div className="adm-me__meta">
              <span className="adm-me__name">{admin.name}</span>
              <span className="adm-me__email">{admin.email}</span>
            </div>
          </div>
          <button className="adm-logout" onClick={logout} aria-label="Log out">
            <LogoutRoundedIcon style={{ fontSize: 17 }} />
          </button>
        </div>
      </aside>

      {/* ══ CONTENT ══════════════════════════════════════════ */}
      <main className="adm-main">
        <Outlet />
      </main>

    </div>
  );
}