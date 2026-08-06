// api/models/PlatformAdmin.js
// The platform OWNER'S account (you) — completely separate from
// Companies/Employee. There is NO registration route for this model:
// accounts are created only by scripts/seedAdmin.js, so the public
// attack surface for admin creation is zero.

import { Schema, model } from "mongoose";

const PlatformAdminSchema = new Schema(
  {
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    // bcrypt hash (hashPassword from verifyuser.js).
    // select:false → never leaves the DB unless explicitly asked for,
    // exactly like employeeAccessPassword.
    passwordHash: { type: String, required: true, select: false },

    name:        { type: String, default: "Admin", trim: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export default model("PlatformAdmin", PlatformAdminSchema, "PlatformAdmins");