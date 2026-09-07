import mongoose, { Schema, Document } from "mongoose";
import { z } from "zod";
import { Status } from "../shared/enum";
export type ModuleStatus = "Active" | "Inactive";

export interface IFeature {
  featureId: string;
  featureName: string;
  description?: string | null;
  status: ModuleStatus;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChildModule {
  childModuleId: string;
  childModuleName: string;
  description?: string | null;
  status: ModuleStatus;
  isEnabled: boolean;
  features: IFeature[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPortalModule extends Document {
  portal: string;
  parentModuleId: string;
  parentModuleName: string;
  description?: string | null;
  status: ModuleStatus;
  isEnabled: boolean;
  children: IChildModule[];
  createdBy: string;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

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
      enum: ["Active", "Inactive"],
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
      enum: ["Active", "Inactive"],
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
      enum: ["Active", "Inactive"],
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
  status: Status,
  isEnabled: z.boolean(),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateParentModuleValidation = z.object({
  parentModuleName: z.string().min(1, "Parent module name is required").optional(),
  description: z.string().optional(),
  status: Status,
  isEnabled: z.boolean().optional(),
  updatedBy: z.string().min(1, "Updated by is required"),
});

// ---------------------------------------------------------------------------
// Child module
// ---------------------------------------------------------------------------

export const createChildModuleValidation = z.object({
  childModuleName: z.string().min(1, "Child module name is required"),
  description: z.string().optional(),
  status: Status,
  isEnabled: z.boolean(),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateChildModuleValidation = z.object({
  childModuleName: z.string().min(1, "Child module name is required").optional(),
  description: z.string().optional(),
  status: Status,
  isEnabled: z.boolean().optional(),
  updatedBy: z.string().min(1, "Updated by is required"),
});

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------

export const createFeatureValidation = z.object({
  featureName: z.string().min(1, "Feature name is required"),
  description: z.string().optional(),
  status: Status,
  isEnabled: z.boolean(),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateFeatureValidation = z.object({
  featureName: z.string().min(1, "Feature name is required").optional(),
  description: z.string().optional(),
  status: Status,
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
