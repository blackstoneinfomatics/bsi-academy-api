import mongoose, { Schema } from "mongoose";
import { Plans } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { commonMessages } from "../config/messages";

const PlanSchema = new Schema<Plans>(
  {
    tenantId: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
      unique: true,
    },
    planId: {
      type: String,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ["MONTHLY", "YEARLY", "LIFETIME", "QUARTERLY", "HALF_YEARLY"],
      default: "MONTHLY",
    },

    trialDays: {
      type: Number,
      default: 0,
    },

    maxUsers: {
      type: Number,
      default: 5,
    },

    allowedRoles: {
      type: [String],
      default: [],
    },

    features: {
      type: [String],
      default: [],
    },
    currency: {
      type: String,
      default: "USD",
    },
    canCreateCustomRoles: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(CustomEnumerator.Status),
      required: true,
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
    collection: "plan",
    timestamps: true,
  },
);

export const createPlanValidation = z.object({
  tenantId: z.string(),
  planId: z.string(),
  maxUsers: z.number(),
  trialDays: z.number(),
  billingCycle: z.enum([
    "MONTHLY",
    "YEARLY",
    "LIFETIME",
    "QUARTERLY",
    "HALF_YEARLY",
  ]),
  price: z.number(),
  allowedRoles: z.array(z.string()),
  planName: z.string(),
  features: z.array(z.string()),
  canCreateCustomRole: z.boolean(),
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

export default mongoose.model<Plans>("plan", PlanSchema);
