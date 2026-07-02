import mongoose, { model, Schema } from "mongoose";

import { IRecruitment } from "../../types/models.types";
import { z } from "zod";
import { applicationStatus, appStatus, commonMessages } from "../config/messages";


const recruitmentSchema = new Schema<IRecruitment>(
{
tenantId: { type: String, required: true },
candidateId: {
    type: String,
    required: true,
},
candidateFirstName:{
    type: String,
    required: true,
},
candidateLastName:{
    type: String,
    required: true,
},
supervisor:{
    supervisorId:{
        type: String,
        required: false,
    },
    supervisorName:{
        type: String,
        required: false,  
    },
    supervisorEmail:{
        type: String,
        required: false,
    },
    supervisorRole:{
        type: String,
        required: false,
    }
},
gender: {
    type: String,
    required: false
},
applicationDate:{
    type: Date,
    required: true,
},
candidateEmail:{
    type: String,
    required: true,
},
candidatePhoneNumber:{
    type: Number,
    required: true,
},
candidateCountry:{
 type: String,
 required: true,
},
candidateCity:{
    type: String,
    required: true,
},
positionApplied:{
    type: String,
    required: true,
},
currency:{
    type: String,
    required: true, 
},
expectedSalary:{
    type: Number,
    required: true, 
},
preferedWorkingHours:{
    type: String,
    required: true,
},
uploadResume:{
    type: String,
    required: false,
},
comments:{
    type: String,
    required: true,
},

applicationStatus:{
    type: String,
    required: false,
},
level:{
    type: String,
    required: false,
},
quranReading:{
    type: String,
    required: false,
},
tajweed:{
    type: String,
    required: false,
},
arabicWriting:{
    type: String,
    required: false,
},
arabicSpeaking:{
    type: String,
    required: false,
},
englishSpeaking:{
    type: String,
    required: false, 
},
preferedWorkingDays:{
    type: String,
    required: false,
},
overallRating:{
    type: Number,
    required: false,
},
professionalExperience:[{

    jobRole: {
      type: String,
      required: false, 
    },
    organizationName: {
      type: String,
      required: false,
    },
    jobLocation: {
      type: String,
      required: false,
    },
    fromDate: {
      type:Date,
      required: false,
    },
      toDate: {
      type:Date,
      required: false,
    },

    jobDescription: {
      type: String,
      required: false,
    },
}],

skills:{
    type: String,
    required: false,
},
status:{
    type: String,
    required: false,
},
createdDate:{
    type: Date,
    required: true,
},
createdBy:{
    type: String,
    required: true,
},
updatedDate:{
    type: Date,
    required: false,
},
updatedBy:{
    type: String,
    required: false,
}
},  
{
    collection: "recruitment",
    timestamps: false,
}
);
export const zodRecruitmentSchema = z.object({
    tenantId: z.string(),
    candidateFirstName : z.string().min(3),
    candidateLastName : z.string().min(1),
    supervisor:z.object({
        supervisorId:z.string().optional(),
        supervisorName:z.string().optional(),
        supervisorEmail:z.string().optional(),
        supervisorRole:z.string().optional(),
    }).optional(),
    gender: z.string().optional(),
    applicationDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      candidateEmail: z.string().email() ,
      candidatePhoneNumber: z.preprocess(
        (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
        z.number()
      ),
      candidateCountry: z.string(),
      candidateCity: z.string(),
      positionApplied: z.string(),
      currency: z.string(),
      expectedSalary: z.preprocess(
        (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
        z.number()
      ),
      preferedWorkingHours: z.string(),
      comments: z.string().optional(),
      applicationStatus: z.enum([applicationStatus.NEWAPPLICATION, applicationStatus.SHORTLISTED, applicationStatus.REJECTED, applicationStatus.WAITING, applicationStatus.SENDAPPROVAL, applicationStatus.APPROVED ]).optional(),
      level: z.string().optional(),
      quranReading: z.string().optional(),
      tajweed: z.string().optional(),
      arabicWriting: z.string().optional(),
      arabicSpeaking: z.string().optional(),
      englishSpeaking: z.string().optional(),
      preferedWorkingDays: z.string().optional(),
      overallRating: z.preprocess(
        (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
        z.number()
      ).optional(),
    //   professionalExperience:z.array(z.object({
    //     jobRole: z.string().optional(),
    //     organizationName: z.string().optional(),
    //     jobLocation: z.string().optional(),
    //     fromDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    //     message: commonMessages.INVALID_DATE_FORMAT,
    //   }).transform((val) => new Date(val)).optional(),
    //     toDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    //     message: commonMessages.INVALID_DATE_FORMAT,
    //   }).transform((val) => new Date(val)).optional(),
    //     jobDescription:  z.string().optional()
    //   })
    // ).optional(),
      skills: z.string().optional(),
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
export default mongoose.model<IRecruitment>("Recruitment", recruitmentSchema);
