import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IBackupRequest } from "../../types/models.types";
import { RequestStatus } from "../shared/enum";
import { backupRequestMessages } from "../config/messages";

const parseRequestDate = z
  .union([z.string().date(), z.string().datetime({ offset: true })])
  .transform((value) => new Date(value));

export const backupRequestValidation = z
  .object({
    tenantId: z.string().trim().min(1),
    tenantName: z.string().trim().min(1),
    backupStartDate: parseRequestDate,
    backupEndDate: parseRequestDate,
    additionalNotes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .superRefine(({ backupStartDate, backupEndDate }, context) => {
    if (backupStartDate > backupEndDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["backupStartDate"],
        message: backupRequestMessages.START_AFTER_END,
      });
    }

    const now = new Date();
    const earliestAllowedDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30)
    );

    if (backupStartDate < earliestAllowedDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["backupStartDate"],
        message: backupRequestMessages.OUTSIDE_RETENTION,
      });
    }

    if (backupEndDate > now) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["backupEndDate"],
        message: backupRequestMessages.END_IN_FUTURE,
      });
    }
  });

const backupRequestSchema = new Schema<IBackupRequest>(
  {
    requestId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    tenantName: { type: String, required: true, trim: true },
    backupStartDate: { type: Date, required: true },
    backupEndDate: { type: Date, required: true },
    additionalNotes: { type: String, required: false, trim: true },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      required: true,
    },
  },
  {
    collection: "backupRequests",
    timestamps: true,
  }
);

backupRequestSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IBackupRequest>(
  "BackupRequest",
  backupRequestSchema
);
