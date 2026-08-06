// api/routes/announcementRoutes.js
// COMPANY-SIDE feed. Mount in index.js:
//
//     import announcementRoutes from "./routes/announcementRoutes.js";
//     app.use("/api/announcements", announcementRoutes);
//
// Endpoint (company cookie auth):
//     GET /api/announcements/latest     → newest 10, for the panel

import { Router } from "express";
import Announcement from "../models/Announcement.js";
import { decryptUserData } from "../verifyuser.js";

const router = Router();

router.get("/latest", async (req, res) => {
  try {
    const employeeId = decryptUserData(req.cookies?.employeeId);
    const companyId  = decryptUserData(req.cookies?.companyId);
    if (!employeeId || !companyId)
      return res.status(401).json({ message: "Login/Register please!" });

    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title body createdAt")
      .lean();

    return res.status(200).json({ data: announcements });
  } catch (err) {
    console.error("❌ announcements latest:", err.message);
    return res.status(500).json({ message: "Failed to load announcements." });
  }
});

export default router;