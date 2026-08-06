// api/models/ApiKey.js
// One document per issued key. The RAW key ("mc_live_…") is shown to
// the user exactly once at creation — only its SHA-256 hash is stored,
// so a database leak cannot be turned into working keys (same pattern
// as the password-reset tokens).

import { Schema, model } from "mongoose";

const ApiKeySchema = new Schema(
  {
    companyId: {
      type:     Schema.Types.ObjectId,
      ref:      "Companies",
      required: true,
      index:    true,
    },

    // Human label: "Website backend", "POS system", …
    name: { type: String, required: true, trim: true, maxlength: 60 },

    // First chars of the raw key, e.g. "mc_live_a8f3c1" — for display
    // in the settings list only ("which key is this?"), never for auth.
    keyPrefix: { type: String, required: true },

    // sha256(rawKey) — the only thing auth ever compares against.
    keyHash: { type: String, required: true, unique: true, index: true },

    createdBy:  { type: Schema.Types.ObjectId, ref: "Employee" },
    lastUsedAt: { type: Date },

    // Soft revoke — keeps the audit trail (name, last used, when revoked)
    revoked:   { type: Boolean, default: false },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

export default model("ApiKey", ApiKeySchema, "ApiKeys");