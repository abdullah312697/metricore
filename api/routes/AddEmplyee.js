import express from 'express';
import mongoose from 'mongoose';
const router = express.Router();
import { uploadImage } from '../cloudinary.js';
import multerProcess from '../multerMiddleware.js';
import Employee from "../models/Employee.js";
import{decryptCompanyPassword, decryptUserData, encryptCompanyPassword} from '../verifyuser.js';
import { deleteResorce } from '../cloudinaryDelete.js';
import Companies from "../models/Companies.js";
import { renderBrandEmail, sendMail } from '../mailer.js';
import { limitFor } from "../config/plans.js";   // + Companies import if not present

const MANAGER_ROLES = ["Owner", "Admin"];

const getRequester = async (req) => {
  const { employeeId, companyId } = req.cookies;
  const requesterId  = decryptUserData(employeeId);
  const reqCompanyId = decryptUserData(companyId);
  if (!requesterId || !reqCompanyId) return null;
  if (!mongoose.Types.ObjectId.isValid(requesterId)) return null;
 
  const requester = await Employee.findById(requesterId);
  if (!requester) return null;
  if (String(requester.companyId) !== String(reqCompanyId)) return null;
 
  return {
    requester,
    requesterId,
    companyId: reqCompanyId,
    isManager: MANAGER_ROLES.includes(requester.EmplyeeRoal),
  };
};

const isOwnerRecord = async (target) => {
  const company = await Companies.findById(String(target.companyId));
  return !!company && target.YemplyeeEmail === company.companyEmail;
};

router.post("/addemplyee", async (req, res) => {
  const { companyId } = req.cookies;

  // Step 1: Validate company login
  if (!companyId) {
    return res.status(400).json({ message: "Login/Register please!" });
  }

  const companyIdDecrypted = decryptUserData(companyId);
  if (!companyIdDecrypted) {
    return res.status(400).json({ message: "Invalid company session!" });
  }

const billing = await Companies.findById(companyIdDecrypted).select("planId subscriptionStatus trialEndsAt").lean();
const max = limitFor(billing, "products");
if (max !== Infinity) {
  const n = await ClientProduct.countDocuments({ companyId: companyIdDecrypted });
  if (n >= max) return res.status(403).json({ message: `Your plan allows up to ${max} Employee. Upgrade to add more.` });
}
  // Step 2: Handle multer upload
  multerProcess(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      // Step 3: Validate required fields
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

      // Step 4: Validate profile image
      if (file.length === 0) {
        return res.status(400).json({ message: "Profile picture must be included!" });
      }

      // Step 5: Check duplicate email
      const exists = await Employee.findOne({ YemplyeeEmail: req.body.YemplyeeEmail });
      if (exists) {
        return res.status(409).json({ message: "Employee email already exists!" });
      }

      // Step 6: Upload image to cloud
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


router.patch("/completeOnboarding", async (req, res) => {
  try {
    const { employeeId, companyId } = req.cookies;
    const newemplyeeId = decryptUserData(employeeId);
    const newcompanyId = decryptUserData(companyId);
 
    if (!newemplyeeId || !newcompanyId)
      return res.status(401).json({ message: "Login/Register please!" });
 
    if (!mongoose.Types.ObjectId.isValid(newemplyeeId))
      return res.status(400).json({ message: "Invalid employeeId" });
 
    const updated = await Companies.findByIdAndUpdate(
      mongoose.Types.ObjectId.createFromHexString(newcompanyId),
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

router.get("/getallEmployee", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    const companyIdDecripted = decryptUserData(companyId); // this should be the companyIdDecripted

    if (!companyIdDecripted) {
      return res.status(400).json({ message: "Login/Register please!" });
    }

    // Find all employees for this company
    const employees = await Employee.find({ companyId: companyIdDecripted }, "-employeeAccessPassword");

    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found!" });
    }

    return res.status(200).json({ data: employees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

router.get("/getallEmployeeforMessage", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    const companyIdDecripted = decryptUserData(companyId); // this should be the companyIdDecripted

    if (!companyIdDecripted) {
      return res.status(400).json({ message: "Login/Register please!" });
    }

    // Find all employees for this company
    const employees = await Employee.find({ companyId: companyIdDecripted }).select("EmplyeeProfile YemplyeeName");

    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found!" });
    }

    return res.status(200).json({ data: employees });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

router.get("/getSingleEmployee/:EmployeeId", async (req, res) => {
  try {
    const auth = await getRequester(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });
 
    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });
 
    const employee = await Employee.findOne({
      _id:       EmployeeId,
      companyId: auth.companyId,
    });        // 👈 never leaves the server
 
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });
 
    return res.status(200).json({ employee });
  } catch (error) {
    console.error("❌ getSingleEmployee:", error.message);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

const MANAGER_EDITABLE = [
  "YemplyeeName", "YemplyeePhone", "YemplyeeLeaving", "employeePosition",
  "EmplyeeRoal", "EmplyeeJoinDate", "EmplyeeSellary", "FirstSelarry",
  "lsatPaid", "TotalSeavings", "currency", "about",
];
const SELF_EDITABLE = ["YemplyeeName", "YemplyeePhone", "YemplyeeLeaving", "about"];
 
router.put("/updateEmployee/:EmployeeId", async (req, res) => {
  try {
    const auth = await getRequester(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });
 
    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });
 
    const isSelf = String(auth.requesterId) === String(EmployeeId);
    if (!auth.isManager && !isSelf)
      return res.status(403).json({ message: "You can only edit your own profile." });
 
    const target = await Employee.findOne({ _id: EmployeeId, companyId: auth.companyId });
    if (!target) return res.status(404).json({ message: "Employee not found" });
 
    // Only the Owner may edit the Owner's record
    if (await isOwnerRecord(target)) {
      if (!isSelf || auth.requester.EmplyeeRoal !== "Owner")
        return res.status(403).json({ message: "Only the owner can edit the owner profile." });
    }
 
    // ── Whitelist by role — everything else is silently dropped ──
    const allowed = auth.isManager ? MANAGER_EDITABLE : SELF_EDITABLE;
    const updateData = {};
    for (const key of allowed) {
      const v = req.body[key];
      if (v !== undefined && v !== null && v !== "") updateData[key] = v;
    }
 
    // Nobody grants "Owner" through this route — ownership comes
    // from registration only.
    if (updateData.EmplyeeRoal === "Owner") delete updateData.EmplyeeRoal;
 
    if (!Object.keys(updateData).length)
      return res.status(400).json({ message: "No valid fields to update!" });
 
    const updatedEmployee = await Employee.findOneAndUpdate(
      { _id: EmployeeId, companyId: auth.companyId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
 
    // Keep your AccessData refresh behavior
    const company = await Companies.findById(auth.companyId).select("-companyPassword");
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
 
 
// ── B3. REPLACE updateEmployeeStatus — manager-only + owner shield
router.put("/updateEmployeeStatus/:EmployeeId", async (req, res) => {
  try {
    const auth = await getRequester(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });
    if (!auth.isManager)
      return res.status(403).json({ message: "Only Owner or Admin can change employee status." });
 
    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });
 
    const EmployeeStatus = req.body.EmployeeProfileStatus;
    if (!EmployeeStatus)
      return res.status(400).json({ message: "Employee status is required!" });
 
    const target = await Employee.findOne({ _id: EmployeeId, companyId: auth.companyId });
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
 
 
// ── B4. REPLACE deleteEmployee — manager-only, no self, no owner,
//        plus Cloudinary profile-image cleanup
router.delete("/deleteEmployee/:EmployeeId", async (req, res) => {
  try {
    const auth = await getRequester(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });
    if (!auth.isManager)
      return res.status(403).json({ message: "Only Owner or Admin can delete employees." });
 
    const { EmployeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(EmployeeId))
      return res.status(400).json({ message: "Invalid employee id" });
 
    if (String(auth.requesterId) === String(EmployeeId))
      return res.status(400).json({ message: "You cannot delete your own profile." });
 
    const target = await Employee.findOne({ _id: EmployeeId, companyId: auth.companyId });
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

router.patch("/ChangeProfile/:EmployeeId", async (req, res) => {
  const { EmployeeId } = req.params;
  const { companyId } = req.cookies;
  const companyIdDecripted = decryptUserData(companyId); // Company ID

  if (!companyIdDecripted) {
    return res.status(400).json({ message: "Login/Register please!" });
  }

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

      // Update Employee document
      const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: EmployeeId, companyId: companyIdDecripted }, // Ensure employee belongs to this company
        {
          $set: {
            EmplyeeProfile: uploadResult.secure_url,
            CloudinaryPublicId: uploadResult.public_id,
          },
        },
        { new: true } // Return updated document
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

router.put("/updateEmployeePassword/:employeeId", async (req, res) => {
  try {
    const { employeeId: cookieEmp, companyId: cookieComp } = req.cookies;
    const requesterId  = decryptUserData(cookieEmp);
    const newcompanyId = decryptUserData(cookieComp);
    if (!requesterId || !newcompanyId)
      return res.status(401).json({ message: "Login/Register please!" });

    const { employeeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(employeeId))
      return res.status(400).json({ message: "Invalid employee id" });

    const { employeeAccessPassword: newPassword, currentPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    // When ready, upgrade to: if (!STRONG_PASSWORD.test(newPassword)) ...

    // ── Who is asking? ────────────────────────────────────────────
    const requester = await Employee.findById(requesterId);
    if (!requester || String(requester.companyId) !== String(newcompanyId))
      return res.status(403).json({ message: "Not allowed." });

    const isManager = ["Owner", "Admin"].includes(requester.EmplyeeRoal);
    const isSelf    = String(requesterId) === String(employeeId);
    if (!isManager && !isSelf)
      return res.status(403).json({ message: "You can only change your own password." });

    // ── Target must be in the same company (tenant isolation) ─────
    const target = await Employee.findOne({
      _id:       mongoose.Types.ObjectId.createFromHexString(employeeId),
      companyId: String(newcompanyId),
    }).select("+employeeAccessPassword");
    if (!target) return res.status(404).json({ message: "Employee not found" });

    // ── Owner record is off-limits here — it must stay in sync
    //    with companyPassword via Company Settings → Security ──────
    const company = await Companies.findById(newcompanyId);
    if (company && target.YemplyeeEmail === company.companyEmail)
      return res.status(400).json({
        message: "The owner password is changed from Company Settings → Security.",
      });

    // ── Self-change requires proving the current password ─────────
    if (isSelf && !isManager) {
      if (!currentPassword)
        return res.status(400).json({ message: "Current password is required." });
      const matches = decryptCompanyPassword(target.employeeAccessPassword) === currentPassword;
      // (same comparison note as above — reuse your login's method)
      if (!matches)
        return res.status(400).json({ message: "Current password is incorrect." });
    }
    // Managers resetting someone else skip the current-password check —
    // that's the whole point of a manager reset for a forgotten password.
if (newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    target.employeeAccessPassword = encryptCompanyPassword(newPassword);
    await target.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("❌ updateEmployeePassword error:", error.message);
    return res.status(500).json({ message: "Failed to update password." });
  }
});


// POST /company/emailEmployees  — manager-only group/single email
router.post("/emailEmployees", async (req, res) => {
  try {
    const auth = await getRequester(req);           // your existing helper
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });
    if (!auth.isManager)
      return res.status(403).json({ message: "Only Owner or Admin can email the team." });

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
      companyId: auth.companyId,
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
      footerNote: `Sent by ${auth.requester.YemplyeeName || "your team"} via MetriCore.`,
    });

    // BCC pattern: send one email, recipients hidden from each other.
    // sendMail accepts an array — but for privacy, put them in bcc.
    const result = await sendMail({
      to:      auth.requester.YemplyeeEmail,   // "to" = sender (or a no-reply)
      bcc:     recipients,                     // 👈 everyone hidden from each other
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