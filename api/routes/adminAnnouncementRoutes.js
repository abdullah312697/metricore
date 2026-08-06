// api/routes/adminAnnouncementRoutes.js
// ADMIN-SIDE announcements. Mount in index.js:
//
//     import adminAnnouncementRoutes from "./routes/adminAnnouncementRoutes.js";
//     app.use("/api/admin", adminAnnouncementRoutes);
//
// Endpoints (requireAdmin):
//     GET    /api/admin/announcements?page=       newest first, 10/page
//     POST   /api/admin/announcements             { title, body, sendEmail }
//     DELETE /api/admin/announcements/:id         retract one
//
// EMAIL BLAST: when sendEmail=true, every NON-SUSPENDED company with
// an email gets the announcement — sent in BCC batches of 50 through
// mailer.js so one send can't trip provider recipient limits. Batches
// fail independently and never fail the publish: the announcement is
// always saved and always visible in-app.
//
// 👈 Adjust: Companies import filename, the companyEmail read, and
//    the mailer.js path — same knobs as the feedback routes.

import { Router } from "express";
import mongoose from "mongoose";
import Announcement from "../models/Announcement.js";
import Companies from "../models/Companies.js";              // 👈 adjust
import { requireAdmin } from "./adminAuthRoutes.js";
import { sendMail, renderBrandEmail } from "../mailer.js";   // 👈 adjust path

const router = Router();

const PAGE_SIZE  = 10;
const BATCH_SIZE = 50;

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ═══════════════════════════════════════════════════════════════
   GET /announcements — newest first
═══════════════════════════════════════════════════════════════ */
router.get("/announcements", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const [total, announcements] = await Promise.all([
      Announcement.countDocuments({}),
      Announcement.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    return res.status(200).json({
      announcements,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (err) {
    console.error("❌ admin announcements list:", err.message);
    return res.status(500).json({ message: "Failed to load announcements." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /announcements — publish (+ optional email blast)
═══════════════════════════════════════════════════════════════ */
router.post("/announcements", requireAdmin, async (req, res) => {
  try {
    const title     = String(req.body?.title || "").trim();
    const body      = String(req.body?.body  || "").trim();
    const sendEmail = Boolean(req.body?.sendEmail);

    if (!title) return res.status(400).json({ message: "Title is required." });
    if (title.length > 120)
      return res.status(400).json({ message: "Title must be 120 characters or fewer." });
    if (!body) return res.status(400).json({ message: "Body is required." });
    if (body.length > 5000)
      return res.status(400).json({ message: "Body must be 5000 characters or fewer." });

    const announcement = await Announcement.create({ title, body });

    let emailed = 0;
    let failedBatches = 0;

    if (sendEmail) {
      // every non-suspended company with an email (verified or not —
      // they registered with it; suspended accounts are excluded)
      const companies = await Companies.find({ isSuspended: { $ne: true } }).lean();
      const emails = [
        ...new Set(companies.map((c) => c.companyEmail).filter(Boolean)),  // 👈 adjust read
      ];

      const html = renderBrandEmail({
        bodyHtml: `
          <h2 style="color:#ffffff;font-size:19px;margin:24px 0 14px;">${esc(title)}</h2>
          <div style="color:#dde6ee;font-size:14px;line-height:1.75;white-space:pre-wrap;">${esc(body)}</div>`,
        footerNote: "You're receiving this because you have a MetriCore workspace.",
      });

      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const chunk  = emails.slice(i, i + BATCH_SIZE);
        const result = await sendMail({
          to:      req.admin.email,   // header "to" = you; recipients hidden in bcc
          bcc:     chunk,
          subject: title,
          html,
        });
        if (result?.ok) emailed += chunk.length;
        else failedBatches++;
      }

      announcement.emailSent = emailed > 0;
      announcement.emailedTo = emailed;
      await announcement.save();
    }

    return res.status(201).json({
      message: sendEmail
        ? failedBatches === 0
          ? `Published and emailed to ${emailed} compan${emailed === 1 ? "y" : "ies"}.`
          : `Published. Emailed ${emailed}; ${failedBatches} batch(es) failed — it's still visible in-app.`
        : "Published — visible in every company's What's-new panel.",
      announcement,
    });
  } catch (err) {
    console.error("❌ publish announcement:", err.message);
    return res.status(500).json({ message: "Failed to publish. Please try again." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   DELETE /announcements/:id — retract
═══════════════════════════════════════════════════════════════ */
router.delete("/announcements/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid announcement id." });

    const gone = await Announcement.findByIdAndDelete(id);
    if (!gone) return res.status(404).json({ message: "Announcement not found." });

    return res.status(200).json({ message: "Announcement removed." });
  } catch (err) {
    console.error("❌ delete announcement:", err.message);
    return res.status(500).json({ message: "Failed to remove announcement." });
  }
});

export default router;