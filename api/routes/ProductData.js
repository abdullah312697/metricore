import express from 'express';
const router = express.Router();
import ProductsCost from '../models/ProductCost.js';
import ClientProduct from "../models/ClientProduct.js";
import mongoose from 'mongoose';
import ExtraFieldConfig from '../models/ExtraFieldConfig.js';
import { limitFor } from "../config/plans.js";
import Companies from '../models/Companies.js';   // 👈 was used but not imported (addEverydayData)

// unified auth/permission system (utils/auth.js)
// getRequester → validated { requester, requesterId, companyId, role, tier, can() }
import { getRequester } from "../utils/auth.js";

/* ═══════════════════════════════════════════════════════════════
   POST /createInitialCost — set up a product's cost fields
   Writes cost data → manageProducts
═══════════════════════════════════════════════════════════════ */
router.post("/createInitialCost", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("manageProducts"))
      return res.status(403).json({ message: "You don't have permission to edit cost data." });

    const newcompanyId = ctx.companyId;

    const {
      productId,
      goalId,
      AdCost              = 0,
      OtherCost           = 0,
      DelibaryCostPersale = 0,
      PackgingCost        = 0,
      PrductBuyingCost    = 0,
      ShippingCost        = 0,
    } = req.body;
 
    // ── Validate ids ──────────────────────────────────────────
    if (!productId || !mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ message: "Valid productId is required" });
 
    if (!mongoose.Types.ObjectId.isValid(newcompanyId))
      return res.status(400).json({ message: "Invalid companyId" });
 
    const companyObjId = mongoose.Types.ObjectId.createFromHexString(newcompanyId);
    const productObjId = mongoose.Types.ObjectId.createFromHexString(productId);
 
    // ── Multi-tenant safety: product must belong to this company ─
    const product = await ClientProduct.findOne({
      _id:       productObjId,
      companyId: companyObjId,
    });
 
    if (!product)
      return res.status(404).json({ message: "Product not found or unauthorized" });
 
    // ── Optional extra check: product must be in this goal ───────
    if (goalId && !product.GoalIdentifire.includes(goalId))
      return res.status(400).json({ message: "Product does not belong to this goal" });
 
    // ── Sanitize numbers (negative / NaN → 0) ────────────────────
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
 
    // ── Today window — same as the lazy upsert uses ──────────────
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
 
    // ── Upsert today's record ────────────────────────────────────
    // If a record for today already exists → update cost fields.
    // If not → create it with zeroed metrics + empty extraFields.
    const costDoc = await ProductsCost.findOneAndUpdate(
      {
        companyId: companyObjId,
        ProductId: productObjId,
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      },
      {
        $set: {
          AdCost:              toNum(AdCost),
          OtherCost:           toNum(OtherCost),
          DelibaryCostPersale: toNum(DelibaryCostPersale),
          PackgingCost:        toNum(PackgingCost),
          PrductBuyingCost:    toNum(PrductBuyingCost),
          ShippingCost:        toNum(ShippingCost),
        },
        $setOnInsert: {
          SoldQuentity:     0,
          Return:           0,
          TargetSaleAmount: 0,
          extraFields:      [],
        },
      },
      { upsert: true, new: true }
    );
 
    return res.status(201).json({
      message: "Initial cost record created",
      data:    costDoc,
    });
 
  } catch (err) {
    console.error("❌ createInitialCost error:", err.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /addEverydayData — create a daily cost/sales record
   Writes cost data → manageProducts
═══════════════════════════════════════════════════════════════ */
router.post("/addEverydayData", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("manageProducts"))
      return res.status(403).json({ message: "You don't have permission to add cost data." });
    const todayData = req.body;

    // Validate required fields
    if (!todayData.companyId || !todayData.ProductId) {
      return res.status(400).json({ message: "companyId and ProductId are required" });
    }

    // ✅ Spread all body fields directly — no nesting
    const isProductCreated = await ProductsCost.create({
      ...todayData  // spreads companyId, ProductId, and everything else
    });

    return res.status(201).json({
      message: "ok",
      data: isProductCreated
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /productGoalandData/:goalId — full cost/financial summary per
   product for a goal. Exposes sensitive cost breakdowns → viewFinancials.
   (Also lazily upserts today's records; the caller therefore needs
   the financial permission to reach this data.)
═══════════════════════════════════════════════════════════════ */
router.get("/productGoalandData/:goalId", async (req, res) => {
  const ctx = await getRequester(req);
  if (!ctx)
    return res.status(401).json({ message: "Login/Register please!" });
  if (!ctx.can("viewFinancials"))
    return res.status(403).json({ message: "You don't have permission to view financial data." });

  const newcompanyId = ctx.companyId;
  const { goalId }                = req.params;
  const { start, end }            = req.query;

  const sameGoalProduct = await ClientProduct.find({
    companyId:      newcompanyId,
    GoalIdentifire: goalId,
  });

  if (!sameGoalProduct.length)
    return res.status(404).json({ message: "No products found for this goal" });

  const productIds = sameGoalProduct.map((p) =>
    mongoose.Types.ObjectId.createFromHexString(p._id.toString())
  );

  const rangeStart = start
    ? new Date(start)
    : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();

  const rangeEnd = end
    ? new Date(end)
    : (() => { const d = new Date(); d.setUTCHours(23, 59, 59, 999); return d; })();

  const isDefaultToday = !start && !end;

  // 👇 No ProductId — one config per company + goal
  const allExtraConfigs = await ExtraFieldConfig.findOne({
    companyId: newcompanyId,
    GoalId:    goalId,
  });

  // 👇 All products share same field definitions
  const fieldDefs = allExtraConfigs?.EachProductFields.map((f) => ({
    fieldId:       f._id.toString(),
    fieldName:     f.fieldName,
    calculateWith: f.calculateWith,
  })) || [];

  // ── Lazy upsert for today ──────────────────────────────────────
  if (isDefaultToday) {
    const extraFields = fieldDefs.map((def) => ({
      configId: mongoose.Types.ObjectId.createFromHexString(def.fieldId),
      value:    0,
    }));

    await Promise.all(
      sameGoalProduct.map(async (product) => {
        const previousDoc = await ProductsCost.findOne(
          {
            companyId: newcompanyId,
            ProductId: product._id,
            createdAt: { $lt: rangeStart },
          },
          null,
          { sort: { createdAt: -1 } }
        );

        // 👇 Carry previous extraField values if available
        const extraFieldsWithPrev = fieldDefs.map((def) => {
          const prevField = previousDoc?.extraFields?.find(
            (ef) => ef.configId.toString() === def.fieldId
          );
          return {
            configId: mongoose.Types.ObjectId.createFromHexString(def.fieldId),
            value:    prevField?.value || 0,
          };
        });

        return ProductsCost.findOneAndUpdate(
          {
            companyId: newcompanyId,
            ProductId: product._id,
            createdAt: { $gte: rangeStart, $lte: rangeEnd },
          },
          {
            $setOnInsert: {
              companyId:           newcompanyId,
              ProductId:           product._id,
              SoldQuentity:        0,
              Return:              0,
              AdCost:              0,
              OtherCost:           0,
              PackgingCost:        0,
              PrductBuyingCost:    0,
              ShippingCost:        0,
              DelibaryCostPersale: previousDoc?.DelibaryCostPersale || 0,
              TargetSaleAmount:    previousDoc?.TargetSaleAmount    || 0,
              extraFields:         extraFieldsWithPrev,
            },
          },
          { upsert: true, new: true }
        );
      })
    );
  }

  // ── matchStage ─────────────────────────────────────────────────
  const matchStage = {
    companyId: mongoose.Types.ObjectId.createFromHexString(newcompanyId),
    ProductId: { $in: productIds },
    createdAt: { $gte: rangeStart, $lte: rangeEnd },
  };

  // ── Main aggregation ───────────────────────────────────────────
  const costSummary = await ProductsCost.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:                 "$ProductId",
        costDocId:           { $first: "$_id" },
        SoldQuentity:        { $sum: "$SoldQuentity" },
        Return:              { $sum: "$Return" },
        AdCost:              { $sum: "$AdCost" },
        OtherCost:           { $sum: "$OtherCost" },
        PackgingCost:        { $sum: "$PackgingCost" },
        PrductBuyingCost:    { $sum: "$PrductBuyingCost" },
        ShippingCost:        { $sum: "$ShippingCost" },
        TargetSaleAmount:    { $sum: "$TargetSaleAmount" },
        DelibaryCostPersale: { $avg: "$DelibaryCostPersale" },
        DelibaryCost: {
          $sum: { $multiply: ["$DelibaryCostPersale", "$SoldQuentity"] }
        },
        rawExtraFields: { $push: "$extraFields" },
      },
    },
  ]);

  // ── Merge extraFields values with definitions ──────────────────
  const finalSummary = costSummary.map((cost) => {
    const valueMap = cost.rawExtraFields
      .flat()
      .reduce((acc, field) => {
        if (!field) return acc;
        const key = field.configId.toString();
        acc[key]  = (acc[key] || 0) + (field.value || 0);
        return acc;
      }, {});

    // 👇 All products use same fieldDefs — no per-product lookup needed
    const extraFields = fieldDefs.map((def) => ({
      configId:      def.fieldId,
      fieldName:     def.fieldName,
      calculateWith: def.calculateWith,
      total:         valueMap[def.fieldId] || 0,
    }));

    const { rawExtraFields, ...costWithoutRaw } = cost;
    return { ...costWithoutRaw, extraFields };
  });

  // ── Merge with product data ────────────────────────────────────
  const mergedSummary = sameGoalProduct.map((product) => {
    const costData = finalSummary.find(
      (c) => c._id.toString() === product._id.toString()
    );

    // 👇 Fallback — show all fields with 0 if no cost data
    const fallbackExtraFields = fieldDefs.map((def) => ({
      configId:      def.fieldId,
      fieldName:     def.fieldName,
      calculateWith: def.calculateWith,
      total:         0,
    }));

    return {
      ...product._doc,
      costDocId:           costData?.costDocId           || null,
      SoldQuentity:        costData?.SoldQuentity        || 0,
      Return:              costData?.Return              || 0,
      AdCost:              costData?.AdCost              || 0,
      OtherCost:           costData?.OtherCost           || 0,
      DelibaryCostPersale: costData?.DelibaryCostPersale || 0,
      DelibaryCost:        costData?.DelibaryCost        || 0,
      PackgingCost:        costData?.PackgingCost        || 0,
      PrductBuyingCost:    costData?.PrductBuyingCost    || 0,
      ShippingCost:        costData?.ShippingCost        || 0,
      TargetSaleAmount:    costData?.TargetSaleAmount    || 0,
      extraFields:         costData?.extraFields         || fallbackExtraFields,
    };
  });

  return res.status(200).json({ message: "ok", mergedSummary });
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /updateExtraFieldValue/:costId — edit a custom cost field
   Writes cost data → manageProducts
═══════════════════════════════════════════════════════════════ */
router.patch("/updateExtraFieldValue/:costId", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("manageProducts"))
      return res.status(403).json({ message: "You don't have permission to edit cost data." });

    const newcompanyId = ctx.companyId;

    const { costId }          = req.params;
    const { configId, value } = req.body;

    // 👇 Validate before converting — prevents BSON crash
    if (!configId || configId.length !== 24)
      return res.status(400).json({ message: `Invalid configId: "${configId}"` });

    const updated = await ProductsCost.findOneAndUpdate(
      {
        _id:                    costId,
        companyId:              newcompanyId,
        "extraFields.configId": mongoose.Types.ObjectId.createFromHexString(configId),
      },
      { $set: { "extraFields.$.value": Number(value) } },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Record not found" });

    return res.status(200).json({ message: "Updated", data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /updateProductCost/:costId — edit a cost/sales field
   Writes cost data → manageProducts
═══════════════════════════════════════════════════════════════ */
router.patch("/updateProductCost/:costId", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("manageProducts"))
      return res.status(403).json({ message: "You don't have permission to edit cost data." });

    const newcompanyId = ctx.companyId;

    const { costId } = req.params;
    const { field, value } = req.body;
    const allowedFields = [
      "SoldQuentity", "Return", "AdCost",
      "OtherCost", "DelibaryCostPersale", "PackgingCost",
      "PrductBuyingCost", "ShippingCost", "TargetSaleAmount",
    ];

    if (!allowedFields.includes(field))
      return res.status(400).json({ message: `Field "${field}" is not updatable` });

    const updated = await ProductsCost.findOneAndUpdate(
      { _id: costId, companyId: newcompanyId },
      { $set: { [field]: Number(value) } },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Record not found" });

    return res.status(200).json({ message: "Updated", data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;