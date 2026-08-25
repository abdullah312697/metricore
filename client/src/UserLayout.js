
import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import PersonOutlineIcon    from "@mui/icons-material/PersonOutline";
import LogoutIcon           from "@mui/icons-material/Logout";
import { useAuth }  from "./context/AuthContext";   // 👈 adjust path to your structure
import { Altaxios } from "./frontend/Altaxios";     // 👈 adjust path to your structure
import "./style/UserLayout.css";
import WhatsNew from "./frontend/client/components/WhatsNew";   // adjust path
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
/* ═══════════════════════════════════════════════════════════════
   UserLayout — header + <Outlet /> + footer for /company/:companyName
   If your current UserLayout has other logic (socket init, providers,
   scroll handling), keep that logic and merge this chrome around it.
═══════════════════════════════════════════════════════════════ */
export default function UserLayout() {
  const { companyName } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, setUser } = useAuth();

  const [menuOpen,     setMenuOpen]     = useState(false); // mobile nav drawer
  const [profileOpen,  setProfileOpen]  = useState(false); // employee dropdown
  const [loggingOut,   setLoggingOut]   = useState(false);
  const profileRef = useRef(null);

  // ── Display values (fallbacks in case AuthContext shape differs) ─
  const base            = `/company/${companyName}`;
  const displayCompany  = user?.companyName || companyName || "Company";
  const companyLogo     = user?.companyLogo || null;
  const companyInitial  = displayCompany[0]?.toUpperCase() || "C";
  const employeeLabel   = user?.employeeName || user?.name || user?.YemplyeeEmail || user?.email || "Signed in";
  const employeeId      = user?.employeeId || user?._id;   // 👈 adjust to your AuthContext key
  const employeeProfile = user?.employeeProfile;
  // ── Nav links — edit this array to add/remove pages ─────────────
  const NAV_LINKS = [
    { to: base,                 label: "Dashboard", end: true  },
    { to: `${base}/creategoal`,  label: "Set Goal",  end: false },
    { to: `${base}/addproduct`, label: "Products",  end: false },
  ];

  // ── Close dropdown on outside click ─────────────────────────────
  useEffect(() => {
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ── Close dropdown + mobile menu on Escape ──────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setProfileOpen(false); setMenuOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── Close both on route change ───────────────────────────────────
  useEffect(() => {
    setProfileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // ── Logout ───────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await Altaxios.get("/users/logout"); // clears the auth cookies server-side
    } catch (err) {
      console.error(err); // cookies may already be dead — proceed anyway
    } finally {
      setUser?.(null);                          // if your AuthContext exposes setUser
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="ul-root">

      {/* ══ HEADER ═══════════════════════════════════════════════ */}
      <header className="ul-header">
        <div className="ul-header__inner">

          {/* ── Brand: company logo + name → dashboard ─────────── */}
          <Link to={base} className="ul-brand">
            {companyLogo ? (
              <img src={companyLogo} alt="" className="ul-brand__logo" />
            ) : (
              <span className="ul-brand__logo ul-brand__logo--fallback">
                {companyInitial}
              </span>
            )}
            <span className="ul-brand__name">{displayCompany}</span>
          </Link>

          {/* ── Nav links (desktop) ──────────────────────────────── */}
          <nav className="ul-nav">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `ul-nav__link ${isActive ? "ul-nav__link--active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* ── Right actions ────────────────────────────────────── */}
          <div className="ul-actions">
            <WhatsNew />
            {/* Company profile icon → settings page */}
            <Link
              to={`${base}/billing`}
              className="ul-icon-btn"
              title="Billing & Plan"
              aria-label="Billing & Plan"
            >
              <PaymentOutlinedIcon style={{ fontSize: 20 }} />
            </Link>
            <Link
              to={`${base}/settings`}
              className="ul-icon-btn"
              title="Company settings"
              aria-label="Company settings"
            >
              <SettingsOutlinedIcon style={{ fontSize: 20 }} />
            </Link>

            {/* Employee avatar + dropdown */}
            <div className="ul-profile" ref={profileRef}>
              <button
                className={`ul-avatar ${profileOpen ? "ul-avatar--open" : ""}`}
                onClick={() => setProfileOpen((p) => !p)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Your profile"
                style={{borderRadius:'10px'}}
              >
                  {!employeeProfile ? (
                    <PersonOutlineRoundedIcon style={{color:'#8899aa'}}/>
                  ) : (
                    <>
                      <img src={employeeProfile} alt="employee profile" style={{width:'38px',height:'38px',borderRadius:'50%'}}/>
                      <span className="ul-avatar__presence" title="Online" />
                    </>
                  )}
              </button>

              {/* ── Dropdown panel ─────────────────────────────── */}
              {profileOpen && (
                <div className="ul-dropdown" role="menu">

                  {/* Identity block */}
                  <div className="ul-dropdown__identity">
                    {/* <span className="ul-dropdown__avatar">{employeeInitial}</span> */}
                  {!employeeProfile ? (
                    <PersonOutlineRoundedIcon style={{width:'40px',height:'40px',color:'#8899aa'}}/>
                  ) : (
                      <img src={employeeProfile} alt="employee profile" style={{width:'40px',height:'40px',borderRadius:'50%'}}/>
                  )}

                    <div className="ul-dropdown__who">
                      <span className="ul-dropdown__name">{employeeLabel}</span>
                      <span className="ul-dropdown__company ul-mono">{displayCompany}</span>
                    </div>
                  </div>

                  <div className="ul-dropdown__divider" />

                  {/* Actions */}
                  <Link
                    to={`${base}/theemployee/${employeeId}`}
                    className="ul-dropdown__item"
                    role="menuitem"
                  >
                    <PersonOutlineIcon style={{ fontSize: 18 }} />
                    View profile
                  </Link>

                  <Link
                    to={`${base}/settings`}
                    className="ul-dropdown__item"
                    role="menuitem"
                  >
                    <SettingsOutlinedIcon style={{ fontSize: 18 }} />
                    Company settings
                  </Link>

                  <div className="ul-dropdown__divider" />

                  <button
                    className="ul-dropdown__item ul-dropdown__item--danger"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    role="menuitem"
                  >
                    <LogoutIcon style={{ fontSize: 18 }} />
                    {loggingOut ? "Logging out…" : "Log out"}
                  </button>
                </div>
              )}

            </div>

            {/* Mobile burger */}
            <button
              className={`ul-burger ${menuOpen ? "ul-burger--open" : ""}`}
              onClick={() => setMenuOpen((p) => !p)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <span /><span /><span />
            </button>

          </div>
        </div>

        {/* ── Mobile nav drawer ──────────────────────────────────── */}
        <div className={`ul-mobile-nav ${menuOpen ? "ul-mobile-nav--open" : ""}`}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `ul-mobile-nav__link ${isActive ? "ul-mobile-nav__link--active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* ══ PAGE CONTENT ═════════════════════════════════════════ */}
      <main className="ul-main">
        <Outlet />
      </main>

      {/* ══ FOOTER ═══════════════════════════════════════════════ */}
      <footer className="ul-footer">
        <div className="ul-footer__inner">

          <div className="ul-footer__brand">
            {companyLogo ? (
              <img src={companyLogo} alt="" className="ul-footer__logo" />
            ) : (
              <span className="ul-footer__logo ul-footer__logo--fallback">
                {companyInitial}
              </span>
            )}
            <span className="ul-footer__name">{displayCompany}</span>
            <span className="ul-footer__powered ul-mono">
              Powered by MetriCore
            </span>
          </div>

          <nav className="ul-footer__links">
            <Link to={base}>Dashboard</Link>
            <Link to={`${base}/settings`}>Settings</Link>
            <Link to="/changelog">Changelog</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/developers">Developer-guide</Link>
            <Link to={`${base}/support`}>Support</Link>
          </nav>

          <span className="ul-footer__copy ul-mono">
            © {new Date().getFullYear()} {displayCompany}
          </span>

        </div>
      </footer>

    </div>
  );
}