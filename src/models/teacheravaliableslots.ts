import mongoose, { Schema } from "mongoose";
import { TeacherAvaliableSlots } from "../../types/models.types";

const teacherAvaliableSlotsSchema = new Schema<TeacherAvaliableSlots>(
  {
    date: { type: String, required: true },
    teacherId: { type: String, required: true },
    name:{type :String ,required:true},
    position :{type :String , required : true},
    from: { type: String, required: true },
    to: { type: String, required: true },
    isStatus: { type: Boolean, default: true },
    createdDate: { type: Date, default: Date.now },
  },
  {
    collection: "TeacherAvaliableSlots",
    timestamps: false, 
  }
);

export default mongoose.model<TeacherAvaliableSlots>('TeacherAvaliableSlots',teacherAvaliableSlotsSchema);