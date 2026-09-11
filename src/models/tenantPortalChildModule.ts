// childModule.schema.ts

import { Schema } from "mongoose";
import { PortalStatus, PortalType } from "../shared/enum";
import { FeatureSchema } from "./tenantPortalFeature";
import { ITenantPortalChildModule } from "../../types/models.types";

export const ChildModuleSchema = new Schema<ITenantPortalChildModule>(
  {
    childModuleId: {
      type: String,
      required: true,
    },

    childModuleName: {
      type: String,
      required: true,
    },

    childModuleStatus: {
      type: String,
      enum: Object.values(PortalStatus),
      default: PortalStatus.ACTIVE,
    },

    childModuleType: {
      type: String,
      enum: Object.values(PortalType),
      default: PortalType.CUSTOM,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    features: {
      type: [FeatureSchema],
      default: [],
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false, timestamps: true }
);