import mongoose, { Schema } from "mongoose";
import { IBillingPeriod, Plans } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { commonMessages } from "../config/messages";

const BillingPeriodSchema = new Schema<IBillingPeriod>(
  {
    billingPeriodId: {
      type: String,
      required: true,
    },

    billingPeriod: {
      type: String,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      default: 0,
    },

    discount: {
      type: Number,
      required: true,
      default: 0,
    },

    gstRate: {
      type: Number,
      required: true,
      default: 0,
    },

    taxAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const PlanSchema = new Schema<Plans>(
  {
    // tenantId: {
    //   type: String,
    //   required: true,
    // },

    planId: {
      type: String,
      required: true,
      unique: true,
    },

    planName: {
      type: String,
      required: true,
      unique: true,
    },

    studentLimit: {
      type: Number,
      required: true,
    },

    userLimit: {
      type: Number,
      default: 0,
    },

    trialDays: {
      type: Number,
      required: true,
      default: 0,
    },

    gstAndTax: {
      type: Number,
      required: true,
      default: 0,
    },

   taxAmount: {
      type: Number,
      required: false,
      default: 0,
    },

    billingPeriods: {
      type: [BillingPeriodSchema],
      required: true,
      default: [],
    },

    planDescription: {
      type: String,
      required: true,
    },

    planStatus: {
      type: String,
      enum: ["Growing", "Low_Adoption", "Most_Popular"],
      required: true,
    },

    allowedRoles: {
      type: [String],
      required: true,
      default: [],
    },

    features: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    totalPrice: {
      type: Number,
      required: false,
      default: 0,
    },

    canCreateCustomRole: {
      type: Boolean,
      required: true,
      default: false,
    },

    customDomain: {
      type: Boolean,
      required: true,
      default: false,
    },

    domain: {
  type: String,
  required: false,
  default: "",
},  

    backup: {
      type: Boolean,
      required: true,
      default: false,
    },

    status: {
      type: String,
      // "Draft" is Plan-specific (the multi-step create wizard's initial state)
      // and intentionally kept out of the shared Status enum used by other modules.
      enum: [...Object.values(CustomEnumerator.Status), "Draft"],
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

    lastUpdatedBy: {
      type: String,
      required: false,
    },
  },
  {
    collection: "plan",
    timestamps: true,
  },
);

export const billingPeriodSchema = z.object({
  billingPeriodId: z.string().min(1, "billingPeriodId is required"),
  billingPeriod: z.string().min(1, "billingPeriod is required"),
  duration: z.number().min(1, "duration is required"),
  // Pricing is added later via the price/discount update step, so it's not
  // mandatory when a billing period is first added.
  price: z.number().nonnegative().default(0),
  discount: z.number().min(0).max(100).default(0),
  gstRate: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative().default(0),
});

export type BillingPeriodPayload = z.infer<typeof billingPeriodSchema>;
export const addBillingPeriodValidation = billingPeriodSchema.omit({
  billingPeriodId: true,
});

export type AddBillingPeriodPayload = z.infer<
  typeof addBillingPeriodValidation
>;

export const updateBillingPeriodValidation = billingPeriodSchema.pick({
  price: true,
  discount: true,
  gstRate: true,
  taxAmount: true,
  totalAmount: true,
});

export type UpdateBillingPeriodPayload = z.infer<
  typeof updateBillingPeriodValidation
>;

export const createPlanValidation = z.object({
  planId: z.string().optional(),
  planName: z.string().min(1, "Plan name is required"),
  totalPrice: z.number().nonnegative(),
  studentLimit: z.number().nonnegative(),
  userLimit: z.number().nonnegative(),
  trialDays: z.number().nonnegative(),
  gstAndTax: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  billingPeriods: z.array(billingPeriodSchema).default([]),
  planDescription: z.string().min(1, "Plan description is required"),
  planStatus: z.enum([
    "Growing",
    "Low_Adoption",
    "Most_Popular",
  ]),
  allowedRoles: z.array(z.string()),
  features: z.record(z.string(), z.array(z.string())),
  canCreateCustomRole: z.boolean(),
  customDomain: z.boolean().default(false),
  domain: z.string().optional(),
  backup: z.boolean().default(false),
  status: z.string(),
  createdBy: z.string().optional(),
  lastUpdatedBy: z.string().optional(),
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
});

export default mongoose.model<Plans>("plan", PlanSchema);
