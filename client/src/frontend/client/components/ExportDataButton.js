import { useEffect, useRef, useState, useCallback } from "react";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Altaxios } from "../../Altaxios";                          // 👈 adjust to your folder depth
import { useAuth } from "../../../context/AuthContext";             // 👈 adjust to your folder depth
import "../../../style/ExportDataButton.css";

/* ═══════════════════════════════════════════════════════════════
   ExportDataButton — self-contained "Export CSV" control.

   Drop it anywhere (dashboard header, ViewGoal top bar, etc.) — on
   mount it asks the backend what this company's plan allows
   (GET /export/info) and renders accordingly:

     • Starter (export disabled)  → locked button, upsell message
     • Growth / Scale             → button opens a small popover with
                                     a date range (pre-filled + capped
                                     to what the plan allows) and a
                                     "Download CSV" action.

   The backend re-validates every rule server-side — this component
   only exists to give people the right constraints up front instead
   of a round-tripped rejection.
═══════════════════════════════════════════════════════════════ */

const MS_PER_DAY = 86400000;

const toIso = (d) => new Date(d).toISOString().slice(0, 10);

const addDays = (iso, days) => toIso(new Date(new Date(iso).getTime() + days * MS_PER_DAY));

const addMonths = (iso, months) => {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toIso(d);
};

// clamp an ISO date string between two (possibly null) ISO bounds
const clamp = (iso, min, max) => {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
};

// latest date this company may set as the "end" of an export, given a
// chosen "start" — start + maxRangeMonths, capped to today. Falls back
// to "today" if maxRangeMonths isn't a finite number (defensive only;
// current plans.js always sets it to 6).
const maxEndFor = (startIso, info) =>
  Number.isFinite(info?.maxRangeMonths)
    ? clamp(addMonths(startIso, info.maxRangeMonths), null, info.latestDate)
    : info?.latestDate;

export default function ExportDataButton({ className = "" }) {
  const { user } = useAuth();

  const [open,        setOpen]        = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [info,        setInfo]        = useState(null);   // /export/info response
  const [infoError,   setInfoError]   = useState("");     // request FAILED (≠ plan says no)
  const [start,       setStart]       = useState("");
  const [end,         setEnd]         = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error,       setError]       = useState("");

  const popRef = useRef(null);
  const btnRef = useRef(null);

  /* ── load plan eligibility once ─────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoadingInfo(true);
    Altaxios.get("/export/info")
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setInfo(data);

        // default range: last 30 days, clamped to what the plan allows
        const latest = data.latestDate;
        const earliestBound = data.earliestDate || null;
        const defaultStart = clamp(addDays(latest, -30), earliestBound, latest);
        setStart(defaultStart);
        setEnd(latest);
      })
      .catch((err) => {
        if (cancelled) return;
        // A failed request is NOT a billing state — surface the real reason.
        // (A 403 here usually means the role lacks viewFinancials; a 404
        //  usually means exportRoutes isn't mounted in server.js yet.)
        const status = err.response?.status;
        const detail = err.response?.data?.message || err.message || "Request failed";
        setInfoError(status ? `${status} — ${detail}` : detail);
      })
      .finally(() => { if (!cancelled) setLoadingInfo(false); });
    return () => { cancelled = true; };
  }, []);

  /* ── close popover on outside click ─────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  /* ── quick range presets ─────────────────────────────────────── */
  const applyPreset = useCallback((days) => {
    if (!info) return;
    const latest = info.latestDate;
    const earliestBound = info.earliestDate || null;
    const wantedStart = addDays(latest, -days);
    const newStart = clamp(wantedStart, earliestBound, latest);
    setStart(newStart);
    setEnd(latest);
    setError("");
  }, [info]);

  const handleStartChange = (val) => {
    setStart(val);
    // keep end within this plan's max span of the new start
    const maxEnd = maxEndFor(val, info);
    if (end > maxEnd) setEnd(maxEnd);
    if (end < val) setEnd(val);
    setError("");
  };

  const handleEndChange = (val) => {
    setEnd(val);
    setError("");
  };

  /* ── download ─────────────────────────────────────────────────── */
  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await Altaxios.get("/export/companyDataCsv", {
        params: { start, end },
        responseType: "blob",
      });

      const disposition = res.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `export-${start}-to-${end}.csv`;

      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      let message = "Could not export data.";
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          message = JSON.parse(await data.text())?.message || message;
        } catch { /* not JSON, keep default */ }
      } else {
        message = data?.message || message;
      }
      setError(message);
    } finally {
      setDownloading(false);
    }
  };

  /* ── loading state ───────────────────────────────────────────── */
  if (loadingInfo) {
    return (
      <button className={`ed-btn ed-btn--loading ${className}`} disabled>
        <DownloadRoundedIcon fontSize="small" />
        <span>Export CSV</span>
      </button>
    );
  }

  /* ── couldn't reach /export/info — show WHY, don't blame the plan ── */
  if (infoError) {
    return (
      <div className="ed-root">
        <button
          ref={btnRef}
          className={`ed-btn ed-btn--locked ${className}`}
          onClick={() => setOpen((v) => !v)}
        >
          <DownloadRoundedIcon fontSize="small" />
          <span>Export CSV</span>
        </button>
        {open && (
          <div className="ed-pop ed-pop--upsell" ref={popRef}>
            <button className="ed-pop__close" onClick={() => setOpen(false)}>
              <CloseRoundedIcon style={{ fontSize: 16 }} />
            </button>
            <p className="ed-upsell__title">Export unavailable</p>
            <p className="ed-error" role="alert">{infoError}</p>
          </div>
        )}
      </div>
    );
  }

  /* ── plan genuinely doesn't include export (a real 200 response) ── */
  if (!info?.enabled) {
    return (
      <div className="ed-root">
        <button
          ref={btnRef}
          className={`ed-btn ed-btn--locked ${className}`}
          onClick={() => setOpen((v) => !v)}
        >
          <LockOutlinedIcon fontSize="small" />
          <span>Export CSV</span>
        </button>
        {open && (
          <div className="ed-pop ed-pop--upsell" ref={popRef}>
            <button className="ed-pop__close" onClick={() => setOpen(false)}>
              <CloseRoundedIcon style={{ fontSize: 16 }} />
            </button>
            <p className="ed-upsell__title">CSV export isn't on your plan</p>
            <p className="ed-upsell__body">
              Exporting your cost &amp; sales data to CSV is available on the Growth and Scale plans.
            </p>
            <a
              className="ed-upsell__cta"
              href={`/company/${user?.companyName}/billing`}
            >
              View plans
            </a>
          </div>
        )}
      </div>
    );
  }

  /* ── normal (enabled) state ──────────────────────────────────── */
  const maxEndForStart = maxEndFor(start || info.latestDate, info);

  return (
    <div className="ed-root">
      <button
        ref={btnRef}
        className={`ed-btn ${className}`}
        onClick={() => setOpen((v) => !v)}
      >
        <DownloadRoundedIcon fontSize="small" />
        <span>Export CSV</span>
      </button>

      {open && (
        <div className="ed-pop" ref={popRef}>
          <div className="ed-pop__head">
            <span>Export data</span>
            <button className="ed-pop__close" onClick={() => setOpen(false)}>
              <CloseRoundedIcon style={{ fontSize: 16 }} />
            </button>
          </div>

          <div className="ed-presets">
            <button className="ed-chip" onClick={() => applyPreset(30)}>30 days</button>
            <button className="ed-chip" onClick={() => applyPreset(90)}>90 days</button>
            <button className="ed-chip" onClick={() => applyPreset(info.maxRangeMonths * 30)}>
              Max ({info.maxRangeMonths}mo)
            </button>
          </div>

          <div className="ed-field">
            <label htmlFor="ed-start">From</label>
            <input
              id="ed-start"
              type="date"
              value={start}
              min={info.earliestDate || undefined}
              max={info.latestDate}
              onChange={(e) => handleStartChange(e.target.value)}
            />
          </div>

          <div className="ed-field">
            <label htmlFor="ed-end">To</label>
            <input
              id="ed-end"
              type="date"
              value={end}
              min={start}
              max={maxEndForStart}
              onChange={(e) => handleEndChange(e.target.value)}
            />
          </div>

          <p className="ed-hint ed-mono">
            {info.earliestDate
              ? `History back to ${info.earliestDate} · up to ${info.maxRangeMonths} months per export`
              : `Full company history · up to ${info.maxRangeMonths} months per export`}
          </p>

          {error && <p className="ed-error" role="alert">{error}</p>}

          <button className="ed-download" onClick={download} disabled={downloading || !start || !end}>
            {downloading ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      )}
    </div>
  );
}