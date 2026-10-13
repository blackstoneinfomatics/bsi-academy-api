
import mongoose, { Schema } from "mongoose";
import { IUserChatRoomMember } from "../../types/models.types";
import { z } from "zod";
import { ChatGroupRole } from "../shared/enum";



export const userChatRoomMemberSchema = new Schema<IUserChatRoomMember>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
    },

    course:{
      type:String,
       required: false,
       trim: true,
      default:null,
    },

    groupRole: {
      type: String,
      enum: Object.values(ChatGroupRole),
      default: ChatGroupRole.MEMBER,
      required: true,
    },

    lastSeenMessageId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },

    lastClearedMessageId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    lastClearedAt: {
      type: Date,
      default: null,
    },

    isActive: {
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
    },
  },
  {
    collection: "userchatroommembers",
    timestamps: true,
  },
);

// One membership per user per room, including soft-deleted memberships
userChatRoomMemberSchema.index(
  { roomId: 1, userId: 1 },
  { unique: true },
);

userChatRoomMemberSchema.index({
  tenantId: 1,
  userId: 1,
  isActive: 1,
  deletedAt: 1,
});

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const RoomMemberValidation = z.object({
  roomId: objectId,
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().trim().min(1),
  role: z.string().min(1),
  course: z.string().min(1).optional(),
  groupRole: z
    .enum([ChatGroupRole.ADMIN, ChatGroupRole.MEMBER])
    .default(ChatGroupRole.MEMBER),

  createdBy: z.string().min(1),
  isActive: z.boolean().default(true),
});

export const UserRoomMemberModel = mongoose.model<IUserChatRoomMember>(
  "userChatRoomMembers",
  userChatRoomMemberSchema,
);
