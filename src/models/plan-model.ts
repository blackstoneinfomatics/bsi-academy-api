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
      type: [
        {
          portalId: {
            type: String,
            required: true,
          },
          portalName: {
            type: String,
            required: true,
          },
        },
      ],
      required: true,
      default: [],
    },

  modules: {
  type: [
    {
      moduleId: {
        type: String,
        required: true,
      },

      moduleName: {
        type: String,
        required: true,
      },

      // Selection order of this module within the plan, as chosen in the frontend.
      order: {
        type: Number,
        required: true,
      },

      // Direct features under parent module
      features: {
        type: [
          {
            featureId: {
              type: String,
              required: true,
            },
            featureName: {
              type: String,
              required: true,
            },
          },
        ],
        required: false,
        default: undefined,
      },

      // Child modules under parent module
      children: {
        type: [
          {
            childModuleId: {
              type: String,
              required: true,
            },

            childModuleName: {
              type: String,
              required: true,
            },

            // Selection order of this child module within its parent, as chosen in the frontend.
            order: {
              type: Number,
              required: true,
            },

            // Features under child module
            features: {
              type: [
                {
                  featureId: {
                    type: String,
                    required: true,
                  },
                  featureName: {
                    type: String,
                    required: true,
                  },
                },
              ],
              required: false,
              default: undefined,
            },
          },
        ],
        required: false,
        default: undefined,
      },
    },
  ],
  required: true,
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
  allowedRoles: z.array(
    z.object({
      portalName: z.string(),
      portalId: z.string(),
    }),
  ),
modules: z.array(
  z.object({
    moduleId: z.string(),
    moduleName: z.string(),

    // Selection order of this module within the plan - sent as-is from the frontend.
    order: z.number().int().nonnegative(),

    // Parent module may or may not have direct features
    features: z.array(
      z.object({
        featureId: z.string(),
        featureName: z.string()
      })
    ).optional(),

    // Parent module may or may not have children
    children: z.array(
      z.object({
        childModuleId: z.string(),
        childModuleName: z.string(),

        // Selection order of this child module within its parent - sent as-is from the frontend.
        order: z.number().int().nonnegative(),

        // Child may or may not have features
        features: z.array(
          z.object({
            featureId: z.string(),
            featureName: z.string()
          })
        ).optional()
      })
    ).optional()
  })
),
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
