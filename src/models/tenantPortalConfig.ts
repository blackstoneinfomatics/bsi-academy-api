
import mongoose, { Schema, Types } from "mongoose";
import { ModuleSchema } from "./tenantPortalModule";

export const TenantPortalConfigSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    portalId: {
      type: Types.ObjectId,
      required: true,
      index: true,
    },

    tenantPortalId: {
      type: Types.ObjectId,
      required: true,
      index: true,
    },

    modules: [ModuleSchema],

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
    collection: "tenantPortalConfig",
    timestamps: true,
  }
);

TenantPortalConfigSchema.index({ tenantId: 1 });

TenantPortalConfigSchema.index({ portalId: 1 });

TenantPortalConfigSchema.index({ tenantPortalId: 1 });

TenantPortalConfigSchema.index(
  { tenantId: 1, portalId: 1 },
  { unique: true }
);

TenantPortalConfigSchema.index({ deletedAt: 1 });

TenantPortalConfigSchema.index({
  tenantId: 1,
  deletedAt: 1,
});

export default mongoose.model(
  "tenantPortalConfig",
  TenantPortalConfigSchema
);