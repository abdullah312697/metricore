import express from "express";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { decryptUserData } from '../verifyuser.js';
import multerProcess from '../multerMiddleware.js';
import { uploadImage } from '../cloudinary.js';
import { getIO } from "../socket/socket.js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import {generatePublicId} from '../reuseableFn.js';

ffmpeg.setFfmpegPath(ffmpegPath);
const router = express.Router();

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const getFileType = (mime) => {
  if (!mime || typeof mime !== "string") return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/msword" || mime.includes("wordprocessingml")) return "word";
  if (mime === "application/vnd.ms-excel" || mime.includes("spreadsheetml")) return "excel";
  if (mime === "application/vnd.ms-powerpoint" || mime.includes("presentationml")) return "powerpoint";
  if (mime.startsWith("text/")) return "text";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return "archive";
  return "file";
};
const getBaseName = (name = "") => name.replace(/\.[^/.]+$/, "");

const convertToMp3 = (inputPath) => {
  return new Promise((resolve, reject) => {
    const outputPath = `${inputPath}.mp3`;
    ffmpeg(inputPath)
      .toFormat("mp3")
      .audioBitrate(128)
      .on("end", () => {
        try { fs.unlinkSync(inputPath); } catch (err) { console.warn("Could not delete original:", err.message); }
        resolve(outputPath);
      })
      .on("error", (err) => { console.error("FFmpeg error:", err); reject(err); })
      .save(outputPath);
  });
};


/* ─────────────────────────────────────────
   POST /newMessage
───────────────────────────────────────── */
router.post("/newMessage", async (req, res) => {
  multerProcess(req, res, async (err) => {
    if (err) return res.json({ message: err.message });

    try {
      const files = req.files;
      const { conversationId, senderId, content } = req.body;
      // ── Validation ──
      if (!conversationId || !senderId) {
        return res.status(400).json({ message: "conversationId and senderId required" });
      }
      if (!content && (!files || files.length === 0)) {
        return res.status(400).json({ message: "Message content or file required" });
      }

      const conv = await Conversation.findById(conversationId).lean();
      if (!conv) return res.status(404).json({ message: "Conversation not found" });

      const isParticipant = conv.participants.some(
        (p) => String(p.employeeId) === String(senderId)
      );
      if (!isParticipant) return res.status(403).json({ message: "Not a participant" });

      // ── Socket reference ──
      const io = getIO();
      const socketRoom = `conversation_${conversationId}`;

      let uploadedFiles = [];
      let messageType = "text";

      // ── File uploads ──
      if (files && files.length > 0) {
        const totalFiles = files.length;
        let completedFiles = 0;

        // 🔔 Phase 1: notify clients upload is starting
        io.to(socketRoom).emit("uploadProgress", {
          senderId,
          phase: "uploading",
          overallPercent: 0,
          totalFiles,
          completedFiles: 0,
        });

        const uploadResults = await Promise.all(
          files.map(async (file, fileIndex) => {
            let newFile = file.buffer;
            let tempPath = null;
            let mp3Path = null;
            const originalName = file.originalname || "file";
            let publicId = generatePublicId(originalName);

            try {
              // ── Convert non-mp3 audio to mp3 ──
              if (
                file.mimetype.startsWith("audio/") &&
                file.mimetype !== "audio/mpeg"
              ) {
                const uploadDir = "uploads";
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

                tempPath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}_${originalName}`;
                fs.writeFileSync(tempPath, file.buffer);
                mp3Path = await convertToMp3(tempPath);
                newFile = fs.readFileSync(mp3Path);
                publicId = generatePublicId(`${getBaseName(originalName)}.mp3`);
              }

              // 🔔 Upload to Cloudinary WITH progress callback
              const result = await uploadImage(
                newFile,
                publicId,
                `messages/${conversationId}`,
                (cloudinaryPercent) => {
                  // Each file gets an equal share of the 100%
                  const fileShare = 100 / totalFiles;
                  const overallPercent = Math.round(
                    completedFiles * fileShare +
                    (cloudinaryPercent / 100) * fileShare
                  );

                  io.to(socketRoom).emit("uploadProgress", {
                    senderId,
                    phase: "uploading",
                    overallPercent,
                    totalFiles,
                    completedFiles,
                    currentFile: fileIndex,
                  });
                }
              );

              completedFiles++;
              return result;

            } catch (err) {
              console.error("File processing error:", err);
              // Fallback upload without progress
              return await uploadImage(file.buffer, publicId, `messages/${conversationId}`);

            } finally {
              try {
                if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                if (mp3Path && fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
              } catch (e) {
                console.warn("Cleanup failed:", e.message);
              }
            }
          })
        );

        // ── Build uploadedFiles array ──
        uploadedFiles = uploadResults.map((result, index) => {
          const file = files[index];
          let detectedType = getFileType(file.mimetype);
          let originalName = file.originalname || "file";
        const isAudio = file.mimetype.startsWith("audio/");
        const needsConversion = isAudio && file.mimetype !== "audio/mpeg";
          if (needsConversion) {
            originalName = `${getBaseName(originalName)}.mp3`;
          }

          return {
            mediaUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
            messageType: detectedType,
            fullName: originalName,
          };
        });

        messageType = uploadedFiles.length >= 1 ? uploadedFiles[0].messageType : "text";

        // 🔔 Phase 2: all files uploaded, now saving to DB
        io.to(socketRoom).emit("uploadProgress", {
          senderId,
          phase: "processing",
          overallPercent: 100,
          totalFiles,
          completedFiles: totalFiles,
        });
      }

      // ── Save message to MongoDB ──
      const message = await Message.create({
        companyId: conv.companyId,
        conversationId,
        senderId,
        content: content || "",
        messageType,
        media: uploadedFiles,
      });

      // ── Update conversation lastMessage ──
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          messageId: message._id,
          text: content || messageType,
          senderId,
          sentAt: message.createdAt,
          messageType,
          media: uploadedFiles,
        },
        updatedAt: new Date(),
      });

      // 🔔 Broadcast new message to room
      io.to(socketRoom).emit("newMessage", message);

      // 🔔 Upload fully done — clear progress bar on sender's side
      io.to(socketRoom).emit("uploadProgress", {
        senderId,
        phase: "done",
        overallPercent: 100,
      });

      return res.status(201).json({ message: "Message sent", data: message });

    } catch (err) {
      console.error("send message error:", err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });
});

/* ─────────────────────────────────────────
   GET /:conversationId  (paginated)
───────────────────────────────────────── */
router.get("/:conversationId", async (req, res) => {
  try {
    const { companyId } = req.cookies;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });
    const companyIdDecripted = decryptUserData(companyId);

    const { conversationId } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const skip = (page - 1) * limit;

    const messages = await Message.find({ companyId: companyIdDecripted, conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({ data: messages.reverse(), page, limit });
  } catch (err) {
    console.error("fetch messages error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

/* ─────────────────────────────────────────
   PUT /delivered
───────────────────────────────────────── */
// router.put("/delivered", async (req, res) => {
//   try {
//     const { messageIds, employeeId } = req.body;
//     if (!Array.isArray(messageIds) || !employeeId)
//       return res.status(400).json({ message: "messageIds[] and employeeId required" });

//     await Message.updateMany(
//       { _id: { $in: messageIds }, deliveredTo: { $ne: employeeId } },
//       { $push: { deliveredTo: employeeId }, $set: { status: "delivered" } }
//     );

//     return res.status(200).json({ message: "Messages marked delivered" });
//   } catch (err) {
//     console.error("deliver update error:", err);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// });
// PUT /delivered
router.put("/delivered", async (req, res) => {
  try {
    const { conversationId, employeeId, lastDeliveredMessageId } = req.body;

    if (!conversationId || !employeeId || !lastDeliveredMessageId) {
      return res.status(400).json({
        message: "conversationId, employeeId, lastDeliveredMessageId required"
      });
    }

    const updated = await Conversation.updateOne(
      {
        _id: conversationId,
        "participants.employeeId": employeeId
      },
      {
        $set: {
          "participants.$.lastDeliveredMessageId": lastDeliveredMessageId
        }
      }
    );

    return res.status(200).json({
      message: "Delivered updated",
      updated
    });

  } catch (err) {
    console.error("delivered update error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
/* ─────────────────────────────────────────
   PUT /seen
───────────────────────────────────────── */
// router.put("/seen", async (req, res) => {
//   try {
//     const { messageIds, employeeId } = req.body;
//     if (!Array.isArray(messageIds) || !employeeId)
//       return res.status(400).json({ message: "messageIds[] and employeeId required" });

//     await Message.updateMany(
//       { _id: { $in: messageIds }, seenBy: { $ne: employeeId } },
//       { $push: { seenBy: employeeId }, $set: { status: "seen" } }
//     );

//     return res.status(200).json({ message: "Messages marked seen" });
//   } catch (err) {
//     console.error("seen update error:", err);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// });
// PUT /seen
router.put("/seen", async (req, res) => {
  try {
    const { conversationId, employeeId, lastSeenMessageId } = req.body;

    if (!conversationId || !employeeId || !lastSeenMessageId) {
      return res.status(400).json({
        message: "conversationId, employeeId, lastSeenMessageId required"
      });
    }

    const updated = await Conversation.updateOne(
      {
        _id: conversationId,
        "participants.employeeId": employeeId
      },
      {
        $set: {
          "participants.$.lastReadMessageId": lastSeenMessageId,
          "participants.$.lastReadAt": new Date()
        }
      }
    );

    return res.status(200).json({
      message: "Seen updated",
      updated
    });

  } catch (err) {
    console.error("seen update error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;