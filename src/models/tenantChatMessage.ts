import mongoose, { Schema } from "mongoose";
import { ITenantChatMessage } from "../../types/models.types";
import { z } from "zod";
import { ChatMessageType } from "../shared/enum";

export const TenantChatMessageSchema = new Schema<ITenantChatMessage>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    senderId: {
      type: String,
      required: true,
      index: true,
    },

    senderName: {
      type: String,
      required: true,
    },

    senderRole: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    messageType: {
      type: String,
      enum: Object.values(ChatMessageType),
      default: ChatMessageType.TEXT,
    },

    attachments: [{ type: String }],

    replyTo: {
      messageId: { type: Schema.Types.ObjectId },
      message: String,
      senderId: String,
      senderName: String,
    },

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },

    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },

    deletedForEveryoneBy: {
      type: String,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "tenantchatmessages",
    timestamps: true,
  },
);

TenantChatMessageSchema.index({ roomId: 1, createdAt: -1 });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const ChatMessageValidation = z.object({
  roomId: objectId,

  senderId: z.string().min(1),
  senderName: z.string().min(1),
  senderRole: z.string().min(1),

  title: z.string().optional(),
  message: z.string().optional(),

  messageType: z
    .enum([ChatMessageType.TEXT, ChatMessageType.IMAGE, ChatMessageType.FILE])
    .default(ChatMessageType.TEXT),

  attachments: z.array(z.string()).optional(),

  replyTo: z
    .object({
      messageId: objectId,
      message: z.string(),
      senderId: z.string(),
      senderName: z.string(),
    })
    .optional(),
});

export const ChatMessageModel = mongoose.model<ITenantChatMessage>(
  "tenantChatMessages",
  TenantChatMessageSchema,
);
