// api/routes/contactRoutes.js
// PUBLIC contact form + ADMIN queue, in one router.
//
// Mount in index.js:
//     import contactRoutes from "./routes/contactRoutes.js";
//     app.use("/api/contact", contactRoutes);
//
// PUBLIC (no auth — anyone can post):
//     POST   /api/contact/addNewContact          rate-limited + honeypot
//
// ADMIN (requireAdmin):
//     GET    /api/contact/getAllmessages?filter=&page=
//     PATCH  /api/contact/message/:id/read       { isRead }
//     PUT    /api/contact/replayMessage/:replayId { sendReply, emailCustomer }
//     DELETE /api/contact/deleteMessage/:deleteId
//
// Fixed vs the old version:
//   • uses YOUR mailer.js (renderBrandEmail/sendMail) — the leaked
//     Gmail credentials + Nothun branding are gone.
//   • correct status codes (400 for validation, 500 for failure) so
//     the frontend can tell success from error.
//   • public POST is rate-limited + honeypot-guarded (it's unauth'd).
//   • reply is admin-only and its own status flow.
//
// 👈 Adjust the mailer.js import path if it isn't at ../mailer.js

import { Router } from "express";
import mongoose from "mongoose";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import Contact from "../models/Contact.js";
import { requireAdmin } from "./adminAuthRoutes.js";
import { sendMail, renderBrandEmail } from "../mailer.js";   // 👈 adjust path

const router = Router();

const PAGE_SIZE = 15;

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* ── spam shield for the PUBLIC endpoint ─────────────────────── */
const contactLimiter = rateLimit({
  windowMs:        15 * 60_000,
  max:             5,               // 5 submissions / 15 min / IP
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => ipKeyGenerator(req.ip),
  message: "Too many messages from this address. Please try again later.",
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — POST /addNewContact
   Accepts the ContactPage's fields (name/email/subject/message)
   AND the legacy shape (fullname/phone/comment) — whichever arrives.
═══════════════════════════════════════════════════════════════ */
router.post("/addNewContact", contactLimiter, async (req, res) => {
  try {
    const b = req.body || {};

    // honeypot: a hidden field real users never fill. Bots do.
    // If present and non-empty, pretend success and drop it.
    if (b.website || b.company_url) {
      return res.status(200).json("Thanks, we'll get back to you soon!");
    }

    // accept either field name from the frontend
    const fullname = String(b.fullname ?? b.name ?? "").trim();
    const email    = String(b.email ?? "").trim();
    const phone    = String(b.phone ?? "").trim();
    const subject  = String(b.subject ?? "").trim();
    const comment  = String(b.comment ?? b.message ?? "").trim();
    const intent   = String(b.intent ?? "other").trim();

    if (!fullname) return res.status(400).json("Please enter your name.");
    if (!email)    return res.status(400).json("Please enter your email address.");
    if (!isEmail(email)) return res.status(400).json("That doesn't look like a valid email address.");
    if (!comment)  return res.status(400).json("Please enter a message.");
    if (comment.length > 3000) return res.status(400).json("Message is too long (3000 characters max).");

    await Contact.create({ fullname, email, phone, subject, comment, intent });

    return res.status(200).json("Thanks, we'll get back to you soon!");
  } catch (error) {
    console.error("❌ addNewContact:", error.message);
    return res.status(500).json("Failed to send your message. Please try again.");
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — GET /getAllmessages?filter=all|unread|replied&page=1
═══════════════════════════════════════════════════════════════ */
router.get("/getAllmessages", requireAdmin, async (req, res) => {
  try {
    const filter = String(req.query.filter || "all");
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);

    const match = {};
    if (filter === "unread")  match.isRead = false;
    if (filter === "replied") match.replay = { $exists: true, $nin: [null, ""] };

    const [total, unreadCount, repliedCount, messages] = await Promise.all([
      Contact.countDocuments(match),
      Contact.countDocuments({ isRead: false }),
      Contact.countDocuments({ replay: { $exists: true, $nin: [null, ""] } }),
      Contact.find(match)
        .sort({ isRead: 1, createdAt: -1 })   // unread first, newest first
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    return res.status(200).json({
      messages,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      counts: {
        all:     await Contact.countDocuments({}),
        unread:  unreadCount,
        replied: repliedCount,
      },
    });
  } catch (error) {
    console.error("❌ getAllmessages:", error.message);
    return res.status(500).json("Failed to retrieve messages.");
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — PATCH /message/:id/read   { isRead: true|false }
═══════════════════════════════════════════════════════════════ */
router.patch("/message/:id/read", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json("Invalid message id.");
    if (typeof req.body?.isRead !== "boolean")
      return res.status(400).json("isRead must be true or false.");

    const updated = await Contact.findByIdAndUpdate(
      id,
      { $set: { isRead: req.body.isRead } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json("Message not found.");

    return res.status(200).json({ message: "Updated.", data: updated });
  } catch (error) {
    console.error("❌ mark read:", error.message);
    return res.status(500).json("Failed to update message.");
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — PUT /replayMessage/:replayId  { sendReply, emailCustomer }
   Stores the reply, marks read, and (optionally) emails the customer
   via mailer.js. Email failure is non-fatal.
═══════════════════════════════════════════════════════════════ */
router.put("/replayMessage/:replayId", requireAdmin, async (req, res) => {
  try {
    const { replayId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(replayId))
      return res.status(400).json("Invalid message id.");

    const sendReply    = typeof req.body?.sendReply === "string" ? req.body.sendReply.trim() : "";
    const emailCustomer = req.body?.emailCustomer !== false;   // default true

    if (!sendReply) return res.status(400).json("Reply can't be empty.");
    if (sendReply.length > 3000)
      return res.status(400).json("Reply is too long (3000 characters max).");

    const msg = await Contact.findByIdAndUpdate(
      replayId,
      { $set: { replay: sendReply, repliedAt: new Date(), isRead: true } },
      { new: true }
    ).lean();
    if (!msg) return res.status(404).json("Message not found.");

    // optional email — never fatal
    let emailed = false;
    if (emailCustomer && msg.email) {
      try {
        const html = renderBrandEmail({
          bodyHtml: `
            <h2 style="color:#ffffff;font-size:18px;margin:24px 0 12px;">
              Hi ${esc(msg.fullname)},
            </h2>
            <p style="color:#dde6ee;font-size:14px;line-height:1.7;margin:0 0 16px;">
              Thanks for reaching out to MetriCore. Here's our reply${msg.subject ? ` regarding "${esc(msg.subject)}"` : ""}:
            </p>
            <div style="color:#dde6ee;font-size:14px;line-height:1.75;white-space:pre-wrap;
                        border-left:3px solid #ffb100;padding-left:14px;">${esc(sendReply)}</div>`,
          footerNote: "You're receiving this because you contacted MetriCore.",
        });
        const result = await sendMail({
          to:      msg.email,
          subject: msg.subject ? `Re: ${msg.subject}` : "Re: your message to MetriCore",
          html,
        });
        emailed = Boolean(result?.ok);
      } catch (mailErr) {
        console.warn("⚠️ contact reply email failed:", mailErr.message);
      }
    }

    return res.status(200).json({
      message: emailed ? "Reply saved and emailed." : "Reply saved.",
      data:    { _id: msg._id, replay: msg.replay, repliedAt: msg.repliedAt, isRead: msg.isRead },
    });
  } catch (error) {
    console.error("❌ replayMessage:", error.message);
    return res.status(500).json("Failed to send your reply.");
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — DELETE /deleteMessage/:deleteId
═══════════════════════════════════════════════════════════════ */
router.delete("/deleteMessage/:deleteId", requireAdmin, async (req, res) => {
  try {
    const { deleteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deleteId))
      return res.status(400).json("Invalid message id.");

    const isDelete = await Contact.findByIdAndDelete(deleteId);
    if (!isDelete) return res.status(404).json("Message not found.");

    return res.status(200).json({ data: isDelete, message: "Successfully deleted." });
  } catch (error) {
    console.error("❌ deleteMessage:", error.message);
    return res.status(500).json("Failed to delete message.");
  }
});

export default router;