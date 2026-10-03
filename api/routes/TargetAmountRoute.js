// import express from "express";
// import mongoose from "mongoose";
// import TargetAmountSet from "../models/TargetAmountSet.js";
// import MyTargetGoles from "../models/MyTarget.js";
// import { decryptUserData } from "../verifyuser.js";

// const router = express.Router();

// // ─────────────────────────────────────────────
// // Helper: parse & validate cookie credentials
// // ─────────────────────────────────────────────
// function resolveCredentials(cookies) {
//   const employeeId = decryptUserData(cookies.employeeId);
//   const companyId = decryptUserData(cookies.companyId);
//   return { employeeId, companyId };
// }

// // ─────────────────────────────────────────────
// // Helper: parse & deduplicate ProductId param
// // ─────────────────────────────────────────────
// function parseProductIds(raw) {
//   const arr = Array.isArray(raw) ? raw : String(raw).split(",");
//   return [...new Set(arr.filter((id) => mongoose.Types.ObjectId.isValid(id)))];
// }

// /**
//  * GET /productTargetAmount
//  *
//  * Logic:
//  *  1. Fetch existing TargetAmountSet docs for the given ProductIds.
//  *  2. Split them into locked (isLock=true) and unlocked (isLock=false).
//  *  3. Find ProductIds that have NO doc yet (missing).
//  *  4. Distributable pool = goalTarget - sum(locked amounts).
//  *  5. Recipients = all unlocked existing docs + all missing ProductIds.
//  *  6. Each recipient gets: pool / recipients.length
//  *  7. Unlocked existing docs are updated in-place; missing ones are inserted.
//  *  8. Locked docs are never touched.
//  */
// router.get("/productTargetAmount", async (req, res) => {
//   try {
//     const { employeeId: newEmployeeId, companyId: newCompanyId } =
//       resolveCredentials(req.cookies);

//     if (!newEmployeeId || !newCompanyId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const { GoalId, ProductId } = req.query;

//     if (!GoalId || !mongoose.Types.ObjectId.isValid(GoalId)) {
//       return res.status(400).json({ message: "Invalid GoalId" });
//     }
//     if (!ProductId) {
//       return res.status(400).json({ message: "ProductId required" });
//     }

//     const validProductIds = parseProductIds(ProductId);
//     if (validProductIds.length === 0) {
//       return res.status(400).json({ message: "No valid ProductIds provided" });
//     }

//     // 1. Fetch all existing docs for these products under this goal
//     const existingDocs = await TargetAmountSet.find({
//       companyId: newCompanyId,
//       GoalId,
//       ProductId: { $in: validProductIds },
//     }).lean();

//     // 2. Separate locked vs unlocked, build lookup set
//     let lockedSum = 0;
//     const existingSet = new Set();
//     const unlockedExistingIds = [];

//     for (const doc of existingDocs) {
//       const pid = doc.ProductId.toString();
//       existingSet.add(pid);
//       if (doc.isLock) {
//         lockedSum += Number(doc.TargetAmount || 0);
//       } else {
//         unlockedExistingIds.push(doc.ProductId);
//       }
//     }

//     // 3. ProductIds that don't have a doc yet
//     const missingProductIds = validProductIds.filter(
//       (id) => !existingSet.has(id)
//     );

//     // 4. Fetch goal's total target
//     const goalDoc = await MyTargetGoles.findById(GoalId)
//       .select("targetAmount")
//       .lean();

//     if (!goalDoc) {
//       return res.status(404).json({ message: "Goal not found" });
//     }

//     // 5. Calculate the equal share for every non-locked slot
//     const totalRecipients = unlockedExistingIds.length + missingProductIds.length;
//     const pool = Math.max(Number(goalDoc.targetAmount || 0) - lockedSum, 0);
//     const perProductAmount = totalRecipients > 0 ? pool / totalRecipients : 0;

//     // 6. Update existing unlocked docs
//     if (unlockedExistingIds.length > 0) {
//       await TargetAmountSet.updateMany(
//         {
//           companyId: newCompanyId,
//           GoalId,
//           ProductId: { $in: unlockedExistingIds },
//           isLock: { $ne: true }, // safety guard
//         },
//         { $set: { TargetAmount: perProductAmount } }
//       );
//     }

//     // 7. Insert missing docs
//     let createdDocs = [];
//     if (missingProductIds.length > 0) {
//       const newDocs = missingProductIds.map((id) => ({
//         companyId: newCompanyId,
//         GoalId,
//         ProductId: id,
//         TargetAmount: perProductAmount,
//       }));
//       createdDocs = await TargetAmountSet.insertMany(newDocs);
//     }

//     // 8. Re-fetch all docs so the response reflects the latest state
//     const allDocs = await TargetAmountSet.find({
//       companyId: newCompanyId,
//       GoalId,
//       ProductId: { $in: validProductIds },
//     }).lean();

//     return res.status(200).json({
//       message: "success",
//       totalExisting: existingDocs.length,
//       totalCreated: createdDocs.length,
//       perProductAmount,
//       data: allDocs,
//     });
//   } catch (error) {
//     console.error("[GET /productTargetAmount]", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// });

// /**
//  * PUT /productTargetUpdate
//  *
//  * Logic:
//  *  1. Fetch existing TargetAmountSet docs for the given ProductIds.
//  *  2. Compute lockedSum from docs where isLock=true.
//  *  3. The target product gets NewTargetAmount.
//  *  4. Distributable pool = totalTarget - lockedSum - NewTargetAmount.
//  *  5. All other UNLOCKED docs (excluding targetProductId) share the pool equally.
//  *  6. Locked docs are never touched.
//  */
// router.put("/productTargetUpdate", async (req, res) => {
//   try {
//     const { employeeId: newEmployeeId, companyId: newCompanyId } =
//       resolveCredentials(req.cookies);

//     if (!newEmployeeId || !newCompanyId) {
//       return res.status(401).json({ message: "Login/Register please!" });
//     }

//     const { GoalId, ProductId } = req.query;
//     const { NewTargetAmount, totalTarget, targetProductId } = req.body;

//     if (!GoalId || !mongoose.Types.ObjectId.isValid(GoalId)) {
//       return res.status(400).json({ message: "Invalid GoalId" });
//     }
//     if (!ProductId) {
//       return res.status(400).json({ message: "ProductId required" });
//     }
//     if (NewTargetAmount === undefined || NewTargetAmount === null) {
//       return res.status(400).json({ message: "NewTargetAmount required" });
//     }
//     if (!totalTarget) {
//       return res.status(400).json({ message: "totalTarget required" });
//     }
//     if (!targetProductId) {
//       return res.status(400).json({ message: "targetProductId required" });
//     }

//     const validProductIds = parseProductIds(ProductId);
//     if (validProductIds.length === 0) {
//       return res.status(400).json({ message: "No valid ProductIds provided" });
//     }

//     // 1. Fetch existing docs
//     const existingDocs = await TargetAmountSet.find({
//       companyId: newCompanyId,
//       GoalId,
//       ProductId: { $in: validProductIds },
//     }).lean();

//     if (existingDocs.length === 0) {
//       return res.status(404).json({ message: "No matching product docs found" });
//     }

//     // 2. Compute lockedSum BEFORE using it in any formula
//     let lockedSum = 0;
//     for (const doc of existingDocs) {
//       if (doc.isLock) {
//         lockedSum += Number(doc.TargetAmount || 0);
//       }
//     }

//     // 3. Other unlocked docs that are NOT the target product
//     const redistributeTargets = existingDocs.filter(
//       (doc) =>
//         doc.isLock !== true &&
//         doc.ProductId.toString() !== targetProductId.toString()
//     );

//     // 4. Pool for redistribution
//     const newAmount = Number(NewTargetAmount);
//     const pool = Math.max(Number(totalTarget) - lockedSum - newAmount, 0);
//     const perProductAmount =
//       redistributeTargets.length > 0 ? pool / redistributeTargets.length : 0;

//     // 5. BulkWrite: redistribute unlocked peers + set target product's new value
//     const bulkOps = [];

//     if (redistributeTargets.length > 0) {
//       bulkOps.push({
//         updateMany: {
//           filter: {
//             companyId: newCompanyId,
//             GoalId,
//             ProductId: {
//               $in: redistributeTargets.map((doc) => doc.ProductId),
//             },
//             isLock: { $ne: true }, // safety guard
//           },
//           update: { $set: { TargetAmount: perProductAmount } },
//         },
//       });
//     }

//     bulkOps.push({
//       updateOne: {
//         filter: {
//           companyId: newCompanyId,
//           GoalId,
//           ProductId: targetProductId,
//         },
//         update: { $set: { TargetAmount: newAmount } },
//       },
//     });

//      await TargetAmountSet.bulkWrite(bulkOps);
//     const updatedDocs = await TargetAmountSet.find({
//       companyId: newCompanyId,
//       GoalId,
//       ProductId: { $in: validProductIds },
//     }).lean();

//     return res.status(200).json({
//       message: "success",
//       data: updatedDocs,
//     });
//   } catch (error) {
//     console.error("[PUT /productTargetUpdate]", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// });

// /**
//  * 3️⃣ UPDATE isLock FIELD
//  */
// router.patch("/ProductTargetIslock", async (req, res) => {
//   try {
//     const { employeeId, companyId } = req.cookies;
//     const { GoalId, ProductId } = req.query;
//     const newemplyeeId = decryptUserData(employeeId);
//     const newcompanyId = decryptUserData(companyId);
//     const { isLock } = req.body;

//     if (!newemplyeeId || !newcompanyId) {
//         return res.status(400).json({ message: "Login/Register please!" });
//     }
//     if (!GoalId || !mongoose.Types.ObjectId.isValid(GoalId)) {
//       return res.status(400).json({ message: "Invalid GoalId" });
//     }

//     if (!ProductId) {
//       return res.status(400).json({ message: "ProductId required" });
//     }

//     if (typeof isLock !== "boolean") {
//       return res.status(400).json({ message: "isLock must be boolean" });
//     }

//     const updatedDoc = await TargetAmountSet.findOneAndUpdate(
//       {
//         companyId: newcompanyId,
//         GoalId,
//         ProductId,
//       },
//       { $set: { isLock } },
//       { new: true }
//     );

//     if (!updatedDoc) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     return res.status(200).json({
//       message:'success',
//       data: updatedDoc,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// export default router;
import express from "express";
import mongoose from "mongoose";
import TargetAmountSet from "../models/TargetAmountSet.js";
import MyTargetGoles from "../models/MyTarget.js";

// unified auth/permission system (utils/auth.js)
// getRequester → validated { requester, requesterId, companyId, role, tier, can() }
import { getRequester } from "../utils/auth.js";

const router = express.Router();

// ─────────────────────────────────────────────
// Helper: parse & deduplicate ProductId param
// ─────────────────────────────────────────────
function parseProductIds(raw) {
  const arr = Array.isArray(raw) ? raw : String(raw).split(",");
  return [...new Set(arr.filter((id) => mongoose.Types.ObjectId.isValid(id)))];
}

/**
 * GET /productTargetAmount
 *
 * NOTE: although this is a GET, it WRITES (creates/updates target
 * allocations as a side effect), so it requires manageProducts.
 *
 * Logic:
 *  1. Fetch existing TargetAmountSet docs for the given ProductIds.
 *  2. Split them into locked (isLock=true) and unlocked (isLock=false).
 *  3. Find ProductIds that have NO doc yet (missing).
 *  4. Distributable pool = goalTarget - sum(locked amounts).
 *  5. Recipients = all unlocked existing docs + all missing ProductIds.
 *  6. Each recipient gets: pool / recipients.length
 *  7. Unlocked existing docs are updated in-place; missing ones are inserted.
 *  8. Locked docs are never touched.
 */
router.get("/productTargetAmount", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!ctx.can("manageProducts")) {
      return res.status(403).json({ message: "You don't have permission to set target amounts." });
    }

    const newCompanyId = ctx.companyId;

    const { GoalId, ProductId } = req.query;

    if (!GoalId || !mongoose.Types.ObjectId.isValid(GoalId)) {
      return res.status(400).json({ message: "Invalid GoalId" });
    }
    if (!ProductId) {
      return res.status(400).json({ message: "ProductId required" });
    }

    const validProductIds = parseProductIds(ProductId);
    if (validProductIds.length === 0) {
      return res.status(400).json({ message: "No valid ProductIds provided" });
    }

    // 1. Fetch all existing docs for these products under this goal
    const existingDocs = await TargetAmountSet.find({
      companyId: newCompanyId,
      GoalId,
      ProductId: { $in: validProductIds },
    }).lean();

    // 2. Separate locked vs unlocked, build lookup set
    let lockedSum = 0;
    const existingSet = new Set();
    const unlockedExistingIds = [];

    for (const doc of existingDocs) {
      const pid = doc.ProductId.toString();
      existingSet.add(pid);
      if (doc.isLock) {
        lockedSum += Number(doc.TargetAmount || 0);
      } else {
        unlockedExistingIds.push(doc.ProductId);
      }
    }

    // 3. ProductIds that don't have a doc yet
    const missingProductIds = validProductIds.filter(
      (id) => !existingSet.has(id)
    );

    // 4. Fetch goal's total target
    const goalDoc = await MyTargetGoles.findById(GoalId)
      .select("targetAmount")
      .lean();

    if (!goalDoc) {
      return res.status(404).json({ message: "Goal not found" });
    }

    // 5. Calculate the equal share for every non-locked slot
    const totalRecipients = unlockedExistingIds.length + missingProductIds.length;
    const pool = Math.max(Number(goalDoc.targetAmount || 0) - lockedSum, 0);
    const perProductAmount = totalRecipients > 0 ? pool / totalRecipients : 0;

    // 6. Update existing unlocked docs
    if (unlockedExistingIds.length > 0) {
      await TargetAmountSet.updateMany(
        {
          companyId: newCompanyId,
          GoalId,
          ProductId: { $in: unlockedExistingIds },
          isLock: { $ne: true }, // safety guard
        },
        { $set: { TargetAmount: perProductAmount } }
      );
    }

    // 7. Insert missing docs
    let createdDocs = [];
    if (missingProductIds.length > 0) {
      const newDocs = missingProductIds.map((id) => ({
        companyId: newCompanyId,
        GoalId,
        ProductId: id,
        TargetAmount: perProductAmount,
      }));
      createdDocs = await TargetAmountSet.insertMany(newDocs);
    }

    // 8. Re-fetch all docs so the response reflects the latest state
    const allDocs = await TargetAmountSet.find({
      companyId: newCompanyId,
      GoalId,
      ProductId: { $in: validProductIds },
    }).lean();

    return res.status(200).json({
      message: "success",
      totalExisting: existingDocs.length,
      totalCreated: createdDocs.length,
      perProductAmount,
      data: allDocs,
    });
  } catch (error) {
    console.error("[GET /productTargetAmount]", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /productTargetUpdate
 *
 * Logic:
 *  1. Fetch existing TargetAmountSet docs for the given ProductIds.
 *  2. Compute lockedSum from docs where isLock=true.
 *  3. The target product gets NewTargetAmount.
 *  4. Distributable pool = totalTarget - lockedSum - NewTargetAmount.
 *  5. All other UNLOCKED docs (excluding targetProductId) share the pool equally.
 *  6. Locked docs are never touched.
 */
router.put("/productTargetUpdate", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) {
      return res.status(401).json({ message: "Login/Register please!" });
    }
    if (!ctx.can("manageProducts")) {
      return res.status(403).json({ message: "You don't have permission to update target amounts." });
    }

    const newCompanyId = ctx.companyId;

    const { GoalId, ProductId } = req.query;
    const { NewTargetAmount, totalTarget, targetProductId } = req.body;

    if (!GoalId || !mongoose.Types.ObjectId.isValid(GoalId)) {
      return res.status(400).json({ message: "Invalid GoalId" });
    }
    if (!ProductId) {
      return res.status(400).json({ message: "ProductId required" });
    }
    if (NewTargetAmount === undefined || NewTargetAmount === null) {
      return res.status(400).json({ message: "NewTargetAmount required" });
    }
    if (!totalTarget) {
      return res.status(400).json({ message: "totalTarget required" });
    }
    if (!targetProductId) {
      return res.status(400).json({ message: "targetProductId required" });
    }

    const validProductIds = parseProductIds(ProductId);
    if (validProductIds.length === 0) {
      return res.status(400).json({ message: "No valid ProductIds provided" });
    }

    // 1. Fetch existing docs
    const existingDocs = await TargetAmountSet.find({
      companyId: newCompanyId,
      GoalId,
      ProductId: { $in: validProductIds },
    }).lean();

    if (existingDocs.length === 0) {
      return res.status(404).json({ message: "No matching product docs found" });
    }

    // 2. Compute lockedSum BEFORE using it in any formula
    let lockedSum = 0;
    for (const doc of existingDocs) {
      if (doc.isLock) {
        lockedSum += Number(doc.TargetAmount || 0);
      }
    }

    // 3. Other unlocked docs that are NOT the target product
    const redistributeTargets = existingDocs.filter(
      (doc) =>
        doc.isLock !== true &&
        doc.ProductId.toString() !== targetProductId.toString()
    );

    // 4. Pool for redistribution
    const newAmount = Number(NewTargetAmount);
    const pool = Math.max(Number(totalTarget) - lockedSum - newAmount, 0);
    const perProductAmount =
      redistributeTargets.length > 0 ? pool / redistributeTargets.length : 0;

    // 5. BulkWrite: redistribute unlocked peers + set target product's new value
    const bulkOps = [];

    if (redistributeTargets.length > 0) {
      bulkOps.push({
        updateMany: {
          filter: {
            companyId: newCompanyId,
            GoalId,
            ProductId: {
              $in: redistributeTargets.map((doc) => doc.ProductId),
            },
            isLock: { $ne: true }, // safety guard
          },
          update: { $set: { TargetAmount: perProductAmount } },
        },
      });
    }

    bulkOps.push({
      updateOne: {
        filter: {
          companyId: newCompanyId,
          GoalId,
          ProductId: targetProductId,
        },
        update: { $set: { TargetAmount: newAmount } },
      },
    });

     await TargetAmountSet.bulkWrite(bulkOps);
    const updatedDocs = await TargetAmountSet.find({
      companyId: newCompanyId,
      GoalId,
      ProductId: { $in: validProductIds },
    }).lean();

    return res.status(200).json({
      message: "success",
      data: updatedDocs,
    });
  } catch (error) {
    console.error("[PUT /productTargetUpdate]", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * 3️⃣ UPDATE isLock FIELD
 */
router.patch("/ProductTargetIslock", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) {
      return res.status(401).json({ message: "Login/Register please!" });
    }
    if (!ctx.can("manageProducts")) {
      return res.status(403).json({ message: "You don't have permission to lock target amounts." });
    }

    const newcompanyId = ctx.companyId;
    const { GoalId, ProductId } = req.query;
    const { isLock } = req.body;

    if (!GoalId || !mongoose.Types.ObjectId.isValid(GoalId)) {
      return res.status(400).json({ message: "Invalid GoalId" });
    }

    if (!ProductId) {
      return res.status(400).json({ message: "ProductId required" });
    }

    if (typeof isLock !== "boolean") {
      return res.status(400).json({ message: "isLock must be boolean" });
    }

    const updatedDoc = await TargetAmountSet.findOneAndUpdate(
      {
        companyId: newcompanyId,
        GoalId,
        ProductId,
      },
      { $set: { isLock } },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message:'success',
      data: updatedDoc,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;