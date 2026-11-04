import mongoose, { Schema, Types } from "mongoose";
import { ITenantBackup } from "../../types/models.types";
import { BackupStatus, BackupFormat } from "../shared/enum";
import { z } from "zod";

export const TenantBackupSchema = new Schema<ITenantBackup>(
  {
    backupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    tenantName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    requestedBy: {
      type: String,
      required: true,
      index: true,
    },

    additionalNotes :{
      type: String,
      default: null,
      trim: true,
    },

    dateRange: {
      fromDate: {
        type: Date,
        required: true,
      },

      toDate: {
        type: Date,
        required: true,
      },
    },

    format: {
      type: String,
      enum: Object.values(BackupFormat),
      default: BackupFormat.EXCEL,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(BackupStatus),
      default: BackupStatus.PENDING,
      index: true,
    },

    fileDetails: {
      fileId: {
        type: Schema.Types.ObjectId,
        default: null,
      },

      fileName: {
        type: String,
        default: null,
        trim: true,
      },

      mimeType: {
        type: String,
        default: null,
      },

      fileSize: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalRecords: {
        type: Number,
        default: 0,
        min: 0,
      },

      collectionCounts: {
        type: Map,
        of: Number,
        default: {},
      },

      generatedAt: {
        type: Date,
        default: null,
      },

      expiresAt: {
        type: Date,
        default: null,
      },
    },

    errorMessage: {
      type: String,
      default: null,
      trim: true,
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
      index: true,
    },
  },
  {
    collection: "tenantBackup",
    timestamps: true,
  },
);

// Unique backup ID
TenantBackupSchema.index(
  { backupId: 1 },
  { unique: true },
);

// Tenant backup history
TenantBackupSchema.index({
  tenantId: 1,
  createdAt: -1,
});

// Tenant subscription backup history
TenantBackupSchema.index({
  tenantId: 1,
  subscriptionId: 1,
  createdAt: -1,
});

// Status-based worker queries
TenantBackupSchema.index({
  status: 1,
  createdAt: 1,
});

// Expiration management
TenantBackupSchema.index({
  "fileDetails.expiresAt": 1,
});

export default mongoose.model<ITenantBackup>(
  "tenantBackup",
  TenantBackupSchema,
);

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const TenantBackupBaseValidation = z.object({
  backupId: z.string().trim().min(1).optional(),

  tenantId: z
    .string()
    .trim()
    .min(1, "Tenant ID is required"),

  tenantName: z
    .string()
    .trim()
    .min(1, "Tenant name is required"),

  subscriptionId: objectId,

  requestedBy: z
    .string()
    .trim()
    .min(1, "Requested by is required"),

  additionalNotes: z.string().trim().optional(),  

  dateRange: z.object({
    fromDate: z.coerce.date(),

    toDate: z.coerce.date(),
  }).refine(
    (data) => data.fromDate <= data.toDate,
    {
      message: "From date must be less than or equal to To date",
      path: ["toDate"],
    },
  ),

  format: z
    .enum([BackupFormat.EXCEL])
    .default(BackupFormat.EXCEL),

  status: z
    .enum([
      BackupStatus.PENDING,
      BackupStatus.PROCESSING,
      BackupStatus.COMPLETED,
      BackupStatus.FAILED,
      BackupStatus.EXPIRED,
    ])
    .default(BackupStatus.PENDING),

  createdBy: z
    .string()
    .trim()
    .min(1, "Created by is required"),

  updatedBy: z.string().optional(),
});