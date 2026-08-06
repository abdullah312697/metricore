// api/routes/feedbackRoutes.js
// COMPANY-SIDE ticket routes. Mount in index.js:
//
//     import feedbackRoutes from "./routes/feedbackRoutes.js";
//     app.use("/api/feedback", feedbackRoutes);
//
// Endpoints (company cookie auth, same pattern as your other routes):
//     POST /api/feedback/submitFeedback   { type, subject, message }
//     GET  /api/feedback/myFeedback       tenant's own tickets + replies

import { Router } from "express";
import Feedback from "../models/Feedback.js";
import { decryptUserData } from "../verifyuser.js";

const router = Router();

const TYPES = ["complaint", "bug", "feature", "other"];

// same cookie-auth pattern as updateProduct
const getAuth = (req) => {
  const employeeId = decryptUserData(req.cookies?.employeeId);
  const companyId  = decryptUserData(req.cookies?.companyId);
  if (!employeeId || !companyId) return null;
  return { employeeId, companyId };
};

/* ═══════════════════════════════════════════════════════════════
   POST /submitFeedback
═══════════════════════════════════════════════════════════════ */
router.post("/submitFeedback", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });

    const type    = String(req.body?.type || "").toLowerCase();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!TYPES.includes(type))
      return res.status(400).json({ message: "Pick a valid ticket type." });
    if (!subject) return res.status(400).json({ message: "Subject is required." });
    if (subject.length > 120)
      return res.status(400).json({ message: "Subject must be 120 characters or fewer." });
    if (!message) return res.status(400).json({ message: "Message is required." });
    if (message.length > 3000)
      return res.status(400).json({ message: "Message must be 3000 characters or fewer." });

    const ticket = await Feedback.create({
      companyId:  auth.companyId,
      employeeId: auth.employeeId,
      type,
      subject,
      message,
    });

    return res.status(201).json({
      message: "Thanks — your ticket has been sent to the MetriCore team.",
      data:    ticket,
    });
  } catch (err) {
    console.error("❌ submitFeedback:", err.message);
    return res.status(500).json({ message: "Failed to submit. Please try again." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /myFeedback — this company's tickets, newest first
═══════════════════════════════════════════════════════════════ */
router.get("/myFeedback", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });

    const tickets = await Feedback.find({ companyId: auth.companyId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ data: tickets });
  } catch (err) {
    console.error("❌ myFeedback:", err.message);
    return res.status(500).json({ message: "Failed to load your tickets." });
  }
});

export default router;