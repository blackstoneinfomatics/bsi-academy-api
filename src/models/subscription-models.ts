import mongoose, { Schema } from "mongoose";
import { Subscription } from "../../types/models.types";
import { z } from "zod";
import { commonMessages } from "../config/messages";

const SubscriptionSchema = new Schema<Subscription>(
  {
    tenantId: {
      type: String,
      required: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    planId: {
      type: String,
      ref: "Plan",
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "CANCELLED", "INACTIVE", "TRIALS"],
      default: "ACTIVE",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isTrialUsed: {
      type: Boolean,
      default: false,
    },
    createdDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    updatedBy: {
      type: String,
      required: false,
    },
  },
  {
    collection: "subscriptionSaas",
    timestamps: true,
  },
);

export const createSubscriptionValidation = z.object({
  tenantId: z.string(),
  subscriptionId: z.string(),
  planId: z.string(),
  planName: z.string(),
  subscriptionStatus: z.enum([
    "ACTIVE",
    "EXPIRED",
    "CANCELLED",
    "INACTIVE",
    "TRIALS",
  ]),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val)),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val)),
  isTrialUsed: z.boolean(),
  status: z.string(),
  createdBy: z.string().optional(),
  createdDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .optional(),
  updatedDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .optional(),

  updatedBy: z.string().optional(),
});

export default mongoose.model<Subscription>("subscriptionSaas", SubscriptionSchema);
