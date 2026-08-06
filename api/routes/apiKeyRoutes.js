// api/routes/apiKeyRoutes.js
// SETTINGS-SIDE key management — cookie-authenticated, manager-only.
//
// Mount in server.js:   app.use("/api/apikeys", apiKeyRoutes);
// Endpoints:            POST   /api/apikeys        (generate — key shown ONCE)
//                       GET    /api/apikeys        (list, masked)
//                       DELETE /api/apikeys/:keyId (soft revoke)

import { Router }          from "express";
import crypto              from "crypto";
import mongoose            from "mongoose";
import ApiKey              from "../models/ApiKey.js";
import EmplyeeSchima            from "../models/Employee.js";      // 👈 adjust to your
import { decryptUserData } from "../verifyuser.js";          //    real filenames

//mc_live_cd0ee736a20f307511b7defb88147b5e0877ada990cc2090
//
// curl -k https://10.188.91.23:5000/api/v1/ingest/ping \
//   -H "Authorization: Bearer mc_live_cd0ee736a20f307511b7defb88147b5e0877ada990cc2090"
const router = Router();

const MANAGER_ROLES = ["Owner", "Admin"];
const MAX_ACTIVE_KEYS = 5;

const hashKey = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

// Same requester pattern as AddEmployee.js — role from the DB,
// never from the client.
const getManagerAuth = async (req) => {
  const { employeeId, companyId } = req.cookies;
  const requesterId  = decryptUserData(employeeId);
  const reqCompanyId = decryptUserData(companyId);
  if (!requesterId || !reqCompanyId)                     return { status: 401, message: "Login/Register please!" };
  if (!mongoose.Types.ObjectId.isValid(requesterId))     return { status: 401, message: "Login/Register please!" };
  if (!mongoose.Types.ObjectId.isValid(reqCompanyId))    return { status: 401, message: "Login/Register please!" };

  const requester = await EmplyeeSchima.findById(requesterId);
  if (!requester || String(requester.companyId) !== String(reqCompanyId))
    return { status: 403, message: "Not allowed." };

  if (!MANAGER_ROLES.includes(requester.EmplyeeRoal))
    return { status: 403, message: "Only Owner or Admin can manage API keys." };

  return {
    ok:           true,
    employeeId:   requesterId,
    companyObjId: mongoose.Types.ObjectId.createFromHexString(reqCompanyId),
  };
};

/* ═══════════════════════════════════════════════════════════════
   POST /api/apikeys — generate a new key
   The raw key appears in THIS response only. It is never stored
   and can never be shown again.
═══════════════════════════════════════════════════════════════ */
router.post("/", async (req, res) => {
  try {
    const auth = await getManagerAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });

    const name = String(req.body?.name || "").trim();
    if (!name)
      return res.status(400).json({ message: "Give the key a name (e.g. 'Website backend')." });
    if (name.length > 60)
      return res.status(400).json({ message: "Key name must be under 60 characters." });

    const activeCount = await ApiKey.countDocuments({
      companyId: auth.companyObjId,
      revoked:   false,
    });
    if (activeCount >= MAX_ACTIVE_KEYS)
      return res.status(400).json({
        message: `Maximum ${MAX_ACTIVE_KEYS} active keys. Revoke one before creating another.`,
      });

    // mc_live_ + 48 hex chars of CSPRNG entropy
    const rawKey = "mc_live_" + crypto.randomBytes(24).toString("hex");

    const record = await ApiKey.create({
      companyId: auth.companyObjId,
      name,
      keyPrefix: rawKey.slice(0, 15),          // "mc_live_a8f3c1e"
      keyHash:   hashKey(rawKey),
      createdBy: auth.employeeId,
    });

    return res.status(201).json({
      message: "API key created. Copy it now — it will not be shown again.",
      apiKey:  rawKey,                          // 👈 the ONE time it exists in a response
      data: {
        _id:       record._id,
        name:      record.name,
        keyPrefix: record.keyPrefix,
        createdAt: record.createdAt,
        revoked:   false,
        lastUsedAt: null,
      },
    });
  } catch (err) {
    console.error("❌ create apikey:", err.message);
    return res.status(500).json({ message: "Failed to create API key." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /api/apikeys — list (masked — hashes never leave the server)
═══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const auth = await getManagerAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });

    const keys = await ApiKey
      .find({ companyId: auth.companyObjId })
      .select("name keyPrefix lastUsedAt revoked revokedAt createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({ data: keys });
  } catch (err) {
    console.error("❌ list apikeys:", err.message);
    return res.status(500).json({ message: "Failed to load API keys." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/apikeys/:keyId — soft revoke (audit trail kept)
   Takes effect on the very next request that key makes.
═══════════════════════════════════════════════════════════════ */
router.delete("/:keyId", async (req, res) => {
  try {
    const auth = await getManagerAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });

    const { keyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(keyId))
      return res.status(400).json({ message: "Invalid key id" });

    const revokedKey = await ApiKey.findOneAndUpdate(
      { _id: keyId, companyId: auth.companyObjId, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } },
      { new: true }
    );

    if (!revokedKey)
      return res.status(404).json({ message: "Key not found or already revoked" });

    return res.status(200).json({ message: `"${revokedKey.name}" revoked.` });
  } catch (err) {
    console.error("❌ revoke apikey:", err.message);
    return res.status(500).json({ message: "Failed to revoke API key." });
  }
});

export default router;