import mongoose, { model, Schema } from "mongoose";
import { IUsershiftschedule } from "../../types/models.types";
import { z } from "zod";

const usershiftscheduleSchema = new Schema<IUsershiftschedule>({
        academicCoachId: {
            type: String,
            required: false,
        },
        teacherId: {
            type: String,
            required: false,
        },
        supervisorId: {
            type: String,
            required: false,
        },
        employeeId: {
            type: String,
            required: false,
        },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    role: {
      type: String,
      required: true,
  },
  position:{
      type: String,
      required: false,
  },
    workhrs: {
        type: String,
        required: true,
    },
    startdate: {
        type: Date,
        required: true,
    },
    enddate:{
        type: Date,
        required: true,
    },
    fromtime: {
        type: String,
        required: true,
    },
    totime: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: false,
    },
    createdDate: {
        type: Date,
        required: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    lastUpdatedDate: {
        type: Date,
        required: false,
    },
    lastUpdatedBy: {
        type: String,
        required: false,
      }

},
{
    collection: "userShiftSchedule",
    timestamps: false,
})
// export const zodUserShiftScheduleSchema = z.object({

//     academicCoach: z.object({
//         academicCoachId: z.string(),
//         name: z.string(),
//         role: z.string(),
//     }), 
//     teacher: z.object({
//         teacherId: z.string(),
//         name: z.string(),
//         role: z.string(),
//     }),
//     workhrs: z.string(),
//     startdate: z.string(),
//     enddate: z.string(),
//     fromtime: z.string(),
//     totime: z.string(),
//     status: z.string(),
//     createdBy: z.string(),
//     lastUpdatedDate: z.string(),
//     lastUpdatedBy: z.string(),

// })


export default mongoose.model<IUsershiftschedule>("UserShiftSchedule", usershiftscheduleSchema);