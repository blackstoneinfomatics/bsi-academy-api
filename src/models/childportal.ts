import { Schema } from "mongoose";
import { z } from "zod";
import { Status } from "../shared/enum";
import { IChildModule } from "../../types/models.types";
import { featureSchema } from "./featuremodule";

export const childModuleSchema = new Schema<IChildModule>(
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

export type CreateChildModuleInput = z.infer<typeof createChildModuleValidation>;
export type UpdateChildModuleInput = z.infer<typeof updateChildModuleValidation>;
