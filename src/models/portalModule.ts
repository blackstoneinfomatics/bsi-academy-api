import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { Status, PortalType } from "../shared/enum";
import { IPortalModule } from "../../types/models.types";
import { childModuleSchema } from "./childportal";
import { featureSchema } from "./featuremodule";

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
    order: {
      type: Number,
      required: true,
      default: 0,
      min: 1,
    },
    // Default vs Custom - unrelated to Global vs Tenant scoping.
    type: {
      type: String,
      enum: Object.values(PortalType),
      default: PortalType.DEFAULT,
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
    // Features created directly under the Parent Module (no Child Module in between).
    features: {
      type: [featureSchema],
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

  parentModuleName: z
    .string()
    .min(1, "Parent module name is required"),

  order: z
    .number()
    .int()
    .min(1)
    .optional(),

  type: z
    .nativeEnum(PortalType)
    .default(PortalType.DEFAULT),

  description: z.string().optional(),

  status: z.nativeEnum(Status),

  isEnabled: z.boolean(),

  // Features directly under Parent Module
  features: z
    .array(
      z.object({
        featureId: z.string().min(1, "Feature ID is required"),

        featureName: z
          .string()
          .min(1, "Feature name is required"),

        description: z.string().optional(),

        status: z.nativeEnum(Status),

        isEnabled: z.boolean()
      })
    )
    .optional()
    .default([]),

  createdBy: z
    .string()
    .min(1, "Created by is required")
});

export const updateParentModuleValidation = z.object({
  parentModuleName: z.string().min(1, "Parent module name is required").optional(),
  order: z.number().int().min(1).optional(),
  type: z.nativeEnum(PortalType).optional(),
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
export type UpdateAccessInput = z.infer<typeof updateAccessValidation>;

export default mongoose.model<IPortalModule>("PortalModule", portalModuleSchema);
