// models/Conversation.js
import mongoose from "mongoose";
const { Schema } = mongoose;

// participant schema (export so other models could reuse if needed)
export const participantSchema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
  lastReadMessageId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
  lastDeliveredMessageId: { type: Schema.Types.ObjectId, ref: "Message", default: null },
  lastReadAt: {type: Date, default: null},
  isMuted: { type: Boolean, default: false }
}, { _id: false }); // participants are subdocs; keep single object _id out (optional)

const conversationSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Companies", required: true }, // scope to company
  type: { type: String, enum: ["private", "group"], default: "private" },
  title: { type: String, default: "" },    // group name (for group chats)
  avatar: { type: String, default: "" },   // group icon url
  participants: { type: [participantSchema], default: [] },
  lastMessage: {
    messageId: { type: Schema.Types.ObjectId, ref: "Message" },
    text: { type: String },
    senderId:{type: String},
    sentAt: { type: Date },
    messageType: {type:String},
    media: [
              {
                mediaUrl: String,
                cloudinaryPublicId: String,
                messageType: String
              }
           ],
  }
}, { timestamps: true });

// Indexes for common queries
conversationSchema.index({ companyId: 1 });
conversationSchema.index({ "participants.employeeId": 1 });
conversationSchema.index({ type: 1, companyId: 1 });

export default mongoose.model("Conversation", conversationSchema);
