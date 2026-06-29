import { model, Schema } from "mongoose";
import { z } from "zod";
import { IAlStudents } from "../../types/models.types";
import { appStatus, commonMessages } from "../config/messages";
import { string } from "joi";


const alStudentSchema = new Schema<IAlStudents>(
    {
student: {
    studentId: {
       type: String,
       required: false,
    },
    studentEmail: {
        type: String,
        required: true,
    },
    studentPhone: {
        type: Number,
        required: true,
    },
    course:{
        type: String,
        required: true,
    },
    courseId: {
        type: String,
        required: false,
    },
    package:
    {
        type: String,
        required: true,
    },
    city:{
        type: String,
        required: true,
    },
    country:
    {
        type: String,
        required: true,
    },
    gender:{
        type: String,
        required: true, 
    }
},
refernceId:{
  type:String,
    required: false,
},
referredBy:{  type:String,
    required: false,},
username: {
    type:String,
    required: true,
},
password:{
    type:String,
    required: true, 
},
sessionClassType:{
    type:String,
    required: false,
},
role: {
    type: String,
    required: true,
},
level: {
    type: String,
    required: false,
},
startDate:{
    type: Date,
    required: false,

},
endDate:{
    type: Date,
    required: false,
},
status: {
    type: String,
    required: true
},    
profilepic: { type: Buffer, required: false },

createdDate: {
    type: Date,
    required: true,
},
createdBy: {
    type: String,
    required: false,
},
updatedDate: {
    type: Date,
    required: false,
},
updatedBy: {
    type: String,
    required: false,
}
 },
 {
    collection: "alfurqanstudent",
    timestamps: false,
}
);
const fileObjectSchema = z.object({
    hapi: z.object({
      filename: z.string(),
      headers: z.any(),
      payload: z.any(),
    }).optional(),
    _data: z.any().optional(),
  });
export const zodAlStudentSchema = z.object({
    student: z.object({
      studentId: z.string().optional(),
      studentEmail: z.string(),
      studentPhone: z.number(),
      course: z.string(),
      package: z.string(),
      city: z.string(),
      country: z.string(),
      gender: z.string()
    }),
    sessionClassType:z.string().optional(),
    refernceId:z.string().optional(),
    referredBy:z.string().optional(),
    level:z.string().optional(),
    profilepic: z
    .union([z.string().nullable(), z.instanceof(Buffer), fileObjectSchema])
    .optional()
    .refine(
      (val) =>
        val === null ||
        typeof val === "string" ||
        Buffer.isBuffer(val) ||
        (typeof val === "object" && "_data" in val),
      {
        message: "uploadFile must be a Buffer, a base64 string, a file object, or null",
      }
    ),
    username: z.string().min(3),
    password: z.string().min(8).optional(),
    role: z.string(),
      status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]),
      createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      createdBy: z.string().optional(),
      lastUpdatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      lastUpdatedBy: z.string().optional(),
});
export default model<IAlStudents>("AlfurqanStudent", alStudentSchema);