import { Schema } from "mongoose";
import { z } from "zod";
import { Status, PortalType } from "../shared/enum";
import { IFeature } from "../../types/models.types";

export const featureSchema = new Schema<IFeature>(
  {
    featureId: {
      type: String,
      required: true,
    },
    featureName: {
      type: String,
      required: true,
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
  },
  {
    _id: false,
    timestamps: true,
  }
);

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------

export const createFeatureValidation = z.object({
  featureName: z.string().min(1, "Feature name is required"),
  type: z.nativeEnum(PortalType).default(PortalType.DEFAULT),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean(),
  createdBy: z.string().min(1, "Created by is required"),
});

export const updateFeatureValidation = z.object({
  featureName: z.string().min(1, "Feature name is required").optional(),
  type: z.nativeEnum(PortalType).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(Status),
  isEnabled: z.boolean().optional(),
  updatedBy: z.string().min(1, "Updated by is required"),
});

export type CreateFeatureInput = z.infer<typeof createFeatureValidation>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureValidation>;
