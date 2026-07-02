import mongoose, { Schema } from "mongoose";
import { IMeetingSchedule } from "../../types/models.types";
import CustomEnumerator from "../shared/enum";
import { z } from "zod";
import { appStatus } from "../config/messages";


const meetingScheduleSchema = new Schema<IMeetingSchedule>(
  {
    tenantId: { type: String, required: true },
    academicCoach: {
    academicCoachId: {
        type: String,
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
    },
    teacher: {
      teacherId: {
        type: String,
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      }
    },
    student: {
      studentId: {
        type: String,
        required: false,
      },
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      country:{
        type: String,
        required: false,
      },
      phonenumber:{
        type: String,
        required: false,
      }

    },
    trialId:{
      type: String,
      required: false,
    },
    classStatus:{
      type: String,
      required: false,
    },
    subject: {
      type: String,
      required: true,
    },
    meetingLocation: {
      type: String,
      required: false,
    },  
    course: {
      courseId: {
        type: String,
        required: true,
      },
      courseName: {
        type: String,
        required: true,
      },
    },
    classType: {
      type: String,
      required: false,
    },
    meetingType: {
      type: String,
      required: false,
    },
    meetingLink: {
      type: String,
      required: false,
    },
    isScheduledMeeting: {
      type: Boolean,
      required: false,
    },
    scheduledStartDate: {
      type: Date,
      required: false,
    },
    scheduledEndDate: {
      type: Date,
      required: false,
    },
    scheduledFrom: {
      type: String,
      required: false,
    },
    scheduledTo: {
      type: String,
      required: false,
    },
    timeZone: {
      type: String,
      required: false,
    },
    remainderInMinutes: {
      type: Number,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    meetingStatus: {
      type: String,
      required: false,
    },
    studentResponse: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: true,
    },
    createdDate: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastUpdatedDate: {
      type: Date,
      required: false,
      default: Date.now(),
    },
    lastUpdatedBy: {
      type: String,
      required: false,
    },
  },
  {
    collection: "meetingSchedules",
    timestamps: false,
  }
);


export const scheduleSchema = z.object({
  tenantId: z.string(),
  academicCoach: z.object({
    academicCoachId: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email().optional()
  }),

  student: z.object({
      studentId: z.string().optional(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      phonenumber: z.string().optional()
    }),
  trialId: z.string().optional(),
  subject: z.string(),
  meetingLocation: z.string().optional(),
  course: z.object({
    courseId: z.string().optional(),
    courseName:z.string().optional()
  }),
  classType: z.string().optional(),
  meetingType : z.string().optional(),
  meetingLink: z.string().optional(),
  isScheduledMeeting: z.boolean(),
  scheduledStartDate: z.string().transform((val) => new Date(val)).optional(),
  scheduledEndDate: z.string().transform((val) => new Date(val)).optional(),
  scheduledFrom: z.string().optional(),
  scheduledTo: z.string().optional(),
  timeZone: z.string().optional(),
  remainderInMinutes: z.number().optional(),
  description: z.string().optional(),
  meetingStatus: z.string().optional(),
  studentResponse: z.string().optional(),
  status: z.string(z.enum([
    appStatus.ACTIVE,
    appStatus.IN_ACTIVE,
  ])).default(appStatus.ACTIVE),
  createdBy: z.string(),
  lastUpdatedBy: z.string().optional(),
 
});

export default mongoose.model<IMeetingSchedule>(
  "MeetingSchedules",
  meetingScheduleSchema
);


