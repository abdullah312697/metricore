import express from "express";
const router = express.Router();
import mongoose from "mongoose";
import ExtraFieldConfig from "../models/ExtraFieldConfig.js";
import ProductsCost from "../models/ProductCost.js";
import ClientProduct from "../models/ClientProduct.js";
import { decryptUserData } from "../verifyuser.js";

const getAuthIds = (req) => {
  const { employeeId, companyId } = req.cookies;
  return {
    newEmployeeId: decryptUserData(employeeId),
    newCompanyId:  decryptUserData(companyId),
  };
};

// ── Helper: get all productIds for a goal ─────────────────────────
const getGoalProductIds = async (companyId, goalId) => {
  const products = await ClientProduct.find(
    { companyId: mongoose.Types.ObjectId.createFromHexString(companyId),
       GoalIdentifire: goalId },
    { _id: 1 } // only fetch _id
  );
  return products.map((p) => p._id);
};

// ─────────────────────────────────────────────────────────────────
// GET — fetch config for company + goal
// ─────────────────────────────────────────────────────────────────
router.get("/getExtraFieldConfigs", async (req, res) => {
  try {
    const { newEmployeeId, newCompanyId } = getAuthIds(req);
    if (!newEmployeeId || !newCompanyId)
      return res.status(401).json({ message: "Login/Register please!" });

    const { configId, productId, goalId } = req.query;

    if (!configId || !productId || !goalId)
      return res.status(400).json({ message: "configId, productId and goalId are required" });

    // ── 1. Get field definition from ExtraFieldConfig ─────────────
    const config = await ExtraFieldConfig.findOne(
      {
        companyId: mongoose.Types.ObjectId.createFromHexString(newCompanyId),
        GoalId:    mongoose.Types.ObjectId.createFromHexString(goalId),
        "EachProductFields._id": mongoose.Types.ObjectId.createFromHexString(configId), // 👈 correct subdoc query
      },
      {
        "EachProductFields.$": 1, // 👈 return ONLY the matching subdoc
      }
    );

    if (!config || !config.EachProductFields?.length)
      return res.status(404).json({ message: "Field config not found" });

    const fieldDef = config.EachProductFields[0]; // matched subdoc

    // ── 2. Get today's value from ProductsCost ────────────────────
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const productCost = await ProductsCost.findOne(
      {
        companyId: mongoose.Types.ObjectId.createFromHexString(newCompanyId),
        ProductId: mongoose.Types.ObjectId.createFromHexString(productId),
        createdAt: { $gte: todayStart, $lte: todayEnd },
        "extraFields.configId": mongoose.Types.ObjectId.createFromHexString(configId),
      },
      {
        "extraFields.$": 1, // 👈 return ONLY the matching extraField entry
      }
    );

    // Value defaults to 0 if no ProductsCost doc found
    const todayValue = productCost?.extraFields?.[0]?.value ?? 0;

    // ── 3. Return combined data ───────────────────────────────────
    return res.status(200).json({
      message: "ok",
      data: {
        configId:      fieldDef._id,
        fieldName:     fieldDef.fieldName,
        calculateWith: fieldDef.calculateWith,
        todayValue,                             // value from ProductsCost
      },
    });

  } catch (error) {
    console.error("getExtraFieldConfigs error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
// ─────────────────────────────────────────────────────────────────
// POST — add new field to EachProductFields
// + push configId to ALL products' ProductsCost docs in this goal
// ─────────────────────────────────────────────────────────────────
router.post("/createExtraFieldConfig", async (req, res) => {
  try {
    const { newEmployeeId, newCompanyId } = getAuthIds(req);
    if (!newEmployeeId || !newCompanyId)
    return res.status(401).json({ message: "Login/Register please!" });
    const { fieldName, calculateWith, goalId, value } = req.body;
    // ── Validate ──────────────────────────────────────────────────
    if (!fieldName?.trim())
      return res.status(400).json({ message: "fieldName is required" });
    if (!goalId)
      return res.status(400).json({ message: "goalId is required" });
    if (calculateWith?.length) {
      const invalid = calculateWith.some((c) => !c.name || !c.calcType);
      if (invalid)
        return res.status(400).json({ message: "Each calculateWith must have name and calcType" });
    }

    // ── Step 1: Find or create config doc for this goal ───────────
    let config = await ExtraFieldConfig.findOne({
      companyId: newCompanyId,
      GoalId:    goalId,
    });

    if (!config) {
      config = await ExtraFieldConfig.create({
        companyId:         newCompanyId,
        GoalId:            goalId,
        EachProductFields: [],
      });
    }

    // ── Check duplicate fieldName ─────────────────────────────────
    const isDuplicate = config.EachProductFields.some(
      (f) => f.fieldName.toLowerCase() === fieldName.trim().toLowerCase()
    );
    if (isDuplicate)
      return res.status(400).json({ message: `"${fieldName}" already exists for this goal` });

    // ── Step 2: Push new field to EachProductFields ───────────────
    config.EachProductFields.push({
      fieldName:     fieldName.trim(),
      calculateWith: calculateWith || [],
    });
    await config.save();

    const addedField = config.EachProductFields[config.EachProductFields.length - 1];

    // ── Step 3: Push to ALL products' ProductsCost in this goal ───
    // 👇 Get all productIds for this goal
    const productIds = await getGoalProductIds(newCompanyId, goalId);

    if (productIds.length) {
      await ProductsCost.updateMany(
        {
          companyId: newCompanyId,
          ProductId: { $in: productIds }, // 👈 all products in goal
        },
        {
          $push: {
            extraFields: {
              configId: addedField._id, // subdoc _id
              value:    Number(value) || 0,
            },
          },
        }
      );
    }

    return res.status(201).json({
      message: `Field "${fieldName}" created for all ${productIds.length} products in this goal`,
      data:    addedField,
    });

  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ message: "Config already exists for this goal" });
    console.error("createExtraFieldConfig error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT — update a specific field inside EachProductFields
// ProductsCost auto-reflects (only stores configId + value)
// ─────────────────────────────────────────────────────────────────
router.put("/updateExtraFieldConfig/:fieldId", async (req, res) => {
  try {
    const { newEmployeeId, newCompanyId } = getAuthIds(req);
    if (!newEmployeeId || !newCompanyId)
      return res.status(401).json({ message: "Login/Register please!" });

    const { fieldId }    = req.params;
    const { fieldName, calculateWith, goalId, productId, fieldValue } = req.body;

    if (!goalId)
      return res.status(400).json({ message: "goalId is required" });

    // ── 1. Find config doc ────────────────────────────────────────
    const config = await ExtraFieldConfig.findOne({
      companyId:               mongoose.Types.ObjectId.createFromHexString(newCompanyId),
      GoalId:                  mongoose.Types.ObjectId.createFromHexString(goalId),
      "EachProductFields._id": mongoose.Types.ObjectId.createFromHexString(fieldId),
    });

    if (!config)
      return res.status(404).json({ message: "Field not found or unauthorized" });

    // ── 2. Check duplicate fieldName (excluding current field) ────
    if (fieldName) {
      const isDuplicate = config.EachProductFields.some(
        (f) =>
          f.fieldName.toLowerCase() === fieldName.trim().toLowerCase() &&
          f._id.toString() !== fieldId
      );
      if (isDuplicate)
        return res.status(400).json({ message: `"${fieldName}" already exists` });
    }

    // ── 3. Update ExtraFieldConfig subdoc ─────────────────────────
    const updateFields = {};
    if (fieldName)                        updateFields["EachProductFields.$.fieldName"]     = fieldName.trim();
    if (calculateWith !== undefined)      updateFields["EachProductFields.$.calculateWith"] = calculateWith;

    const updated = await ExtraFieldConfig.findOneAndUpdate(
      {
        companyId:               mongoose.Types.ObjectId.createFromHexString(newCompanyId),
        GoalId:                  mongoose.Types.ObjectId.createFromHexString(goalId),
        "EachProductFields._id": mongoose.Types.ObjectId.createFromHexString(fieldId),
      },
      { $set: updateFields },
      { new: true }
    );

    const updatedField = updated.EachProductFields.find(
      (f) => f._id.toString() === fieldId
    );

    // ── 4. Update ProductsCost today's value (if provided) ────────
    let updatedValue = null;

    if (productId && fieldValue !== undefined) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setUTCHours(23, 59, 59, 999);

      const costDoc = await ProductsCost.findOneAndUpdate(
        {
          companyId:              mongoose.Types.ObjectId.createFromHexString(newCompanyId),
          ProductId:              mongoose.Types.ObjectId.createFromHexString(productId),
          createdAt:              { $gte: todayStart, $lte: todayEnd },
          "extraFields.configId": mongoose.Types.ObjectId.createFromHexString(fieldId),
        },
        {
          $set: { "extraFields.$.value": Number(fieldValue) },
        },
        { new: true }
      );

      updatedValue = costDoc?.extraFields?.find(
        (ef) => ef.configId.toString() === fieldId
      )?.value ?? null;
    }
    const { _id, ...rest } = updatedField.toObject();
    return res.status(200).json({
      message: "Field updated",
      data: {
        ...rest,
        configId: _id,
        todayValue: updatedValue
      },
    });

  } catch (error) {
    console.error("updateExtraFieldConfig error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
// ─────────────────────────────────────────────────────────────────
// DELETE — remove field from EachProductFields
// + pull from ALL products' ProductsCost in this goal
// ─────────────────────────────────────────────────────────────────
router.delete("/deleteExtraFieldConfig/:fieldId", async (req, res) => {
  try {
    const { newEmployeeId, newCompanyId } = getAuthIds(req);
    if (!newEmployeeId || !newCompanyId)
      return res.status(401).json({ message: "Login/Register please!" });

    const { fieldId } = req.params;
    const { goalId }  = req.body;

    if (!goalId)
      return res.status(400).json({ message: "goalId is required" });

    // ── Remove field from EachProductFields ───────────────────────
    const updated = await ExtraFieldConfig.findOneAndUpdate(
      {
        companyId:               mongoose.Types.ObjectId.createFromHexString(newCompanyId), // ✅
        GoalId:                  mongoose.Types.ObjectId.createFromHexString(goalId),       // ✅
        "EachProductFields._id": mongoose.Types.ObjectId.createFromHexString(fieldId),     // ✅
      },
      {
        $pull: {
          EachProductFields: {
            _id: mongoose.Types.ObjectId.createFromHexString(fieldId), // ✅
          },
        },
      },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Field not found or unauthorized" });

    // ── Pull from ALL products' ProductsCost in this goal ─────────
    const productIds = await getGoalProductIds(newCompanyId, goalId);

    if (productIds.length) {
      await ProductsCost.updateMany(
        {
          companyId: mongoose.Types.ObjectId.createFromHexString(newCompanyId), // ✅
          ProductId: { $in: productIds },
        },
        {
          $pull: {
            extraFields: {
              configId: mongoose.Types.ObjectId.createFromHexString(fieldId), // ✅
            },
          },
        }
      );
    }

    return res.status(200).json({
      message:       `Field deleted from all ${productIds.length} products`,
      deletedFieldId: fieldId,
    });

  } catch (error) {
    console.error("deleteExtraFieldConfig error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;