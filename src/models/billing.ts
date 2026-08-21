import mongoose, { Schema } from "mongoose";
import { IBilling } from "../../types/models.types";
import { BillingStatus } from "../shared/enum";
import { z } from "zod";

export const BillingSchema = new Schema<IBilling>(
  {
    billingName: {
      type: String,
      required: true,
      trim: true,
    },
    billingId: {
      type: String,
      required: true,
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    paymentMethod: {
      type: String,
      required: true,
      trim: true,
    },

    addedBy: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(BillingStatus),
      default: BillingStatus.PENDING,
      index: true,
    },

    createdBy: {
      type: String,
      default: null,
    },

    updatedBy: {
      type: String,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "billing",
    timestamps: true,
  },
);

export const BillingValidation = z.object({
  billingId: z.string().trim().min(1, "Billing ID is required").optional(),
  billingName: z.string().trim().min(1, "Billing name is required"),
  paymentDate: z.coerce.date({
    errorMap: () => ({ message: "Invalid payment date" }),
  }),
  amount: z.number().positive("Amount must be greater than zero"),
  category: z.string().trim().min(1, "Category is required"),
  paymentMethod: z.string().trim().min(1, "Payment method is required"),
  addedBy: z.string().trim().min(1, "Added by is required"),
  status: z.enum([
    BillingStatus.PAID,
    BillingStatus.PENDING,
    BillingStatus.OVERDUE,
    BillingStatus.CANCELLED,
  ]),
  createdBy: z.string().trim().optional(),
  updatedBy: z.string().trim().optional(),
});

export type CreateBillingPayload = z.infer<typeof BillingValidation>;

export default mongoose.model<IBilling>("Billing", BillingSchema);
