import mongoose, { Schema } from "mongoose";
import { Plans } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { commonMessages } from "../config/messages";
import { BillingPeriodSchema, billingPeriodSchema } from "./billingperiod";



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

    domainName: {
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

const addBillingPeriodSchema = billingPeriodSchema.omit({
  billingPeriodId: true,
});
const updateBillingPeriodSchema = billingPeriodSchema.pick({
  price: true,
  discount: true,
  gstRate: true,
  taxAmount: true,
  totalAmount: true,
});

export type AddBillingPeriodPayload = z.infer<typeof addBillingPeriodSchema>;
export type UpdateBillingPeriodPayload = z.infer<typeof updateBillingPeriodSchema>;

export default mongoose.model<Plans>("plan", PlanSchema);
