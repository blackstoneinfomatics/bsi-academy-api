
import mongoose, { Schema } from "mongoose";
import { IUserChatRoom } from "../../types/models.types";
import { z } from "zod";
import {
  ChatRoomStatus,
  ChatRoomType,
  ChatSendAccess,
} from "../shared/enum";

export const UserChatRoomSchema = new Schema<IUserChatRoom>(
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

    // Tenant owning the room
    tenantId: {
      type: String,
      default: null,
      index: true,
    },

    // Used for SEGMENT rooms
    segmentKey: {
      type: String,
      default: null,
      index: true,
    },

    // DIRECT conversations only
    directChatKey: {
      type: String,
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

    // Optional for DIRECT and GROUP rooms
    planName: {
      type: String,
      trim: true,
      default: null,
    },

    lastMessage: {
      messageId: {
        type: Schema.Types.ObjectId,
        default: null,
      },
      message: {
        type: String,
        default: null,
      },
      senderId: {
        type: String,
        default: null,
      },
      senderName: {
        type: String,
        default: null,
      },
      createdAt: {
        type: Date,
        default: null,
      },
    },

    lastMessageAt: {
      type: Date,
      default: null,
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
    collection: "userchatrooms",
    timestamps: true,
  },
);

// General query indexes
UserChatRoomSchema.index({ tenantId: 1, type: 1 });
UserChatRoomSchema.index({ lastMessageAt: -1 });

// One active TENANT room per tenant
UserChatRoomSchema.index(
  { tenantId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: ChatRoomType.TENANT,
      deletedAt: null,
    },
  },
);

// One active room per segment
UserChatRoomSchema.index(
  { segmentKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: ChatRoomType.SEGMENT,
      deletedAt: null,
    },
  },
);

// One active GLOBAL room
// UserChatRoomSchema.index(
//   { type: 1 },
//   {
//     unique: true,
//     partialFilterExpression: {
//       type: ChatRoomType.GLOBAL,
//       deletedAt: null,
//     },
//   },
// );

// One active DIRECT room per user pair within a tenant
UserChatRoomSchema.index(
  { tenantId: 1, directChatKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: ChatRoomType.DIRECT,
      directChatKey: { $type: "string" },
      deletedAt: null,
    },
  },
);

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const UserChatRoomValidation = z.object({
  roomCode: z.string().trim().min(1),

  type: z.enum([
    ChatRoomType.DIRECT,
    ChatRoomType.GROUP,
    ChatRoomType.USER,
    ChatRoomType.TENANT,
    ChatRoomType.SEGMENT,
    ChatRoomType.GLOBAL,
  ]),

  tenantId: z.string().nullable().optional(),

  segmentKey: z.string().nullable().optional(),

  directChatKey: z.string().nullable().optional(),

  name: z.string().trim().min(1),

  description: z.string().max(500).optional(),

  planName: z.string().nullable().optional(),

  sendAccess: z
    .enum([
      ChatSendAccess.ADMIN_ONLY,
      ChatSendAccess.EVERYONE,
    ])
    .default(ChatSendAccess.EVERYONE),

  status: z.enum([
    ChatRoomStatus.ACTIVE,
    ChatRoomStatus.INACTIVE,
    ChatRoomStatus.ARCHIVED,
    ChatRoomStatus.DELETED,
  ]).default(ChatRoomStatus.ACTIVE),

  isEnabled: z.boolean().default(true),

  createdBy: z.string().min(1),
});

export default mongoose.model<IUserChatRoom>(
  "userChatRooms",
  UserChatRoomSchema,
);
