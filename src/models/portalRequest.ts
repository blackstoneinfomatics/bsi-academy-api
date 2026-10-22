import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IPortalRequest } from "../../types/models.types";
import { RequestStatus } from "../shared/enum";

export const portalRequestValidation = z
  .discriminatedUnion("requestType", [
    z
      .object({
        tenantId: z.string().trim().min(1),
        tenantName: z.string().trim().min(1),
        requestType: z.literal("ADD_PORTAL"),
        portalId: z.string().optional(),
        portalName: z.string().trim().min(1).max(200),
        requestReason: z.string().trim().min(1).max(5000),
      })
      .strict(),

    z
      .object({
        tenantId: z.string().trim().min(1),
        tenantName: z.string().trim().min(1),
        requestType: z.literal("DISABLE_PORTAL"),
        portalId: z.string().trim().min(1),
        portalName: z.string().trim().min(1).max(200),
        requestReason: z.string().trim().min(1).max(5000),
      })
      .strict(),

    z
      .object({
        tenantId: z.string().trim().min(1),
        tenantName: z.string().trim().min(1),
        requestType: z.literal("ADD_FEATURE"),
        portalId: z.string().trim().min(1),
        portalName: z.string().trim().min(1).max(200),
        featureId: z.string().trim().min(1).optional(),
        featureName: z.string().trim().min(1).max(200),
        requestReason: z.string().trim().min(1).max(5000),
      })
      .strict(),

    z
      .object({
        tenantId: z.string().trim().min(1),
        tenantName: z.string().trim().min(1),
        requestType: z.literal("DISABLE_FEATURE"),
        portalId: z.string().trim().min(1),
        portalName: z.string().trim().min(1).max(200),
        featureId: z.string().trim().min(1),
        featureName: z.string().trim().min(1).max(200),
        requestReason: z.string().trim().min(1).max(5000),
      })
      .strict(),
  ]);

const portalRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    tenantName: { type: String, required: true, trim: true },

    requestType: {
      type: String,
      enum: [
        "ADD_PORTAL",
        "DISABLE_PORTAL",
        "ADD_FEATURE",
        "DISABLE_FEATURE",
      ],
      required: true,
    },

    portalName: { type: String, trim: true },
    portalId: { type: String, trim: true },

    featureName: { type: String, trim: true },
    featureId: { type: String, trim: true },

    requestReason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      required: true,
    },
  },
  {
    collection: "portalRequests",
    timestamps: true,
  }
);

portalRequestSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IPortalRequest>(
  "PortalRequest",
  portalRequestSchema
);