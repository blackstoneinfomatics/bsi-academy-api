import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IRefundTransaction } from "../../types/models.types";
import { PaymentGateway, RefundApprovalStatus, RefundStatus } from "../shared/enum";

export const RefundTransactionSchema = new Schema<IRefundTransaction>(
  {
    refundNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    refundStatus: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
      index: true,
    },

    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionInvoice",
      required: true,
      index: true,
    },

    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
      unique: true, 
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "TenantSubscription",
      required: true,
      index: true,
    },

    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      required: true,
      index: true,
    },

    stripeRefundId: {
      type: String,
      default: null,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    settlementAmount: {
      type: Number,
      default: null,
    },

    settlementCurrency: {
      type: String,
      default: null,
    },

    exchangeRate: {
      type: Number,
      default: null,
    },

    refundReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: Object.values(RefundApprovalStatus),
      default: RefundApprovalStatus.PENDING,
      index: true,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
    },

    refundResponse: {
      type: Schema.Types.Mixed,
      default: null,
      select: false,
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
    },
  },
  {
    collection: "refundtransaction",
    timestamps: true,
  }
);

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const RefundBaseValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant ID is required"),

  invoiceId: objectId,

  paymentId: objectId,

  subscriptionId: objectId,

  refundNumber: z.string().trim().min(1, "Refund number is required"),

  gateway: z.enum(["STRIPE", "MANUAL"]),

  stripeRefundId: z.string().optional(),

  amount: z.number().min(0),

  currency: z.string().trim().length(3).default("INR"),

  settlementAmount: z.number().optional(),

  settlementCurrency: z.string().optional(),

  exchangeRate: z.number().optional(),

  refundReason: z.string().trim().max(500).optional(),

  status: z
    .enum(["PENDING", "APPROVED", "REJECTED"])
    .default("PENDING"),

  refundStatus: z
    .enum(["PENDING", "PAID", "FAILED"])
    .default("PENDING"),

  refundedAt: z.coerce.date().optional(),

  failureReason: z.string().optional(),

  refundResponse: z.any().optional(),

  createdBy: z.string().trim().min(1, "Created by is required"),

  updatedBy: z.string().optional(),
});

export default mongoose.model<IRefundTransaction>(
  "RefundTransaction",
  RefundTransactionSchema
);