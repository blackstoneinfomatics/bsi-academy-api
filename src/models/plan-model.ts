import mongoose, { Schema } from "mongoose";
import { Plans } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { commonMessages } from "../config/messages";

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

    billingCycle: {
      type: String,
      enum: ["MONTHLY", "YEARLY", "LIFETIME", "QUARTERLY", "HALF_YEARLY"],
      required: true,
      default: "MONTHLY",
    },

    monthlyPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    yearlyPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    setupFee: {
      type: Number,
      required: true,
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



    planDescription: {
      type: String,
      required: true,
    },

    planStatus: {
      type: String,
      enum: ["Active", "In active", "MOST_POPULAR"],
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
  // tenantId: z.string(),

  planId: z.string().optional(),
  planName: z.string().min(1, "Plan name is required"),

  studentLimit: z.number().nonnegative(),

  billingCycle: z.enum([
    "MONTHLY",
    "YEARLY",
    "LIFETIME",
    "QUARTERLY",
    "HALF_YEARLY",
  ]),

  monthlyPrice: z.number().nonnegative(),

  yearlyPrice: z.number().nonnegative(),

  setupFee: z.number().nonnegative(),

  trialDays: z.number().nonnegative(),

  gstAndTax: z.number().nonnegative(),


  planDescription: z.string().min(1, "Plan description is required"),

  planStatus: z.enum([
  "Active",
  "In active",
  "MOST_POPULAR",
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
