// routes/conversation.js
import express from "express";
import Conversation from "../models/Conversation.js";
// import Employee from "../models/Employee.js"; // for validation if needed
// import Message from "../models/Message.js"; // optional
import{decryptUserData} from '../verifyuser.js';
// import authMiddleware if you have one that sets req.companyId
import mongoose from "mongoose";
import multerProcess from '../multerMiddleware.js';

import Message from "../models/Message.js";
import { uploadImage } from '../cloudinary.js';

const router = express.Router();

router.post("/newConverSation", async (req, res) => {
  try {
    const { companyId, employeeId } = req.cookies;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });
    const companyIdDecripted = decryptUserData(companyId);
    const userIdDecripted = decryptUserData(employeeId);
    
    const { type = "", participants = [], title = "", avatar = "" } = req.body;
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ message: "participants array required" });
    }
    // ensure all participant ids are valid ObjectIds
    const normalized = participants.map(id =>
  mongoose.Types.ObjectId.createFromHexString(id)
);


    if (type === "private") {
      if (normalized.length !== 2) {
        return res.status(400).json({ message: "Private conversation requires exactly 2 participants" });
      }

        const existing = await Conversation.findOne({
          companyId: companyIdDecripted,
          type: "private",
          participants: {
            $all: [
              { $elemMatch: { employeeId: normalized[0] } },
              { $elemMatch: { employeeId: normalized[1] } }
            ]
          }
        });
      if (existing){
         const messages = await Message.find({
          conversationId: existing._id,
          companyId: companyIdDecripted,
        }).sort({ createdAt: 1 });

        return res.status(200).json({
          conversation: existing,
          messages,
        });
      };

      // create new private conversation
      const partDocs = normalized.map((empId, idx) => ({
        employeeId: empId,
        role: "member",
        joinedAt: new Date()
      }));

      const convo = await Conversation.create({
        companyId: companyIdDecripted,
        type: "private",
        participants: partDocs
      });
        const messages = await Message.find({ conversationId: convo._id })
          .sort({ createdAt: 1 });
      return res.status(201).json({ messages, conversation: convo });
    }

    // GROUP chat creation
    // make sure at least one admin (the creator)
    // if creator isn't included, add them as admin
const existing = await Conversation.findOne({
    companyId: companyIdDecripted,
    type: "group",
  }).lean();

  if (existing) {
    const existingIds = new Set(existing.participants.map(p => String(p.employeeId)));
    const filtered = normalized.filter(id => !existingIds.has(String(id)));

    if (filtered.length > 0) {
      const ops = filtered.map(empId => ({
        updateOne: {
          filter: { _id: existing._id, "participants.employeeId": { $ne: empId } },
          update: {
            $push: {
              participants: { employeeId: empId, role: "member", joinedAt: new Date() }
            }
          }
        }
      }));

      await Conversation.bulkWrite(ops);
    }

    const [updatedConversation, messages] = await Promise.all([
      Conversation.findById(existing._id).lean(),
      Message.find({ conversationId: existing._id, companyId: companyIdDecripted })
               .sort({ createdAt: 1 }).lean(),
    ]);

    return res.status(200).json({ conversation: updatedConversation, messages });
  }
        const creatorEmployeeId = String(userIdDecripted); // optional if you pass it

const creator = mongoose.Types.ObjectId.isValid(creatorEmployeeId)
  ? new mongoose.Types.ObjectId(creatorEmployeeId)
  : null;

    const uniqueParticipantIds = [...new Map(normalized.map(id => [String(id), id])).values()];
    if (!creator) {
  return res.status(400).json({ message: "Invalid creator ID" });
}

if (
  creator &&
  !uniqueParticipantIds.some(x => x.equals(creator))
) {
  uniqueParticipantIds.unshift(creator);
}
    // build participant docs: first one -> admin
    const parts = uniqueParticipantIds.map((empId, idx) => ({
      employeeId: empId,
      role: idx === 0 ? "admin" : "member",
      joinedAt: new Date()
    }));

    const groupConvo = await Conversation.create({
      companyId: companyIdDecripted,
      type: "group",
      title,
      avatar,
      participants: parts
    });
    const messages = await Message.find({ conversationId: groupConvo._id })
      .sort({ createdAt: 1 });

    return res.status(201).json({ messages, conversation: groupConvo });

  } catch (err) {
    console.error("create convo error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/**
 * Get all conversations for current employee (paginated)
 * Query params: page, limit
 */
router.get("/my", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });
    const companyIdDecripted = decryptUserData(companyId);

    // you might track employee id in cookie or decrypt to get it; I'll assume req.query.employeeId OR user cookie maps to employee id
    const employeeId = req.query.employeeId || req.body.employeeId || null; // ideally from auth

    if (!employeeId) return res.status(400).json({ message: "employeeId required (from session)" });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(10, parseInt(req.query.limit || "20", 10));
    const skip = (page - 1) * limit;

    const convos = await Conversation.find({
      companyId : companyIdDecripted,
      "participants.employeeId": employeeId
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({ data: convos, page, limit });
  } catch (err) {
    console.error("get my convos error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/**
 * Get conversation by id (and optionally populate participants)
 */
router.get("/:conversationId", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });
    const companyIdDecripted = decryptUserData(companyId);

    const { conversationId } = req.params;
    const convo = await Conversation.findOne({ _id: conversationId, companyId: companyIdDecripted })
      .populate("participants.employeeId", "empName EmplyeeProfile empEmail")
      .populate("lastMessage.messageId")
      .lean();

    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    return res.status(200).json({ data: convo });
  } catch (err) {
    console.error("get convo error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/updateGroupInfo/:conversationId", (req, res) => {
  multerProcess(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const { companyId } = req.cookies;
      if (!companyId) return res.status(401).json({ message: "Unauthorized" });

      const companyIdDecripted = decryptUserData(companyId);

      const { conversationId } = req.params;
      const { title, actorEmployeeId } = req.body;
      const files = req.files;

      // 🔴 admin check
      if (!actorEmployeeId) {
        return res.status(400).json({
          message: "actorEmployeeId required to verify admin role",
        });
      }

      const convo = await Conversation.findOne({
        _id: conversationId,
        companyId: companyIdDecripted,
      });

      if (!convo) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const actor = convo.participants.find(
        (p) => String(p.employeeId) === String(actorEmployeeId)
      );

      if (!actor || actor.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: admin only" });
      }

      // ============================
      // ✅ HANDLE FILE UPLOAD
      // ============================
      if (files && files.length > 0) {
        const file = files[0];

        const result = await uploadImage(
          file.buffer,
          `group_${conversationId}`, // file name
          "groupAvatar"              // folder name
        );

        convo.avatar = result.secure_url; // ✅ save Cloudinary URL
      }

      // ============================
      // ✅ HANDLE TITLE UPDATE
      // ============================
      if (title !== undefined && title.trim() !== "") {
        convo.title = title;
      }

      await convo.save();

      return res.status(200).json({message: "updated"});

    } catch (err) {
      console.error("update convo error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });
});


router.put("/updatePerticipent/:conversationId", async(req, res) => {

    try {
      const { companyId } = req.cookies;
      if (!companyId) return res.status(401).json({ message: "Unauthorized" });

      const companyIdDecripted = decryptUserData(companyId);

      const { conversationId } = req.params;
      const {isMuted, actorEmployeeId } = req.body;

      const updated = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        companyId: companyIdDecripted,
        "participants.employeeId": actorEmployeeId,
      },
      {
        $set: { "participants.$.isMuted": isMuted },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Conversation or participant not found." });
    }
    // Return only the updated participant for a leaner response
    const updatedParticipant = updated.participants.find(
      (p) => p.employeeId.toString() === actorEmployeeId
    );

    res.status(200).json({
      message: "Mute status updated successfully.",
      participant: updatedParticipant,
    });

    } catch (err) {
      console.error("update convo error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });


router.post("/:conversationId/participants", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });
    const companyIdDecripted = decryptUserData(companyId);

    const { conversationId } = req.params;
    const { employeeId, actorEmployeeId, role = "member" } = req.body;
    if (!employeeId || !actorEmployeeId) return res.status(400).json({ message: "employeeId & actorEmployeeId required" });

    const convo = await Conversation.findOne({ _id: conversationId, companyId: companyIdDecripted });
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    const actor = convo.participants.find(p => String(p.employeeId) === String(actorEmployeeId));
    if (!actor || actor.role !== "admin") return res.status(403).json({ message: "Forbidden: admin only" });

    // avoid duplicates
    const already = convo.participants.find(p => String(p.employeeId) === String(employeeId));
    if (already) return res.status(400).json({ message: "Participant already in conversation" });

    convo.participants.push({ employeeId, role, joinedAt: new Date() });
    await convo.save();

    return res.status(200).json({ message: "Participant added", conversation: convo });
  } catch (err) {
    console.error("add participant error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/**
 * Remove participant from group conversation (admin or self removal)
 * actorEmployeeId is the one performing the removal (admin or same as employeeId)
 */
router.delete("/:conversationId/participants/:employeeId", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });
    const companyIdDecripted = decryptUserData(companyId);

    const { conversationId, employeeId } = req.params;
    const { actorEmployeeId } = req.body; // who is attempting removal

    const convo = await Conversation.findOne({ _id: conversationId, companyId: companyIdDecripted });
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    // allow removal if actor is admin OR actor === employee being removed
    const actor = convo.participants.find(p => String(p.employeeId) === String(actorEmployeeId));
    if (!actor) return res.status(403).json({ message: "Actor not authorized" });

    if (String(actor.employeeId) !== String(employeeId) && actor.role !== "admin") {
      return res.status(403).json({ message: "Only admin can remove others" });
    }

    // remove participant
    convo.participants = convo.participants.filter(p => String(p.employeeId) !== String(employeeId));
    await convo.save();

    return res.status(200).json({ message: "Participant removed", conversation: convo });
  } catch (err) {
    console.error("remove participant error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});


export default router;
