import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon       from "@mui/icons-material/Check";
import { Altaxios }    from "../../Altaxios";
import "../../../style/DeveloperGuide.css";

/* ═══════════════════════════════════════════════════════════════
   DeveloperGuide — public docs for the push ingestion API.
   Route:  <Route path="developers" element={<DeveloperGuide />} />
   Linked from ApiKeysCard and the footers.
═══════════════════════════════════════════════════════════════ */

const API_BASE = (Altaxios?.defaults?.baseURL || "https://api.metricore.app/api").replace(/\/$/, "");

const SECTIONS = [
  { id: "overview",  label: "Overview" },
  { id: "auth",      label: "Authentication" },
  { id: "endpoints", label: "Endpoints" },
  { id: "payload",   label: "Sending daily data" },
  { id: "matching",  label: "Product matching" },
  { id: "timing",    label: "When to send" },
  { id: "limits",    label: "Rate limits" },
  { id: "responses", label: "Responses" },
  { id: "errors",    label: "Errors" },
  { id: "examples",  label: "Code examples" },
  { id: "checklist", label: "Quick-start checklist" },
];

const METRICS = [
  ["soldQuantity",        "Units sold today (running total)"],
  ["returns",             "Units returned today (running total)"],
  ["adCost",              "Advertising spend for the day"],
  ["otherCost",           "Any other cost for the day"],
  ["deliveryCostPerSale", "Delivery cost per unit sold"],
  ["packagingCost",       "Packaging cost"],
  ["buyingCost",          "Purchase cost per unit"],
  ["shippingCost",        "Shipping cost"],
];

/* small copy-to-clipboard button used on every code block */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };
  return (
    <button className="dg-copy" onClick={copy} aria-label="Copy code">
      {copied ? <CheckIcon style={{ fontSize: 14 }} /> : <ContentCopyIcon style={{ fontSize: 14 }} />}
    </button>
  );
}

function Code({ children }) {
  return (
    <div className="dg-codewrap">
      <pre className="dg-pre dg-mono">{children}</pre>
      <CopyBtn text={children} />
    </div>
  );
}

export default function DeveloperGuide() {
  const [active, setActive] = useState("overview");
  const ticking = useRef(false);

  /* scroll-spy — highlights the section currently in view */
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        let current = SECTIONS[0].id;
        for (const s of SECTIONS) {
          const el = document.getElementById(s.id);
          if (el && el.getBoundingClientRect().top <= 120) current = s.id;
        }
        setActive(current);
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="dg-root">
      <div className="dg-container">

        {/* ══ HERO ═══════════════════════════════════════════════ */}
        <header className="dg-hero">
          <span className="dg-eyebrow dg-mono">Developer guide</span>
          <h1 className="dg-title">Send your sales data automatically</h1>
          <p className="dg-sub">
            Connect your website or backend to MetriCore so today's sales and
            costs appear in your dashboard without anyone typing them in.
          </p>
          <div className="dg-baseurl dg-mono">
            <span className="dg-baseurl__key">BASE URL</span>
            <span className="dg-baseurl__val">{API_BASE}/v1</span>
          </div>
        </header>

        <div className="dg-layout">

          {/* ══ SIDEBAR ══════════════════════════════════════════ */}
          <nav className="dg-nav" aria-label="Guide sections">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`dg-nav__link ${active === s.id ? "dg-nav__link--active" : ""}`}
                onClick={() => jump(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* ══ CONTENT ══════════════════════════════════════════ */}
          <main className="dg-content">

            {/* ── Overview ─────────────────────────────────────── */}
            <section id="overview" className="dg-section">
              <h2 className="dg-h2">Overview</h2>
              <p>
                Your system <strong>pushes</strong> data to MetriCore — we never
                poll or scrape your website. Once connected, your server sends
                today's numbers per product, and they land in the same daily
                records your team sees on the dashboard.
              </p>
              <p>
                Two rules make the API safe to automate:
              </p>
              <ul className="dg-list">
                <li>
                  <strong>Cumulative totals, not increments.</strong> Send
                  "47 sold so far today", never "+3 since last time". Values
                  replace what's stored — so retries, duplicates, and
                  overlapping requests can never double-count.
                </li>
                <li>
                  <strong>Idempotent by design.</strong> Sending the same
                  payload twice reports <code className="dg-mono">unchanged</code> and
                  writes nothing.
                </li>
              </ul>
            </section>

            {/* ── Auth ─────────────────────────────────────────── */}
            <section id="auth" className="dg-section">
              <h2 className="dg-h2">Authentication</h2>
              <p>
                An <strong>Owner or Admin</strong> generates an API key in{" "}
                <em>Company Settings → API access</em>. The key starts with{" "}
                <code className="dg-mono">mc_live_</code> and is shown exactly once —
                copy it immediately. Send it on every request:
              </p>
              <Code>{`Authorization: Bearer mc_live_your_key_here`}</Code>

              <div className="dg-notice dg-notice--danger">
                <strong>Server-side only.</strong> Never put the key in website
                frontend code, browser JavaScript, or mobile apps — anyone who
                opens DevTools can read it and write data into your account.
                All requests must come from your backend. Store the key in an
                environment variable, never in source code, and if it ever
                leaks, revoke it in Settings and generate a new one (revocation
                is instant).
              </div>
            </section>

            {/* ── Endpoints ────────────────────────────────────── */}
            <section id="endpoints" className="dg-section">
              <h2 className="dg-h2">Endpoints</h2>
              <table className="dg-table">
                <thead>
                  <tr><th>Method</th><th>Path</th><th>Purpose</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="dg-method dg-method--get dg-mono">GET</span></td>
                    <td className="dg-mono">/v1/ingest/ping</td>
                    <td>Verify your key is wired correctly</td>
                  </tr>
                  <tr>
                    <td><span className="dg-method dg-method--get dg-mono">GET</span></td>
                    <td className="dg-mono">/v1/ingest/products</td>
                    <td>List your products with the ids, names and SKUs your payloads can reference</td>
                  </tr>
                  <tr>
                    <td><span className="dg-method dg-method--post dg-mono">POST</span></td>
                    <td className="dg-mono">/v1/ingest/daily</td>
                    <td>Push today's cumulative numbers</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* ── Payload ──────────────────────────────────────── */}
            <section id="payload" className="dg-section">
              <h2 className="dg-h2">Sending daily data</h2>
              <p>
                <code className="dg-mono">POST /v1/ingest/daily</code> with a JSON body.
                Each product needs <strong>one identifier</strong> and{" "}
                <strong>at least one metric</strong>:
              </p>
              <Code>{`{
  "products": [
    {
      "sku": "TSHIRT-01",
      "soldQuantity": 47,
      "returns": 2,
      "adCost": 35.50
    },
    {
      "name": "Nothun Tote bag",
      "soldQuantity": 12,
      "buyingCost": 4.25
    }
  ]
}`}</Code>

              <h3 className="dg-h3">Available metrics</h3>
              <p>
                All metrics are optional numbers ≥ 0. They map one-to-one to
                the fields your team fills in the daily cost table — send them
                exactly as you would type them there. Fields you omit are left
                untouched, so automated pushes and manual edits can coexist.
              </p>
              <table className="dg-table">
                <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
                <tbody>
                  {METRICS.map(([field, meaning]) => (
                    <tr key={field}>
                      <td className="dg-mono dg-amber">{field}</td>
                      <td>{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="dg-h3">The date rule</h3>
              <p>
                The endpoint accepts <strong>today's data only</strong>, where
                "today" is the <strong>UTC calendar day</strong>. Omit{" "}
                <code className="dg-mono">date</code> entirely (recommended) and today is
                assumed; if you include it, it must equal today in{" "}
                <code className="dg-mono">dd/MM/yyyy</code>.
              </p>
              <div className="dg-notice dg-notice--warn">
                <strong>Timezone note.</strong> If your business runs ahead of
                UTC, sales just after your local midnight still belong to the
                previous UTC day and a push at that moment counts them into the
                new day. The simple fix: push on a schedule throughout the day
                (see below) rather than once at local midnight.
              </div>
            </section>

            {/* ── Matching ─────────────────────────────────────── */}
            <section id="matching" className="dg-section">
              <h2 className="dg-h2">Product matching</h2>
              <p>Each item is matched against your MetriCore products in this order:</p>
              <ol className="dg-list dg-list--num">
                <li>
                  <code className="dg-mono">productId</code> — the MetriCore id (most
                  precise; get it from <code className="dg-mono">GET /v1/ingest/products</code>)
                </li>
                <li><code className="dg-mono">sku</code> — recommended for stable integrations</li>
                <li>
                  <code className="dg-mono">name</code> — exact product name; matching
                  ignores case and extra spaces, but the words must be identical
                </li>
              </ol>
              <p>
                Unmatched items are <code className="dg-mono">skipped</code> with reason{" "}
                <code className="dg-mono">product_not_found</code> — the rest of the payload
                still processes. Prefer <code className="dg-mono">productId</code> or{" "}
                <code className="dg-mono">sku</code>: names drift when someone renames a
                product; ids don't.
              </p>
            </section>

            {/* ── Timing ───────────────────────────────────────── */}
            <section id="timing" className="dg-section">
              <h2 className="dg-h2">When to send</h2>
              <p>
                Because values are cumulative totals and pushes are idempotent,
                frequency is a freedom, not a risk. Ranked:
              </p>

              <div className="dg-patterns">
                <div className="dg-pattern dg-pattern--best">
                  <span className="dg-pattern__badge dg-mono">✓ BEST</span>
                  <h4>After every sale</h4>
                  <p>
                    When an order completes on your server, recompute today's
                    totals from your own database and push them. Your MetriCore
                    dashboard stays live.
                  </p>
                </div>

                <div className="dg-pattern dg-pattern--good">
                  <span className="dg-pattern__badge dg-mono">✓ GOOD</span>
                  <h4>On a schedule</h4>
                  <p>
                    A cron job every 15–60 minutes that pushes today's totals.
                    Simple, robust, and self-healing — each run replaces the
                    previous values.
                  </p>
                </div>

                <div className="dg-pattern dg-pattern--min">
                  <span className="dg-pattern__badge dg-mono">⚠ MINIMUM</span>
                  <h4>Once per day</h4>
                  <p>
                    Works, but it must run <strong>before midnight UTC</strong> —
                    after midnight the API rejects the payload as yesterday's
                    data, and that day stays empty.
                  </p>
                </div>

                <div className="dg-pattern dg-pattern--never">
                  <span className="dg-pattern__badge dg-mono">✕ NEVER</span>
                  <h4>From your website frontend</h4>
                  <p>
                    Never call the API on page load or from browser JavaScript.
                    Your key would be visible to every visitor, and strangers'
                    page views would drive your data sync. Backend only.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Limits ───────────────────────────────────────── */}
            <section id="limits" className="dg-section">
              <h2 className="dg-h2">Rate limits & quotas</h2>
              <table className="dg-table">
                <tbody>
                  <tr><td>Requests</td><td><strong>60 per minute</strong> per key — exceeding it returns <code className="dg-mono">429</code></td></tr>
                  <tr><td>Daily cap</td><td>None — under the patterns above you'll never approach the limit</td></tr>
                  <tr><td>Products per request</td><td>500 maximum — batch everything into one request instead of one request per product</td></tr>
                  <tr><td>Active keys</td><td>5 per company</td></tr>
                </tbody>
              </table>
            </section>

            {/* ── Responses ────────────────────────────────────── */}
            <section id="responses" className="dg-section">
              <h2 className="dg-h2">Responses</h2>
              <p>Every successful push returns a summary plus a per-item result:</p>
              <Code>{`{
  "ok": true,
  "date": "20/07/2026",
  "summary": { "received": 2, "updated": 1, "created": 0,
               "unchanged": 0, "skipped": 1 },
  "results": [
    { "identifier": "TSHIRT-01", "product": "Classic T-Shirt",
      "status": "updated", "fields": ["SoldQuentity", "AdCost"] },
    { "identifier": "Old product", "status": "skipped",
      "reason": "product_not_found" }
  ]
}`}</Code>
              <table className="dg-table">
                <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td className="dg-mono dg-amber">created</td><td>First data for this product today — a new daily record was created</td></tr>
                  <tr><td className="dg-mono dg-amber">updated</td><td>Today's record existed; the sent fields were replaced</td></tr>
                  <tr><td className="dg-mono dg-amber">unchanged</td><td>Values identical to what's stored — nothing written</td></tr>
                  <tr><td className="dg-mono dg-amber">skipped</td><td>Item not processed — see <code className="dg-mono">reason</code> (product_not_found, invalid_value, no_metrics_provided)</td></tr>
                </tbody>
              </table>
            </section>

            {/* ── Errors ───────────────────────────────────────── */}
            <section id="errors" className="dg-section">
              <h2 className="dg-h2">Errors</h2>
              <table className="dg-table">
                <thead><tr><th>Code</th><th>Error</th><th>What it means</th></tr></thead>
                <tbody>
                  <tr><td className="dg-mono">401</td><td className="dg-mono">unauthorized</td><td>Missing, invalid, or revoked key — check the Authorization header</td></tr>
                  <tr><td className="dg-mono">400</td><td className="dg-mono">invalid_request</td><td>Body isn't valid — "products" missing, empty, or over 500 items</td></tr>
                  <tr><td className="dg-mono">400</td><td className="dg-mono">invalid_date</td><td>The date sent isn't today (UTC) — omit "date" to default to today</td></tr>
                  <tr><td className="dg-mono">429</td><td className="dg-mono">rate_limited</td><td>Over 60 requests/minute — back off and retry</td></tr>
                  <tr><td className="dg-mono">500</td><td className="dg-mono">server_error</td><td>Our side — safe to retry (idempotency protects you)</td></tr>
                </tbody>
              </table>
            </section>

            {/* ── Examples ─────────────────────────────────────── */}
            <section id="examples" className="dg-section">
              <h2 className="dg-h2">Code examples</h2>

              <h3 className="dg-h3">Test your key (curl)</h3>
              <Code>{`curl ${API_BASE}/v1/ingest/ping \\
  -H "Authorization: Bearer $METRICORE_KEY"`}</Code>

              <h3 className="dg-h3">Node.js — push after each sale</h3>
              <Code>{`// runs on YOUR server after an order completes
async function pushToMetriCore() {
  // 1. compute today's totals from YOUR database
  const products = await getTodayTotalsPerProduct();
  // → [{ sku: "TSHIRT-01", soldQuantity: 47, adCost: 35.5 }, ...]

  // 2. push (Node 18+ has fetch built in)
  const res = await fetch("${API_BASE}/v1/ingest/daily", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${process.env.METRICORE_KEY}\`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ products }),
  });

  const data = await res.json();
  if (!data.ok) console.error("MetriCore push failed:", data);
}`}</Code>

              <h3 className="dg-h3">Node.js — scheduled every 30 minutes</h3>
              <Code>{`import cron from "node-cron";   // npm i node-cron

cron.schedule("*/30 * * * *", () => {
  pushToMetriCore().catch(console.error);
});`}</Code>

              <h3 className="dg-h3">PHP</h3>
              <Code>{`$payload = ["products" => [[
  "sku"          => "TSHIRT-01",
  "soldQuantity" => $todayUnits,
  "adCost"       => $todayAdSpend,
]]];

$ch = curl_init("${API_BASE}/v1/ingest/daily");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_HTTPHEADER     => [
    "Authorization: Bearer " . getenv("METRICORE_KEY"),
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS     => json_encode($payload),
]);
$result = json_decode(curl_exec($ch), true);
curl_close($ch);`}</Code>
            </section>

            {/* ── Checklist ────────────────────────────────────── */}
            <section id="checklist" className="dg-section">
              <h2 className="dg-h2">Quick-start checklist</h2>
              <ol className="dg-list dg-list--num">
                <li>Generate a key in <em>Company Settings → API access</em> and store it in an environment variable on your server</li>
                <li><code className="dg-mono">GET /v1/ingest/ping</code> — confirm <code className="dg-mono">{"{ ok: true }"}</code></li>
                <li><code className="dg-mono">GET /v1/ingest/products</code> — map your products to their ids or SKUs</li>
                <li>Send one <code className="dg-mono">POST /v1/ingest/daily</code> with a single product and check the dashboard</li>
                <li>Send it again — confirm <code className="dg-mono">unchanged</code></li>
                <li>Automate: hook it to your order-complete event, or schedule it every 15–60 minutes</li>
              </ol>
              <p className="dg-foot-note">
                Stuck? <Link to="/contact" className="dg-link">Contact support</Link> —
                include the <code className="dg-mono">results</code> array from your response
                and we can see exactly what happened.
              </p>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}