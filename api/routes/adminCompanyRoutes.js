// api/routes/adminCompanyRoutes.js
// Company directory for the admin console.
//
// Mount in index.js (same base path — Express stacks routers):
//
//     import adminCompanyRoutes from "./routes/adminCompanyRoutes.js";
//     app.use("/api/admin", adminCompanyRoutes);
//
// Endpoints (all requireAdmin):
//     GET   /api/admin/companies?q=&sort=&page=      list (12/page)
//     GET   /api/admin/companies/:id                 detail + counts
//     PATCH /api/admin/companies/:id/suspend         { suspended: bool }
//
// ⚠️ SAME TWO ADJUSTMENTS AS THE STATS ROUTE (marked 👈):
//   • the Companies / Employee model import filenames
//   • VERIFIED_FIELD + the companyName / companyEmail / companyLogo
//     field reads, if your schema names them differently
//
// SCHEMA PREREQUISITE — add to your Companies schema:
//     isSuspended: { type: Boolean, default: false },
//
// LOGIN BLOCK — suspension only bites if useLogin checks it; see the
// snippet in the wiring notes (403 "account suspended").

import { Router } from "express";
import mongoose from "mongoose";
import Companies from "../models/Companies.js";       // 👈 adjust
import Employee  from "../models/Employee.js";        // 👈 adjust
import ClientProduct from "../models/ClientProduct.js";
import { requireAdmin } from "./adminAuthRoutes.js";

const router = Router();

const VERIFIED_FIELD = "isVerify";                  // 👈 adjust
const PAGE_SIZE = 12;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalize = (c, counts = {}) => ({
  _id:       c._id,
  name:      c.companyName  || "—",                   // 👈 adjust reads
  email:     c.companyEmail || "",
  logo:      c.companyLogo  || "",
  verified:  Boolean(c[VERIFIED_FIELD]),
  suspended: Boolean(c.isSuspended),
  createdAt: c.createdAt || null,
  employees: counts.employees ?? 0,
  products:  counts.products  ?? 0,
});

// { companyId → n } from an aggregate over a set of company ids
const countByCompany = async (Model, ids) => {
  const rows = await Model.aggregate([
    { $match: { companyId: { $in: ids } } },
    { $group: { _id: "$companyId", n: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((r) => { map[String(r._id)] = r.n; });
  return map;
};

/* ═══════════════════════════════════════════════════════════════
   GET /companies — search + sort + paginate
═══════════════════════════════════════════════════════════════ */
router.get("/companies", requireAdmin, async (req, res) => {
  try {
    const q    = String(req.query.q || "").trim();
    const sort = String(req.query.sort || "newest");
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const filter = q
      ? {
          $or: [
            { companyName:  { $regex: escapeRegex(q), $options: "i" } },  // 👈 adjust
            { companyEmail: { $regex: escapeRegex(q), $options: "i" } },  // 👈 adjust
          ],
        }
      : {};

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name:   { companyName: 1 },                     // 👈 adjust
    };

    const [total, docs] = await Promise.all([
      Companies.countDocuments(filter),
      Companies.find(filter)
        .sort(sortMap[sort] || sortMap.newest)
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    const ids = docs.map((d) => d._id);
    const [empMap, prodMap] = await Promise.all([
      countByCompany(Employee, ids),
      countByCompany(ClientProduct, ids),
    ]);

    const companies = docs.map((c) =>
      normalize(c, {
        employees: empMap[String(c._id)],
        products:  prodMap[String(c._id)],
      })
    );

    return res.status(200).json({
      companies,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (err) {
    console.error("❌ admin companies list:", err.message);
    return res.status(500).json({ message: "Failed to load companies." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /companies/:id — detail + counts
═══════════════════════════════════════════════════════════════ */
router.get("/companies/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid company id." });
    }

    const company = await Companies.findById(id).lean();
    if (!company) return res.status(404).json({ message: "Company not found." });

    const [employees, products] = await Promise.all([
      Employee.countDocuments({ companyId: id }),
      ClientProduct.countDocuments({ companyId: id }),
    ]);

    return res.status(200).json({ company: normalize(company, { employees, products }) });
  } catch (err) {
    console.error("❌ admin company detail:", err.message);
    return res.status(500).json({ message: "Failed to load company." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /companies/:id/suspend — { suspended: true | false }
═══════════════════════════════════════════════════════════════ */
router.patch("/companies/:id/suspend", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid company id." });
    }
    if (typeof req.body?.suspended !== "boolean") {
      return res.status(400).json({ message: "suspended must be true or false." });
    }

    const company = await Companies.findByIdAndUpdate(
      id,
      { $set: { isSuspended: req.body.suspended } },
      { new: true }
    ).lean();

    if (!company) return res.status(404).json({ message: "Company not found." });

    return res.status(200).json({
      message: company.isSuspended
        ? "Company suspended — logins are now blocked."
        : "Company unsuspended — logins restored.",
      company: normalize(company),
    });
  } catch (err) {
    console.error("❌ admin suspend:", err.message);
    return res.status(500).json({ message: "Failed to update company." });
  }
});

export default router;