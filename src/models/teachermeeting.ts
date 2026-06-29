import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { TeacherMeeting } from "../../types/models.types";
import { teacherStatus, commonMessages } from "../config/messages";

const TeacherMeetingSchema = new Schema<TeacherMeeting>(
  {
    meetingId: { type: String, required: true },
    meetingName: { type: String, required: true },
    teacher: {
      teacherId: { type: String, required: false },
      teacherName: { type: String, required: false },
      teacherEmail: { type: String, required: false },
    },
    participants: {
      type: [
        {
          studentId: { type: String, required: false },
          studentName: { type: String, required: false },
          studentEmail: { type: String, required: false },
        }
      ],
      required: false,
    },
    
    selectedDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    description: { type: String, required: true },
    meetingStatus: {
      type: String,
      required: true,
      enum: [teacherStatus.SCHEDULED, teacherStatus.RESCHEDULED],
    },
    status: {
      type: String,
      required: true,
      enum: [
        teacherStatus.ACTIVE,
        teacherStatus.IN_ACTIVE,
        teacherStatus.DELETED,
        teacherStatus.ARCHIVED,
        teacherStatus.NEW,
      ],
    },
    createdDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: String, required: true },
    updatedDate: { type: Date, required: true, default: Date.now },
    updatedBy: { type: String, required: false },
  },
  {
    collection: "teacherMeeting",
    timestamps: false,
  }
);


export const zodTeacherMeetingSchema = z.object({
  meetingId: z.string().optional(),
  meetingName: z.string(),
  teacher: z.object({
    teacherId: z.string().optional(),
    teacherName: z.string().optional(),
    teacherEmail: z.string().optional(),
  }),
  participants: z
  .array(
    z.object({
      studentId: z.string().optional(),
      studentName: z.string().optional(),
      studentEmail: z.string().optional()
    })
  ).optional(),

  // selectedDate: z.string(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  description: z.string(),
  meetingStatus: z.enum([teacherStatus.SCHEDULED, teacherStatus.RESCHEDULED]),
  status: z.enum([teacherStatus.ACTIVE, teacherStatus.IN_ACTIVE]),
  createdDate: z.string().optional(),
  createdBy: z.string().optional(),
  updatedDate: z
    .string()
    .optional()
    .refine((val) => (val ? !isNaN(Date.parse(val)) : true), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => (val ? new Date(val) : undefined)),
  updatedBy: z.string().optional(),
  selectedDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val)),

  filterValues: z
  .object({
    course: z
      .object({
        courseName: z.union([z.string(), z.array(z.string())]).optional(),
      })
      .optional(),
    meetingStatus: z.union([z.string(), z.array(z.string())]).optional(),
 
    startTime: z.union([z.string(), z.array(z.string())]).optional(),
    dateRange: z
      .object({
        from: z.string().refine(val => !isNaN(Date.parse(val))),
        to: z.string().refine(val => !isNaN(Date.parse(val)))
      })
      .optional(),
  })
  .optional(),
  
});

export const zodUpdateMeetingSchema = zodTeacherMeetingSchema.partial();

export default mongoose.model<TeacherMeeting>('teacherMeeting', TeacherMeetingSchema);