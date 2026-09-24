import mongoose, { Schema } from "mongoose";
import { ISubscriptionTrial } from "../../types/models.types";
import { SubscriptionTrialStatus } from "../shared/enum";
import { z } from "zod";

export const TrialSchema = new Schema<ISubscriptionTrial>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    trialStartDate: {
      type: Date,
      required: true,
    },

    trialEndDate: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(SubscriptionTrialStatus),
      default: SubscriptionTrialStatus.ACTIVE,
      index: true,
    },

    isConverted: {
      type: Boolean,
      default: false,
    },

    convertedAt: {
      type: Date,
      default: null,
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
      index: true,
    },
  },
  {
    collection: "subscriptiontrials",
    timestamps: true,
  }
);

TrialSchema.index(
  { tenantId: 1, status: 1 },
  { partialFilterExpression: { status: "ACTIVE", deletedAt: null } }
);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const TrialBaseValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant ID is required"),

  trialStartDate: z.coerce.date(),

  trialEndDate: z.coerce.date(),

  status: z
    .enum([
      SubscriptionTrialStatus.ACTIVE,
      SubscriptionTrialStatus.CANCELLED,
      SubscriptionTrialStatus.CONVERTED,
      SubscriptionTrialStatus.EXPIRED,
      SubscriptionTrialStatus.INACTIVE,
      SubscriptionTrialStatus.COMPLETED,
    ])
    .default(SubscriptionTrialStatus.ACTIVE),

  isConverted: z.boolean().default(false),

  convertedAt: z.coerce.date().optional().nullable(),

  createdBy: z.string().trim().min(1, "Created by is required"),

  updatedBy: z.string().trim().optional(),
});

export const TrialValidation = TrialBaseValidation.refine(
  (data) => data.trialEndDate >= data.trialStartDate,
  {
    path: ["trialEndDate"],
    message: "Trial end date must be greater than or equal to start date.",
  }
);

export default mongoose.model<ISubscriptionTrial>("SubscriptionTrial", TrialSchema);