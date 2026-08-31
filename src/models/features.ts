import mongoose, { Schema } from "mongoose";
import { IFeatures, ITenant } from "../../types/models.types";
import CustomEnumerator, { Status } from "../shared/enum";
import { z } from "zod";
import { commonMessages } from "../config/messages";

const featureSchema = new Schema<IFeatures>(
  {
    selectmodule: {
      type: String,
      required: true,
    },
    selectcategory: {
      type: String,
      required: true,
    },
    navigationMenuInformation :{
    navigationName: {
      type: String,
      required: false,
    },

},

    status: {
      type: String,
      enum: Status,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
      type: String,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "features",
    timestamps: false,
  }
);

export const zodTenantSchema = z.object({
  tenantCode: z.string().min(3),
  tenantName: z.string().min(3),
  tenantLogo: z.string().optional(),
  organizationName: z.string(),
  phoneNumber: z.string(),
  mobileNumber: z.string(),
  emailId: z.string().email(),
  gstNo: z.string(),
  panNo: z.string(),
  website: z.string(),
  domainName: z.string().optional(),
  tenantJobCode: z.string(),
  faxNo: z.string(),
  state: z.string(),
  city: z.string(),
  street: z.string(),
  postalCode: z.string(),
  country: z.string(),
  companyRegistrationCertificate: z.string().optional(),
  gstCertificate: z.string().optional(),
  addressProof: z.string().optional(),
  plan: z.string().optional(),
  timeZone: z.string().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  createdBy: z.string(),
  lastUpdatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  lastUpdatedBy: z.string(),
});
export default mongoose.model<IFeatures>("Features", featureSchema);
