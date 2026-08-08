import mongoose, { Schema } from "mongoose";
import { ISubscriptionInvoice } from "../../types/models.types";
import { SubscriptionInvoiceStatus } from "../shared/enum";
import { z } from "zod";

export const SubscriptionInvoiceSchema = new Schema<ISubscriptionInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenants",
      required: true,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "plan",
      required: true,
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "TenantSubscription",
      required: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    nextReminderDays: {
      type: Date,
      default: null,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    paymentTerms: {
      type: Number,
      required: true,
      default: 15,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(SubscriptionInvoiceStatus),
      default: SubscriptionInvoiceStatus.PENDING,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    attachments: [
      {
        type: String,
        trim: true,
      },
    ],

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
    },
  },
  {
    collection: "subscriptioninvoice",
    timestamps: true,
  },
);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const SubscriptionInvoiceBaseValidation = z
  .object({
    planId: objectId,

    subscriptionId: objectId,

    invoiceNumber: z.string().trim().min(1, "Invoice number is required"),

    invoiceDate: z.coerce.date(),

    dueDate: z.coerce.date(),

    nextReminderDays: z.coerce.date().optional(),

    currency: z.string().trim().length(3).default("INR"),

    paymentTerms: z.number().int().min(0).default(15),

    discountAmount: z.number().min(0).default(0).optional(),

    subtotal: z.number().min(0),

    status: z
      .enum([
        SubscriptionInvoiceStatus.PENDING,
        SubscriptionInvoiceStatus.PAID,
        SubscriptionInvoiceStatus.OVERDUE,
        SubscriptionInvoiceStatus.CANCELLED,
        SubscriptionInvoiceStatus.FAILED,
        SubscriptionInvoiceStatus.REFUNDED,
        SubscriptionInvoiceStatus.PARTIALLY_PAID,
      ])
      .default(SubscriptionInvoiceStatus.PENDING),

    taxAmount: z.number().min(0).default(0),

    totalAmount: z.number().min(0),

    notes: z.string().trim().max(1000).optional(),

    attachments: z.array(z.string()).optional(),

    createdBy: z.string().trim().min(1, "Created by is required"),

    updatedBy: z.string().trim().optional(),
  });

 export const SubscriptionInvoiceValidation =
  SubscriptionInvoiceBaseValidation.refine(
    (data) => data.dueDate >= data.invoiceDate,
    {
      path: ["dueDate"],
      message: "Due date must be greater than or equal to invoice date.",
    }
  );

export type CreateSubscriptionInvoicePayload = z.infer<
  typeof SubscriptionInvoiceValidation
>;


export default mongoose.model<ISubscriptionInvoice>(
  "SubscriptionInvoice",
  SubscriptionInvoiceSchema
);