import mongoose, { Schema } from "mongoose";
import { IReminderHistory } from "../../types/models.types";

const channelResultSchema = new Schema(
  {
    attempted: { type: Boolean, required: true, default: false },
    success: { type: Boolean, required: true, default: false },
    error: { type: String, required: false },
  },
  { _id: false },
);

const ReminderHistorySchema = new Schema<IReminderHistory>(
  {
    historyId: {
      type: String,
      required: true,
      unique: true,
    },

    reminderId: {
      type: String,
      required: true,
    },

    tenantId: {
      type: String,
      required: true,
    },

    subscriptionId: {
      type: String,
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },

    overdueDays: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    channels: {
      email: { type: channelResultSchema, required: true },
      sms: { type: channelResultSchema, required: true },
      whatsapp: { type: channelResultSchema, required: true },
      inApp: { type: channelResultSchema, required: true },
    },

    status: {
      type: String,
      enum: ["SENT", "FAILED"],
      required: true,
    },

    sentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    collection: "reminderHistory",
    timestamps: false,
  },
);

// Used by the cron to find the last time a given reminder config fired for a
// given tenant, to enforce repeatEveryDays / prevent same-day duplicates.
ReminderHistorySchema.index({ reminderId: 1, tenantId: 1, sentDate: -1 });

export default mongoose.model<IReminderHistory>(
  "ReminderHistory",
  ReminderHistorySchema,
);
