
import mongoose, { Schema } from "mongoose";
import { z } from "zod";

import { IPurchaseRequest } from "../../types/models.types";
import {
  PurchaseActivationMode,
  PurchasePaymentStatus,
  PurchaseRequestStatus,
} from "../shared/enum";



export const PurchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(PurchaseRequestStatus),
      default: PurchaseRequestStatus.PENDING_APPROVAL,
      required: true,
      index: true,
    },

    activationMode: {
      type: String,
      enum: Object.values(PurchaseActivationMode),
      required: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // Tenant details
    tenant: {
      tenantId: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },
      tenantName: {
        type: String,
        required: true,
        trim: true,
      },
      requestedBy: {
        type: String,
        required: true,
        trim: true,
      },
    },

    // Subscription and current plan details
    subscription: {
      tenantSubscriptionId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      currentPlanId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      currentPlanName: {
        type: String,
        required: true,
        trim: true,
      },
      subscriptionStartDate: {
        type: Date,
        required: true,
      },
      subscriptionEndDate: {
        type: Date,
        required: true,
      },
      remainingDays: {
        type: Number,
        required: true,
        min: 0,
      },
      totalPeriodDays: {
        type: Number,
        required: true,
        min: 1,
      },
    },

    // Purchased feature details
    update: {
      updateId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      updateName: {
        type: String,
        required: true,
        trim: true,
      },

      category:{
       type:String,
       required: true,
        trim: true,
      },
      monthlyAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      discountValue: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    // Financial calculation snapshot
    pricing: {
      discountAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      subAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      gstRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      gstAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      totalAmount: {
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
        minlength: 3,
        maxlength: 3,
      },
    },

    // Super Admin approval
    approval: {
      approvedBy: {
        type: String,
        default: null,
      },
      approvedAt: {
        type: Date,
        default: null,
      },
      rejectionReason: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
      },
    },

    // Payment tracking
    payment: {
      paymentId: {
        type: Schema.Types.ObjectId,
        default: null,
      },
      paymentStatus: {
        type: String,
        enum: Object.values(PurchasePaymentStatus),
        default: PurchasePaymentStatus.PENDING,
        required: true,
      },
    },

    // Actual feature activation time
    activatedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: "purchaserequest",
    timestamps: true,
  },
);

// ---------------------------------------------
// Indexes
// ---------------------------------------------

PurchaseRequestSchema.index({
  "tenant.tenantId": 1,
  status: 1,
  createdAt: -1,
});

PurchaseRequestSchema.index({
  "subscription.tenantSubscriptionId": 1,
});

PurchaseRequestSchema.index({
  status: 1,
  activationMode: 1,
});

PurchaseRequestSchema.index({
  "payment.paymentId": 1,
});

// ---------------------------------------------
// Common Validation
// ---------------------------------------------

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const nonNegativeAmount = z.number().finite().min(0);

export const PurchaseRequestBaseValidation = z.object({
  purchaseNumber: z
    .string()
    .trim()
    .min(1, "Purchase number is required"),

  status: z.nativeEnum(PurchaseRequestStatus)
    .default(PurchaseRequestStatus.PENDING_APPROVAL),

  activationMode: z.nativeEnum(PurchaseActivationMode),

  requestedAt: z.coerce.date().optional(),

  tenant: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
    tenantName: z.string().trim().min(1, "Tenant name is required"),
    requestedBy: z.string().trim().min(1, "Requester is required"),
  }),

  subscription: z.object({
    tenantSubscriptionId: objectId,
    currentPlanId: objectId,
    currentPlanName: z.string().trim().min(1),
    subscriptionStartDate: z.coerce.date(),
    subscriptionEndDate: z.coerce.date(),
    remainingDays: z.number().int().min(0),
    totalPeriodDays: z.number().int().positive(),
  }),

  update: z.object({
    updateId: objectId,
    updateName: z.string().trim().min(1),
    category: z.string().trim().min(1),
    monthlyAmount: nonNegativeAmount,
    discountValue: nonNegativeAmount,
  }),

  pricing: z.object({
    discountAmount: nonNegativeAmount,
    subAmount: nonNegativeAmount,
    gstRate: z.number().finite().min(0).max(100),
    gstAmount: nonNegativeAmount,
    totalAmount: nonNegativeAmount,
    currency: z.string().trim().length(3).default("INR"),
  }),

  approval: z.object({
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.coerce.date().nullable().optional(),
    rejectionReason: z.string().trim().max(500).nullable().optional(),
  }).optional(),

  payment: z.object({
    paymentId: objectId.nullable().optional(),
    paymentStatus: z.nativeEnum(PurchasePaymentStatus)
      .default(PurchasePaymentStatus.PENDING),
  }).optional(),

  activatedAt: z.coerce.date().nullable().optional(),
});

// ---------------------------------------------
// Create Validation
// ---------------------------------------------

export const CreatePurchaseRequestValidation =
  PurchaseRequestBaseValidation;

// ---------------------------------------------
// Model Export
// ---------------------------------------------

export default mongoose.model<IPurchaseRequest>(
  "PurchaseRequest",
  PurchaseRequestSchema,
);
