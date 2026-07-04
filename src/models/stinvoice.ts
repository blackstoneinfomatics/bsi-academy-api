import { model, Schema } from "mongoose";
import {  z } from "zod";
import { IStudentInvoice } from "../../types/models.types";
import { appStatus, commonMessages } from "../config/messages";
import { required } from "joi";

// Mongoose Schema
const studentInvoiceSchema = new Schema<IStudentInvoice>(
  {
    tenantId: { type: String, required: true },
    student: {
      studentId: {
        type: String,
        required: true,
      },
      studentName: {
        type: String,
        required: true,
      },
      studentEmail: {
        type: String,
        required: true,
      },
      studentPhone: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
    },
    evaluationData: {
      type: Schema.Types.Mixed,
      required: false,
    },
    courseName: {
      type: String,
      required: true,
    },
    invoiceNumber: {
      type: Number,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    invoiceStatus: {
      type: String,
      required: false,
      default: "Pending",
    },
        paymentStatus: {
      type: String,
      required: false,
      default: "Pending",
    },
    packageType:{
    type:String,
    required:false,
    },
    itemDescription:{
    type:String,
    required:false,
    },
    duration:{
    type:String,
    required:false,
    },
    rate:
    {
    type:String,
    required:false,
    },
    description:
    {
    type:String,
    required:false,
    },
    attachFile:{
    type:Buffer,
    required:false,
    }, 

    status: {
      type: String,
      required: true,
      enum: [appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED],
      default: appStatus.ACTIVE,
    },
    dueDate:{
    type: String,
    required:false,
    },
     paymentDate: { 
      type: Date,
      required:false,
     },
    createdDate: {
      type: String,
      required :false,
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastUpdatedDate: {
      type: String,
      required :false,
      default: Date.now,
    },
    lastUpdatedBy: {
      type: String,
      required: false,
    },
      // <-- Ensure this exists

  },
  {
    collection: "stinvoice",
    timestamps: false,
  }
);

// Zod Validation Schema
export const zodAlStudentInvoiceSchema = z.object({
  tenantId: z.string(),
  student: z.object({
    studentId: z.string(),
    studentName: z.string(),
    studentEmail: z.string().email("Invalid email format"),
    studentPhone: z.string(),
    country: z.string(),
    city: z.string(),
  }),
  evaluationData: z.any().optional(),
  courseName: z.string(),
  amount: z.number(),
  invoiceNumber: z.number().optional(),
  packageType: z.string().optional(),
  itemDescription: z.string().optional(),
  duration: z.string().optional(),
  rate: z.string().optional(),
  description: z.string().optional(),
  attachFile:  z.union([z.instanceof(Buffer), z.string()]).optional(),
  paymentDate: z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  })
  .transform((val) => new Date(val))
  .optional(),
  paymentStatus: z.string().optional().default("Pending"),

  invoiceStatus: z.string().optional().default("Pending"),
  status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]).default(appStatus.ACTIVE),
  // Update for dates: Treat as strings and convert to Date
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),

  createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),

  lastUpdatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  createdBy: z.string(),
  lastUpdatedBy: z.string().optional(),
});
export default model<IStudentInvoice>("stinvoice", studentInvoiceSchema);
