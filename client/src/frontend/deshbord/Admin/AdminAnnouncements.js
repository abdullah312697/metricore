import { useEffect, useState, useCallback } from "react";
import CampaignRoundedIcon     from "@mui/icons-material/CampaignRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ChevronLeftRoundedIcon  from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Altaxios } from "../../Altaxios";   // 👈 same depth as the other admin files
import "../../../style/Admin/AdminAnnouncements.css";

/* ═══════════════════════════════════════════════════════════════
   AdminAnnouncements — /admin/announcements
   Composer on top (title + body + "also email" toggle), history
   below with emailed chips, expand, and two-click delete.
═══════════════════════════════════════════════════════════════ */

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminAnnouncements() {
  const [title,      setTitle]      = useState("");
  const [body,       setBody]       = useState("");
  const [sendEmail,  setSendEmail]  = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [note,       setNote]       = useState(null);   // {ok, text}

  const [page,    setPage]    = useState(1);
  const [data,    setData]    = useState({ announcements: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [expandedId,  setExpandedId]  = useState(null);
  const [confirmId,   setConfirmId]   = useState(null);
  const [deletingId,  setDeletingId]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Altaxios.get("/admin/announcements", { params: { page } })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    if (!title.trim() || !body.trim()) {
      setNote({ ok: false, text: "Title and body are both required." });
      return;
    }
    setPublishing(true);
    setNote(null);
    try {
      const res = await Altaxios.post("/admin/announcements", {
        title: title.trim(),
        body:  body.trim(),
        sendEmail,
      });
      setNote({ ok: true, text: res.data.message });
      setTitle("");
      setBody("");
      setSendEmail(false);
      setPage(1);
      load();
    } catch (err) {
      setNote({ ok: false, text: err.response?.data?.message || "Failed to publish." });
    } finally {
      setPublishing(false);
    }
  };

  const remove = async (id) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    setDeletingId(id);
    try {
      await Altaxios.delete(`/admin/announcements/${id}`);
      setConfirmId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="adm-page-title">Announcements</h1>
      <p className="adm-page-sub">
        Publish product updates and news. Always shown in every company's
        What's-new panel; optionally emailed to all companies too.
      </p>

      {/* ══ COMPOSER ═══════════════════════════════════════════ */}
      <div className="ada-composer">
        <input
          className="ada-input"
          placeholder="Title — e.g. “MetriCore 1.2: push API + SKU support”"
          maxLength={120}
          value={title}
          onChange={(e) => { setTitle(e.target.value); setNote(null); }}
          disabled={publishing}
        />

        <textarea
          className="ada-input ada-textarea"
          rows={6}
          maxLength={5000}
          placeholder="What's new? Line breaks are kept as you write them…"
          value={body}
          onChange={(e) => { setBody(e.target.value); setNote(null); }}
          disabled={publishing}
        />

        <div className="ada-composer__foot">
          <label className="ada-emailcheck">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              disabled={publishing}
            />
            Also email every company (BCC, batches of 50)
          </label>

          <button
            className="ada-publish"
            onClick={publish}
            disabled={publishing || !title.trim() || !body.trim()}
          >
            <CampaignRoundedIcon style={{ fontSize: 17 }} />
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>

        {note && (
          <p className={`ada-note ${note.ok ? "ada-note--ok" : "ada-note--err"}`}>
            {note.text}
          </p>
        )}
      </div>

      {/* ══ HISTORY ════════════════════════════════════════════ */}
      <h2 className="ada-history-title">Published</h2>

      {loading ? (
        <div className="adm-ghost-grid ada-ghosts">
          {[...Array(3)].map((_, i) => <div className="adm-ghost" key={i} />)}
        </div>
      ) : data.announcements.length === 0 ? (
        <div className="ada-empty">Nothing published yet — your first announcement will appear here.</div>
      ) : (
        <div className="ada-list">
          {data.announcements.map((a) => {
            const expanded = expandedId === a._id;
            return (
              <div className="ada-item" key={a._id}>
                <div className="ada-item__top">
                  <div className="ada-item__meta">
                    <span className="ada-item__title">{a.title}</span>
                    <span className="ada-item__date">{fmt(a.createdAt)}</span>
                  </div>

                  <div className="ada-item__actions">
                    {a.emailSent ? (
                      <span className="ada-chip ada-chip--mail">Emailed · {a.emailedTo}</span>
                    ) : (
                      <span className="ada-chip">In-app only</span>
                    )}
                    <button
                      className={`ada-del ${confirmId === a._id ? "ada-del--confirm" : ""}`}
                      onClick={() => remove(a._id)}
                      disabled={deletingId === a._id}
                      title={confirmId === a._id ? "Click again to confirm" : "Remove"}
                    >
                      {confirmId === a._id
                        ? (deletingId === a._id ? "…" : "Confirm?")
                        : <DeleteOutlineRoundedIcon style={{ fontSize: 16 }} />}
                    </button>
                  </div>
                </div>

                <p
                  className={`ada-item__body ${expanded ? "ada-item__body--open" : ""}`}
                  onClick={() => setExpandedId(expanded ? null : a._id)}
                  title={expanded ? "Collapse" : "Expand"}
                >
                  {a.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {data.pages > 1 && (
        <div className="ada-pager">
          <button className="ada-pager__btn" disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
            <ChevronLeftRoundedIcon style={{ fontSize: 18 }} />
          </button>
          <span className="ada-pager__label ada-mono">Page {page} / {data.pages}</span>
          <button className="ada-pager__btn" disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)} aria-label="Next page">
            <ChevronRightRoundedIcon style={{ fontSize: 18 }} />
          </button>
        </div>
      )}
    </div>
  );
}