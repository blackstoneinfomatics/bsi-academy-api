import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { RequestStatus } from "../shared/enum";
import { IRefundRequest } from "../../types/models.types";

export const refundRequestValidation = z
  .object({
    tenantId: z.string().trim().min(1),
    tenantName: z.string().trim().min(1),
    paymentId: z.string().trim().min(1),

    refundReason: z.enum([
      "CHANGE_PLAN",
      "DUPLICATE_PAYMENT",
      "SERVICE_ISSUE",
      "OTHER",
    ]),

    newPlan: z.string().trim().min(1).max(200).optional(),

    additionalDetails: z.string().trim().min(1).max(5000),

    refundMethod: z.string().trim().min(1),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.refundReason === "CHANGE_PLAN" && !data.newPlan) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPlan"],
        message: "New plan is required when changing plans",
      });
    }
  });

const refundRequestSchema = new Schema<IRefundRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
    },

    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    tenantName: {
      type: String,
      required: true,
      trim: true,
    },

    paymentId: {
      type: String,
      required: true,
      index: true,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundReason: {
      type: String,
      enum: [
        "CHANGE_PLAN",
        "DUPLICATE_PAYMENT",
        "SERVICE_ISSUE",
        "OTHER",
      ],
      required: true,
    },

    newPlan: {
      type: String,
      trim: true,
    },

    additionalDetails: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundMethod: {
      type: String,
      enum: ["UPI", "BANK_TRANSFER", "ORIGINAL_PAYMENT_METHOD"],
      required: true,
    },

    eligibilityStatus: {
      type: String,
      enum: ["ELIGIBLE", "EXPIRED"],
      required: true,
    },

    daysRemaining: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      required: true,
    },
  },
  {
    collection: "refundRequests",
    timestamps: true,
  }
);

refundRequestSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IRefundRequest>(
  "RefundRequest",
  refundRequestSchema
);