// layouts/PublicLayout.jsx
import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./style/PublicLayout.css";
import logo from './images/logo/metricore-icon-transparent.svg';

const PublicLayout = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // 👇 Scroll to top on every page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="pl-root">

      {/* ── Shared Header ──────────────────────────── */}
      <header className={`pl-header ${scrolled ? "pl-header--scrolled" : ""}`}>
        <div className="pl-header__inner">
        <Link to="/" className="pl-logo">
          <img src={logo} alt="MetriCore Logo" className="pl-logo__mark" />
          <span className="pl-logo__name">MetriCore</span>
        </Link>
          <nav className="pl-nav">
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>

          <div className="pl-header__actions">
            <Link to="/login"  className="pl-login">Log in</Link>
            <Link to="/register" className="pl-btn">Start Free</Link>
          </div>
        </div>
      </header>

      {/* ── Page content renders here ───────────────── */}
      <main className="pl-main">
        <Outlet /> {/* 👈 this is where each page drops in */}
      </main>

      {/* ── Shared Footer ──────────────────────────── */}
      <footer className="pl-footer">
        <div className="pl-footer__inner">
          <div className="pl-footer__brand">
            <Link to="/" className="pl-logo">
              <img src={logo} alt="MetriCore Logo" className="pl-logo__mark" />
              <span className="pl-logo__name">MetriCore</span>
            </Link>
            <p>Every cost tracked. Every goal met.</p>
          </div>

          <div className="pl-footer__cols">
            {[
              { heading: "Product",  links: [["Features","/#features"],["Pricing","/#pricing"],["Changelog","/changelog"]] },
              { heading: "Company",  links: [["About","/about"],["Blog","/blog"],["Contact","/contact"],["Docs","/docs"]]                  },
              { heading: "Legal",    links: [["Privacy","/privacy"],["Terms","/terms"],["Status","/status"],["Developer-Guide","/developers"]]              },
            ].map(col => (
              <div key={col.heading} className="pl-footer__col">
                <h4>{col.heading}</h4>
                {col.links.map(([label, href]) => (
                  label === 'Features' ? (
                    <a href={href}>{label}</a>
                  ) :
                  label === 'Pricing' ? (
                    <a href={href}>{label}</a>
                  ) :
                  <Link key={label} to={href}>{label}</Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="pl-footer__bottom">
          <span>© {new Date().getFullYear()} MetriCore. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
};

export default PublicLayout;