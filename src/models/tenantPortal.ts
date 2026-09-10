import mongoose, { Schema, Types } from "mongoose";
import { ITenantPortal } from "../../types/models.types";
import { PortalStatus, PortalType } from "../shared/enum";
import { z } from "zod";

export const TenantPortalSchema = new Schema<ITenantPortal>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    portalId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    portalCode: {
      type: String,
      required: true,
      trim: true,
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
      required: true,
      index: true,
    },

    userLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(PortalStatus),
      default: PortalStatus.ACTIVE,
      index: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
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
    collection: "tenant_portal",
    timestamps: true,
  }
);

TenantPortalSchema.index({ tenantId: 1, portalId: 1 }, { unique: true });
TenantPortalSchema.index({ status: 1, isEnabled: 1 });


export default mongoose.model<ITenantPortal>(
  "tenantPortal",
  TenantPortalSchema
);

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const TenantPortalBaseValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant ID is required"),

  subscriptionId: objectId,

  portalId: objectId,

  portalCode: z.string().trim().min(1, "Portal code is required"),

  portalName: z.string().trim().min(1, "Portal name is required"),

  portalType: z
    .enum([PortalType.DEFAULT, PortalType.CUSTOM])
    .default(PortalType.DEFAULT),

  userLimit: z.number().min(0).default(0),

  status: z
    .enum([
      PortalStatus.ACTIVE,
      PortalStatus.INACTIVE,
      PortalStatus.ARCHIVED,
    ])
    .default(PortalStatus.ACTIVE),

  isEnabled: z.boolean().default(true),

  description: z.string().trim().max(500).optional(),

  createdBy: z.string().trim().min(1, "Created by is required"),

  updatedBy: z.string().optional(),
});