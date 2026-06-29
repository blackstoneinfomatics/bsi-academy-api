import mongoose, { Schema } from "mongoose";
import { IActiveSession } from "../../types/models.types";

const activeSessionSchema = new Schema<IActiveSession>(
  {
    tenantId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
    loginDate: {
      type: Date,
      required: true,
    },
    refreshToken: {
      type: String,
      required: false,
    },
    accessToken: {
      type: String,
      required: true,
    }
  },
  {
    collection: "activeSessions",
    timestamps: true,
  }
);

export default mongoose.model<IActiveSession>("ActiveSession", activeSessionSchema);
