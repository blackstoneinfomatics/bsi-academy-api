import mongoose, { Schema } from "mongoose";
import { ITenantSubscription } from "../../types/models.types";
import {
  BillingCycle,
  PaymentStatus,
  SubscriptionStatus,
} from "../shared/enum";
import { z } from "zod";

export const TenantSubscriptionSchema = new Schema<ITenantSubscription>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "plan",
      required: true,
    },

    planName: {
      type: String,
      required: true,
      trim: true,
    },

    subscriptionCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    duration: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: SubscriptionStatus,
      default: SubscriptionStatus.PENDING,
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: PaymentStatus,
      default: PaymentStatus.PENDING,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    nextRenewalDate: {
      type: Date,
      default: null,
    },

    autoRenew: {
      type: Boolean,
      default: false,
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
    collection: "tenantsubscriptions",
    timestamps: true,
  },
);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const TenantSubscriptionBaseValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant ID is required"),

  planId: objectId,

  subscriptionCode: z
    .string()
    .trim()
    .min(1, "Subscription code is required")
    .max(100),

  duration: z.number().int().positive("Duration must be a positive integer"),

  status: z
    .nativeEnum(SubscriptionStatus)
    .default(SubscriptionStatus.PENDING)
    .optional(),

  paymentStatus: z
    .nativeEnum(PaymentStatus)
    .default(PaymentStatus.PENDING)
    .optional(),

  startDate: z.coerce.date().optional(),

  endDate: z.coerce.date().optional(),

  nextRenewalDate: z.coerce.date().optional(),

  autoRenew: z.boolean().default(false).optional(),

  remarks: z.string().trim().max(1000).optional(),

  createdBy: z.string().trim().min(1, "Created by is required"),

  updatedBy: z.string().trim().optional(),
});

export const TenantSubscriptionValidation =
  TenantSubscriptionBaseValidation.refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      path: ["endDate"],
      message: "End date must be greater than or equal to start date.",
    },
  );

export type CreateTenantSubscriptionDto = z.infer<
  typeof TenantSubscriptionBaseValidation
>;
export default mongoose.model<ITenantSubscription>(
  "TenantSubscription",
  TenantSubscriptionSchema,
);
