import express from 'express';
import mongoose from "mongoose";
const router = express.Router();
import MyTargetGoles from '../models/MyTarget.js';
import { decryptUserData } from '../verifyuser.js';
import ClientProduct from '../models/ClientProduct.js';
import ProductsCost from '../models/ProductCost.js';
import { parse, isValid, differenceInDays } from "date-fns";
import ExtraFieldConfig     from "../models/ExtraFieldConfig.js";
import { limitFor } from "../config/plans.js";
import Companies from '../models/Companies.js'

const parseGoalDate = (raw) => {
  if (!raw) return null;
 
  // Try app's stored format first: "dd/MM/yyyy"
  const ddmm = parse(raw, "dd/MM/yyyy", new Date());
  if (isValid(ddmm)) return ddmm;
 
  // Fallback: ISO / other formats
  const iso = new Date(raw);
  if (isValid(iso)) return iso;
 
  return null;
};
 
// ── Helper: generate N evenly-spaced flat points ────────────────
const flatLine = (startMs, endMs, count = 12) => {
  if (startMs >= endMs) {
    return [
      { x: startMs, y: 0 },
      { x: startMs + 86_400_000, y: 0 },
    ];
  }
  const step = (endMs - startMs) / (count - 1);
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(startMs + i * step),
    y: 0,
  }));
};
 
const ensureRenderable = (points, startMs, endMs) => {
  const valid = points.filter(
    (p) => p.x != null && !isNaN(p.x) && p.y != null
  );
 
  if (valid.length === 0) return flatLine(startMs, endMs);
 
  if (valid.length === 1) {
    return [
      { x: startMs,          y: 0          },
      { x: valid[0].x,       y: valid[0].y },
      { x: endMs,            y: valid[0].y },
    ];
  }
   const firstX = valid[0].x;
  if (firstX > startMs + 86_400_000 /* >1 day gap */) {
    return [{ x: startMs, y: 0 }, ...valid];
  }
 
  return valid;
};


const getAuth = (req) => {
  try {
    const { employeeId, companyId } = req.cookies;
    if (!employeeId || !companyId) return null;
 
    const newEmployeeId = decryptUserData(employeeId);
    const newCompanyId  = decryptUserData(companyId);
 
    if (!newEmployeeId || !newCompanyId)                  return null;
    if (!mongoose.Types.ObjectId.isValid(newEmployeeId))  return null;
    if (!mongoose.Types.ObjectId.isValid(newCompanyId))   return null;
 
    return {
      employeeId:   newEmployeeId,
      companyId:    newCompanyId,
      companyObjId: mongoose.Types.ObjectId.createFromHexString(newCompanyId),
    };
  } catch {
    return null;
  }
};
  
// ── Number: positive finite check ───────────────────────────────
const isPositiveNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
};
 
// ── Update whitelist: the ONLY fields a client may modify ───────
// Blocks $set:req.body attacks (companyId hijack, injected fields).
const ALLOWED_UPDATE_FIELDS = [
  "targetName",
  "targetStartDate",
  "targetEndDate",
  "targetAmount",
];
 
/* ═══════════════════════════════════════════════════════════════
   CREATE — POST /addNewGoles  (alias: POST /createGoal)
   Old bug: never set companyId — since your schema now has
   companyId required:true, every create was FAILING validation.
═══════════════════════════════════════════════════════════════ */
const createGoalHandler = async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth)
      return res.status(401).json({ message: "Login/Register please!" });

    const billing = await Companies.findById(auth.companyObjId).select("planId subscriptionStatus trialEndsAt").lean();
    const max = limitFor(billing, "products");
    if (max !== Infinity) {
      const n = await ClientProduct.countDocuments({ companyId: auth.companyObjId });
      if (n >= max) return res.status(403).json({ message: `Your plan allows up to ${max} Goal. Upgrade to add more.` });
    }

    const { targetName, targetStartDate, targetEndDate, targetAmount } = req.body;
 
    // ── Field validation ────────────────────────────────────────
    if (typeof targetName !== "string" || !targetName.trim())
      return res.status(400).json({ message: "Goal name is required" });
 
    const startDate = parseGoalDate(targetStartDate);
    if (!startDate)
      return res.status(400).json({ message: "Start date must be a valid dd/MM/yyyy date" });
 
    const endDate = parseGoalDate(targetEndDate);
    if (!endDate)
      return res.status(400).json({ message: "End date must be a valid dd/MM/yyyy date" });
 
    if (startDate > endDate)
      return res.status(400).json({ message: "Start date must be on or before end date" });
 
    if (!isPositiveNumber(targetAmount))
      return res.status(400).json({ message: "Target amount must be a number greater than zero" });
 
    // ── Create with tenant ownership ────────────────────────────
    const newGoal = new MyTargetGoles({
      targetName:      targetName.trim(),
      targetStartDate: targetStartDate.trim(),
      targetEndDate:   targetEndDate.trim(),
      targetAmount:    Number(targetAmount),
      companyId:       auth.companyObjId,        // 👈 the missing piece
    });
 
    await newGoal.save();
 
    // data._id is required by the onboarding wizard (Step 2 → 3)
    return res.status(200).json({
      message: "Goal created successfully",
      data:    newGoal,
    });
 
  } catch (error) {
    console.error("❌ createGoal error:", error.message);
    return res.status(500).json({ message: "Failed to create goal" });
  }
};
 
router.post("/addNewGoles", createGoalHandler);
 
/* ═══════════════════════════════════════════════════════════════
   READ ALL — GET /getGoleData
   Old bug: find({}) returned EVERY company's goals — the single
   worst leak in the file. Now scoped to the caller's company.
   ⚠️ Response stays a RAW ARRAY — View.js does setAllDatas(res.data)
═══════════════════════════════════════════════════════════════ */
router.get("/getGoleData", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth)
      return res.status(401).json({ message: "Login/Register please!" });
 
    const goals = await MyTargetGoles
      .find({ companyId: auth.companyObjId })   // 👈 tenant isolation
      .sort({ createdAt: -1 });                 // newest first
 
    // Empty list is a valid state (pre-onboarding), not an error
    return res.status(200).json(goals);
 
  } catch (error) {
    console.error("❌ getGoleData error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve goals" });
  }
});
 
/* ═══════════════════════════════════════════════════════════════
   READ ONE — GET /getOneGoal/:goalId
   Old bug: findById with no company check — any logged-out visitor
   could read any company's goal by guessing/leaking an id.
   ⚠️ Response stays the RAW GOAL OBJECT for frontend compatibility.
═══════════════════════════════════════════════════════════════ */
router.get("/getOneGoal/:goalId", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth)
      return res.status(401).json({ message: "Login/Register please!" });
 
    const { goalId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(goalId))
      return res.status(400).json({ message: "Invalid goal id" });
 
    const goal = await MyTargetGoles.findOne({
      _id:       mongoose.Types.ObjectId.createFromHexString(goalId),
      companyId: auth.companyObjId,             // 👈 tenant isolation
    });
 
    if (!goal)
      return res.status(404).json({ message: "Goal not found" });
 
    return res.status(200).json(goal);
 
  } catch (error) {
    console.error("❌ getOneGoal error:", error.message);
    return res.status(500).json({ message: "Failed to retrieve goal" });
  }
});
 
/* ═══════════════════════════════════════════════════════════════
   UPDATE — PUT /updateGoles/:goalId
   Old bugs: $set:req.body (client could overwrite companyId or
   inject any field) · upsert:true (typo'd id silently created a
   ghost goal) · no ownership check.
═══════════════════════════════════════════════════════════════ */
router.put("/updateGoles/:goalId", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth)
      return res.status(401).json({ message: "Login/Register please!" });
 
    const { goalId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(goalId))
      return res.status(400).json({ message: "Invalid goal id" });
 
    const goalObjId = mongoose.Types.ObjectId.createFromHexString(goalId);
 
    // ── Fetch existing (also proves ownership) ──────────────────
    const existing = await MyTargetGoles.findOne({
      _id:       goalObjId,
      companyId: auth.companyObjId,
    });
 
    if (!existing)
      return res.status(404).json({ message: "Goal not found" });
 
    // ── Whitelist: keep only allowed fields from req.body ───────
    const updates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
 
    if (!Object.keys(updates).length)
      return res.status(400).json({ message: "No valid fields to update" });
 
    // ── Validate each provided field ────────────────────────────
    if (updates.targetName !== undefined) {
      if (typeof updates.targetName !== "string" || !updates.targetName.trim())
        return res.status(400).json({ message: "Goal name cannot be empty" });
      updates.targetName = updates.targetName.trim();
    }
 
    if (updates.targetAmount !== undefined) {
      if (!isPositiveNumber(updates.targetAmount))
        return res.status(400).json({ message: "Target amount must be a number greater than zero" });
      updates.targetAmount = Number(updates.targetAmount);
    }
 
    if (updates.targetStartDate !== undefined && !parseGoalDate(updates.targetStartDate))
      return res.status(400).json({ message: "Start date must be a valid dd/MM/yyyy date" });
 
    if (updates.targetEndDate !== undefined && !parseGoalDate(updates.targetEndDate))
      return res.status(400).json({ message: "End date must be a valid dd/MM/yyyy date" });
 
    // ── Cross-check date order against the MERGED result ────────
    // (e.g. user updates only endDate → compare with existing start)
    const mergedStart = parseGoalDate(updates.targetStartDate ?? existing.targetStartDate);
    const mergedEnd   = parseGoalDate(updates.targetEndDate   ?? existing.targetEndDate);
    if (mergedStart && mergedEnd && mergedStart > mergedEnd)
      return res.status(400).json({ message: "Start date must be on or before end date" });
 
    // ── Apply — filter includes companyId, NO upsert ─────────────
    const updatedGoal = await MyTargetGoles.findOneAndUpdate(
      { _id: goalObjId, companyId: auth.companyObjId },
      { $set: updates },
      { new: true, runValidators: true }
    );
 
    // ⚠️ Same response shape as before: { data, message }
    return res.status(200).json({
      data:    updatedGoal,
      message: "Goal updated successfully!",
    });
 
  } catch (error) {
    console.error("❌ updateGoles error:", error.message);
    return res.status(500).json({ message: "Failed to update goal" });
  }
});
 
/* ═══════════════════════════════════════════════════════════════
   DELETE — DELETE /deleteGoal/:deleteId
   Old bug: findByIdAndDelete with no ownership check — any company
   could delete another company's goals.
   New: cascade cleanup so no orphaned references remain.
═══════════════════════════════════════════════════════════════ */
router.delete("/deleteGoal/:deleteId", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth)
      return res.status(401).json({ message: "Login/Register please!" });
 
    const { deleteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deleteId))
      return res.status(400).json({ message: "Invalid goal id" });
 
    const goalObjId = mongoose.Types.ObjectId.createFromHexString(deleteId);
 
    // ── Delete with tenant isolation ────────────────────────────
    const deletedGoal = await MyTargetGoles.findOneAndDelete({
      _id:       goalObjId,
      companyId: auth.companyObjId,
    });
 
    if (!deletedGoal)
      return res.status(404).json({ message: "Goal not found" });
 
    // ── Cascade cleanup ─────────────────────────────────────────
    // 1) Pull this goalId string out of every product's
    //    GoalIdentifire array (products can live in other goals,
    //    so we never delete the products themselves).
    await ClientProduct.updateMany(
      { companyId: auth.companyObjId, GoalIdentifire: deleteId },
      { $pull: { GoalIdentifire: deleteId } }
    );
 
    // 2) Remove this goal's extra-field configuration doc.
    await ExtraFieldConfig.deleteOne({
      companyId: auth.companyObjId,
      GoalId:    goalObjId,
    });
 
    // NOTE: ProductsCost records are per product+date and shared
    // across goals — intentionally NOT deleted here.
 
    return res.status(200).json({
      message: "Goal deleted successfully",
      data:    deletedGoal,
    });
 
  } catch (error) {
    console.error("❌ deleteGoal error:", error.message);
    return res.status(500).json({ message: "Failed to delete goal" });
  }
});

router.get("/goalSparklineData", async (req, res) => {
  try {
    const { employeeId, companyId } = req.cookies;
    const newemplyeeId = decryptUserData(employeeId);
    const newcompanyId = decryptUserData(companyId);
 
    if (!newemplyeeId || !newcompanyId)
      return res.status(401).json({ message: "Login/Register please!" });
 
    if (!mongoose.Types.ObjectId.isValid(newcompanyId))
      return res.status(400).json({ message: "Invalid companyId" });
 
    const companyObjId = mongoose.Types.ObjectId.createFromHexString(newcompanyId);
 
    // ── 1. Fetch all goals for this company ──────────────────────
    const goals = await MyTargetGoles.find({ companyId: newcompanyId });
 
    if (!goals.length)
      return res.status(200).json({ message: "ok", data: [] });
 
    // ── 2. Process each goal in parallel ────────────────────────
    const sparklineData = await Promise.all(
      goals.map(async (goal) => {
 
        // ── Parse goal dates ─────────────────────────────────────
        const goalStart = parseGoalDate(goal.targetStartDate);
        const goalEnd   = parseGoalDate(goal.targetEndDate);
 
        // Invalid dates → return error state
        if (!goalStart || !goalEnd || !isValid(goalStart) || !isValid(goalEnd)) {
          console.warn(`⚠️  Invalid dates for "${goal.targetName}":`, {
            start: goal.targetStartDate,
            end:   goal.targetEndDate,
          });
          return {
            goalId:          goal._id,
            goalName:        goal.targetName,
            targetAmount:    goal.targetAmount || 0,
            points:          flatLine(Date.now() - 86_400_000 * 7, Date.now()),
            totalRevenue:    0,
            expectedRevenue: 0,
            achievementPct:  0,
            isOnTrack:       false,
            isPending:       false,
            color:           "#ef4444",
            error:           "Invalid date format",
          };
        }
 
        goalStart.setUTCHours(0, 0, 0, 0);
        goalEnd.setUTCHours(23, 59, 59, 999);
 
        const today     = new Date();
        const startMs   = goalStart.getTime();
        const endMs     = goalEnd.getTime();
 
        // ── Goal not started yet → pending ───────────────────────
        if (today < goalStart) {
          return {
            goalId:          goal._id,
            goalName:        goal.targetName,
            targetAmount:    goal.targetAmount || 0,
            points:          flatLine(startMs, endMs),
            totalRevenue:    0,
            expectedRevenue: 0,
            achievementPct:  0,
            isOnTrack:       true,
            isPending:       true,
            color:           "#f59e0b", // amber
          };
        }
 
        // rangeEnd = today or goalEnd whichever is earlier
        const rangeEnd = new Date(Math.min(today.getTime(), goalEnd.getTime()));
        rangeEnd.setUTCHours(23, 59, 59, 999);
        const rangeEndMs = rangeEnd.getTime();
 
        // ── Calculate time metrics ────────────────────────────────
        const totalDays   = Math.max(differenceInDays(goalEnd, goalStart) + 1, 1);
        const elapsedDays = Math.max(differenceInDays(rangeEnd, goalStart) + 1, 1);
        const dailyTarget = (goal.targetAmount || 0) / totalDays;
        const expectedRevenue = Math.round(dailyTarget * elapsedDays);
 
        // ── Find products in this goal ────────────────────────────
        const goalIdStr  = goal._id.toString();
        const goalProducts = await ClientProduct.find(
          {
            companyId:      newcompanyId,
            GoalIdentifire: goalIdStr,
          },
          { _id: 1, ProductPrice: 1 }
        );
 
        // No products → flat line, 0% behind
        if (!goalProducts.length) {
          return {
            goalId:          goal._id,
            goalName:        goal.targetName,
            targetAmount:    goal.targetAmount || 0,
            points:          flatLine(startMs, rangeEndMs),
            totalRevenue:    0,
            expectedRevenue,
            achievementPct:  0,
            isOnTrack:       false,
            isPending:       false,
            color:           "#ef4444",
          };
        }
 
        const productIds = goalProducts.map((p) =>
          mongoose.Types.ObjectId.createFromHexString(p._id.toString())
        );
 
        // ── Aggregate daily revenue ───────────────────────────────
        const rawPoints = await ProductsCost.aggregate([
          {
            $match: {
              companyId: companyObjId,
              ProductId: { $in: productIds },
              createdAt: { $gte: goalStart, $lte: rangeEnd },
            },
          },
          {
            $lookup: {
              from:         "ClientProduct",
              localField:   "ProductId",
              foreignField: "_id",
              as:           "product",
            },
          },
          {
            $unwind: {
              path:                       "$product",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              dayRevenue: {
                $multiply: [
                  { $ifNull: ["$SoldQuentity",        0] },
                  { $ifNull: ["$product.ProductPrice", 0] },
                ],
              },
            },
          },
          {
            $group: {
              _id:     {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              revenue: { $sum: "$dayRevenue" },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              x: {
                $toLong: {
                  $dateFromString: {
                    dateString: "$_id",
                    format:     "%Y-%m-%d", // explicit format
                    onError:    null,        // null on failure, not crash
                    onNull:     null,
                  },
                },
              },
              y: { $round: ["$revenue", 0] },
            },
          },
          // Drop any docs where x conversion failed
          { $match: { x: { $ne: null } } },
        ]);
 
        // ── Ensure chart can render ───────────────────────────────
        const points       = ensureRenderable(rawPoints, startMs, rangeEndMs);
        const totalRevenue = rawPoints.reduce((s, p) => s + (p.y || 0), 0);
        const isOnTrack    = totalRevenue >= expectedRevenue;
        const achievementPct = goal.targetAmount > 0
          ? Math.min(Math.round((totalRevenue / goal.targetAmount) * 100), 999)
          : 0;
 
        return {
          goalId:          goal._id,
          goalName:        goal.targetName,
          targetAmount:    goal.targetAmount || 0,
          points,                                         // ≥ 2 points guaranteed
          totalRevenue:    Math.round(totalRevenue),
          expectedRevenue,
          achievementPct,
          isOnTrack,
          isPending:       false,
          color:           isOnTrack ? "#22c55e" : "#ef4444",
        };
      })
    );
 
    return res.status(200).json({ message: "ok", data: sparklineData });
 
  } catch (err) {
    console.error("❌ goalSparklineData:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

export default router;