import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IRecruitmentInterviewSchedule } from "../../types/models.types";
import { RecruitmentInterviewPlatform } from "../shared/enum";
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
    interviewPlatform: {
      type: String,
      enum: Object.values(RecruitmentInterviewPlatform),
      required: true,
    },
  },
  {
    collection: "recruitmentInterviewSchedules",
    timestamps: true,
  }
);

recruitmentInterviewScheduleSchema.index({ recruitmentId: 1 }, { unique: true });

export const zodRecruitmentInterviewScheduleSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i, "A valid recruitment _id is required"),
  interviewDate: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((value) => new Date(value)),
  interviewTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Interview time must be in HH:MM (24-hour) format",
  }),
  interviewPlatform: z.nativeEnum(RecruitmentInterviewPlatform),
}).strict();

export default mongoose.model<IRecruitmentInterviewSchedule>(
  "RecruitmentInterviewSchedule",
  recruitmentInterviewScheduleSchema
);
