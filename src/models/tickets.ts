import mongoose, { Document, Model, Schema } from "mongoose";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../shared/enum";
import { ITicket } from "../../types/models.types";

export interface ITicketDocument
  extends
    Omit<
      ITicket,
      "createdBy" | "recipientIds" | "acknowledgedBy" | "resolvedBy"
    >,
    Document {
  createdBy: string;
  recipientIds: string[];
  acknowledgedBy?: string;
  resolvedBy?: string;
}

const attachmentSchema = new Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const ticketHistorySchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["CREATED", "FORWARDED", "ACKNOWLEDGED", "RESOLVED", "REOPENED"],
    },
    fromUserId: {
      type: String,
      required: true,
    },
    fromRole: {
      type: String,
      required: true,
    },
    toUserIds: {
      type: [String],
      default: [],
    },
    toRole: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicketDocument>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    createdByRole: {
      type: String,
      required: true,
      trim: true,
    },
    recipientRole: {
      type: String,
      required: false,
      trim: true,
    },
    currentAssignedRole: {
      type: String,
      trim: true,
    },
    currentAssignedTo: {
      type: [String],
      default: [],
    },
    history: {
      type: [ticketHistorySchema],
      default: [],
    },
    recipientIds: {
      type: [String],
      required: true,
      default: [],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      required: true,
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: TICKET_PRIORITIES.MEDIUM,
      required: true,
    },
    relatedTo: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: TICKET_STATUSES.OPEN,
      required: true,
      index: true,
    },
    acknowledgedBy: {
      type: String,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgementMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    resolvedBy: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ticketSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

ticketSchema.index({
  recipientIds: 1,
  status: 1,
});
ticketSchema.index({
  currentAssignedTo: 1,
  status: 1,
});

const TicketModel: Model<ITicketDocument> =
  mongoose.models.Ticket ||
  mongoose.model<ITicketDocument>("Ticket", ticketSchema);

export default TicketModel;
