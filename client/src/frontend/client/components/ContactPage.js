import { useState } from "react";
import { Link } from "react-router-dom";
import "../../../style/ContactPage.css";
import { Altaxios } from "../../Altaxios";
// ── Contact intents — route visitors before they type ────────────
const INTENTS = [
  {
    id:           "support",
    icon:         "🛠",
    title:        "Product support",
    desc:         "Something isn't working as expected or you need help using a feature.",
    email:        "support@metricore.app",
    responseTime: "Within 1 business day",
    placeholder:  "Describe what's happening and which feature is involved. Steps to reproduce the issue help us a lot.",
    subject:      "Support request",
  },
  {
    id:           "sales",
    icon:         "📊",
    title:        "Sales & pricing",
    desc:         "You want to understand which plan fits your business or need a custom quote.",
    email:        "support@metricore.app",
    responseTime: "Within 1 business day",
    placeholder:  "Tell us about your business — how many products, how many goals, and roughly how many people would use the platform.",
    subject:      "Sales enquiry",
  },
  {
    id:           "security",
    icon:         "🔒",
    title:        "Security or bug",
    desc:         "You found a vulnerability, a data issue, or something behaving incorrectly.",
    email:        "support@metricore.app",
    responseTime: "Prioritised — as soon as possible",
    placeholder:  "Describe what you found. Include steps to reproduce if possible. Do not include real user data in this form.",
    subject:      "Security / bug report",
  },
  {
    id:           "other",
    icon:         "✉️",
    title:        "Something else",
    desc:         "Partnership, press, feedback, or anything that doesn't fit above.",
    email:        "support@metricore.app",
    responseTime: "Within 2 business days",
    placeholder:  "Tell us what's on your mind. We read every message ourselves.",
    subject:      "",
  },
];

// ── Other contact channels ───────────────────────────────────────
const CHANNELS = [
  {
    icon:  "📖",
    title: "Documentation",
    desc:  "Step-by-step guides for every feature.",
    link:  "/docs",
    cta:   "Browse docs",
  },
  {
    icon:  "📋",
    title: "Changelog",
    desc:  "See what changed in the latest release.",
    link:  "/changelog",
    cta:   "Read changelog",
  },
];

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function ContactPage() {
  const [activeIntent, setActiveIntent] = useState(null);
  const [form, setForm]                 = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors]             = useState({});
  const [sent, setSent]                 = useState(false);
  const [sending, setSending]           = useState(false);

  const intent = INTENTS.find((i) => i.id === activeIntent);

  // ── Select intent ──────────────────────────────────────────────
  const selectIntent = (id) => {
    const chosen = INTENTS.find((i) => i.id === id);
    setActiveIntent(id);
    setForm((prev) => ({ ...prev, subject: chosen.subject }));
    setErrors({});
    // scroll to form smoothly
    setTimeout(() => {
      document.getElementById("ct-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // ── Field change ───────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ── Validate ───────────────────────────────────────────────────
  const validate = () => {
    const next = {};
    if (!form.name.trim())    next.name    = "Please enter your name.";
    if (!form.email.trim())   next.email   = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "That doesn't look like a valid email address.";
    if (!form.subject.trim()) next.subject = "Please add a subject.";
    if (!form.message.trim()) next.message = "Please describe what you need.";
    else if (form.message.trim().length < 20)
      next.message = "A bit more detail helps us help you faster.";
    return next;
  };

  // ── Submit ─────────────────────────────────────────────────────
// ── Submit ─────────────────────────────────────────────────────
const handleSend = async () => {
  const errs = validate();
  if (Object.keys(errs).length) { setErrors(errs); return; }
  setSending(true);
  setErrors({});
  try {
    await Altaxios.post("/contact/addNewContact", {
      name:    form.name,          // backend accepts name → fullname
      email:   form.email,
      subject: form.subject,
      message: form.message,       // backend accepts message → comment
      intent:  activeIntent || "other",
      website: "",                 // honeypot — stays empty for real users
    });
    setSent(true);
  } catch (err) {
    const msg = typeof err.response?.data === "string"
      ? err.response.data
      : "Something went wrong sending your message. Please try again.";
    setErrors({ message: msg });
  } finally {
    setSending(false);
  }
};

  // ── Reset ──────────────────────────────────────────────────────
  const handleReset = () => {
    setSent(false);
    setActiveIntent(null);
    setForm({ name: "", email: "", subject: "", message: "" });
    setErrors({});
  };

  return (
    <div className="ct-root">

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="ct-hero">
        <div className="ct-hero__grid" />
        <div className="ct-container ct-hero__inner">
          <span className="ct-eyebrow">Contact</span>
          <h1 className="ct-hero__title">
            What brings<br />you here?
          </h1>
          <p className="ct-hero__sub">
            Choose what you need so we can help faster — your message
            comes straight to us, and we'll get back to you soon.
          </p>
        </div>
      </div>

      {/* ── Intent cards ────────────────────────────────────────── */}
      <div className="ct-container">
        <div className="ct-intents">
          {INTENTS.map((intent) => (
            <button
              key={intent.id}
              className={`ct-intent ${activeIntent === intent.id ? "ct-intent--active" : ""}`}
              onClick={() => selectIntent(intent.id)}
              aria-pressed={activeIntent === intent.id}
            >
              <span className="ct-intent__icon">{intent.icon}</span>
              <h3 className="ct-intent__title">{intent.title}</h3>
              <p  className="ct-intent__desc">{intent.desc}</p>
              <div className="ct-intent__footer">
                <span className="ct-intent__time ct-mono">
                  ⏱ {intent.responseTime}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Form + sidebar ──────────────────────────────────────── */}
      <div className="ct-container ct-body" id="ct-form">

        {/* Form column */}
        <div className={`ct-form-wrap ${activeIntent ? "ct-form-wrap--visible" : ""}`}>

          {sent ? (
            /* ── Success state ────────────────────────────────── */
            <div className="ct-success">
              <div className="ct-success__icon">✓</div>
              <h2 className="ct-success__title">Message sent</h2>
              <p className="ct-success__text">
                We received your message and will reply to{" "}
                <strong>{form.email}</strong>{" "}
                {intent ? intent.responseTime.toLowerCase() : "soon"}.
              </p>
              <p className="ct-success__ref ct-mono">
                Sent to {intent?.email}
              </p>
              <button className="ct-btn ct-btn--ghost" onClick={handleReset}>
                Send another message
              </button>
            </div>
          ) : (
            /* ── Form ─────────────────────────────────────────── */
            <>
              {/* Destination indicator */}
              {intent && (
                <div className="ct-destination">
                  <span className="ct-destination__label ct-mono">Sending to</span>
                  <span className="ct-destination__email">{intent.email}</span>
                  <span className="ct-destination__time ct-mono">
                    {intent.responseTime}
                  </span>
                </div>
              )}

              <div className="ct-form">

                {/* Name + Email row */}
                <div className="ct-form__row">
                  <div className="ct-field">
                    <label className="ct-label" htmlFor="ct-name">
                      Your name
                    </label>
                    <input
                      id="ct-name"
                      name="name"
                      type="text"
                      className={`ct-input ${errors.name ? "ct-input--error" : ""}`}
                      placeholder="First and last name"
                      value={form.name}
                      onChange={handleChange}
                      autoComplete="name"
                    />
                    {errors.name && (
                      <span className="ct-error">{errors.name}</span>
                    )}
                  </div>

                  <div className="ct-field">
                    <label className="ct-label" htmlFor="ct-email">
                      Your email
                    </label>
                    <input
                      id="ct-email"
                      name="email"
                      type="email"
                      className={`ct-input ${errors.email ? "ct-input--error" : ""}`}
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <span className="ct-error">{errors.email}</span>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div className="ct-field">
                  <label className="ct-label" htmlFor="ct-subject">
                    Subject
                  </label>
                  <input
                    id="ct-subject"
                    name="subject"
                    type="text"
                    className={`ct-input ${errors.subject ? "ct-input--error" : ""}`}
                    placeholder="One line about your message"
                    value={form.subject}
                    onChange={handleChange}
                  />
                  {errors.subject && (
                    <span className="ct-error">{errors.subject}</span>
                  )}
                </div>

                {/* Message */}
                <div className="ct-field">
                  <label className="ct-label" htmlFor="ct-message">
                    Message
                  </label>
                  <textarea
                    id="ct-message"
                    name="message"
                    rows={6}
                    className={`ct-textarea ${errors.message ? "ct-input--error" : ""}`}
                    placeholder={
                      intent
                        ? intent.placeholder
                        : "Tell us what you need. The more detail, the faster we can help."
                    }
                    value={form.message}
                    onChange={handleChange}
                  />
                  <div className="ct-field__footer">
                    {errors.message ? (
                      <span className="ct-error">{errors.message}</span>
                    ) : (
                      <span className="ct-char-count ct-mono">
                        {form.message.length} chars
                      </span>
                    )}
                  </div>
                </div>

                {/* Send */}
                <button
                  className="ct-btn ct-btn--send"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <span className="ct-spinner" />
                      Sending…
                    </>
                  ) : (
                    "Send message"
                  )}
                </button>

                <p className="ct-form__note ct-mono">
                  We never share your email with third parties.
                </p>

                {/* honeypot — visually hidden, not for humans */}
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  value=""
  onChange={() => {}}
  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
  aria-hidden="true"
/>
              </div>
            </>
          )}
        </div>

        {/* ── Empty state when no intent selected ─────────────── */}
        {!activeIntent && (
          <div className="ct-form-prompt">
            <div className="ct-form-prompt__arrow">↑</div>
            <p>Choose a topic above to open the contact form.</p>
          </div>
        )}

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="ct-sidebar">

          {/* Response time table */}
          <div className="ct-sidebar__block">
            <h3 className="ct-sidebar__heading">Response times</h3>
            <div className="ct-times">
              {INTENTS.map((i) => (
                <div
                  key={i.id}
                  className={`ct-time-row ${activeIntent === i.id ? "ct-time-row--active" : ""}`}
                >
                  <span className="ct-time-row__icon">{i.icon}</span>
                  <span className="ct-time-row__label">{i.title}</span>
                  <span className="ct-time-row__val ct-mono">{i.responseTime}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Other channels */}
          <div className="ct-sidebar__block">
            <h3 className="ct-sidebar__heading">Other resources</h3>
            <div className="ct-channels">
              {CHANNELS.map((ch) => (
                <Link key={ch.title} to={ch.link} className="ct-channel">
                  <span className="ct-channel__icon">{ch.icon}</span>
                  <div className="ct-channel__copy">
                    <span className="ct-channel__title">{ch.title}</span>
                    <span className="ct-channel__desc">{ch.desc}</span>
                  </div>
                  <span className="ct-channel__arrow">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Response note */}
          <div className="ct-sidebar__hours">
            <p className="ct-sidebar__hours-title ct-mono">How we reply</p>
            <p className="ct-sidebar__hours-text">
              MetriCore is a small operation — your message comes
              straight to us, and we usually reply within one
              business day. Security and bug reports are prioritised.
            </p>
          </div>

        </aside>
      </div>

    </div>
  );
}