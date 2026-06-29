import mongoose, { Schema } from "mongoose";
import { string, z } from "zod";
import { appStatus, commonMessages } from "../config/messages";
import { IEmpwages } from "../../types/models.types";


const empWagesSchema = new Schema<IEmpwages>(
  {
employeeId:{
    type: String,
    required: true,
},
employeeName: 
{
    type: String,
    required: true,
},
classType:{
    
className:{
    type: String,
    required: true,
},
hoursMins: {
    type: String,
    required: true,
},
rate:{
    type: String,
    required: true,
},
currency:{
    type: String,
    required: true,
},
},
status:
{
type: String,
required: false,
},
createdDate:
{
type: Date,
required: false,
},
createdBy:
{
type: String,
required: false,
},
updatedDate:
{
type: Date,
required: false,
},
updatedBy:
{
type: String,
required: false,
}

  },
  {
    collection: "employeeWages",
    timestamps: false,
}
);
export const zodEmpWagesSchema = z.object({
    employeeId : z.string().min(3),
    employeeName : z.string().min(1),
    classType:z.object({
        className:z.string().optional(),
        hoursMins:z.string().optional(),
        rate:z.string().optional(),
        currency:z.string().optional(),
    }).optional(),
      status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]).optional(),
      createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      createdBy: z.string().optional(),
      updatedDate:z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      updatedBy:z.string().optional()
})
export default mongoose.model<IEmpwages>("EmployeeWages", empWagesSchema);