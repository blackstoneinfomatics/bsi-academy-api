import mongoose, { Schema } from "mongoose";
import { IBillingPeriod } from "../../types/models.types";
import { z } from "zod";

export const BillingPeriodSchema = new Schema<IBillingPeriod>(
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
{
    collection: "billingPeriods",
    timestamps: true,
  },);



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

  export default mongoose.model<IBillingPeriod>("BillingPeriodSchema", BillingPeriodSchema);
  