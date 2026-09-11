// module.schema.ts

import { Schema } from "mongoose";
import { PortalStatus, PortalType } from "../shared/enum";
import { FeatureSchema } from "./tenantPortalFeature";
import { ChildModuleSchema } from "./tenantPortalChildModule";
import { ITenantPortalModule } from "../../types/models.types";

export const ModuleSchema = new Schema<ITenantPortalModule>(
  {
    moduleId: {
      type: String,
      required: true,
    },

    moduleName: {
      type: String,
      required: true,
    },

    orderNo: {
      type: Number,
      required: true,
      default: 1,
    },

    moduleStatus: {
      type: String,
      enum: Object.values(PortalStatus),
      default: PortalStatus.ACTIVE,
    },

    moduleType: {
      type: String,
      enum: Object.values(PortalType),
      default: PortalType.CUSTOM,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    // Features created directly under the Module (no Child Module in between).
    features: {
      type: [FeatureSchema],
      default: [],
    },
    children: {
      type: [ChildModuleSchema],
      default: [],
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false, timestamps: true }
);