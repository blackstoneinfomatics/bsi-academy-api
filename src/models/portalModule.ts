import mongoose, { Schema, Document } from "mongoose";
import { z } from "zod";
import { Status } from "../shared/enum";
import { IChildModule, IFeature, IPortalModule } from "../../types/models.types";



const featureSchema = new Schema<IFeature>(
  {
    featureId: {
      type: String,
      required: true,
    },
    featureName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(Status),
      required: true,
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);

const childModuleSchema = new Schema<IChildModule>(
  {
    childModuleId: {
      type: String,
      required: true,
    },
    childModuleName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(Status),
      required: true,
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    features: {
      type: [featureSchema],
      default: [],
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);

const portalModuleSchema = new Schema<IPortalModule>(
  {
    portal: {
      type: String,
      required: true,
      trim: true,
    },
    parentModuleId: {
      type: String,
      required: true,
      unique: true,
    },
    parentModuleName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(Status),
      required: true,
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    children: {
      type: [childModuleSchema],
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
    },
  },
  {
    collection: "portalmodules",
    timestamps: true,
  }
);





// ---------------------------------------------------------------------------
// Parent module
// ---------------------------------------------------------------------------

export const createParentModuleValidation = z.object({
  portal: z.string().min(1, "Portal is required"),
  parentModuleName: z.string().min(1, "Parent module name is required"),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean(),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateParentModuleValidation = z.object({
  parentModuleName: z.string().min(1, "Parent module name is required").optional(),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean().optional(),
  updatedBy: z.string().min(1, "Updated by is required"),
});

// ---------------------------------------------------------------------------
// Child module
// ---------------------------------------------------------------------------

export const createChildModuleValidation = z.object({
  childModuleName: z.string().min(1, "Child module name is required"),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean(),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateChildModuleValidation = z.object({
  childModuleName: z.string().min(1, "Child module name is required").optional(),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean().optional(),
  updatedBy: z.string().min(1, "Updated by is required"),
});

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------

export const createFeatureValidation = z.object({
  featureName: z.string().min(1, "Feature name is required"),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean(),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateFeatureValidation = z.object({
  featureName: z.string().min(1, "Feature name is required").optional(),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean().optional(),
  updatedBy: z.string().min(1, "Updated by is required"),
});

// ---------------------------------------------------------------------------
// Enable / disable (shared by parent, child and feature)
// ---------------------------------------------------------------------------

export const updateAccessValidation = z.object({
  isEnabled: z.boolean(),
  updatedBy: z.string().min(1, "Updated by is required"),
});

export type CreateParentModuleInput = z.infer<typeof createParentModuleValidation>;
export type UpdateParentModuleInput = z.infer<typeof updateParentModuleValidation>;
export type CreateChildModuleInput = z.infer<typeof createChildModuleValidation>;
export type UpdateChildModuleInput = z.infer<typeof updateChildModuleValidation>;
export type CreateFeatureInput = z.infer<typeof createFeatureValidation>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureValidation>;
export type UpdateAccessInput = z.infer<typeof updateAccessValidation>;


export default mongoose.model<IPortalModule>("PortalModule", portalModuleSchema);
