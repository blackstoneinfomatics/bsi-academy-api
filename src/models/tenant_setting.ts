import mongoose, { Schema } from "mongoose";
import { ITenantSettings } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { appStatus, commonMessages, tenantsMessages,  } from "../config/messages";
 
const tenantSettingsSchema = new Schema<ITenantSettings>(
  {
    tenantId: {
      type: String,
      required: true,
    },
    keyName: {
      type: String,
      required: true,
    },
    keyValue: {
      type: Schema.Types.Mixed,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    isConnected: {
      type: Boolean,
      required: false,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(CustomEnumerator.Status),
      required: true,
    },
    createdDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastUpdatedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastUpdatedBy: {
      type: String,
      required: true,
    },
  },
  {
    collection: "tenantSettings",
    timestamps: false,
  }
);
 
export const zodTenantSettingsSchema = z.object({
  tenantId: z.string().min(5),
  keyName: z.enum(tenantsMessages.KEYNAMES),
  keyValue: z.any(),
  module: z.enum(tenantsMessages.MODULE_TYPES),
  isConnected: z.boolean().default(false),
  status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE]),
  createdDate: z.string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .optional(),
  createdBy: z.string(),
  lastUpdatedDate: z.string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .optional(),
  lastUpdatedBy: z.string(),
});

export default mongoose.model<ITenantSettings>(
  "tenantSettings",
  tenantSettingsSchema
);