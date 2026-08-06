// api/models/Contact.js
// Public contact-form submissions (people NOT logged in — no
// companyId/employeeId, just a name + email + message). Surfaces in
// the admin console alongside Feedback, but is its own model because
// the sender is anonymous.

import mongoose from "mongoose";

const CustomerContact = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true, maxlength: 120 },
    email:    { type: String, required: true, trim: true, maxlength: 160 },
    phone:    { type: String, trim: true, maxlength: 40 },   // optional
    // the ContactPage sends a subject + message; we keep both.
    subject:  { type: String, trim: true, maxlength: 160 },
    comment:  { type: String, required: true, trim: true, maxlength: 3000 },

    // which intent card the visitor picked (support/sales/security/other)
    intent:   { type: String, trim: true, default: "other" },

    replay:   { type: String, trim: true, maxlength: 3000 },  // your reply (kept your spelling)
    repliedAt:{ type: Date },
    isRead:   { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", CustomerContact, "Contact");

export default Contact;