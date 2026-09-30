import mongoose, { Schema } from "mongoose";
import { ITenantRoomMember } from "../../types/models.types";
import { z } from "zod";

export const TenantRoomMemberSchema = new Schema<ITenantRoomMember>(
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
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    role:{
       type: String,
      required: true,
    },

    lastSeenMessageId: {
      type: Schema.Types.ObjectId,
    },

    lastSeenAt: {
      type: Date,
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
      index: true,
    },
  },
  {
    collection: "tenantroommembers",
    timestamps: true,
  }
);

TenantRoomMemberSchema.index(
  { roomId: 1, userId: 1 },
  { unique: true }
);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const RoomMemberValidation = z.object({
  roomId: objectId,

  userId: z.string().min(1),
  tenantId: z.string().min(1),

  name: z.string().min(1),
  role: z.string().min(1),


  createdBy: z.string().min(1),

  isActive: z.boolean().default(true),
});

export const TenantRoomMemberModel = mongoose.model<ITenantRoomMember>(
  "tenantRoomMembers",
  TenantRoomMemberSchema
);