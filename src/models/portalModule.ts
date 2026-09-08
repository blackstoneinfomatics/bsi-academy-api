import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { Status } from "../shared/enum";
import { IPortalModule } from "../../types/models.types";
import { childModuleSchema } from "./childportal";

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
