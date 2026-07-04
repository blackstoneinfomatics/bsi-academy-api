import mongoose, { Schema } from "mongoose";
import { appStatus, commonMessages } from "../config/messages";
import { IPackage } from "../../types/models.types";
import { z } from "zod";

// If IPackage is missing or mismatched, update it accordingly
// Assuming IPackage is similar to IExpense with relevant fields

const packageSchema = new Schema<IPackage>(
  {
    tenantId: { type: String, required: true },
    packageName: {
      type: String,
      required: true,
    },
    costPerHour: {
      type: String,
      required: true,
    },
    categories: {
      type: Map,
      of: [String], // Object with category keys and string[] values
      required: true,
    },
    descriptionPoint: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED],
      default: appStatus.ACTIVE,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
    },
    updatedDate: {
      type: Date,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    collection: "package",
    timestamps: false,
  }
);

// Zod Schema
export const zodPackageSchema = z.object({
  tenantId: z.string(),
  packageName: z.string(),
  costPerHour: z.string(),
  categories: z.record(z.string(), z.array(z.string())), // { [category: string]: string[] }
  descriptionPoint: z.string(),
  status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]).optional(),
  createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  createdBy: z.string().optional(),
  updatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  updatedBy: z.string().optional()
});

export default mongoose.model<IPackage>("Package", packageSchema);
