import express from 'express';
const router = express.Router();
import Companies from "../models/Companies.js";
import Employee from "../models/Employee.js";
import MyTarget from "../models/MyTarget.js";
import{encryptUserData,hashPassword,decryptUserData,encryptCompanyPassword,decryptCompanyPassword} from '../verifyuser.js';
import multerProcess from '../multerMiddleware.js';
import { uploadImage } from '../cloudinary.js';
import mongoose from 'mongoose';
import {deleteResorce} from '../cloudinaryDelete.js';
import crypto from "crypto";
import { sendVerificationCode, sendPasswordReset } from "../mailer.js";

const SAFE_COMPANY_FIELDS =
  "companyName companyEmail companyLogo industry numberofEmployees isVerify isOnboarded createdAt";

const getCompanyAuth = (req) => {
  try {
    const { employeeId, companyId } = req.cookies;
    if (!employeeId || !companyId) return null;
 
    const newEmployeeId = decryptUserData(employeeId);
    const newCompanyId  = decryptUserData(companyId);
 
    if (!newEmployeeId || !newCompanyId)                 return null;
    if (!mongoose.Types.ObjectId.isValid(newEmployeeId)) return null;
    if (!mongoose.Types.ObjectId.isValid(newCompanyId))  return null;
 
    return {
      employeeId:   newEmployeeId,                                          // 👈 added
      companyId:    newCompanyId,                                           // 👈 added
      companyObjId: mongoose.Types.ObjectId.createFromHexString(newCompanyId),
    };
  } catch {
    return null;
  }
};
//user register<>
router.post("/register", async (req, res) => {
  multerProcess(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const estr =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    try {
      const {
        companyName, industry, companyEmail, companyPassword,
        rePassword, numberofEmployees,
      } = req.body;

      // ── Validation ───────────────────────────────────────────
      if (!companyName?.trim() || !industry?.trim() || !companyEmail?.trim() ||
          !companyPassword || !numberofEmployees?.trim() || !rePassword) {
        return res.status(400).json({ message: "All fields are required." });
      }
      const email = companyEmail.trim().toLowerCase();   // normalize once

      if (!email.match(estr))
        return res.status(400).json({ message: "Please enter a valid email address." });
      if (companyPassword.length < 8)
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      if (!companyPassword.match(strongPasswordRegex))
        return res.status(400).json({ message: "Password needs upper & lower case, a number, and a special character (@$!%*?&)." });
      if (companyPassword !== rePassword)
        return res.status(400).json({ message: "Passwords do not match." });
      if (!req.files || req.files.length === 0)
        return res.status(400).json({ message: "Please upload a company logo." });

      // ── Duplicate check (fast path — the DB index is the real guard) ─
      const existing = await Companies.findOne({ companyEmail: email }).exec();
      if (existing)
        return res.status(409).json({ message: "This email is already registered. Try logging in." });

      // ── Upload logo ──────────────────────────────────────────
      const file = req.files[0];
      const uploadResult = await uploadImage(file.buffer, Date.now().toString(), "CompanyLogo");

      // ── Credentials + server-generated verify code ───────────
      const hashed = await hashPassword(companyPassword);   // 👈 bcrypt
      const vfCode = crypto.randomInt(100000, 1000000);     // server decides, never the client

      // ── Create Company + owner Employee as a unit ────────────
      // If the Employee insert fails (e.g. the unique-email index),
      // the Company is rolled back so the email isn't orphaned.
      let saveUser;
      let newEmployee;
      try {
        saveUser = await Companies.create({
          companyName:        companyName.trim(),
          industry:           industry.trim(),
          companyEmail:       email,
          numberofEmployees:  numberofEmployees.trim(),
          companyPassword:    hashed,
          verifyCode:         vfCode,
          companyLogo:        uploadResult.secure_url,
          CloudinaryPublicId: uploadResult.public_id,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        });

        newEmployee = await Employee.create({
          companyId:              saveUser._id.toString(),
          YemplyeeEmail:          email,
          employeeAccessPassword: hashed,
          EmplyeeRoal:            "Owner",   // explicit — owner-shield checks rely on it
        });
      } catch (createErr) {
        // Roll back a half-created account so this email isn't blocked
        if (saveUser?._id) {
          await Companies.deleteOne({ _id: saveUser._id }).catch(() => {});
          // best-effort: also clean the just-uploaded logo
          if (uploadResult?.public_id) {
            try { await deleteResorce(uploadResult.public_id, "image"); } catch {}
          }
        }
        if (createErr.code === 11000) {
          return res.status(409).json({ message: "This email is already registered. Try logging in." });
        }
        console.error("register create error:", createErr.message);
        return res.status(500).json({ message: "Could not create your account. Please try again." });
      }

      // ── Send verification code — non-fatal if it fails ───────
      const mail = await sendVerificationCode(email, vfCode);
      if (!mail.ok) console.error("register: verification email failed —", mail.error);

      // ── Respond: auth cookies + AccessData ───────────────────
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const cookieOpts = { httpOnly: true, secure: true, sameSite: "none", maxAge: oneYearMs };

      const AccessData = {
        companyName: saveUser.companyName,
        companyLogo: saveUser.companyLogo,
        isVerify:    saveUser.isVerify,
      };

      return res
        .status(200)
        .cookie("companyId",  encryptUserData(saveUser._id.toString()),      cookieOpts)
        .cookie("employeeId", encryptUserData(newEmployee._id.toString()),   cookieOpts)
        .json({
          message: mail.ok
            ? "Account created! Check your email for the verification code."
            : "Account created — we couldn't send the email. Use Resend on the verification page.",
          AccessData,
        });

    } catch (err) {
      console.error("register error:", err.message);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });
});
//user register</>


/* ═══════════════════════════════════════════════════════════════
   GET /company/getCompanyProfile
   Returns the caller's own company — safe fields only.
═══════════════════════════════════════════════════════════════ */
router.get("/getCompanyProfile", async (req, res) => {
  try {
    const auth = getCompanyAuth(req);
    if (!auth)
      return res.status(401).json({ message: "Login/Register please!" });

    const company = await Companies
      .findById(auth.companyObjId)
      .select(SAFE_COMPANY_FIELDS);          // 👈 password/verifyCode excluded

    if (!company)
      return res.status(404).json({ message: "Company not found" });

    return res.status(200).json({ message: "ok", data: company });

  } catch (error) {
    console.error("❌ getCompanyProfile error:", error.message);
    return res.status(500).json({ message: "Failed to load company profile" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /company/updateCompanyProfile
   Updates text fields only. Strict whitelist — email, password,
   isVerify, isOnboarded can NEVER be changed through this route.
═══════════════════════════════════════════════════════════════ */
router.patch("/updateCompanyProfile", async (req, res) => {
  try {
    const auth = getCompanyAuth(req);
    if (!auth)
      return res.status(401).json({ message: "Login/Register please!" });

    // ── Whitelist — the ONLY editable fields ────────────────────
    const ALLOWED = ["companyName", "industry", "numberofEmployees"];
    const updates = {};
    for (const field of ALLOWED) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (!Object.keys(updates).length)
      return res.status(400).json({ message: "No valid fields to update" });

    // ── Validation ──────────────────────────────────────────────
    if (updates.companyName !== undefined) {
      if (typeof updates.companyName !== "string" || !updates.companyName.trim())
        return res.status(400).json({ message: "Company name cannot be empty" });
      if (updates.companyName.trim().length > 80)
        return res.status(400).json({ message: "Company name must be under 80 characters" });
      updates.companyName = updates.companyName.trim();
    }

    if (updates.industry !== undefined) {
      if (typeof updates.industry !== "string")
        return res.status(400).json({ message: "Industry must be text" });
      if (updates.industry.trim().length > 60)
        return res.status(400).json({ message: "Industry must be under 60 characters" });
      updates.industry = updates.industry.trim();
    }

    if (updates.numberofEmployees !== undefined) {
      if (typeof updates.numberofEmployees !== "string" || !updates.numberofEmployees.trim())
        return res.status(400).json({ message: "Team size is required" });
      if (updates.numberofEmployees.trim().length > 20)
        return res.status(400).json({ message: "Team size value is too long" });
      updates.numberofEmployees = updates.numberofEmployees.trim();
    }

    // ── Apply ───────────────────────────────────────────────────
    const updated = await Companies
      .findByIdAndUpdate(
        auth.companyObjId,
        { $set: updates },
        { new: true, runValidators: true }
      )
      .select(SAFE_COMPANY_FIELDS);

    if (!updated)
      return res.status(404).json({ message: "Company not found" });

    return res.status(200).json({
      message: "Company profile updated",
      data:    updated,
    });

  } catch (error) {
    console.error("❌ updateCompanyProfile error:", error.message);
    return res.status(500).json({ message: "Failed to update company profile" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /company/updateCompanyLogo
   Multipart route — multer runs first (req.body is empty until it
   parses). Uploads the new logo, updates the doc, then deletes the
   OLD Cloudinary image (non-fatal if that cleanup fails).

   ⚠️ Frontend appends the file as "companyLogo" — make sure your
   multerProcess field config accepts that name (or use .any()).
   Same lesson as the product upload.
═══════════════════════════════════════════════════════════════ */
router.patch("/updateCompanyLogo", async (req, res) => {
  multerProcess(req, res, async (err) => {
    if (err) {
      console.error("❌ multer:", err.message);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    try {
      const auth = getCompanyAuth(req);
      if (!auth)
        return res.status(401).json({ message: "Login/Register please!" });

      // ── File is REQUIRED for this route ───────────────────────
      const file = req.files?.[0];
      if (!file)
        return res.status(400).json({ message: "Please choose an image" });

      if (!file.mimetype?.startsWith("image/"))
        return res.status(400).json({ message: "File must be an image" });

      // ── Fetch current doc — we need the old public id ─────────
      const company = await Companies.findById(auth.companyObjId);
      if (!company)
        return res.status(404).json({ message: "Company not found" });

      const oldPublicId = company.CloudinaryPublicId;

      // ── Upload new logo ───────────────────────────────────────
      const uploadResult = await uploadImage(
        file.buffer,
        Date.now().toString(),
        "CompanyLogo"
      );

      // ── Update doc ────────────────────────────────────────────
      company.companyLogo        = uploadResult.secure_url;
      company.CloudinaryPublicId = uploadResult.public_id;
      await company.save();

      // ── Delete old image — AFTER the new one is saved ─────────
      // Non-fatal: an orphaned image is better than a broken logo.
      if (oldPublicId) {
        try {
          await deleteResorce(oldPublicId);
        } catch (cleanupErr) {
          console.warn("⚠️ Old logo cleanup failed:", cleanupErr.message);
        }
      }

      return res.status(200).json({
        message: "Logo updated",
        data:    { companyLogo: uploadResult.secure_url },
      });

    } catch (error) {
      console.error("❌ updateCompanyLogo error:", error.message);
      return res.status(500).json({ message: "Failed to update logo" });
    }
  });
});

//sende a vefiry code<>
router.post("/verifyCode", async (req, res) => {
  try {
    const { companyId, employeeId } = req.cookies;
    const { verifyCode } = req.body;

    // -------------------------
    // 1. Validate cookies exist
    //--------------------------
    if (!companyId || !employeeId) {
      return res.status(400).json({ message: "Please login or register!" });
    }

    // -------------------------
    // 2. Decrypt IDs
    //--------------------------
    const decryptedCompanyId = decryptUserData(companyId);
    const decryptedEmployeeId = decryptUserData(employeeId);

    if (!decryptedCompanyId || !decryptedEmployeeId) {
      return res.status(400).json({ message: "Invalid or expired session!" });
    }

    // -------------------------
    // 3. Validate input
    //--------------------------
    if (!verifyCode || verifyCode.length !== 6) {
      return res.status(400).json({ message: "Verification code must be 6 digits!" });
    }

    // -------------------------
    // 4. Find Company
    //--------------------------
    const company = await Companies.findById(decryptedCompanyId).select("-companyPassword");
    if (!company) {
      return res.status(404).json({ message: "Company not found!" });
    }

    if (company.verifyCode !== Number(verifyCode)) {
      return res.status(400).json({ message: "Incorrect verification code!" });
    }

    // -------------------------
    // 5. Find Employee
    //--------------------------
    const employee = await Employee.findById(decryptedEmployeeId).select("-employeeAccessPassword");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found!" });
    }

    // -------------------------
    // 6. Verify email (update DB)
    //--------------------------
    await Companies.findByIdAndUpdate(decryptedCompanyId, {
      $set: {
        isVerify: true,  // important: mark verified!
        verifyCode: null // remove code after verification
      }
    });

    // -------------------------
    // 7. Prepare AccessData for AuthContext
    //--------------------------
    const AccessData = {
    
      companyName: company.companyName,
      companyLogo: company.companyLogo,
      employeeId: employee._id,
      employeeName: employee.YemplyeeName,
      employeeRoal: employee.EmplyeeRoal,
      employeeProfile: employee.EmplyeeProfile,
      isVerify: company.isVerify,
    };

    return res.status(200).json({
      message: "Email verified successfully!",
      AccessData,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
//sende a vefiry code</>
//update vefiry code<>
router.put("/updateVfCode", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    const decryptedCompanyId = decryptUserData(companyId);
    if (!decryptedCompanyId || !mongoose.Types.ObjectId.isValid(decryptedCompanyId))
      return res.status(401).json({ message: "Login/Register please!" });
 
    const vfCode = crypto.randomInt(100000, 1000000);   // 👈 server decides
 
    const company = await Companies.findByIdAndUpdate(
      decryptedCompanyId,
      { $set: { verifyCode: vfCode } },
      { new: true }
    );
    if (!company)
      return res.status(404).json({ message: "Company not found" });
 
    if (company.isVerify)
      return res.status(400).json({ message: "This email is already verified." });
 
const mail = await sendVerificationCode(company.companyEmail, vfCode);
if (!mail.ok)
  return res.status(500).json({ message: "Failed to resend verification code!" });
return res.status(200).json({ message: "Verification code resent!" });

} catch (err) {
    console.error("❌ updateVfCode error:", err.message);
    return res.status(500).json({ message: "Failed to resend verification code!" });
  }
});
//update vefiry code</>
router.get("/onboardingStatus", async (req, res) => {
  try {
    const { employeeId, companyId } = req.cookies;
    const newemplyeeId = decryptUserData(employeeId);
    const newcompanyId = decryptUserData(companyId);

    if (!newemplyeeId || !newcompanyId)
      return res.status(401).json({ message: "Login/Register please!" });

    const company = await Companies.findById(newcompanyId, { isOnboarded: 1 });
    if (!company)
      return res.status(404).json({ message: "Company not found" });

    let isOnboarded = company.isOnboarded ?? false;

    // 👇 Auto-heal: flag false but goals already exist
    // (abandoned wizard) → treat as onboarded + persist
    if (!isOnboarded) {
      const goalCount = await MyTarget.countDocuments({ companyId: newcompanyId });
      if (goalCount > 0) {
        isOnboarded = true;
        await Companies.findByIdAndUpdate(newcompanyId, { $set: { isOnboarded: true } });
      }
    }

    return res.status(200).json({ isOnboarded });
  } catch (err) {
    console.error("❌ onboardingStatus error:", err.message);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
//vefiry if user log or not<>
router.get("/vefiryUsersLog", async(req,res) => {
    try{
    const { companyId, employeeId } = req.cookies;
    // Check if cookies exist
    if (!companyId || !employeeId) {
      return res.status(400).json({ message: "Please login or register!" });
    }
        // Decrypt IDs
    const decryptedCompanyId = decryptUserData(companyId);
    const decryptedEmployeeId = decryptUserData(employeeId);

        const company = await Companies.findById(decryptedCompanyId).select("-companyPassword");

        if(!company){
            return res.status(400).json({message:"Register your Company please!"});
        }

        if(!company.isVerify){
            return res.status(400).json({message:"Verify your email"});
        }
        
    // Find employee
    const employee = await Employee.findById(decryptedEmployeeId).select("-employeeAccessPassword");
    if (!employee || !company) {
      return res.status(400).json({ message: "Not Found or not registered!" });
    }
    // Validate company ID
    if (employee.companyId.toString() !== decryptedCompanyId.toString()) {
      return res.status(400).json({ message: "Company and employee do not match!" });
    }
        const AccessData = {
          companyName:company.companyName,
          companyLogo:company.companyLogo,
          employeeId: employee._id,
          employeeName: employee.YemplyeeName,
          employeeRoal: employee.EmplyeeRoal,
          employeeProfile: employee.EmplyeeProfile,
          isVerify: company.isVerify,
      }
    // Success
    return res.status(200).json({ message: "Company and employee verified successfully.", AccessData});
}catch(error){
        console.log(error);
        return res.status(500).json({message:"Something went wrong"});
    }
});
//vefiry if user log or not</>

router.post("/useLogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Fields must not be empty!" });
    }
    const BLOCKED_STATUSES = ["Suspended", "Blocked", "Cancel"];
    let employee = await Employee.findOne({ YemplyeeEmail: email }).select("+employeeAccessPassword");
    if (!employee) {
      return res.status(400).json({ message: "Email or password not match!" });
    }
    if (BLOCKED_STATUSES.includes(employee.EmployeeProfileStatus)) {
      return res.status(403).json({
        message: "Your account access has been restricted. Contact your workspace owner.",
      });
    }

      const dbPass = decryptCompanyPassword(employee.employeeAccessPassword);
      if (password !== dbPass) {
        return res.status(400).json({ message: "Email or password not match!" });
      }
      const comIdStr = employee.companyId.toString();
      const EmployeeComData = await Companies.findById(comIdStr);
      if(!EmployeeComData){
        return res.status(400).json({message:"something wrong!"})
      }
      const encryptedId = encryptUserData(employee._id.toString());
      const encryptedCompanyId = encryptUserData(employee.companyId.toString());
      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const AccessData = {
          companyName:EmployeeComData.companyName,
          companyLogo:EmployeeComData.companyLogo,
          employeeId: employee._id,
          employeeName: employee.YemplyeeName,
          employeeRoal: employee.EmplyeeRoal,
          employeeProfile: employee.EmplyeeProfile,
          isVerify: EmployeeComData.isVerify,
      }
      return res
        .status(200)
        .cookie("employeeId", encryptedId, {

                            httpOnly: true,
                            secure:true,
                            sameSite: "none", 
                            maxAge: oneYearInSeconds * 1000 // Convert seconds to milliseconds
        })
        .cookie("companyId", encryptedCompanyId, {
                            httpOnly: true,
                            secure:true,
                            sameSite: "none", 
                            maxAge: oneYearInSeconds * 1000 // Convert seconds to milliseconds
        })
        .json({
          message: "Employee login successful!",
          AccessData
        });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

//user login </>

//user logout <>

router.get("/logout", (req, res) => {
  try {
    const opts = { httpOnly: true, secure: true, sameSite: "none", path: "/" };
    return res
      .clearCookie("companyId",  opts)
      .clearCookie("employeeId", opts)
      .status(200)
      .json({ message: "You are logged out!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong." });
  }
});
//user logout </>

// ═══════════════════════════════════════════════════════════════
const RESET_TTL_MINUTES = 30;

const STRONG_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// sha256 helper — we store the HASH of the token, never the raw token,
// so a database leak cannot be turned into working reset links
const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

/* ═══════════════════════════════════════════════════════════════
   POST /company/requestPasswordReset
   Body: { email }
   ALWAYS answers 200 with the same message — whether or not the
   email exists — so the route can't be used to discover which
   emails are registered (enumeration protection).
═══════════════════════════════════════════════════════════════ */
router.post("/requestPasswordReset", async (req, res) => {
  const generic = {
    message: "If an account exists for that email, a reset link has been sent.",
  };

  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(200).json(generic);
    }

    const company = await Companies.findOne({ companyEmail: email.trim() });
    if (!company) {
      return res.status(200).json(generic); // 👈 no enumeration
    }

    // ── Generate token: raw goes in the email, HASH goes in the DB ─
    const rawToken = crypto.randomBytes(32).toString("hex");
    company.resetPasswordToken   = hashToken(rawToken);
    company.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await company.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

const mail = await sendPasswordReset(company.companyEmail, resetUrl, RESET_TTL_MINUTES);
if (!mail.ok) console.error("requestPasswordReset: email failed —", mail.error);
return res.status(200).json(generic);

  } catch (error) {
    console.error("❌ requestPasswordReset error:", error.message);
    return res.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /company/resetPassword
   Body: { token, newPassword }
   Verifies the hashed token + expiry, enforces the same strong-
   password rule as registration, updates the Company password AND
   the owner's Employee login credential, then burns the token.
═══════════════════════════════════════════════════════════════ */
router.post("/resetPassword", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== "string")
      return res.status(400).json({ message: "Reset token is missing." });

    if (!newPassword || typeof newPassword !== "string")
      return res.status(400).json({ message: "New password is required." });

    if (!STRONG_PASSWORD.test(newPassword))
      return res.status(400).json({
        message: "Password must be 8+ characters with uppercase, lowercase, a number and a special character (@$!%*?&).",
      });

    // ── Look up by HASH + unexpired ─────────────────────────────
    const company = await Companies.findOne({
      resetPasswordToken:   hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!company)
      return res.status(400).json({
        message: "This reset link is invalid or has expired.",
      });

    // ── Update password + burn the token (single use) ───────────
    const encrypted = encryptCompanyPassword(newPassword);
    company.companyPassword      = encrypted;
    company.resetPasswordToken   = undefined;
    company.resetPasswordExpires = undefined;
    await company.save();

    // ── CRITICAL: sync the OWNER's Employee record ───────────────
    // Your login authenticates against the Employee collection —
    // register created the owner Employee with the same encrypted
    // password. Without this sync, the reset would "succeed" but
    // the owner would still log in with the OLD password.
    await Employee.updateOne(
      {
        companyId:     String(company._id),   // matches string or ObjectId schema
        YemplyeeEmail: company.companyEmail,
      },
      { $set: { employeeAccessPassword: encrypted } }
    );

    return res.status(200).json({
      message: "Password updated. You can now log in with your new password.",
    });

  } catch (error) {
    console.error("❌ resetPassword error:", error.message);
    return res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
});

// PATCH /company/changeCompanyPassword
router.patch("/changeCompanyPassword", async (req, res) => {
  try {
    const auth = getCompanyAuth(req);
    if (!auth) return res.status(401).json({ message: "Login/Register please!" });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Current and new password are required." });

    if (!STRONG_PASSWORD.test(newPassword))
      return res.status(400).json({
        message: "Password must be 8+ characters with uppercase, lowercase, a number and a special character (@$!%*?&).",
      });

    if (currentPassword === newPassword)
      return res.status(400).json({ message: "New password must be different from the current one." });

    // ── Requester must be the OWNER — company credential, owner-only ──
    const requester = await Employee.findById(auth.employeeId);
    if (!requester || String(requester.companyId) !== String(auth.companyId))
      return res.status(403).json({ message: "Not allowed." });
    if (requester.EmplyeeRoal !== "Owner")
      return res.status(403).json({ message: "Only the company owner can change this password." });

    const company = await Companies.findById(auth.companyObjId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // ── Verify current — REUSE THE EXACT COMPARISON YOUR LOGIN USES ──
    // One of these two, depending on your helper:
    const matches = decryptCompanyPassword(company.companyPassword) === currentPassword;
    // const matches = encryptCompanyPassword(currentPassword) === company.companyPassword;
    if (!matches)
      return res.status(400).json({ message: "Current password is incorrect." });

    // ── Update BOTH documents (same sync as the reset flow) ──────────
    const encrypted = encryptCompanyPassword(newPassword);
    company.companyPassword = encrypted;
    await company.save();

    await Employee.updateOne(
      { companyId: String(company._id), YemplyeeEmail: company.companyEmail },
      { $set: { employeeAccessPassword: encrypted } }
    );

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("❌ changeCompanyPassword error:", error.message);
    return res.status(500).json({ message: "Failed to change password." });
  }
});


export default router;