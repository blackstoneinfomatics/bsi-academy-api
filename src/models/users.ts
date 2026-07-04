import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { IUser } from "../../types/models.types";

import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { appStatus, commonMessages, userMessages } from "../config/messages";
import { isEncryptedPassword } from "../shared/common";

const userSchema = new Schema<IUser>(
  {
     tenantId: {
 type: String,
      default: uuidv4,
      required: false,
      unique: true,
     },
    userId: {
      type: String,
      default: uuidv4,
      required: true,
      unique: true,
    },
    userName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
      unique: true,
    },
    gender:{
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      match: /\S+@\S+\.\S+/,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8
    },
    role: {
      type: [String],
      required: true
    },
    position:{
     type: String,
      required: false,
    },
    profileImage: {
      type: String,
      default: null
    },
    lastLoginDate: {
      type: Date,
      default: Date.now
    },
    country: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: Object.values(CustomEnumerator.Status),
      required: true
    },
    createdDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    createdBy: {
      type: String,
      required: true
    },
    lastUpdatedDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastUpdatedBy: {
      type: String,
      required: true
    },
  },
  {
    collection: "tenantUsers",
    timestamps: false,
  }
);

export const zodUserSchema = z.object({
  userName: z.string().min(3),
  gender: z.string(),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .refine((value) => isEncryptedPassword(value), {
      message: userMessages.ENCRYPT_PASSWORD_ERROR,
    }),
  role: z.array(z.string()).min(1),
  position: z.string().optional(),
  profileImage: z.string().nullable(),
  lastLoginDate: z.string().nullable(),
  country: z.string().optional(),
  status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]),
  createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  createdBy: z.string(),
  lastUpdatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  lastUpdatedBy: z.string(),
})

export default mongoose.model<IUser>("TenantUsers", userSchema);
