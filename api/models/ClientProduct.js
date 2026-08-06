import { Schema, model } from "mongoose";

const ClientProductData = new Schema(
  {
    companyId:          { type: Schema.Types.ObjectId, ref: "Companies", required: true },
    ProductName:        { type: String, required: true, trim: true },
    productImgFile:     { type: String },
    CloudinaryPublicId: { type: String },
    InStockQuentity:    { type: Number },
    ProductPrice:       { type: Number, required: true },
    GoalIdentifire:     { type: [String], required: true },
    sku:                { type: String, trim: true },
  },
  { timestamps: true }
);

ClientProductData.index(
  { companyId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: "string" } } }
);

export default model("ClientProduct", ClientProductData, "ClientProduct");