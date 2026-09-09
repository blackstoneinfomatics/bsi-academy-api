import mongoose, { Schema } from "mongoose";
import { IPortal } from "../../types/models.types";
import { PortalStatus, PortalType, RoleType } from "../shared/enum";
import { z } from "zod";

export const PortalSchema = new Schema<IPortal>(
  {
    portalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    portalName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    portalType: {
      type: String,
      enum: Object.values(PortalType),
      default: PortalType.DEFAULT,
      index: true,
    },

    roleType: {
        type: String,
        enum: Object.values(RoleType),
        required: true,
      },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(PortalStatus),
      default: PortalStatus.ACTIVE,
      index: true,
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
    collection: "portal",
    timestamps: true,
  }
);


PortalSchema.index({ portalId: 1 });
PortalSchema.index({ portalType: 1, status: 1 });

export const PortalBaseValidation = z.object({

  portalName: z.string().trim().min(1, "Portal name is required"),

  portalType: z
    .enum([PortalType.DEFAULT, PortalType.CUSTOM])
    .default(PortalType.DEFAULT),

  roleType: 
      z.enum([
        RoleType.ACADEMIC,
        RoleType.ADMINISTRATION,
        RoleType.FINANCE,
        RoleType.TRANSPORT,
        RoleType.HOSTEL,
      ])
    .default(RoleType.ACADEMIC),

  description: z.string().trim().max(500).optional(),


  status: z
    .enum([
      PortalStatus.ACTIVE,
      PortalStatus.INACTIVE,
      PortalStatus.ARCHIVED,
    ])
    .default(PortalStatus.ACTIVE),

  createdBy: z.string().trim().min(1, "Created by is required").optional(),

  updatedBy: z.string().optional(),
});

export default mongoose.model<IPortal>("Portal", PortalSchema);