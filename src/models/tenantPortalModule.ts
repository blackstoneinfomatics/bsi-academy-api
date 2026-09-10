// module.schema.ts

import { Schema } from "mongoose";
import { PortalStatus, PortalType } from "../shared/enum";
import { FeatureSchema } from "./tenantPortalFeature";
import { ChildModuleSchema } from "./tenantPortalChildModule";

export const ModuleSchema = new Schema(
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
      default: PortalType.DEFAULT,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    features: [FeatureSchema],
    children: [ChildModuleSchema],
  },
  { _id: false }
);