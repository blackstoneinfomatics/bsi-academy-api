import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { ICustomServiceInvoice } from "../../types/models.types";
import { PaymentStatus, SubscriptionInvoiceStatus } from "../shared/enum";

const InvoiceItemSchema = new Schema(
  {
    service: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, default: 0, min: 0 },
    taxType: { type: String, default: "GST", trim: true },
    category: { type: String, default: "", trim: true },
    taxAmount: { type: Number, required: true, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

export const CustomServiceInvoiceSchema = new Schema<ICustomServiceInvoice>(
  {
    tenantId: { type: String, required: true, index: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "TenantSubscription",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "plan",
      required: true,
      index: true,
    },
    paymentLink: { type: String, trim: true, default: null },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true, index: true },
    currency: { type: String, required: true, default: "INR", uppercase: true },
    paymentTerms: { type: Number, required: true, default: 15, min: 0 },
    items: { type: [InvoiceItemSchema], required: true, default: [] },
    subTotal: { type: Number, required: true, min: 0 },
    totalTax: { type: Number, required: true, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    customerNotes: { type: String, trim: true, maxlength: 1000, default: "" },
    attachments: { type: [String], default: [] },
    invoiceStatus: {
      type: String,
      enum: Object.values(SubscriptionInvoiceStatus),
      default: SubscriptionInvoiceStatus.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { collection: "customServiceInvoice", timestamps: true },
);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const invoiceItemValidation = z.object({
  service: z.string().trim().min(1, "Service is required"),
  description: z.string().trim().optional().default(""),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  taxRate: z.number().nonnegative("Tax rate cannot be negative").default(0),
  taxType: z.string().trim().optional().default("GST"),
  category: z.string().trim().optional().default(""),
});

export const CustomServiceInvoiceValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant ID is required"),
  subscriptionId: objectId,
  invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.string().trim().length(3).default("INR"),
  paymentTerms: z.number().int().min(0).default(15),
  items: z.array(invoiceItemValidation).min(1, "At least one invoice item is required"),
  customerNotes: z.string().trim().max(1000).optional().default(""),
  attachments: z.array(z.string()).optional().default([]),
  createdBy: z.string().trim().min(1, "Created by is required"),
}).refine((data) => data.dueDate >= data.invoiceDate, {
  path: ["dueDate"],
  message: "Due date must be greater than or equal to invoice date.",
});

export type CreateCustomServiceInvoicePayload = z.infer<
  typeof CustomServiceInvoiceValidation
>;
export type InvoiceItemInput = z.infer<typeof invoiceItemValidation>;

export default mongoose.model<ICustomServiceInvoice>(
  "CustomServiceInvoice",
  CustomServiceInvoiceSchema,
);
