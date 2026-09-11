
import { Schema } from "mongoose";
import { PortalStatus, PortalType } from "../shared/enum";
import { ITenantPortalFeature } from "../../types/models.types";

// Every feature in this collection belongs to a tenant's Custom configuration.
export const FeatureSchema = new Schema<ITenantPortalFeature>(
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
      default: PortalType.CUSTOM,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false, timestamps: true }
);