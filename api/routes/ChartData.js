// import express from 'express';
// import ProductsCost from '../models/ProductCost.js';
// import{decryptUserData} from '../verifyuser.js';
// import mongoose from 'mongoose';
// const router = express.Router();


// router.get("/companyChartData", async (req, res) => {
//   try {
//     const { employeeId, companyId } = req.cookies;
//     const newemplyeeId = decryptUserData(employeeId);
//     const newcompanyId = decryptUserData(companyId);

//     if (!newemplyeeId || !newcompanyId)
//       return res.status(401).json({ message: "Login/Register please!" });

//     const { start, end, groupBy = "day" } = req.query;

//     // 👇 Log incoming params to verify
//     const rangeStart = start
//       ? new Date(start)
//       : (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();

//     const rangeEnd = end
//       ? new Date(end)
//       : (() => { const d = new Date(); d.setUTCHours(23,59,59,999); return d; })();

//     // 👇 Validate ObjectId before converting
//     if (!mongoose.Types.ObjectId.isValid(newcompanyId))
//       return res.status(400).json({ message: "Invalid companyId" });

//     // 👇 Date format WITHOUT timezone (removed "+06:00")
// // In backend route — shorter format for day groupBy
//     const dateFormat = {
//       hour:  { $dateToString: { format: "%H:00",  date: "$createdAt" } }, // "14:00"
//       day:   { $dateToString: { format: "%d %b",  date: "$createdAt" } }, // "06 May" ← no year
//       month: { $dateToString: { format: "%b %Y",  date: "$createdAt" } }, // "May 2026"
//     }[groupBy] || { $dateToString: { format: "%d %b", date: "$createdAt" } };
// // In backend route — shorter format for day groupBy

//     const companyObjId = mongoose.Types.ObjectId.createFromHexString(newcompanyId);

//     // 👇 First check if any docs exist for this company
//     // const docCount = await ProductsCost.countDocuments({ companyId: companyObjId });
//     // if(docCount === 0 ) return res.status(400).json({ message: "no data available" });
//     const chartData = await ProductsCost.aggregate([
//       {
//         $match: {
//           companyId: companyObjId,
//           createdAt: { $gte: rangeStart, $lte: rangeEnd },
//         },
//       },

//       // 👇 Lookup ClientProduct for ProductPrice
//       {
//         $lookup: {
//           from:         "ClientProduct", // 👈 must match exact MongoDB collection name
//           localField:   "ProductId",
//           foreignField: "_id",
//           as:           "product",
//         },
//       },

//       // 👇 Keep docs even if no product found (debug)
//       { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

//       {
//         $addFields: {
//           productPrice: { $ifNull: ["$product.ProductPrice", 0] },
//           SoldAmount: {
//             $multiply: [
//               "$SoldQuentity",
//               { $ifNull: ["$product.ProductPrice", 0] },
//             ],
//           },
//         },
//       },
//       {
//         $addFields: {
//           TotalCost: {
//             $add: [
//               { $ifNull: ["$AdCost",          0] },
//               { $ifNull: ["$OtherCost",        0] },
//               { $ifNull: ["$PackgingCost",     0] },
//               { $ifNull: ["$PrductBuyingCost", 0] },
//               { $ifNull: ["$ShippingCost",     0] },
//               {
//                 $multiply: [
//                   { $ifNull: ["$DelibaryCostPersale", 0] },
//                   { $ifNull: ["$SoldQuentity",        0] },
//                 ],
//               },
//             ],
//           },
//         },
//       },
//       {
//         $addFields: {
//           Profit: { $subtract: ["$SoldAmount", "$TotalCost"] },
//         },
//       },

//       {
//         $group: {
//           _id:          dateFormat,
//           SoldAmount:   { $sum: "$SoldAmount"   },
//           SoldQuentity: { $sum: "$SoldQuentity" },
//           Profit:       { $sum: "$Profit"       },
//           Return:       { $sum: "$Return"       },
//           AdCost:       { $sum: "$AdCost"       },
//           docsCount:    { $sum: 1 },              // 👈 debug: how many docs per group
//         },
//       },

//       { $sort: { _id: 1 } },

//       {
//         $project: {
//           _id:          0,
//           x:            "$_id",
//           SoldAmount:   { $round: ["$SoldAmount",   0] },
//           SoldQuentity: { $round: ["$SoldQuentity", 0] },
//           Profit:       { $round: ["$Profit",       0] },
//           Return:       { $round: ["$Return",       0] },
//           AdCost:       { $round: ["$AdCost",       0] },
//           docsCount:    1,
//         },
//       },
//     ]);
//     return res.status(200).json({ message: "ok", data: chartData });
//   } catch (err) {
//     console.error("❌ companyChartData error:", err.message);
//     return res.status(500).json({ message: err.message }); // 👈 sends real error
//   }
// });

// router.get("/dailySummary", async (req, res) => {
//   try {
//     const { employeeId, companyId } = req.cookies;
//     const newemplyeeId = decryptUserData(employeeId);
//     const newcompanyId = decryptUserData(companyId);

//     if (!newemplyeeId || !newcompanyId)
//       return res.status(401).json({ message: "Login/Register please!" });

//     if (!mongoose.Types.ObjectId.isValid(newcompanyId))
//       return res.status(400).json({ message: "Invalid companyId" });

//     const rangeStart = (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();

//     const rangeEnd =  (() => { const d = new Date(); d.setUTCHours(23,59,59,999); return d; })();

//     const companyObjId = mongoose.Types.ObjectId.createFromHexString(newcompanyId);

//     const dailySummary = await ProductsCost.aggregate([

//       {
//         $match: {
//           companyId: companyObjId,
//           createdAt: { $gte: rangeStart, $lte: rangeEnd },
//         },
//       },

//       {
//         $lookup: {
//           from:         "ClientProduct",
//           localField:   "ProductId",
//           foreignField: "_id",
//           as:           "product",
//         },
//       },
//       {
//         $unwind: {
//           path:                       "$product",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       {
//         $addFields: {
//           Revenue: {
//             $multiply: [
//               { $ifNull: ["$SoldQuentity",        0] },
//               { $ifNull: ["$product.ProductPrice", 0] },
//             ],
//           },
//           TotalCost: {
//             $add: [
//               { $ifNull: ["$AdCost",          0] },
//               { $ifNull: ["$OtherCost",        0] },
//               { $ifNull: ["$PackgingCost",     0] },
//               { $ifNull: ["$PrductBuyingCost", 0] },
//               { $ifNull: ["$ShippingCost",     0] },
//               {
//                 $multiply: [
//                   { $ifNull: ["$DelibaryCostPersale", 0] },
//                   { $ifNull: ["$SoldQuentity",        0] },
//                 ],
//               },
//             ],
//           },
//         },
//       },
//       {
//         $addFields: {
//           EstimatedProfit: { $subtract: ["$Revenue", "$TotalCost"] },
//         },
//       },

//       {
//         $group: {
//           _id: null,
//           date:            { $first: "$createdAt" },
//           TotalUnitsSold:  { $sum: { $ifNull: ["$SoldQuentity", 0] } },
//           TotalRevenue:    { $sum: "$Revenue"},
//           EstimatedProfit: { $sum: "$EstimatedProfit"  },
//         },
//       },

//       { $sort: { date: 1 } },

//       {
//         $project: {
//           _id:             0,
//           TotalUnitsSold:  { $round: ["$TotalUnitsSold",  0] },
//           TotalRevenue:    { $round: ["$TotalRevenue",    0] },
//           EstimatedProfit: { $round: ["$EstimatedProfit", 0] },
//         },
//       },
//     ]);


//     return res.status(200).json({
//       message: "ok",
//       data: dailySummary[0] || {
//         TotalUnitsSold: 0,
//         TotalRevenue: 0,
//         EstimatedProfit: 0,
//       }
//     });

//   } catch (err) {
//     console.error("❌ dailySummary error:", err.message);
//     return res.status(500).json({ message: err.message });
//   }
// });

// export default router;

import express from 'express';
import ProductsCost from '../models/ProductCost.js';
import mongoose from 'mongoose';
const router = express.Router();

// unified auth/permission system (utils/auth.js)
// getRequester → validated { requester, requesterId, companyId, role, tier, can() }
import { getRequester } from "../utils/auth.js";

/* ═══════════════════════════════════════════════════════════════
   GET /companyChartData
   Returns company-wide financial time-series (revenue, profit,
   ad cost, units, returns). SENSITIVE → viewFinancials only.
═══════════════════════════════════════════════════════════════ */
router.get("/companyChartData", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("viewFinancials"))
      return res.status(403).json({ message: "You don't have permission to view financial data." });

    const newcompanyId = ctx.companyId;

    const { start, end, groupBy = "day" } = req.query;

    // 👇 Log incoming params to verify
    const rangeStart = start
      ? new Date(start)
      : (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();

    const rangeEnd = end
      ? new Date(end)
      : (() => { const d = new Date(); d.setUTCHours(23,59,59,999); return d; })();

    // 👇 Validate ObjectId before converting
    if (!mongoose.Types.ObjectId.isValid(newcompanyId))
      return res.status(400).json({ message: "Invalid companyId" });

    // 👇 Date format WITHOUT timezone (removed "+06:00")
// In backend route — shorter format for day groupBy
    const dateFormat = {
      hour:  { $dateToString: { format: "%H:00",  date: "$createdAt" } }, // "14:00"
      day:   { $dateToString: { format: "%d %b",  date: "$createdAt" } }, // "06 May" ← no year
      month: { $dateToString: { format: "%b %Y",  date: "$createdAt" } }, // "May 2026"
    }[groupBy] || { $dateToString: { format: "%d %b", date: "$createdAt" } };
// In backend route — shorter format for day groupBy

    const companyObjId = mongoose.Types.ObjectId.createFromHexString(newcompanyId);

    // 👇 First check if any docs exist for this company
    // const docCount = await ProductsCost.countDocuments({ companyId: companyObjId });
    // if(docCount === 0 ) return res.status(400).json({ message: "no data available" });
    const chartData = await ProductsCost.aggregate([
      {
        $match: {
          companyId: companyObjId,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        },
      },

      // 👇 Lookup ClientProduct for ProductPrice
      {
        $lookup: {
          from:         "ClientProduct", // 👈 must match exact MongoDB collection name
          localField:   "ProductId",
          foreignField: "_id",
          as:           "product",
        },
      },

      // 👇 Keep docs even if no product found (debug)
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          productPrice: { $ifNull: ["$product.ProductPrice", 0] },
          SoldAmount: {
            $multiply: [
              "$SoldQuentity",
              { $ifNull: ["$product.ProductPrice", 0] },
            ],
          },
        },
      },
      {
        $addFields: {
          TotalCost: {
            $add: [
              { $ifNull: ["$AdCost",          0] },
              { $ifNull: ["$OtherCost",        0] },
              { $ifNull: ["$PackgingCost",     0] },
              { $ifNull: ["$PrductBuyingCost", 0] },
              { $ifNull: ["$ShippingCost",     0] },
              {
                $multiply: [
                  { $ifNull: ["$DelibaryCostPersale", 0] },
                  { $ifNull: ["$SoldQuentity",        0] },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          Profit: { $subtract: ["$SoldAmount", "$TotalCost"] },
        },
      },

      {
        $group: {
          _id:          dateFormat,
          SoldAmount:   { $sum: "$SoldAmount"   },
          SoldQuentity: { $sum: "$SoldQuentity" },
          Profit:       { $sum: "$Profit"       },
          Return:       { $sum: "$Return"       },
          AdCost:       { $sum: "$AdCost"       },
          docsCount:    { $sum: 1 },              // 👈 debug: how many docs per group
        },
      },

      { $sort: { _id: 1 } },

      {
        $project: {
          _id:          0,
          x:            "$_id",
          SoldAmount:   { $round: ["$SoldAmount",   0] },
          SoldQuentity: { $round: ["$SoldQuentity", 0] },
          Profit:       { $round: ["$Profit",       0] },
          Return:       { $round: ["$Return",       0] },
          AdCost:       { $round: ["$AdCost",       0] },
          docsCount:    1,
        },
      },
    ]);
    return res.status(200).json({ message: "ok", data: chartData });
  } catch (err) {
    console.error("❌ companyChartData error:", err.message);
    return res.status(500).json({ message: err.message }); // 👈 sends real error
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /dailySummary
   Today's company-wide totals (revenue, units, profit).
   SENSITIVE → viewFinancials only.
═══════════════════════════════════════════════════════════════ */
router.get("/dailySummary", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("viewFinancials"))
      return res.status(403).json({ message: "You don't have permission to view financial data." });

    const newcompanyId = ctx.companyId;

    if (!mongoose.Types.ObjectId.isValid(newcompanyId))
      return res.status(400).json({ message: "Invalid companyId" });

    const rangeStart = (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();

    const rangeEnd =  (() => { const d = new Date(); d.setUTCHours(23,59,59,999); return d; })();

    const companyObjId = mongoose.Types.ObjectId.createFromHexString(newcompanyId);

    const dailySummary = await ProductsCost.aggregate([

      {
        $match: {
          companyId: companyObjId,
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
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
          Revenue: {
            $multiply: [
              { $ifNull: ["$SoldQuentity",        0] },
              { $ifNull: ["$product.ProductPrice", 0] },
            ],
          },
          TotalCost: {
            $add: [
              { $ifNull: ["$AdCost",          0] },
              { $ifNull: ["$OtherCost",        0] },
              { $ifNull: ["$PackgingCost",     0] },
              { $ifNull: ["$PrductBuyingCost", 0] },
              { $ifNull: ["$ShippingCost",     0] },
              {
                $multiply: [
                  { $ifNull: ["$DelibaryCostPersale", 0] },
                  { $ifNull: ["$SoldQuentity",        0] },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          EstimatedProfit: { $subtract: ["$Revenue", "$TotalCost"] },
        },
      },

      {
        $group: {
          _id: null,
          date:            { $first: "$createdAt" },
          TotalUnitsSold:  { $sum: { $ifNull: ["$SoldQuentity", 0] } },
          TotalRevenue:    { $sum: "$Revenue"},
          EstimatedProfit: { $sum: "$EstimatedProfit"  },
        },
      },

      { $sort: { date: 1 } },

      {
        $project: {
          _id:             0,
          TotalUnitsSold:  { $round: ["$TotalUnitsSold",  0] },
          TotalRevenue:    { $round: ["$TotalRevenue",    0] },
          EstimatedProfit: { $round: ["$EstimatedProfit", 0] },
        },
      },
    ]);


    return res.status(200).json({
      message: "ok",
      data: dailySummary[0] || {
        TotalUnitsSold: 0,
        TotalRevenue: 0,
        EstimatedProfit: 0,
      }
    });

  } catch (err) {
    console.error("❌ dailySummary error:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

export default router;