import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IRecruitmentInterviewSchedule } from "../../types/models.types";
import {
  RecruitmentInterviewMode,
  RecruitmentInterviewPlatform,
} from "../shared/enum";
import { commonMessages } from "../config/messages";

const recruitmentInterviewScheduleSchema = new Schema<IRecruitmentInterviewSchedule>(
  {
    recruitmentId: {
      type: Schema.Types.ObjectId,
      ref: "Recruitment",
      required: true,
    },
    tenantId: { type: String, required: true },
    candidateFirstName: { type: String, required: true },
    position: { type: String, required: false },
    teachingExperience: { type: Number, required: false },
    interviewDate: { type: Date, required: true },
    interviewTime: { type: String, required: true },
    previousInterviewDate: { type: Date, required: false },
    previousInterviewTime: { type: String, required: false },
    rescheduleReason: { type: String, required: false, trim: true },
    createdBy: { type: String, required: false, trim: true },
    interviewMode: {
      type: String,
      enum: Object.values(RecruitmentInterviewMode),
      default: RecruitmentInterviewMode.ONLINE,
      required: true,
    },
    interviewPlatform: {
      type: String,
      enum: Object.values(RecruitmentInterviewPlatform),
      required: false,
    },
    interviewmeetinglink: { type: String, required: true },
  },
  {
    collection: "recruitmentInterviewSchedules",
    timestamps: true,
  }
);

recruitmentInterviewScheduleSchema.index({ recruitmentId: 1 }, { unique: true });
recruitmentInterviewScheduleSchema.index(
  { interviewDate: 1, interviewTime: 1 },
  { unique: true }
);

export const zodRecruitmentInterviewIdSchema = z.string().regex(
  /^[a-f\d]{24}$/i,
  "A valid recruitment _id is required"
);

const recruitmentInterviewSchedulePayloadSchema = z.object({
  _id: zodRecruitmentInterviewIdSchema,
  interviewDate: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((value) => new Date(value)),
  interviewTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Interview time must be in HH:MM (24-hour) format",
  }),
  interviewMode: z.nativeEnum(RecruitmentInterviewMode).default(
    RecruitmentInterviewMode.ONLINE
  ),
  interviewPlatform: z
    .union([
      z.nativeEnum(RecruitmentInterviewPlatform),
      z.enum(["GOOGLE_MEET", "ZOOM"]),
    ])
    .transform((platform) => {
      if (platform === "GOOGLE_MEET") {
        return RecruitmentInterviewPlatform.GOOGLE_MEET;
      }
      if (platform === "ZOOM") {
        return RecruitmentInterviewPlatform.ZOOM;
      }
      return platform;
    })
    .optional(),
}).strict();

export const zodRecruitmentInterviewScheduleSchema =
  recruitmentInterviewSchedulePayloadSchema.superRefine((payload, context) => {
  if (
    payload.interviewMode === RecruitmentInterviewMode.ONLINE &&
    !payload.interviewPlatform
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["interviewPlatform"],
      message: "Interview platform is required for online interviews",
    });
  }
});

export const zodRecruitmentInterviewRescheduleSchema =
  recruitmentInterviewSchedulePayloadSchema
    .omit({ _id: true })
    .extend({
      rescheduleReason: z.string().trim().min(1).max(1000).optional(),
    })
    .superRefine((payload, context) => {
      if (
        payload.interviewMode === RecruitmentInterviewMode.ONLINE &&
        !payload.interviewPlatform
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["interviewPlatform"],
          message: "Interview platform is required for online interviews",
        });
      }
    });

export default mongoose.model<IRecruitmentInterviewSchedule>(
  "RecruitmentInterviewSchedule",
  recruitmentInterviewScheduleSchema
);
