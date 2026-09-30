import mongoose, { Schema } from "mongoose";
import { ITenantChatRoom } from "../../types/models.types";
import { z } from "zod";
import { ChatRoomStatus, ChatRoomType, ChatSendAccess } from "../shared/enum";

export const TenantChatRoomSchema = new Schema<ITenantChatRoom>(
  {
    roomCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    type: {
      type: String,
      enum: Object.values(ChatRoomType),
      required: true,
      index: true,
    },

    tenantIds: {
      type: [String],
      default: [],
      index: true,
    },

    segmentKey: {
      type: String,
      index: true,
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    planName: {
      type: String,
      required: true,
      trim: true,
    },

    lastMessage: {
      messageId: { type: Schema.Types.ObjectId },
      message: String,
      senderId: String,
      senderName: String,
      createdAt: Date,
    },

    lastMessageAt: {
      type: Date,
      index: true,
    },

    sendAccess: {
      type: String,
      enum: Object.values(ChatSendAccess),
      default: ChatSendAccess.EVERYONE,
    },

    status: {
      type: String,
      enum: Object.values(ChatRoomStatus),
      default: ChatRoomStatus.ACTIVE,
      index: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: String,
      required: true,
    },

    updatedBy: {
      type: String,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: "tenantchatrooms",
    timestamps: true,
  },
);

TenantChatRoomSchema.index({ tenantId: 1, type: 1 });
TenantChatRoomSchema.index(
  { type: 1, segmentKey: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const TenantChatRoomValidation = z.object({
  roomCode: z.string().min(1),

  type: z.enum([
    ChatRoomType.GLOBAL,
    ChatRoomType.SEGMENT,
    ChatRoomType.TENANT,
    ChatRoomType.USER,
  ]),

  tenantIds: z.array(z.string()),

  segmentKey: z.string().optional(),

  name: z.string().min(1),

  description: z.string().max(500).optional(),

  planName: z.string().min(1),

  sendAccess: z
    .enum([ChatSendAccess.ADMIN_ONLY, ChatSendAccess.EVERYONE])
    .default(ChatSendAccess.EVERYONE),

  status: z
    .enum([
      ChatRoomStatus.ACTIVE,
      ChatRoomStatus.INACTIVE,
      ChatRoomStatus.ARCHIVED,
      ChatRoomStatus.DELETED,
    ])
    .default(ChatRoomStatus.ACTIVE),
  isEnabled: z.boolean().default(true),

  createdBy: z.string().min(1),
});

export default mongoose.model<ITenantChatRoom>(
  "tenantChatRooms",
  TenantChatRoomSchema,
);
