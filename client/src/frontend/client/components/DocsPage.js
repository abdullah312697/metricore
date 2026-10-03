import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../../../style/DocsPage.css";   // 👈 adjust path to match your other pages

/* ═══════════════════════════════════════════════════════════════
   DocsPage — public help center (/docs)

   Docs "layout" with a sticky section sidebar and an article area.
   Content lives in the DOCS array below as data — to add a guide,
   add an object; to edit one, edit its `body`. No CMS, but it scales
   without touching the JSX/CSS.

   Each section: { id, title, icon, articles: [{ id, q, body }] }
   `body` is an array of blocks; block types: "p" | "steps" | "note" | "code".
   Replace the placeholder copy with your real guides.
═══════════════════════════════════════════════════════════════ */

const DOCS = [
  {
    id: "getting-started",
    title: "Getting started",
    icon: "🚀",
    articles: [
      {
        id: "what-is-metricore",
        q: "What is MetriCore?",
        body: [
          { type: "p", text: "MetriCore is a cost-tracking platform for product businesses. You set revenue goals, add your products, and record daily costs — MetriCore calculates where each product and goal actually stands." },
          { type: "p", text: "It's built for product-based businesses — e-commerce sellers, small manufacturers, and anyone selling physical goods who needs to know their true margin after ad spend, delivery, packaging, and returns, not just their revenue." },
        ],
      },
      {
        id: "create-account",
        q: "Creating your account",
        body: [
          { type: "p", text: "Every new company starts with a 14-day free trial — no card required." },
          { type: "steps", items: [
            "Go to the signup page and enter your company details.",
            "Verify your email using the link we send you.",
            "Complete the short onboarding wizard to set up your first goal.",
          ] },
          { type: "note", text: "Your trial gives you full Growth-plan access so you can try everything before choosing a plan." },
        ],
      },
    ],
  },
  {
    id: "goals",
    title: "Goals",
    icon: "🎯",
    articles: [
      {
        id: "create-goal",
        q: "Creating a goal",
        body: [
          { type: "p", text: "A goal is a revenue target with a start and end date. MetriCore tracks progress toward it automatically as you record sales and costs." },
          { type: "steps", items: [
            "From the dashboard, open the Goals card and choose Set goal.",
            "Enter a name, target amount, and date range.",
            "Assign the products that count toward this goal.",
          ] },
        ],
      },
      {
        id: "goal-progress",
        q: "Reading goal progress",
        body: [
          { type: "p", text: "Each goal shows a sparkline of revenue over its date range and a completion percentage. The percentage is your total revenue so far divided by the goal's target amount." },
          { type: "p", text: "The colour tells you whether you're on pace. MetriCore spreads your target evenly across the goal's days to work out where you should be today, then compares that to your actual revenue: green means you're at or ahead of pace, red means you're behind. A goal that hasn't started yet shows as upcoming." },
        ],
      },
    ],
  },
  {
    id: "products",
    title: "Products",
    icon: "📦",
    articles: [
      {
        id: "add-product",
        q: "Adding a product",
        body: [
          { type: "p", text: "Products are the items you track costs and sales against. Each has a name, price, SKU, and image." },
          { type: "note", text: "The SKU matters if you use the ingest API — it's how incoming data is matched to the right product." },
        ],
      },
    ],
  },
  {
    id: "cost-tracking",
    title: "Cost tracking",
    icon: "📊",
    articles: [
      {
        id: "daily-costs",
        q: "Recording daily costs",
        body: [
          { type: "p", text: "Open a goal to see a daily table for each product. Each day a fresh record is created automatically, carrying your delivery cost and target forward from the day before, so you only enter what changed." },
          { type: "p", text: "You fill in the editable fields: Sold Quantity, Return, Ad Cost, Other Cost, Delivery Cost Per Sale, Packaging Cost, Product Buying Cost, Shipping Cost, and Current Target Sale Amount. Each value saves automatically when you click out of the field." },
          { type: "note", text: "Everything else — Sold Amount, Profit, the per-sale costs, and all the totals — is calculated for you from those inputs and the product's price. You can hide any field you don't use from the Fields menu." },
        ],
      },
    ],
  },
  {
    id: "api",
    title: "Ingest API",
    icon: "🔌",
    articles: [
      {
        id: "api-access",
        q: "Getting API access",
        body: [
          { type: "p", text: "The ingest API lets your own server push daily sales and cost data into MetriCore automatically, so your dashboard stays up to date without anyone typing it in. It's available on every plan." },
          { type: "steps", items: [
            "In Company Settings → API access, generate a key (Owner or Admin only). Copy it immediately — it's shown only once.",
            "Send a ping request to confirm the key works.",
            "List your products to get their ids or SKUs, then push your daily totals.",
          ] },
          { type: "code", text: "curl https://metricore.app/api/v1/ingest/ping \\\n  -H \"Authorization: Bearer mc_live_your_key_here\"" },
          { type: "note", text: "The key is server-side only — never put it in browser or frontend code. The full reference, payload format, and code examples are in the Developer Guide." },
        ],
      },
    ],
  },
  {
    id: "team",
    title: "Team & roles",
    icon: "👥",
    articles: [
      {
        id: "invite-team",
        q: "Adding team members",
        body: [
          { type: "p", text: "From the Employees page, the owner or a manager adds a team member and assigns them a role. Each person gets their own login and sees only what their role allows." },
          { type: "p", text: "Roles decide what each person can see and do:" },
          { type: "steps", items: [
            "Owner — the account creator. Full control, including billing, company settings, and deleting the company.",
            "Admin / CEO — full day-to-day access across the company.",
            "Manager / Supervisor / HR — see financials and manage products, goals, and the team. No billing or company settings.",
            "Finance / Accountant — see financials, manage products, and manage billing. Cannot manage the team.",
            "Sales / Marketing / Support and other staff — team chat only. They cannot see company financials.",
            "Guest — minimal, view-only access.",
          ] },
          { type: "note", text: "A person can only assign roles at or below their own level, so a manager can't create an Admin or Owner." },
        ],
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & plans",
    icon: "💳",
    articles: [
      {
        id: "manage-plan",
        q: "Managing your plan",
        body: [
          { type: "p", text: "From the Billing page, the company owner can choose a plan, switch between monthly and annual, and open the billing portal to update payment details or cancel." },
          { type: "note", text: "Only the company owner can make billing changes. Other team members can view the plan but not modify it." },
        ],
      },
    ],
  },
];

/* ── block renderer ──────────────────────────────────────────── */
function Block({ block }) {
  switch (block.type) {
    case "steps":
      return (
        <ol className="doc-steps">
          {block.items.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      );
    case "note":
      return (
        <div className="doc-note">
          <span className="doc-note__label">Note</span>
          <p>{block.text}</p>
        </div>
      );
    case "code":
      return <pre className="doc-code"><code>{block.text}</code></pre>;
    case "p":
    default:
      return <p className="doc-p">{block.text}</p>;
  }
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(DOCS[0].id);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const sectionRefs = useRef({});

  // filter sections/articles by search
  const q = query.trim().toLowerCase();
  const filtered = q
    ? DOCS.map((sec) => ({
        ...sec,
        articles: sec.articles.filter(
          (a) =>
            a.q.toLowerCase().includes(q) ||
            a.body.some((b) => (b.text || (b.items || []).join(" ")).toLowerCase().includes(q))
        ),
      })).filter((sec) => sec.articles.length > 0)
    : DOCS;

  // scroll-spy: highlight the section in view
  useEffect(() => {
    if (q) return;
    const onScroll = () => {
      const y = window.scrollY + 140;
      let current = DOCS[0].id;
      for (const sec of DOCS) {
        const el = sectionRefs.current[sec.id];
        if (el && el.offsetTop <= y) current = sec.id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [q]);

  const jumpTo = (id) => {
    setMenuOpen(false);
    const el = sectionRefs.current[id];
    if (el) window.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
  };

  return (
    <div className="doc-root">

      {/* ── header ─────────────────────────────────────────────── */}
      <header className="doc-header">
        <div className="doc-header__inner">
          <span className="doc-eyebrow">Documentation</span>
          <h1 className="doc-title">How can we help?</h1>
          <p className="doc-sub">
            Guides for every part of MetriCore — from your first goal to the ingest API.
          </p>

          <div className="doc-search">
            <span className="doc-search__icon">⌕</span>
            <input
              className="doc-search__input"
              placeholder="Search the docs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="doc-search__clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
            )}
          </div>
        </div>
      </header>

      {/* ── mobile section toggle ──────────────────────────────── */}
      <button className="doc-menu-toggle" onClick={() => setMenuOpen((o) => !o)}>
        {menuOpen ? "Hide sections" : "Browse sections"}
      </button>

      <div className="doc-body">

        {/* ── sidebar ──────────────────────────────────────────── */}
        <aside className={`doc-sidebar ${menuOpen ? "doc-sidebar--open" : ""}`}>
          <nav className="doc-nav">
            {DOCS.map((sec) => (
              <button
                key={sec.id}
                className={`doc-nav__link ${!q && activeSection === sec.id ? "doc-nav__link--active" : ""}`}
                onClick={() => jumpTo(sec.id)}
              >
                <span className="doc-nav__icon">{sec.icon}</span>
                {sec.title}
              </button>
            ))}
          </nav>

          <div className="doc-sidebar__foot">
            <p className="doc-sidebar__foot-title">Still stuck?</p>
            <Link to="/contact" className="doc-sidebar__contact">Contact support →</Link>
          </div>
        </aside>

        {/* ── articles ─────────────────────────────────────────── */}
        <main className="doc-content">
          {filtered.length === 0 ? (
            <div className="doc-noresult">
              <p>No results for “{query}”.</p>
              <button className="doc-noresult__clear" onClick={() => setQuery("")}>Clear search</button>
            </div>
          ) : (
            filtered.map((sec) => (
              <section
                key={sec.id}
                className="doc-section"
                ref={(el) => (sectionRefs.current[sec.id] = el)}
              >
                <div className="doc-section__head">
                  <span className="doc-section__icon">{sec.icon}</span>
                  <h2 className="doc-section__title">{sec.title}</h2>
                </div>

                <div className="doc-articles">
                  {sec.articles.map((a) => (
                    <article className="doc-article" key={a.id} id={a.id}>
                      <h3 className="doc-article__q">{a.q}</h3>
                      <div className="doc-article__body">
                        {a.body.map((block, i) => <Block block={block} key={i} />)}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}

          <footer className="doc-footer">
            <p>Can't find what you need?</p>
            <Link to="/contact" className="doc-footer__btn">Get in touch</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}