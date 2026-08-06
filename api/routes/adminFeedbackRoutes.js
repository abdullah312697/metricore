// api/routes/adminFeedbackRoutes.js
// ADMIN-SIDE ticket queue. Mount in index.js:
//
//     import adminFeedbackRoutes from "./routes/adminFeedbackRoutes.js";
//     app.use("/api/admin", adminFeedbackRoutes);
//
// Endpoints (requireAdmin):
//     GET   /api/admin/feedback?status=&type=&page=
//           → tickets sorted UNRESOLVED-NEWEST-FIRST + status counts
//     PATCH /api/admin/feedback/:id
//           → { status? , reply? , emailCompany? }
//             reply is stored; if emailCompany=true it's also sent to
//             the company's email via mailer.js (non-fatal on failure).
//             A reply to an "open" ticket auto-moves it to in_progress
//             unless you set a status explicitly.
//
// 👈 Adjust the Companies/Employee import filenames + the
//    companyName / companyEmail / companyLogo / YemplyeeName reads
//    if your schemas name them differently (same knobs as before).

import { Router } from "express";
import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Companies from "../models/Companies.js";     // 👈 adjust
import Employee  from "../models/Employee.js";      // 👈 adjust
import { requireAdmin } from "./adminAuthRoutes.js";
import { sendMail, renderBrandEmail } from "../mailer.js";   // 👈 adjust path if mailer lives elsewhere

const router = Router();

const PAGE_SIZE = 12;
const STATUSES  = ["open", "in_progress", "resolved"];
const TYPES     = ["complaint", "bug", "feature", "other"];

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ═══════════════════════════════════════════════════════════════
   GET /feedback — queue, unresolved first, newest first within
═══════════════════════════════════════════════════════════════ */
router.get("/feedback", requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const type   = String(req.query.type   || "all");
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);

    const match = {};
    if (STATUSES.includes(status)) match.status = status;
    if (TYPES.includes(type))      match.type   = type;

    const [total, byStatusRows, docs] = await Promise.all([
      Feedback.countDocuments(match),
      Feedback.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      Feedback.aggregate([
        { $match: match },
        {
          $addFields: {
            statusRank: {
              $switch: {
                branches: [
                  { case: { $eq: ["$status", "open"] },        then: 0 },
                  { case: { $eq: ["$status", "in_progress"] }, then: 1 },
                ],
                default: 2,
              },
            },
          },
        },
        { $sort: { statusRank: 1, createdAt: -1 } },
        { $skip: (page - 1) * PAGE_SIZE },
        { $limit: PAGE_SIZE },
      ]),
    ]);

    const counts = { open: 0, in_progress: 0, resolved: 0 };
    byStatusRows.forEach((r) => { if (r._id in counts) counts[r._id] = r.n; });

    // hydrate company + submitter for the page
    const companyIds  = [...new Set(docs.map((d) => String(d.companyId)))];
    const employeeIds = [...new Set(docs.map((d) => String(d.employeeId)).filter(Boolean))];

    const [companies, employees] = await Promise.all([
      Companies.find({ _id: { $in: companyIds } }).lean(),
      employeeIds.length
        ? Employee.find({ _id: { $in: employeeIds } }).lean()
        : [],
    ]);

    const cMap = {}; companies.forEach((c) => { cMap[String(c._id)] = c; });
    const eMap = {}; employees.forEach((e) => { eMap[String(e._id)] = e; });

    const tickets = docs.map((t) => {
      const c = cMap[String(t.companyId)] || {};
      const e = eMap[String(t.employeeId)] || {};
      return {
        _id:            t._id,
        type:           t.type,
        subject:        t.subject,
        message:        t.message,
        status:         t.status,
        createdAt:      t.createdAt,
        adminReply:     t.adminReply || null,
        adminRepliedAt: t.adminRepliedAt || null,
        company: {
          _id:   t.companyId,
          name:  c.companyName  || "—",      // 👈 adjust reads
          email: c.companyEmail || "",
          logo:  c.companyLogo  || "",
        },
        employeeName: e.YemplyeeName || "",
      };
    });

    return res.status(200).json({
      tickets,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      counts,
    });
  } catch (err) {
    console.error("❌ admin feedback list:", err.message);
    return res.status(500).json({ message: "Failed to load tickets." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /feedback/:id — status change and/or reply (+email)
═══════════════════════════════════════════════════════════════ */
router.patch("/feedback/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid ticket id." });

    const status       = req.body?.status;
    const reply        = typeof req.body?.reply === "string" ? req.body.reply.trim() : "";
    const emailCompany = Boolean(req.body?.emailCompany);

    if (!status && !reply)
      return res.status(400).json({ message: "Provide a status, a reply, or both." });
    if (status && !STATUSES.includes(status))
      return res.status(400).json({ message: "Invalid status." });
    if (reply.length > 3000)
      return res.status(400).json({ message: "Reply must be 3000 characters or fewer." });

    const ticket = await Feedback.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    if (reply) {
      ticket.adminReply     = reply;
      ticket.adminRepliedAt = new Date();
      // replying to an untouched ticket implies you're on it
      if (!status && ticket.status === "open") ticket.status = "in_progress";
    }
    if (status) ticket.status = status;

    await ticket.save();

    // optional email — never fatal
    let emailed = false;
    if (reply && emailCompany) {
      try {
        const company = await Companies.findById(ticket.companyId).lean();
        const to = company?.companyEmail;                 // 👈 adjust read
        if (to) {
          const html = renderBrandEmail({
            bodyHtml: `
              <h2 style="color:#ffffff;font-size:18px;margin:24px 0 12px;">
                Reply to your ticket: ${esc(ticket.subject)}
              </h2>
              <div style="color:#dde6ee;font-size:14px;line-height:1.75;white-space:pre-wrap;">${esc(reply)}</div>`,
            footerNote: "You can also see this reply on your Support page in MetriCore.",
          });
          const result = await sendMail({
            to,
            subject: `Re: ${ticket.subject}`,
            html,
          });
          emailed = Boolean(result?.ok);
        }
      } catch (mailErr) {
        console.warn("⚠️ feedback reply email failed:", mailErr.message);
      }
    }

    return res.status(200).json({
      message: reply
        ? emailed
          ? "Reply saved and emailed to the company."
          : "Reply saved."
        : "Status updated.",
      ticket: {
        _id:            ticket._id,
        status:         ticket.status,
        adminReply:     ticket.adminReply || null,
        adminRepliedAt: ticket.adminRepliedAt || null,
      },
    });
  } catch (err) {
    console.error("❌ admin feedback patch:", err.message);
    return res.status(500).json({ message: "Failed to update ticket." });
  }
});

export default router;