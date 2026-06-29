import mongoose, { Schema } from "mongoose";
import {  ISupervisorFeedbackCreate } from "../../types/models.types";
import { z } from "zod";

const FeedbackSchema = new Schema<ISupervisorFeedbackCreate>(
  {
    student: {
      studentId: { type: String, required: false },
      studentFirstName: { type: String, required: false },
      studentLastName: { type: String, required: false },
      studentEmail: { type: String, required: false },
    },
    supervisor: {
      supervisorId: { type: String, required: false },
      supervisorFirstName: { type: String, required: false },
      supervisorLastName: { type: String, required: false },
      supervisorEmail: { type: String, required: false },
    },
    teacher: {
      teacherId: { type: String, required: false },
      teacherName: { type: String, required: false },
      teacherEmail: { type: String, required: false },
    },
    classDay: { type: String, required: false },
    preferedTeacher: { type: String, required: false },
    course: {
      courseId: { type: String, required: false },
      courseName: { type: String, required: false },
    },

    // ✅ Ratings related to performance
    teacherRatings: {
      listening: { type: Number, required: false, min: 0, max: 5 },
      reading: { type: Number, required: false, min: 0, max: 5 },
      overall: { type: Number, required: false, min: 0, max: 5 },
    },

    // ✅ NEW: Separate Student-Specific Ratings
    studentsRating: {
      classUnderstanding: { type: Number, required: false, min: 0, max: 5 },
      engagement: { type: Number, required: false, min: 0, max: 5 },
      homeworkCompletion: { type: Number, required: false, min: 0, max: 5 },
    },
    supervisorRating: {
      knowledgeofstudentsandcontent:{ type: Number, required: false, min: 0, max: 5 },
      assessmentofstudents: { type: Number, required: false, min: 0, max: 5 },
      communicationandcollaboration: { type: Number, required: false, min: 0, max: 5 } ,
      professionalism: { type: Number, required: false, min: 0, max: 5 },
    },
    level: { type: Number, required: false },
      sessionId :{ type: String, required: false},
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String, required: false },
    endTime: { type: String, required: false },
    feedbackmessage: { type: String, required: false },

    createdDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: String, required: true },
    lastUpdatedDate: { type: Date, required: true, default: Date.now },
    lastUpdatedBy: { type: String, required: false },
  },
  {
    collection: "feedback",
    timestamps: false,
  }
);


export const zodSupervisorFeedbackSchema = z.object({
  student: z.object({
    studentId: z.string(),
    studentFirstName: z.string(),
    studentLastName: z.string(),
    studentEmail: z.string().email(),
  }).optional(),
  supervisor: z.object({
    supervisorId: z.string(),
    supervisorFirstName: z.string(),
    supervisorLastName: z.string(),
    supervisorEmail: z.string().email(),
  }).optional(),
  teacher: z.object({
    teacherId: z.string().optional(),
    teacherName: z.string().optional(),
    teacherEmail: z.string().optional(),
  }).optional(),
  supervisorRating: z.object({
    knowledgeofstudentsandcontent: z.number().optional(),
    assessmentofstudents: z.number().optional(),
    communicationandcollaboration: z.number().optional(),
    professionalism: z.number().optional(),
  }).optional(),
  sessionId: z.string().optional(),
  classDay: z.string().optional(),
  preferedTeacher: z.string().optional(),

  level: z.number().optional(),

  course: z.object({
    courseId: z.string().optional(),
    courseName: z.string(),
  }),

  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .transform((val) => new Date(val)),
    
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .transform((val) => new Date(val)),

  startTime: z.string().optional(),
  endTime: z.string().optional(),
  feedbackmessage: z.string().optional(),

  teacherRatings: z.object({
    listeningAbility: z.number().min(0).max(5).optional(),
    readingAbility: z.number().min(0).max(5).optional(),
    overallPerformance: z.number().min(0).max(5).optional(),
  }),

  studentsRating: z.object({
    classUnderstanding: z.number().min(0).max(5).optional(),
    engagement: z.number().min(0).max(5).optional(),
    homeworkCompletion: z.number().min(0).max(5).optional(),
  }),

  createdDate: z.string().optional(),
  createdBy: z.string().optional(),
  lastUpdatedDate: z.string().optional(),
  lastUpdatedBy: z.string().optional(),
});

export default mongoose.model<ISupervisorFeedbackCreate>("Feedback", FeedbackSchema);

