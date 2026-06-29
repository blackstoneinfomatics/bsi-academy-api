import mongoose, { Schema } from "mongoose";
import { ILevel } from "../../types/models.types";
import { z } from "zod";

const levelSchema = new Schema<ILevel>(
  {
    courseId: { type: String, required: true },
    level: { type: String, required: true },
    duration: { type: String, required: true },
    description: { type: Buffer, required: true },
    createdDate: { type: Date, default: Date.now },
    createdBy: { type: String , required: true },
  },
  {
    collection: "levels",
    timestamps: false,
  }
);
export const zodLevelSchema = z.object({
  courseId: z.string(),
  level: z.string(),
  duration: z.string(),
  description: z.string().min(1),
  createdDate: z.date(),
  createdBy: z.string(),
});

export default mongoose.model<ILevel>("Level", levelSchema);
