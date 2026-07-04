import mongoose, { Schema } from "mongoose";
import { ITenant } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { commonMessages } from "../config/messages";

const tenantSchema = new Schema<ITenant>(
  {
    tenantCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 5
    },
    tenantName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    tenantLogo: {
      type: String,
      required: true,
    },
    organizationName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    emailId: {
      type: String,
      required: true,
      match: /\S+@\S+\.\S+/,
    },
    gstNo: {
      type: String,
      maxlength: 15,
      default: null,
    },
    panNo: {
      type: String,
      required: true,
      maxlength: 10,
    },
    website: {
      type: String,
      default: null,
    },
    tenantJobCode: {
      type: String,
      required: true,
      unique: true
    },
    faxNo: {
      type: String,
      default: null,
    },
    state: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    street: {
      type: String,
      default: null,
    },
    postalCode: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: null,
    },
    companyRegistrationCertificate: {
       type: String,
       default: null,
    },
    gstCertificate: {
      type: String,
      default: null,
    },
    addressProof: {
      type: String,
      default: null,
    },
    plan: {
      type: String,
      required: true,
    },
    timeZone: {
      type: String,
      default: "UTC",
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    settings: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(CustomEnumerator.Status),
      required: true,
    },
    createdDate: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: String,
      default: null,
    },
    lastUpdatedDate: {
      type: Date,
      default: Date.now,
    },
    lastUpdatedBy: {
      type: String,
      default: null,
    },
  },
  {
    collection: "tenants",
    timestamps: false,
  }
);

export const zodTenantSchema = z.object({
  tenantCode: z.string().min(3),
  tenantName: z.string().min(3),
  tenantLogo: z.string(),
  organizationName: z.string(),
  phoneNumber: z.string(),
  mobileNumber: z.string(),
  emailId: z.string().email(),
  gstNo: z.string(),
  panNo: z.string(),
  website: z.string(),
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
export default mongoose.model<ITenant>("Tenants", tenantSchema);
