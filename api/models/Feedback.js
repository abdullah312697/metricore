// api/models/Feedback.js
// Company → platform tickets: complaints, bugs, feature requests.
// Submitted by any authenticated employee of a company; answered by
// the platform admin. One document per ticket.

import { Schema, model } from "mongoose";

const FeedbackSchema = new Schema(
  {
    companyId: {
      type:     Schema.Types.ObjectId,
      ref:      "Companies",
      required: true,
      index:    true,
    },

    // who inside the company submitted it (for display only)
    employeeId: { type: Schema.Types.ObjectId },

    type: {
      type:     String,
      enum:     ["complaint", "bug", "feature", "other"],
      required: true,
    },

    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },

    status: {
      type:    String,
      enum:    ["open", "in_progress", "resolved"],
      default: "open",
      index:   true,
    },

    // your reply, shown to the company on their Support page
    adminReply:     { type: String, trim: true, maxlength: 3000 },
    adminRepliedAt: { type: Date },
  },
  { timestamps: true }
);

export default model("Feedback", FeedbackSchema, "Feedback");