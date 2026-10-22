import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IPlanChangeRequest } from "../../types/models.types";
import { RequestStatus } from "../shared/enum";
import { planChangeRequestMessages } from "../config/messages";

const parseRequestDate = z
  .union([z.string().date(), z.string().datetime({ offset: true })])
  .transform((value) => new Date(value));

export const planChangeRequestValidation = z
  .object({
    tenantId: z.string().trim().min(1),
    tenantName: z.string().trim().min(1),
    currentPlan: z.string().trim().min(1),
    newPlan: z.string().trim().min(1),
    planStartDate: parseRequestDate,
    changeReason: z.string().trim().min(1).max(2000),
    requestReason: z.string().trim().min(1).max(5000),
  })
  .strict()
  .superRefine(({ planStartDate }, context) => {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    if (planStartDate < startOfToday) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planStartDate"],
        message: planChangeRequestMessages.START_IN_PAST,
      });
    }
  });

const planChangeRequestSchema = new Schema<IPlanChangeRequest>(
  {
    requestId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    tenantName: { type: String, required: true, trim: true },
    currentPlan: { type: String, required: true, trim: true },
    newPlan: { type: String, required: true, trim: true },
    planStartDate: { type: Date, required: true },
    changeReason: { type: String, required: true, trim: true },
    requestReason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      required: true,
    },
  },
  {
    collection: "planChangeRequests",
    timestamps: true,
  }
);

planChangeRequestSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IPlanChangeRequest>(
  "PlanChangeRequest",
  planChangeRequestSchema
);
