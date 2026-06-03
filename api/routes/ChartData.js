import express from 'express';
import ProductsCost from '../models/ProductCost.js';
import{decryptUserData} from '../verifyuser.js';
import mongoose from 'mongoose';
const router = express.Router();


router.get("/companyChartData", async (req, res) => {
  try {
    const { employeeId, companyId } = req.cookies;
    const newemplyeeId = decryptUserData(employeeId);
    const newcompanyId = decryptUserData(companyId);

    if (!newemplyeeId || !newcompanyId)
      return res.status(401).json({ message: "Login/Register please!" });

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
    const dateFormat = {
      hour:  { $dateToString: { format: "%H:00",    date: "$createdAt" } },
      day:   { $dateToString: { format: "%d %b %Y", date: "$createdAt" } },
      month: { $dateToString: { format: "%b %Y",    date: "$createdAt" } },
    }[groupBy] || { $dateToString: { format: "%d %b %Y", date: "$createdAt" } };

    const companyObjId = mongoose.Types.ObjectId.createFromHexString(newcompanyId);

    // 👇 First check if any docs exist for this company
    const docCount = await ProductsCost.countDocuments({ companyId: companyObjId });

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

export default router;