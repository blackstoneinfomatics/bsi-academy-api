// childModule.schema.ts

import { Schema } from "mongoose";
import { PortalStatus, PortalType } from "../shared/enum";
import { FeatureSchema } from "./tenantPortalFeature";

export const ChildModuleSchema = new Schema(
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
      default: PortalType.DEFAULT,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    features: [FeatureSchema],
  },
  { _id: false }
);