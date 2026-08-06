// api/mailer.js — ONE email system for the whole backend
//
// Every email MetriCore sends goes through this file. Routes never
// touch nodemailer, transporters, or HTML again — they call one
// function and get a result object back.
//
//   import { sendMail, sendVerificationCode, sendPasswordReset } from "../mailer.js";
//
//   const mail = await sendVerificationCode("owner@shop.com", 482913);
//   if (!mail.ok) console.error(mail.error);
//
// ── PROVIDER SWITCHING = .env ONLY ───────────────────────────────
// Configure with generic SMTP variables. Every transactional
// provider speaks SMTP, so changing provider never touches code:
//
//   SMTP_HOST=smtp-relay.brevo.com
//   SMTP_PORT=587
//   SMTP_USER=your_brevo_login
//   SMTP_PASS=your_brevo_smtp_key
//   MAIL_FROM=no-reply@yourdomain.com
//   MAIL_FROM_NAME=MetriCore
//
// Quick reference:
//   Brevo    → host smtp-relay.brevo.com : 587
//   Resend   → host smtp.resend.com      : 587   (user: "resend", pass: API key)
//   Postmark → host smtp.postmarkapp.com : 587
//   Gmail    → host smtp.gmail.com       : 587   (app password)
//
// TRANSITION SAFETY: if no SMTP_HOST is set but the old
// EMAIL_USER/EMAIL_PASS exist, this falls back to Gmail so nothing
// breaks mid-migration (a warning is logged).

import nodemailer from "nodemailer";

/* ═══════════════════════════════════════════════════════════════
   TRANSPORTER — lazy singleton (same lesson as cloudinary.js:
   configure on first send, never at import time)
═══════════════════════════════════════════════════════════════ */
let transporter = null;

const ensureTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_USER, EMAIL_PASS } = process.env;

  if (SMTP_HOST) {
    // ── Modern path: generic SMTP, provider-agnostic ────────────
    const missing = [];
    if (!SMTP_USER) missing.push("SMTP_USER");
    if (!SMTP_PASS) missing.push("SMTP_PASS");
    if (missing.length) {
      throw new Error(`Mailer is not configured — missing ${missing.join(", ")} in api/.env`);
    }

    const port = Number(SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port,
      secure: port === 465,           // 465 = TLS from the start, 587 = STARTTLS
      auth:   { user: SMTP_USER, pass: SMTP_PASS },
    });
    return transporter;
  }

  if (EMAIL_USER && EMAIL_PASS) {
    // ── Legacy fallback: old Gmail vars — keeps email alive
    //    during the provider transition ─────────────────────────
    console.warn("⚠️  mailer: SMTP_* vars not set — falling back to legacy Gmail (EMAIL_USER/EMAIL_PASS)");
    transporter = nodemailer.createTransport({
      service: "gmail",
      port:    587,
      secure:  false,
      auth:    { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    return transporter;
  }

  throw new Error(
    "Mailer is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in api/.env"
  );
};

const fromAddress = () => {
  const name = process.env.MAIL_FROM_NAME || "MetriCore";
  const addr = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;
  return `"${name}" <${addr}>`;
};

/* ═══════════════════════════════════════════════════════════════
   CORE SENDER
   to      : string OR array of strings
   subject : string
   html    : string (use renderBrandEmail for the standard shell)
   text    : optional plain-text alternative
   replyTo : optional
   Returns { ok, messageId } or { ok: false, error } — NEVER throws,
   so each route decides whether a mail failure is fatal.
═══════════════════════════════════════════════════════════════ */
export async function sendMail({  to, bcc, subject, html, text, replyTo }) {
  try {
    const list = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (!list.length)      return { ok: false, error: "sendMail: no recipient" };
    if (!subject)          return { ok: false, error: "sendMail: subject is required" };
    if (!html && !text)    return { ok: false, error: "sendMail: html or text body is required" };

    const t = ensureTransporter();

  const info = await t.sendMail({
    from: fromAddress(),
    to:   list.join(", "),
    ...(bcc ? { bcc: (Array.isArray(bcc) ? bcc : [bcc]).join(", ") } : {}),
    subject, html, text,
    ...(replyTo ? { replyTo } : {}),
  });
  
    console.log(`📧 sent "${subject}" → ${list.join(", ")} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };

  } catch (err) {
    console.error(`❌ mail failed "${subject}" → ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/* Optional: call once at server start (dev) to catch bad SMTP
   credentials immediately instead of at the first real signup:
     verifySmtpConnection().then(r => !r.ok && console.error(r.error));   */
export async function verifySmtpConnection() {
  try {
    await ensureTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `SMTP verify failed: ${err.message}` };
  }
}

/* ═══════════════════════════════════════════════════════════════
   BRAND SHELL — one look for every email
   Templates only supply the middle; header/footer stay identical.
   Exported so ANY future email (welcome, invoice, alert) reuses it:
     sendMail({ to, subject, html: renderBrandEmail({ bodyHtml: "..." }) })
═══════════════════════════════════════════════════════════════ */
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderBrandEmail({ bodyHtml, footerNote = "" }) {
  return `
  <div style="background-color:#011626;max-width:560px;margin:0 auto;padding:36px 28px;border-radius:14px;font-family:Arial,Helvetica,sans-serif;">
    <div style="text-align:center;padding-bottom:22px;border-bottom:1px solid rgba(255,255,255,0.12);">
      <span style="display:inline-block;background:#ffb100;color:#040f1a;font-weight:bold;font-size:18px;width:38px;height:38px;line-height:38px;border-radius:9px;">M</span>
      <span style="color:#ffffff;font-size:19px;font-weight:bold;margin-left:8px;vertical-align:middle;">MetriCore</span>
    </div>

    ${bodyHtml}

    <p style="color:#4d6070;font-size:12px;line-height:1.7;border-top:1px solid rgba(255,255,255,0.12);padding-top:18px;margin:26px 0 0;">
      ${footerNote}
    </p>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATE 1 — email verification code
═══════════════════════════════════════════════════════════════ */
export async function sendVerificationCode(to, code) {
  const bodyHtml = `
    <h2 style="color:#ffffff;font-size:20px;margin:28px 0 10px;text-align:center;">Your verification code</h2>
    <p style="color:#ffb100;font-size:34px;letter-spacing:8px;font-weight:bold;text-align:center;background:rgba(255,177,0,0.08);border:1px solid rgba(255,177,0,0.3);border-radius:10px;padding:18px 0;margin:0 0 6px;">${esc(code)}</p>
  `;

  return sendMail({
    to,
    subject: "Your MetriCore verification code",
    html: renderBrandEmail({
      bodyHtml,
      footerNote:
        "Enter this code on the verification page. If you didn't create a MetriCore account, you can safely ignore this email.",
    }),
    text: `Your MetriCore verification code is: ${code}`,
  });
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATE 2 — password reset link
═══════════════════════════════════════════════════════════════ */
export async function sendPasswordReset(to, resetUrl, ttlMinutes = 30) {
  const bodyHtml = `
    <h2 style="color:#ffffff;font-size:20px;margin:28px 0 10px;">Reset your password</h2>
    <p style="color:#8899aa;font-size:14px;line-height:1.7;margin:0 0 26px;">
      We received a request to reset the password for
      <strong style="color:#dde6ee;">${esc(to)}</strong>.
      Click the button below to choose a new one.
    </p>

    <div style="text-align:center;margin:0 0 26px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#ffb100;color:#040f1a;font-weight:bold;font-size:15px;text-decoration:none;padding:13px 30px;border-radius:9px;">
        Set new password
      </a>
    </div>

    <p style="color:#8899aa;font-size:12px;line-height:1.7;margin:0 0 8px;">
      Button not working? Copy this link into your browser:
    </p>
    <p style="color:#ffb100;font-size:12px;word-break:break-all;margin:0;">
      ${esc(resetUrl)}
    </p>
  `;

  return sendMail({
    to,
    subject: "Reset your MetriCore password",
    html: renderBrandEmail({
      bodyHtml,
      footerNote:
        `This link expires in ${ttlMinutes} minutes and can be used once. ` +
        "If you didn't request a reset, you can safely ignore this email — your password will not change.",
    }),
    text: `Reset your MetriCore password: ${resetUrl} (expires in ${ttlMinutes} minutes)`,
  });
}