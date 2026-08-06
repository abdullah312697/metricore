import { useEffect, useRef, useState, useCallback } from "react";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import CloseRoundedIcon    from "@mui/icons-material/CloseRounded";
import { Altaxios } from "../../Altaxios";   // 👈 adjust to your folder depth
import "../../../style/WhatsNew.css";

/* ═══════════════════════════════════════════════════════════════
   WhatsNew — the company-side announcements bell.
   Drop <WhatsNew /> into your UserLayout header, near the profile
   and logout controls. Self-contained: fetches on mount, shows an
   unread dot when something newer than last-seen exists (tracked
   in localStorage), opens a panel, click-outside/Escape closes.
═══════════════════════════════════════════════════════════════ */

const SEEN_KEY = "mc_lastSeenAnnouncement";

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600)  return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function WhatsNew() {
  const [items,  setItems]  = useState([]);
  const [open,   setOpen]   = useState(false);
  const [unread, setUnread] = useState(false);
  const wrapRef = useRef(null);

  // fetch latest on mount
  useEffect(() => {
    Altaxios.get("/announcements/latest")
      .then((res) => {
        const list = res.data.data || [];
        setItems(list);
        if (list.length) {
          const lastSeen = localStorage.getItem(SEEN_KEY);
          setUnread(!lastSeen || new Date(list[0].createdAt) > new Date(lastSeen));
        }
      })
      .catch(() => {});
  }, []);

  // opening marks everything as seen
  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next && items.length) {
        localStorage.setItem(SEEN_KEY, items[0].createdAt);
        setUnread(false);
      }
      return next;
    });
  }, [items]);

  // click-outside + Escape close
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="wn-wrap" ref={wrapRef}>
      <button
        className="wn-bell"
        onClick={toggle}
        aria-label="What's new"
        title="What's new"
      >
        <CampaignRoundedIcon style={{ fontSize: 20 }} />
        {unread && <span className="wn-dot" />}
      </button>

      {open && (
        <div className="wn-panel" role="dialog" aria-label="What's new">
          <div className="wn-head">
            <span className="wn-head__title">What's new</span>
            <button className="wn-close" onClick={() => setOpen(false)} aria-label="Close">
              <CloseRoundedIcon style={{ fontSize: 16 }} />
            </button>
          </div>

          <div className="wn-list">
            {items.length === 0 ? (
              <p className="wn-empty">No announcements yet.</p>
            ) : (
              items.map((a) => (
                <div className="wn-item" key={a._id}>
                  <div className="wn-item__top">
                    <span className="wn-item__title">{a.title}</span>
                    <span className="wn-item__time wn-mono">{timeAgo(a.createdAt)}</span>
                  </div>
                  <p className="wn-item__body">{a.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}