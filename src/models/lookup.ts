import mongoose, { Schema, Document } from "mongoose";
import { ILookup } from "../../types/models.types";
import { z } from "zod";

const LookupSchema = new Schema<ILookup>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    lookupKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    keyName: {
      type: String,
      required: true,
      trim: true,
    },

    keyValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    dataType: {
      type: String,
      enum: ["string", "number", "boolean"],
      default: "string",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },

    createdBy: {
      type: String,
      required: true,
    },

    lastUpdatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "lookups",
  },
);

export const lookupSchema = z.object({
  tenantId: z.string().min(1),
  lookupKey: z.string().min(1),
  keyName: z.string().min(1),
  keyValue: z.string().min(1),
  dataType: z.enum(["string", "number", "boolean"]).optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  createdBy: z.string().min(1),
  lastUpdatedBy: z.string().min(1),
});

LookupSchema.index(
  { tenantId: 1, lookupKey: 1, keyValue: 1 },
  { unique: true },
);

export const Lookup = mongoose.model<ILookup>("Lookup", LookupSchema);
