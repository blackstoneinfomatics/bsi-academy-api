import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { IMeeting } from "../../types/models.types";
import { appStatus, commonMessages } from "../config/messages";

const participantSchema = new Schema(
  {
    participantId: { type: String, required: true },
    participantName: { type: String, required: true },
    participantEmail: { type: String, required: false },
    role: { type: String, enum: ["teacher", "student", "admin","supervisor","academiccoach"], required: true },
    attendee: { type: String, required: false },
  },
  { _id: false }
);

// ✅ Main meeting schema
const addMeetingSchema = new Schema<IMeeting>(
  {
    meetingName: { type: String, required: true },
    meetingId: { type: String, required: false },

  

    // ✅ Organizer details (one of admin/teacher/supervisor/student/academiccoach)
    organizer: {
      organizerId: { type: String, required: false },
      organizerName: { type: String, required: false },
      organizerEmail: { type: String, required: false },
      role: { type: String, enum: ["teacher", "student", "admin", "supervisor", "academiccoach"], required: false },
      _id: false,
    },

    selectedDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },

    // ✅ Unified participants field
    participants: { type: [participantSchema], required: false },

    description: { type: String, required: true },
    meetingStatus: { type: String, required: true },
    meetingminutes: { type: String, required: false },
    duration: { type: String, required: false },
    teacher: {
      type: [
        {
          teacherId: { type: String, required: false },
          teacherName: { type: String, required: false },
          teacherEmail: { type: String, required: false },
          attendee: { type: String, required: false },
        },
      ],
      required: false,
    },
    status: {
      type: String,
      enum: [appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED],
      required: false,
    },

    createdDate: { type: Date, required: true },
    createdBy: { type: String, required: true },
    updatedDate: { type: Date, required: false },
    updatedBy: { type: String, required: false },
  },
  {
    collection: "addMeeting",
    timestamps: false,
  }
);

// ✅ Zod schema for creating a meeting
export const zodAddMeetingSchema = z.object({
  meetingName: z.string(),
  meetingId: z.string().optional(),
  teacher: z.array(z.object({
    teacherId: z.string().optional(),
    teacherName: z.string().optional(),
    teacherEmail: z.string().optional(),
    attendee: z.string().optional(),
  })).optional(),


  // ✅ Organizer validation
  organizer: z
    .object({
      organizerId: z.string().optional(),
      organizerName: z.string().optional(),
      organizerEmail: z.string().optional(),
      role: z.enum(["teacher", "student", "admin", "supervisor", "academiccoach"]).optional(),
    })
    .optional()
    .nullable(),

  selectedDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val)),

  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),

  // ✅ Unified participants validation
  participants: z
    .array(
      z.object({
        participantId: z.string(),
        participantName: z.string(),
        participantEmail: z.string().email().optional(),
        role: z.enum(["teacher", "student", "admin","supervisor","academiccoach"]),
        attendee: z.string().optional(),
      })
    )
    .optional(),

  description: z.string().min(5),
  meetingStatus: z.string(),
  meetingminutes: z.string().optional(),
  duration: z.string().optional(),

  status: z
    .enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED, "Scheduled"])
    .optional(),

  createdDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => new Date(val)),

  createdBy: z.string(),
  updatedDate: z
    .string()
    .optional()
    .refine((val) => (val ? !isNaN(Date.parse(val)) : true), {
      message: commonMessages.INVALID_DATE_FORMAT,
    })
    .transform((val) => (val ? new Date(val) : undefined)),

  updatedBy: z.string().optional(),
  filterValues: z
    .object({
      meetingStatus: z.union([z.string(), z.array(z.string())]).optional(),
      startTime: z.union([z.string(), z.array(z.string())]).optional(),
      dateRange: z
        .object({
          from: z.string().refine((val) => !isNaN(Date.parse(val))),
          to: z.string().refine((val) => !isNaN(Date.parse(val))),
        })
        .optional(),
    })
    .optional(),
});

// ✅ For update
export const zodUpdateMeetingSchema = zodAddMeetingSchema.partial();

export default mongoose.model<IMeeting>("addMeeting", addMeetingSchema);



