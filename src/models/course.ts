import mongoose, { Schema } from "mongoose";
import CustomEnumerator from "../shared/enum";
import { ICourse } from "../../types/models.types";
import { z } from "zod";
import { appStatus } from "../config/messages";

const courseSchema = new Schema<ICourse>({
    tenantId: { type: String, required: true },
    course: {
      courseId: { type: String, required: false },
      courseTitle: { type: String, required: true },
      courseDuration: { type: String, required: true },
      courseDescription: { type: String, required: true },
      courseLevel: { type: String, required: true },
    },
    courseName: { type: String, required: true },
    level:{ type: String, required: true }, 
    status: {
      type: String,
      enum: CustomEnumerator.Status,
      default: 'Active',
    },
    createdDate: { type: Date, default: Date.now },
    createdBy: { type: String },
    lastUpdatedDate: { type: Date },
    lastUpdatedBy: { type: String },
  }, 
  {
    collection: "courses",
    timestamps: false,
  });
  


  export const zodCourseSchema = z.object({
    tenantId: z.string(),
    course: z.object({
      courseId: z.string().optional(),
      courseTitle: z.string(),
      courseDuration: z.string(),
      courseDescription: z.string(),
      courseLevel: z.string(),
    }),
    courseName: z.string(),
    level:z.string(),
    status: z.string().default('Active'),
    createdDate: z.string(),
    createdBy: z.string(),
    lastUpdatedDate: z.string(),
    lastUpdatedBy: z.string(),
  });
  



export default mongoose.model<ICourse>('Course', courseSchema);