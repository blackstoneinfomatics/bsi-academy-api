import mongoose, { Schema } from "mongoose";
import { IEmailTemplate } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    templateKey: {
      type: String,
      required: true,
    },
    templateContent: {
      type: String, // Use String for longtext
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CustomEnumerator.Status),
      required: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
      required: false,
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastUpdatedDate: {
      type: Date,
      default: Date.now,
      required: false,
    },
    lastUpdatedBy: {
      type: String,
      required: false,
    },
  },
  {
    collection: "emailTemplates",
    timestamps: false, // Use custom timestamps
  }
);

export default mongoose.model("EmailTemplate", emailTemplateSchema);
