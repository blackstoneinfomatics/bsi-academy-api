
import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IReminder } from "../../types/models.types";


const ReminderSchema = new Schema<IReminder>({
  reminderId: {
    type: String,
    required: true,
    unique: true,
  },

  tenantId: {
    type: String,
    required: true,
  },

  sendReminder: {
    type: String,
    enum: [
      "ALL_OVERDUE_TENANTS",
      "SPECIFIC_TENANTS",
      "CUSTOM_SELECTION",
    ],
    required: true,
  },

  // Only populated when sendReminder is SPECIFIC_TENANTS or CUSTOM_SELECTION.
  tenantIds: {
    type: [String],
    default: undefined,
  },

  minimumOverdueDays: {
    type: Number,
    required: true,
    default: 1,
  },

  subject: {
    type: String,
    required: true,
  },

  templateId: {
    type: String,
    required: true,
  },

  repeatReminder: {
    type: Boolean,
    default: true,
  },

  repeatEveryDays: {
    type: Number,
    default: 7,
  },

  stopAfterPayment: {
    type: Boolean,
    default: true,
  },

  channels: {
    email: {
      type: Boolean,
      default: true,
    },
    sms: {
      type: Boolean,
      default: false,
    },
    inApp: {
      type: Boolean,
      default: false,
    },
    whatsapp: {
      type: Boolean,
      default: false,
    },
  },

  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
  },

  // Set by the reminder cron (src/operations/remainder.ts) each time a
  // reminder is actually dispatched for any tenant under this config.
  lastReminderSentDate: {
    type: Date,
    required: false,
  },

  createdDate: {
    type: Date,
    default: Date.now,
  },
  createdBy: String,

  updatedDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedBy: String,
}, {
  timestamps: false,
});


export const reminderBaseValidation = z.object({
  tenantId: z.string().min(1, "Tenant Id is required"),

  reminderId: z.string().optional(),

  sendReminder: z.enum([
    "ALL_OVERDUE_TENANTS",
    "SPECIFIC_TENANTS",
    "CUSTOM_SELECTION",
  ]),

  tenantIds: z.array(z.string().min(1)).optional(),

  minimumOverdueDays: z
    .number({
      required_error: "Minimum overdue days is required",
    })
    .min(1, "Minimum overdue days must be at least 1"),

  subject: z
    .string()
    .trim()
    .min(1, "Message subject is required")
    .max(200, "Message subject cannot exceed 200 characters"),

  templateId: z
    .string()
    .trim()
    .min(1, "Reminder template is required"),

  repeatReminder: z.boolean().default(true),

  repeatEveryDays: z
    .number()
    .min(1, "Repeat days must be greater than 0")
    .default(7),

  stopAfterPayment: z.boolean().default(true),

  channels: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    inApp: z.boolean().default(false),
    whatsapp: z.boolean().default(false),
  }),

  status: z
    .enum(["ACTIVE", "INACTIVE"])
    .default("ACTIVE"),

  createdBy: z.string().optional(),

  lastUpdatedBy: z.string().optional(),
});

const withCrossFieldRules = <T extends typeof reminderBaseValidation>(schema: T) =>
  schema
    .refine(
      (data) =>
        data.sendReminder === "ALL_OVERDUE_TENANTS" ||
        (Array.isArray(data.tenantIds) && data.tenantIds.length > 0),
      {
        message: "tenantIds is required when sendReminder is not ALL_OVERDUE_TENANTS",
        path: ["tenantIds"],
      },
    )
    .refine(
      (data) =>
        data.channels.email ||
        data.channels.sms ||
        data.channels.whatsapp ||
        data.channels.inApp,
      {
        message: "At least one channel must be enabled",
        path: ["channels"],
      },
    );

// Full validation used on create — every required field must be present and
// the cross-field rules (tenantIds required for non-ALL modes, at least one
// channel enabled) must hold.
export const reminderValidation = withCrossFieldRules(reminderBaseValidation);

// Partial validation used on update. Cross-field rules only run when both
// sides of the rule are actually present in the payload, since a partial
// update may only touch one field at a time.
export const reminderUpdateValidation = reminderBaseValidation
  .omit({ tenantId: true, createdBy: true })
  .partial()
  .refine(
    (data) =>
      !data.sendReminder ||
      data.sendReminder === "ALL_OVERDUE_TENANTS" ||
      data.tenantIds === undefined ||
      data.tenantIds.length > 0,
    {
      message: "tenantIds cannot be empty when sendReminder is not ALL_OVERDUE_TENANTS",
      path: ["tenantIds"],
    },
  )
  .refine(
    (data) =>
      !data.channels ||
      data.channels.email ||
      data.channels.sms ||
      data.channels.whatsapp ||
      data.channels.inApp,
    {
      message: "At least one channel must be enabled",
      path: ["channels"],
    },
  );

export default mongoose.model<IReminder>("Reminder", ReminderSchema);
