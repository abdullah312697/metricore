// api/routes/ingestRoutes.js — COMPLETE FILE (replace wholesale)
// Public API v1: ping, product discovery, and daily push with
// precise statuses (created / updated / unchanged / skipped).
//
// Mount in server.js:   app.use("/api/v1", ingestRoutes);

import { Router }    from "express";
import crypto        from "crypto";
import mongoose      from "mongoose";
import ApiKey        from "../models/ApiKey.js";
import ClientProduct from "../models/ClientProduct.js";   // 👈 adjust to your
import ProductsCost  from "../models/ProductCost.js";    //    real filenames
import { hasApiAccess } from "../config/plans.js";

const router = Router();

/* ── helpers ─────────────────────────────────────────────────── */
const hashKey = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// trim + lowercase + collapse internal whitespace, so
// "Nothun  Tote bag" and "nothun tote bag " match the same product
const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");

const utcTodayString = () => {
  const now = new Date();
  const d = String(now.getUTCDate()).padStart(2, "0");
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${now.getUTCFullYear()}`;
};

// Public field names → schema field names (typos stay internal)
const METRIC_MAP = {
  soldQuantity:        "SoldQuentity",
  returns:             "Return",
  adCost:              "AdCost",
  otherCost:           "OtherCost",
  deliveryCostPerSale: "DelibaryCostPersale",
  packagingCost:       "PackgingCost",
  buyingCost:          "PrductBuyingCost",
  shippingCost:        "ShippingCost",
};
const ALL_SCHEMA_METRICS = [...Object.values(METRIC_MAP), "TargetSaleAmount"];

/* ── auth middleware ─────────────────────────────────────────── */
const requireApiKey = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const raw    = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!raw || !raw.startsWith("mc_live_")) {
      return res.status(401).json({
        error:   "unauthorized",
        message: "Missing API key. Send header: Authorization: Bearer mc_live_...",
      });
    }

    const key = await ApiKey.findOne({ keyHash: hashKey(raw), revoked: false });
    if (!key) {
      return res.status(401).json({
        error:   "unauthorized",
        message: "Invalid or revoked API key.",
      });
    }
      if (!hasApiAccess(company)) {
        return res.status(403).json({ ok: false, error: "api_access_not_in_plan", hint: "API access requires the Scale plan." });
      }
    ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

    req.apiCompanyId = String(key.companyId);
    req.apiKeyName   = key.name;
    next();
  } catch (err) {
    console.error("❌ requireApiKey:", err.message);
    return res.status(500).json({ error: "server_error", message: "Authentication check failed." });
  }
};

/* ═══════════════════════════════════════════════════════════════
   GET /api/v1/ingest/ping — "is my key wired correctly?"
═══════════════════════════════════════════════════════════════ */
router.get("/ingest/ping", requireApiKey, (req, res) => {
  return res.status(200).json({
    ok:      true,
    message: "API key is valid.",
    key:     req.apiKeyName,
    date:    utcTodayString(),
  });
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/v1/ingest/products — identifiers payloads can use
═══════════════════════════════════════════════════════════════ */
router.get("/ingest/products", requireApiKey, async (req, res) => {
  try {
    const companyObjId = mongoose.Types.ObjectId.createFromHexString(req.apiCompanyId);
    const products = await ClientProduct
      .find({ companyId: companyObjId })
      .select("ProductName sku");

    return res.status(200).json({
      ok:    true,
      count: products.length,
      products: products.map((p) => ({
        productId: String(p._id),
        name:      p.ProductName,
        sku:       p.sku || null,
      })),
    });
  } catch (err) {
    console.error("❌ ingest/products:", err.message);
    return res.status(500).json({ error: "server_error", message: "Failed to load products." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/v1/ingest/daily
   Cumulative totals for TODAY (UTC). Idempotent: identical pushes
   report "unchanged" and write nothing.
═══════════════════════════════════════════════════════════════ */
router.post("/ingest/daily", requireApiKey, async (req, res) => {
  try {
    const { date, products } = req.body || {};

    // ── Request-level validation ─────────────────────────────────
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error:   "invalid_request",
        message: '"products" must be a non-empty array.',
      });
    }
    if (products.length > 500) {
      return res.status(400).json({
        error:   "invalid_request",
        message: "Maximum 500 products per request.",
      });
    }

    const today = utcTodayString();
    if (date !== undefined && date !== today) {
      return res.status(400).json({
        error:   "invalid_date",
        message: `Only today's data can be pushed. Expected "${today}" (dd/MM/yyyy, UTC) but received "${date}". Omit "date" to default to today.`,
      });
    }

    const companyObjId = mongoose.Types.ObjectId.createFromHexString(req.apiCompanyId);

    // ── Catalog + lookup maps (normalized) ───────────────────────
    const catalog = await ClientProduct
      .find({ companyId: companyObjId })
      .select("ProductName sku");

    const byId   = new Map();
    const bySku  = new Map();
    const byName = new Map();
    for (const p of catalog) {
      byId.set(String(p._id), p);
      if (p.sku)         bySku.set(norm(p.sku), p);
      if (p.ProductName) byName.set(norm(p.ProductName), p);
    }

    // ── UTC today window ─────────────────────────────────────────
    const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday   = new Date(); endOfToday.setUTCHours(23, 59, 59, 999);

    // ── Pass 1: resolve + validate, collect write jobs ───────────
    const results = [];
    const summary = { received: products.length, updated: 0, created: 0, unchanged: 0, skipped: 0 };
    const jobs = [];

    for (const item of products) {
      const identifier = item?.productId || item?.sku || item?.name || "unknown";

      let product = null;
      if (item?.productId && mongoose.Types.ObjectId.isValid(item.productId))
        product = byId.get(String(item.productId)) || null;
      if (!product && item?.sku)  product = bySku.get(norm(item.sku))   || null;
      if (!product && item?.name) product = byName.get(norm(item.name)) || null;

      if (!product) {
        summary.skipped++;
        results.push({ identifier, status: "skipped", reason: "product_not_found" });
        continue;
      }

      const $set = {};
      const badField = [];
      for (const [apiField, schemaField] of Object.entries(METRIC_MAP)) {
        if (item[apiField] === undefined) continue;
        const n = toNum(item[apiField]);
        if (n === null) { badField.push(apiField); continue; }
        $set[schemaField] = n;
      }

      if (badField.length) {
        summary.skipped++;
        results.push({
          identifier,
          status: "skipped",
          reason: `invalid_value: ${badField.join(", ")} must be numbers ≥ 0`,
        });
        continue;
      }
      if (!Object.keys($set).length) {
        summary.skipped++;
        results.push({ identifier, status: "skipped", reason: "no_metrics_provided" });
        continue;
      }

      jobs.push({ identifier, product, $set });
    }

    // ── ONE query: today's existing records for matched products ─
    const existingDocs = await ProductsCost.find({
      companyId: companyObjId,
      ProductId: { $in: jobs.map((j) => j.product._id) },
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const existingByProduct = new Map(existingDocs.map((d) => [String(d.ProductId), d]));

    // ── Pass 2: write only what actually differs ─────────────────
    for (const job of jobs) {
      const existing  = existingByProduct.get(String(job.product._id));
      const identical = existing &&
        Object.entries(job.$set).every(([f, v]) => Number(existing[f]) === v);

      if (identical) {
        summary.unchanged++;
        results.push({
          identifier: job.identifier,
          product:    job.product.ProductName,
          status:     "unchanged",
          fields:     Object.keys(job.$set),
        });
        continue;                        // no write → updatedAt stays honest
      }

      const $setOnInsert = { extraFields: [] };
      for (const f of ALL_SCHEMA_METRICS) {
        if (job.$set[f] === undefined) $setOnInsert[f] = 0;
      }

      const result = await ProductsCost.updateOne(
        {
          companyId: companyObjId,
          ProductId: job.product._id,
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
        { $set: job.$set, $setOnInsert },
        { upsert: true }
      );

      const status = result.upsertedCount ? "created" : "updated";
      summary[status]++;
      results.push({
        identifier: job.identifier,
        product:    job.product.ProductName,
        status,
        fields:     Object.keys(job.$set),
      });
    }

    // ── Every code path above either returned or reaches here ────
    return res.status(200).json({ ok: true, date: today, summary, results });

  } catch (err) {
    console.error("❌ ingest/daily:", err.message);
    return res.status(500).json({ error: "server_error", message: "Failed to process the payload." });
  }
});

export default router;