// api/models/Announcement.js
// Platform → companies broadcasts: version updates, news, notices.
// Always visible in-app (the What's-new panel); optionally also
// emailed to every non-suspended company at publish time.

import { Schema, model } from "mongoose";

const AnnouncementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body:  { type: String, required: true, trim: true, maxlength: 5000 },

    // email blast bookkeeping (set at publish time)
    emailSent: { type: Boolean, default: false },
    emailedTo: { type: Number,  default: 0 },
  },
  { timestamps: true }   // createdAt = publish date
);

export default model("Announcement", AnnouncementSchema, "Announcements");