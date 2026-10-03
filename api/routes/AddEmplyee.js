import express from 'express';
import mongoose from 'mongoose';
const router = express.Router();
import { uploadImage } from '../cloudinary.js';
import multerProcess from '../multerMiddleware.js';
import Employee from "../models/Employee.js";
import { decryptCompanyPassword, encryptCompanyPassword } from '../verifyuser.js';
import { deleteResorce } from '../cloudinaryDelete.js';
import Companies from "../models/Companies.js";
import { renderBrandEmail, sendMail } from '../mailer.js';
import { limitFor } from "../config/plans.js";

// ── unified auth/permission system (utils/auth.js) ──
// getRequester      → validated context { requester, requesterId, companyId, role, tier, can() }
// isOwnerRecord     → is this employee the actual company owner (email match)
// requirePermission → express middleware gate for a permission
// can               → pure role→permission check
import {
  getRequester,
  isOwnerRecord,
  requirePermission,
  can,
  canAssignRole,
} from "../utils/auth.js";

/* ═══════════════════════════════════════════════════════════════
   POST /addemplyee  — add a new employee (manageTeam permission)
═══════════════════════════════════════════════════════════════ */
router.post("/addemplyee", requirePermission("manageTeam"), async (req, res) => {
  // requirePermission already validated login, company isolation, and the
  // "manageTeam" permission — the context is on req.ctx.
  const { companyId: companyIdDecrypted } = req.ctx;

  // ── Plan limit check ──
  // NOTE: this counts EMPLOYEES against the plan limit. The original code
  // referenced `ClientProduct` (which was never imported and would crash);
  // for an employee-limit gate we count Employee documents instead.
  const billing = await Companies.findById(companyIdDecrypted)
    .select("planId subscriptionStatus trialEndsAt")
    .lean();
  const max = limitFor(billing, "products");
  if (max !== Infinity) {
    const n = await Employee.countDocuments({ companyId: companyIdDecrypted });
    if (n >= max) {
      return res.status(403).json({
        message: `Your plan allows up to ${max} employees. Upgrade to add more.`,
      });
    }
  }

  // ── Handle multer upload ──
  multerProcess(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      // Validate required fields
      const requiredFields = [
        "YemplyeeName",
        "YemplyeePhone",
        "YemplyeeEmail",
        "YemplyeeLeaving",
        "EmplyeeSellary",
        "EmplyeeRoal",
        "EmplyeeJoinDate",
      ];
      const file = req.files;

      for (const field of requiredFields) {
        if (!req.body[field] || req.body[field].trim() === "") {
          return res.status(400).json({ message: `Field "${field}" must not be empty` });
        }
      }

      // 🔒 Privilege-escalation guard: the creator can only assign a role
      //    at or below their own tier (and never the literal "Owner").
      //    Stops a Manager from creating an Admin/CEO (owner-tier) account.
      if (!canAssignRole(req.ctx.role, req.body.EmplyeeRoal)) {
        return res.status(403).json({
          message: "You can't assign a role higher than your own.",
        });
      }

      // Validate profile image
      if (file.length === 0) {
        return res.status(400).json({ message: "Profile picture must be included!" });
      }

      // Check duplicate email
      const exists = await Employee.findOne({ YemplyeeEmail: req.body.YemplyeeEmail });
      if (exists) {
        return res.status(409).json({ message: "Employee email already exists!" });
      }

      // Upload image to cloud
      const newfile = file[0];
      const uploadResult = await uploadImage(
        newfile.buffer,
        Date.now().toString(),
        "EmplyeeProfile"
      );

      const EmployeePass = encryptCompanyPassword(req.body.employeeAccessPassword);

      const newEmployee = await Employee.create({
        ...req.body,
        companyId: companyIdDecrypted,
        EmplyeeProfile: uploadResult.secure_url,
        CloudinaryPublicId: uploadResult.public_id,
        employeeAccessPassword: EmployeePass,
      });

      return res.status(200).json({
        message: "New employee added!",
        data: newEmployee,
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /completeOnboarding
═══════════════════════════════════════════════════════════════ */
router.patch("/completeOnboarding", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

    const updated = await Companies.findByIdAndUpdate(
      mongoose.Types.ObjectId.createFromHexString(ctx.companyId),
      { $set: { isOnboarded: true } },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Employee not found" });

    return res.status(200).json({
      message:     "Onboarding complete",
      isOnboarded: true,
    });

  } catch (err) {
    console.error("❌ completeOnboarding error:", err.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /getallEmployee
═══════════════════════════════════════════════════════════════ */
router.get("/getallEmployee", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

    // Find all employees for this company (tenant-scoped)
    const employees = await Employee.find(
      { companyId: ctx.companyId },
      "-employeeAccessPassword"
    );

    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found!" });
    }

    return res.status(200).json({ data: employees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /getallEmployeeforMessage
═══════════════════════════════════════════════════════════════ */
router.get("/getallEmployeeforMessage", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

    // Find all employees for this company (tenant-scoped)
    const employees = await Employee.find({ companyId: ctx.companyId })
      .select("EmplyeeProfile YemplyeeName");

    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found!" });
    }

    return res.status(200).json({ data: employees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   GET /getSingleEmployee/:EmployeeId
═══════════════════════════════════════════════════════════════ */
router.get("/getSingleEmployee/:EmployeeId", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });

    const employee = await Employee.findOne({
      _id:       EmployeeId,
      companyId: ctx.companyId,
    });

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    // Flag whether this employee is the actual company owner, so the
    // frontend can lock the role picker on the owner's profile.
    const isOwner = await isOwnerRecord(employee);

    return res.status(200).json({ employee, isOwner });
  } catch (error) {
    console.error("❌ getSingleEmployee:", error.message);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUT /updateEmployee/:EmployeeId — manager (manageTeam) or self
═══════════════════════════════════════════════════════════════ */
const MANAGER_EDITABLE = [
  "YemplyeeName", "YemplyeePhone", "YemplyeeLeaving", "employeePosition",
  "EmplyeeRoal", "EmplyeeJoinDate", "EmplyeeSellary", "FirstSelarry",
  "lsatPaid", "TotalSeavings", "currency", "about",
];
const SELF_EDITABLE = ["YemplyeeName", "YemplyeePhone", "YemplyeeLeaving", "about"];

router.put("/updateEmployee/:EmployeeId", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });

    const isSelf    = String(ctx.requesterId) === String(EmployeeId);
    const canManage = ctx.can("manageTeam");
    if (!canManage && !isSelf)
      return res.status(403).json({ message: "You can only edit your own profile." });

    const target = await Employee.findOne({ _id: EmployeeId, companyId: ctx.companyId });
    if (!target) return res.status(404).json({ message: "Employee not found" });

    // Is the target the actual company owner? (matched by company email)
    const targetIsOwner = await isOwnerRecord(target);

    // Only the actual owner may edit the owner's record
    if (targetIsOwner) {
      if (!isSelf)
        return res.status(403).json({ message: "Only the owner can edit the owner profile." });
    }

    // ── Whitelist by capability — everything else is silently dropped ──
    const allowed = canManage ? MANAGER_EDITABLE : SELF_EDITABLE;
    const updateData = {};
    for (const key of allowed) {
      const v = req.body[key];
      if (v !== undefined && v !== null && v !== "") updateData[key] = v;
    }

    // 🔒 The owner's ROLE is immutable — there must always be exactly one
    //    owner. Nobody (not even the owner themselves) may change it, or
    //    the company could be left with no owner and lose access to
    //    billing/settings/team management. Drop any role change on the owner.
    if (targetIsOwner && "EmplyeeRoal" in updateData) {
      delete updateData.EmplyeeRoal;
    }

    // 🔒 Nobody may PROMOTE anyone INTO the owner role via this route.
    //    Ownership comes only from company registration.
    if (updateData.EmplyeeRoal === "Owner") {
      delete updateData.EmplyeeRoal;
    }

    // 🔒 Privilege-escalation guard: you may only assign a role at or
    //    below your own tier. Stops a Manager granting Admin/CEO
    //    (owner-tier). Rejects rather than silently dropping, so the
    //    caller knows the assignment wasn't allowed.
    if (
      updateData.EmplyeeRoal !== undefined &&
      !canAssignRole(ctx.role, updateData.EmplyeeRoal)
    ) {
      return res.status(403).json({
        message: "You can't assign a role higher than your own.",
      });
    }

    if (!Object.keys(updateData).length)
      return res.status(400).json({ message: "No valid fields to update!" });

    const updatedEmployee = await Employee.findOneAndUpdate(
      { _id: EmployeeId, companyId: ctx.companyId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Keep AccessData refresh behavior
    const company = await Companies.findById(ctx.companyId).select("-companyPassword");
    const AccessData = {
      companyName:     company.companyName,
      companyLogo:     company.companyLogo,
      employeeName:    updatedEmployee.YemplyeeName,
      employeeRoal:    updatedEmployee.EmplyeeRoal,
      employeeProfile: updatedEmployee.EmplyeeProfile,
      isVerify:        company.isVerify,
    };

    return res.status(200).json({ message: "Update successful!", data: updatedEmployee, AccessData });
  } catch (error) {
    console.error("❌ updateEmployee:", error.message);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUT /updateEmployeeStatus/:EmployeeId — manager-only + owner shield
═══════════════════════════════════════════════════════════════ */
router.put("/updateEmployeeStatus/:EmployeeId", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("manageTeam"))
      return res.status(403).json({ message: "You don't have permission to change employee status." });

    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });

    const EmployeeStatus = req.body.EmployeeProfileStatus;
    if (!EmployeeStatus)
      return res.status(400).json({ message: "Employee status is required!" });

    const target = await Employee.findOne({ _id: EmployeeId, companyId: ctx.companyId });
    if (!target) return res.status(404).json({ message: "Employee not found" });

    if (await isOwnerRecord(target))
      return res.status(403).json({ message: "The owner's status cannot be changed." });

    target.EmployeeProfileStatus = EmployeeStatus;   // enum validated by schema
    await target.save();

    return res.status(200).json({ message: "Update successful!", data: target.EmployeeProfileStatus });
  } catch (err) {
    console.error("❌ updateEmployeeStatus:", err.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   DELETE /deleteEmployee/:EmployeeId — manager-only, no self, no owner
═══════════════════════════════════════════════════════════════ */
router.delete("/deleteEmployee/:EmployeeId", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("manageTeam"))
      return res.status(403).json({ message: "You don't have permission to delete employees." });

    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });

    if (String(ctx.requesterId) === String(EmployeeId))
      return res.status(400).json({ message: "You cannot delete your own profile." });

    const target = await Employee.findOne({ _id: EmployeeId, companyId: ctx.companyId });
    if (!target)
      return res.status(404).json({ message: "Employee not found or already deleted" });

    if (await isOwnerRecord(target))
      return res.status(403).json({ message: "The owner account cannot be deleted." });

    await Employee.deleteOne({ _id: target._id });

    // Orphaned-image cleanup — non-fatal
    if (target.CloudinaryPublicId) {
      await deleteResorce(target.CloudinaryPublicId, "image").catch(() => {});
    }

    return res.status(200).json({ message: "Employee deleted successfully!" });
  } catch (err) {
    console.error("❌ deleteEmployee:", err.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /ChangeProfile/:EmployeeId — profile image change
═══════════════════════════════════════════════════════════════ */
router.patch("/ChangeProfile/:EmployeeId", async (req, res) => {
  const ctx = await getRequester(req);
  if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

  const { EmployeeId } = req.params;
  const companyIdDecripted = ctx.companyId;

  // A user may change their own picture; managers may change anyone's.
  const isSelf = String(ctx.requesterId) === String(EmployeeId);
  if (!ctx.can("manageTeam") && !isSelf)
    return res.status(403).json({ message: "You can only change your own picture." });

  multerProcess(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    const file = req.files;

    try {
      const newFile = file[0];

      if (file.length === 0) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const oldPublicId = req.body.CloudinaryPublicId || null;

      // Upload new profile image
      const imageName = new Date().getTime().toString();
      const uploadResult = await uploadImage(newFile.buffer, imageName, "EmplyeeProfile");

      // Update Employee document (tenant-scoped)
      const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: EmployeeId, companyId: companyIdDecripted },
        {
          $set: {
            EmplyeeProfile: uploadResult.secure_url,
            CloudinaryPublicId: uploadResult.public_id,
          },
        },
        { new: true }
      );

      if (!updatedEmployee) {
        // Delete newly uploaded image if update failed
        await deleteResorce(uploadResult.public_id, "image").catch(() => {});
        return res.status(404).json({ message: "Employee not found" });
      }

      // Delete old profile image from Cloudinary
      if (oldPublicId) await deleteResorce(oldPublicId, "image").catch(() => {});
      const company = await Companies.findById(companyIdDecripted).select("-companyPassword");

      const AccessData = {
        companyName: company.companyName,
        companyLogo: company.companyLogo,
        employeeName: updatedEmployee.YemplyeeName,
        employeeRoal: updatedEmployee.EmplyeeRoal,
        employeeProfile: updatedEmployee.EmplyeeProfile,
        isVerify: company.isVerify,
      };

      return res.status(200).json({
        message: "Profile updated successfully!",
        data: updatedEmployee,
        AccessData
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Something went wrong!" });
    }
  });
});

/* ═══════════════════════════════════════════════════════════════
   PUT /updateEmployeePassword/:employeeId — manager reset or self-change
═══════════════════════════════════════════════════════════════ */
router.put("/updateEmployeePassword/:employeeId", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });

    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId))
      return res.status(400).json({ message: "Invalid employee id" });

    const { employeeAccessPassword: newPassword, currentPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    // ── Who is asking? ────────────────────────────────────────────
    const canManage = ctx.can("manageTeam");
    const isSelf    = String(ctx.requesterId) === String(employeeId);
    if (!canManage && !isSelf)
      return res.status(403).json({ message: "You can only change your own password." });

    // ── Target must be in the same company (tenant isolation) ─────
    const target = await Employee.findOne({
      _id:       mongoose.Types.ObjectId.createFromHexString(employeeId),
      companyId: String(ctx.companyId),
    }).select("+employeeAccessPassword");
    if (!target) return res.status(404).json({ message: "Employee not found" });

    // ── Owner record is off-limits here — it must stay in sync
    //    with companyPassword via Company Settings → Security ──────
    if (await isOwnerRecord(target))
      return res.status(400).json({
        message: "The owner password is changed from Company Settings → Security.",
      });

    // ── Self-change requires proving the current password ─────────
    if (isSelf && !canManage) {
      if (!currentPassword)
        return res.status(400).json({ message: "Current password is required." });
      const matches = decryptCompanyPassword(target.employeeAccessPassword) === currentPassword;
      if (!matches)
        return res.status(400).json({ message: "Current password is incorrect." });
    }
    // Managers resetting someone else skip the current-password check —
    // that's the whole point of a manager reset for a forgotten password.

    target.employeeAccessPassword = encryptCompanyPassword(newPassword);
    await target.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("❌ updateEmployeePassword error:", error.message);
    return res.status(500).json({ message: "Failed to update password." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /emailEmployees — manager-only group/single email
═══════════════════════════════════════════════════════════════ */
router.post("/emailEmployees", async (req, res) => {
  try {
    const ctx = await getRequester(req);
    if (!ctx) return res.status(401).json({ message: "Login/Register please!" });
    if (!ctx.can("manageTeam"))
      return res.status(403).json({ message: "You don't have permission to email the team." });

    const { employeeIds, subject, message } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0)
      return res.status(400).json({ message: "Select at least one employee." });
    if (employeeIds.length > 100)
      return res.status(400).json({ message: "Maximum 100 recipients per email." });
    if (!subject?.trim())  return res.status(400).json({ message: "Subject is required." });
    if (!message?.trim())  return res.status(400).json({ message: "Message is required." });

    // Fetch ONLY employees in this company (tenant isolation) that have an email
    const valid = employeeIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const employees = await Employee.find({
      _id:       { $in: valid },
      companyId: ctx.companyId,
    }).select("YemplyeeEmail YemplyeeName");

    const recipients = employees
      .map((e) => e.YemplyeeEmail)
      .filter(Boolean);

    if (!recipients.length)
      return res.status(400).json({ message: "None of the selected employees have an email address." });

    // Build the branded body
    const html = renderBrandEmail({
      bodyHtml: `
        <h2 style="color:#ffffff;font-size:19px;margin:24px 0 14px;">${subject
          .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</h2>
        <div style="color:#dde6ee;font-size:14px;line-height:1.75;white-space:pre-wrap;">${message
          .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>`,
      footerNote: `Sent by ${ctx.requester.YemplyeeName || "your team"} via MetriCore.`,
    });

    // BCC pattern: send one email, recipients hidden from each other.
    const result = await sendMail({
      to:      ctx.requester.YemplyeeEmail,   // "to" = sender (or a no-reply)
      bcc:     recipients,                    // 👈 everyone hidden from each other
      subject: subject.trim(),
      html,
    });

    if (!result.ok)
      return res.status(502).json({ message: "Email service failed. Please try again." });

    return res.status(200).json({
      message:   `Email sent to ${recipients.length} employee${recipients.length > 1 ? "s" : ""}.`,
      sentCount: recipients.length,
    });
  } catch (err) {
    console.error("❌ emailEmployees error:", err.message);
    return res.status(500).json({ message: "Failed to send email." });
  }
});

export default router;