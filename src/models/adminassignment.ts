import mongoose, { Schema } from "mongoose";
import { IAdminAssignment } from "../../types/models.types";
import { z } from "zod";

const adminAssignmentSchema = new Schema<IAdminAssignment>(
  {
    tenantId: { type: String, required: true },
    levelId: { type: String, required: true },
    levelName: { type: String, required: true },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    assignmentId: { type: String, required: true },
    assignmentName: { type: String, required: true },
    assignmentType: { type: String, required: true },
    questionName: { type: String, required: true },
    chooseType: { type: Boolean, default: false },
    trueorfalseType: { type: Boolean, default: false },
    question: { type: String, required: false },
    options: { type: [String], required: false },
    audioFile: { type: Buffer, required: false },
    uploadFile: { type: Buffer, required: false },
    answerValidation: { type: String, required: true },
    createdDate: { type: Date, default: Date.now },
    createdBy: { type: String, required: true },
    updatedDate: { type: Date, default: Date.now },
    updatedBy: { type: String, required: true },
  },
  {
    collection: "adminAssignments",
    timestamps: false,
  }
);

export const zodAdminAssignmentSchema = z.object({
  tenantId: z.string(),
  levelId: z.string(),
  levelName: z.string(),
  courseId: z.string(),
  courseName: z.string(),
  assignmentId: z.string(),
  assignmentName: z.string(),
  assignmentType: z.string(),
  questionName: z.string(),

  chooseType: z.boolean().optional(),
  trueorfalseType: z.boolean().optional(),
  question: z.string().optional(),
  options: z.array(z.string()).optional(),

  audioFile: z
    .any()
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        val === null ||
        typeof val === "string" ||
        Buffer.isBuffer(val),
      {
        message: "audioFile must be a Buffer, base64 string, or null",
      }
    ),

  uploadFile: z
    .any()
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        val === null ||
        typeof val === "string" ||
        Buffer.isBuffer(val),
      {
        message: "uploadFile must be a Buffer, base64 string, or null",
      }
    ),

  answerValidation: z.string(),

  createdDate: z.preprocess((val) => new Date(val as string), z.date()),
  createdBy: z.string(),
  updatedDate: z.preprocess((val) => new Date(val as string), z.date()),
  updatedBy: z.string(),
});

export default mongoose.model<IAdminAssignment>("AdminAssignment", adminAssignmentSchema);
