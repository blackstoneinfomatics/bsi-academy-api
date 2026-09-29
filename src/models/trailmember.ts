import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { ITrialMember } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { appStatus } from "../config/messages";
import { isEncryptedPassword } from "../shared/common";
import { commonMessages, userMessages } from "../config/messages";

const trialMemberSchema = new Schema<ITrialMember>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
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
    },

    email: {
      type: String,
      required: true,
      match: /\S+@\S+\.\S+/,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    role: {
      type: [String],
      required: true,
    },

    profileImage: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(CustomEnumerator.Status),
      required: true,
    },

    createdDate: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: String,
      required: true,
    },

    lastUpdatedDate: {
      type: Date,
      default: Date.now,
    },

    lastUpdatedBy: {
      type: String,
      required: true,
    },
  },
  {
    collection: "trialMembers",
    timestamps: false,
  },
);



export const zodTrialMemberSchema = z.object({
  tenantId: z.string(),

  userId: z.string().optional(),

  userName: z.string().min(3),

  email: z.string().email(),

  password: z
    .string()
    .min(8)
    .refine((value) => isEncryptedPassword(value), {
      message: userMessages.ENCRYPT_PASSWORD_ERROR,
    }),

  role: z.array(z.string()).min(1),

  profileImage: z.string().nullable().optional(),

  status: z.enum([
    appStatus.ACTIVE,
    appStatus.IN_ACTIVE,
    appStatus.DELETED,
  ]),

  createdDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .optional(),

  createdBy: z.string(),

  lastUpdatedDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val))
    .optional(),

  lastUpdatedBy: z.string(),
});


export const TrialMemberModel =
  mongoose.model<ITrialMember>("TrialMembers", trialMemberSchema);

export default TrialMemberModel;