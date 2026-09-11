
import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { ModuleSchema } from "./tenantPortalModule";
import { PortalStatus } from "../shared/enum";
import { ITenantPortalConfig } from "../../types/models.types";

export const TenantPortalConfigSchema = new Schema<ITenantPortalConfig>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    portalId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    tenantPortalId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    modules: {
      type: [ModuleSchema],
      default: [],
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

export default mongoose.model<ITenantPortalConfig>(
  "tenantPortalConfig",
  TenantPortalConfigSchema
);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
// The tenant_portal_config document is seeded (as a Default snapshot of Global)
// when the tenant subscribes to a portal - it always already exists by the time
// these APIs are called. These operations only ADD a Custom entry into that
// existing document and enable it; they never create the root document.
// moduleType/childModuleType/featuretype are always forced to PortalType.CUSTOM
// in the operations layer, never accepted from the request payload.

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const statusValidation = z.nativeEnum(PortalStatus);

// Module (Parent)

export const addTenantModuleValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant id is required"),
  portalId: objectId,
  moduleName: z.string().trim().min(1, "Module name is required"),
  orderNo: z.number().int().min(1).optional(),
  moduleStatus: statusValidation,
  createdBy: z.string().trim().min(1, "Created by is required"),
});

export const updateTenantModuleValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant id is required"),
  portalId: objectId,
  moduleName: z.string().trim().min(1, "Module name is required").optional(),
  orderNo: z.number().int().min(1).optional(),
  moduleStatus: statusValidation.optional(),
  updatedBy: z.string().trim().min(1, "Updated by is required"),
});

// Child Module

export const addTenantChildModuleValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant id is required"),
  portalId: objectId,
  childModuleName: z.string().trim().min(1, "Child module name is required"),
  childModuleStatus: statusValidation,
  createdBy: z.string().trim().min(1, "Created by is required"),
});

export const updateTenantChildModuleValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant id is required"),
  portalId: objectId,
  childModuleName: z.string().trim().min(1, "Child module name is required").optional(),
  childModuleStatus: statusValidation.optional(),
  updatedBy: z.string().trim().min(1, "Updated by is required"),
});

// Feature (either directly under a Module, or nested under a Child Module)

export const addTenantFeatureValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant id is required"),
  portalId: objectId,
  featureName: z.string().trim().min(1, "Feature name is required"),
  featureStatus: statusValidation,
  createdBy: z.string().trim().min(1, "Created by is required"),
});

export const updateTenantFeatureValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant id is required"),
  portalId: objectId,
  featureName: z.string().trim().min(1, "Feature name is required").optional(),
  featureStatus: statusValidation.optional(),
  updatedBy: z.string().trim().min(1, "Updated by is required"),
});

// Enable / disable (shared by Module, Child Module and Feature)

export const tenantPortalConfigAccessValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant id is required"),
  portalId: objectId,
  isEnabled: z.boolean(),
  updatedBy: z.string().trim().min(1, "Updated by is required"),
});

export type AddTenantModuleInput = z.infer<typeof addTenantModuleValidation>;
export type UpdateTenantModuleInput = z.infer<typeof updateTenantModuleValidation>;
export type AddTenantChildModuleInput = z.infer<typeof addTenantChildModuleValidation>;
export type UpdateTenantChildModuleInput = z.infer<typeof updateTenantChildModuleValidation>;
export type AddTenantFeatureInput = z.infer<typeof addTenantFeatureValidation>;
export type UpdateTenantFeatureInput = z.infer<typeof updateTenantFeatureValidation>;
export type TenantPortalConfigAccessInput = z.infer<typeof tenantPortalConfigAccessValidation>;