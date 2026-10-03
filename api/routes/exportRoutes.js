// routes/exportRoutes.js
//
// CSV export of company financial/cost data. Gated two ways:
//   1. RBAC — same as every other financial route: viewFinancials only.
//   2. Plan — Starter can't export at all; Growth/Scale can, with the
//      per-plan history + per-request span limits from config/plans.js.
//
// Mount in server.js:   app.use("/api/export", exportRoutes);
// Frontend calls:       Altaxios.get("/export/info")
//                        Altaxios.get("/export/companyDataCsv", { params, responseType: "blob" })

import express from "express";
import mongoose from "mongoose";
import ProductsCost from "../models/ProductCost.js";
import Companies from "../models/Companies.js";
import { getRequester } from "../utils/auth.js";
import {
  effectivePlanId,
  exportConfigFor,
  earliestExportDate,
} from "../config/plans.js";

const router = express.Router();

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

// UTC midnight for "today".
const startOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const addMonthsUTC = (date, months) => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
};

const toISODate = (d) => new Date(d).toISOString().slice(0, 10);

// Parses a "YYYY-MM-DD" (or any Date-parsable) query param into a Date,
// or returns null if missing/invalid.
const parseDateParam = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Safe CSV field: wraps in quotes and escapes embedded quotes whenever
// the value contains a comma, quote, or newline.
const csvField = (value) => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsvRow = (values) => values.map(csvField).join(",") + "\r\n";

// Loads the fields plans.js needs (planId/subscriptionStatus/trialEndsAt)
// for the requesting company — same select() every other route uses.
const loadBillingCompany = (companyId) =>
  Companies.findById(companyId)
    .select("planId subscriptionStatus trialEndsAt companyName")
    .lean();

/* ═══════════════════════════════════════════════════════════════
   GET /info
   Tells the frontend what this company is allowed to export right
   now, so the date picker can be constrained up front instead of
   round-tripping a rejected request. SENSITIVE → viewFinancials.
═══════════════════════════════════════════════════════════════ */
router.get("/info", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("viewFinancials"))
      return res.status(403).json({ message: "You don't have permission to view financial data." });

    const company = await loadBillingCompany(ctx.companyId);
    if (!company)
      return res.status(404).json({ message: "Company not found" });

    const config   = exportConfigFor(company);
    const earliest = earliestExportDate(company);

    return res.status(200).json({
      message:         "ok",
      planId:          effectivePlanId(company),
      enabled:         config.enabled,
      historyMonths:   config.historyMonths,     // Infinity → serialized as null below
      maxRangeMonths:  config.maxRangeMonths,
      earliestDate:    earliest ? toISODate(earliest) : null,   // null = full history, no lower bound
      latestDate:      toISODate(startOfTodayUTC()),
    });
  } catch (err) {
    console.error("❌ export/info error:", err.message);
    return res.status(500).json({ message: "Could not load export settings." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /companyDataCsv?start=YYYY-MM-DD&end=YYYY-MM-DD
   Streams a CSV of per-product, per-day cost/sales/profit data for
   the requested range. SENSITIVE → viewFinancials + plan-gated.
═══════════════════════════════════════════════════════════════ */
router.get("/companyDataCsv", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx)
      return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("viewFinancials"))
      return res.status(403).json({ message: "You don't have permission to view financial data." });

    const company = await loadBillingCompany(ctx.companyId);
    if (!company)
      return res.status(404).json({ message: "Company not found" });

    const config = exportConfigFor(company);
    if (!config.enabled) {
      return res.status(403).json({
        message: "Data export isn't included on your current plan. Upgrade to Growth or Scale to export CSV data.",
      });
    }

    // ── Validate the requested range ──────────────────────────
    const { start, end } = req.query;
    const rangeStart = parseDateParam(start);
    const rangeEnd   = parseDateParam(end);

    if (!rangeStart || !rangeEnd)
      return res.status(400).json({ message: "Both start and end dates are required (YYYY-MM-DD)." });
    if (rangeStart > rangeEnd)
      return res.status(400).json({ message: "start date must be before end date." });

    rangeStart.setUTCHours(0, 0, 0, 0);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    // ── Enforce plan span cap (e.g. 6 months per request) ─────
    const maxEnd = addMonthsUTC(rangeStart, config.maxRangeMonths);
    if (rangeEnd > maxEnd) {
      return res.status(400).json({
        message: `Your plan allows up to ${config.maxRangeMonths} months per export. Try a narrower range (max end date: ${toISODate(maxEnd)}).`,
      });
    }

    // ── Enforce plan history cap (e.g. no more than 6 months back) ──
    const earliest = earliestExportDate(company);
    if (earliest && rangeStart < earliest) {
      return res.status(400).json({
        message: `Your plan only allows exporting data back to ${toISODate(earliest)}. Upgrade to Scale for full company history.`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(ctx.companyId))
      return res.status(400).json({ message: "Invalid companyId" });
    const companyObjId = mongoose.Types.ObjectId.createFromHexString(ctx.companyId);

    // ── Pull the raw rows (one per product per day) ───────────
    const rows = await ProductsCost.aggregate([
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
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          ProductName: { $ifNull: ["$product.ProductName", "(deleted product)"] },
          Revenue: {
            $multiply: [
              { $ifNull: ["$SoldQuentity", 0] },
              { $ifNull: ["$product.ProductPrice", 0] },
            ],
          },
          DeliveryCostTotal: {
            $multiply: [
              { $ifNull: ["$DelibaryCostPersale", 0] },
              { $ifNull: ["$SoldQuentity", 0] },
            ],
          },
        },
      },
      {
        $addFields: {
          TotalCost: {
            $add: [
              { $ifNull: ["$AdCost",          0] },
              { $ifNull: ["$OtherCost",       0] },
              { $ifNull: ["$PackgingCost",    0] },
              { $ifNull: ["$PrductBuyingCost",0] },
              { $ifNull: ["$ShippingCost",    0] },
              "$DeliveryCostTotal",
            ],
          },
        },
      },
      { $addFields: { Profit: { $subtract: ["$Revenue", "$TotalCost"] } } },
      { $sort: { createdAt: 1, ProductName: 1 } },
      {
        $project: {
          _id:              0,
          Date:             "$createdAt",
          ProductName:      1,
          SoldQuentity:     { $ifNull: ["$SoldQuentity", 0] },
          Return:           { $ifNull: ["$Return", 0] },
          Revenue:          { $round: ["$Revenue", 2] },
          AdCost:           { $ifNull: ["$AdCost", 0] },
          OtherCost:        { $ifNull: ["$OtherCost", 0] },
          PackgingCost:     { $ifNull: ["$PackgingCost", 0] },
          PrductBuyingCost: { $ifNull: ["$PrductBuyingCost", 0] },
          ShippingCost:     { $ifNull: ["$ShippingCost", 0] },
          DeliveryCostTotal:{ $round: ["$DeliveryCostTotal", 2] },
          TargetSaleAmount: { $ifNull: ["$TargetSaleAmount", 0] },
          TotalCost:        { $round: ["$TotalCost", 2] },
          Profit:           { $round: ["$Profit", 2] },
        },
      },
    ]);

    // ── Build the CSV ──────────────────────────────────────────
    const header = [
      "Date", "Product", "Units Sold", "Returns", "Revenue",
      "Ad Cost", "Other Cost", "Packaging Cost", "Buying Cost",
      "Shipping Cost", "Delivery Cost", "Target Sale Amount",
      "Total Cost", "Profit",
    ];

    let csv = toCsvRow(header);
    for (const r of rows) {
      csv += toCsvRow([
        toISODate(r.Date),
        r.ProductName,
        r.SoldQuentity,
        r.Return,
        r.Revenue,
        r.AdCost,
        r.OtherCost,
        r.PackgingCost,
        r.PrductBuyingCost,
        r.ShippingCost,
        r.DeliveryCostTotal,
        r.TargetSaleAmount,
        r.TotalCost,
        r.Profit,
      ]);
    }

    const safeCompanyName = (company.companyName || "metricore")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const filename = `${safeCompanyName}-export-${toISODate(rangeStart)}-to-${toISODate(rangeEnd)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    // BOM so Excel opens the UTF-8 file without mangling special characters.
    return res.status(200).send("﻿" + csv);
  } catch (err) {
    console.error("❌ export/companyDataCsv error:", err.message);
    return res.status(500).json({ message: "Could not generate export." });
  }
});

export default router;