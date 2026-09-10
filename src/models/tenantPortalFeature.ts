
import { Schema } from "mongoose";
import { PortalStatus, PortalType } from "../shared/enum";

export const FeatureSchema = new Schema(
  {
    featureId: {
      type: String,
      required: true,
    },

    featureName: {
      type: String,
      required: true,
    },

    featureStatus: {
      type: String,
      enum: Object.values(PortalStatus),
      default: PortalStatus.ACTIVE,
    },

    featuretype: {
      type: String,
      enum: Object.values(PortalType),
      default: PortalType.DEFAULT,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);