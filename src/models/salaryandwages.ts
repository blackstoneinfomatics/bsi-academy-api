import { model, Schema } from "mongoose";
import { z } from "zod";
import { appStatus, commonMessages } from "../config/messages";
import { ISalarywages } from "../../types/models.types";
const salarywagesSchema = new Schema<ISalarywages>(
  {
    tenantId: { type: String, required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    employeeMail: { type: String, required: true },
    phone: { type: Number, required: false },
    designation: { type: String, required: true },

    salaryAmount: { type: Number, required: true },
    balanceAmount: { type: Number, required: true },
    deductionAmount: { type: Number, required: true },
    isSalaryProcessed: { type: Boolean, default: false },

    paymentDate: { type: Date, required: false },
    paymentStatus: { type: String, required: false },
    commands: { type: String, required: false },
    description: { type: String, required: false },
    paymentMethod: { type: String, required: true },

    status: {
      type: String,
      required: true,
      enum: [appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED],
      default: appStatus.ACTIVE,
    },

    createdDate: { type: Date, required: true },
    createdBy: { type: String, required: true },
    updatedDate: { type: Date, required: false },
    updatedBy: { type: String, required: false },
  },
  {
    collection: "salarywages",
    timestamps: false,
  }
);


// Zod Validation Schema
export const zodsalarywagesSchemaSchema = z.object({
  tenantId: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  employeeMail: z.string(),
  phone: z.number().optional(),
  designation: z.string(),

  salaryAmount: z.number(),
  deductionAmount: z.number(),
  balanceAmount: z.number(),
  isSalaryProcessed: z.boolean().optional(),

  paymentDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val)).optional(),

  paymentStatus: z.string(),
  commands: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z.string(),

  status: z
    .enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED])
    .default(appStatus.ACTIVE),

  createdDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val)),

  updatedDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .optional(),

  createdBy: z.string(),
  updatedBy: z.string().optional(),
});

export default model<ISalarywages>("SalaryWages", salarywagesSchema);
