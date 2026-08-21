import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IPaymentTransaction } from "../../types/models.types";
import {
  PaymentGateway,
  PaymentStatus,
  PaymentType,
} from "../shared/enum";

export const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    paymentNumber: {
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

    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionInvoice",
      required: true,
      index: true,
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "TenantSubscription",
      required: true,
      index: true,
    },

    paymentType: {
      type: String,
      enum: Object.values(PaymentType),
      default: PaymentType.SUBSCRIPTION,
      required: true,
    },

    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      default: PaymentGateway.STRIPE,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    stripePaymentIntentId: {
      type: String,
      default: null,
      index: true,
    },

    transactionReference: {
      type: String,
      default: null,
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    paymentResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    refundableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    netAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    processingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
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
    collection: "paymenttransaction",
    timestamps: true,
  }
);

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const PaymentValidation = z.object({
  invoiceId: objectId,
  paymentIntentResponse: z.any().optional(),
});

export type CreatePaymentPayload = z.infer<
  typeof PaymentValidation
>;

export default mongoose.model<IPaymentTransaction>(
  "PaymentTransaction",
  PaymentTransactionSchema
);