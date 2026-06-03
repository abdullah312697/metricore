// models/ExtraFieldConfig.js
import { Schema, model } from "mongoose";

// Level 3 — what to calculate WITH (name of existing field + operation)
const CalculateWithSchema = new Schema(
  {
    name:     { type: String, required: true }, // existing field name e.g. "AdCost"
    calcType: { type: String, required: true }, // "plus" | "minus" | "multiply" | "divide"
  },
  { _id: false }
);

// Level 2 — one extra field definition (fieldName + how to calculate it)
const EachProductFieldSchema = new Schema(
  {
    fieldName:     { type: String, required: true }, // e.g. "NetProfit", "Tax"
    calculateWith: { type: [CalculateWithSchema], default: [] },
  },
  { _id: true } // 👈 keep _id — ProductsCost.extraFields.configId references this
);

// Level 1 — one config doc per company + product + goal
const ExtraFieldConfigSchema = new Schema(
  {
    companyId:         { type: Schema.Types.ObjectId, ref: "Companies",     required: true },
    GoalId:            { type: Schema.Types.ObjectId, ref: "MyTarget",      required: true },
    EachProductFields: { type: [EachProductFieldSchema], default: [] },
  },
  { timestamps: true }
);

// One doc per company + product + goal combination
ExtraFieldConfigSchema.index(
  { companyId: 1, GoalId: 1 },
  { unique: true }
);

export default model("ExtraFieldConfig", ExtraFieldConfigSchema, "ExtraFieldConfig");