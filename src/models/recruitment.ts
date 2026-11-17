import mongoose, { model, Schema } from "mongoose";

import { IRecruitment } from "../../types/models.types";
import { z } from "zod";
import { applicationStatus, appStatus, commonMessages } from "../config/messages";
import {
  RecruitmentEmployment,
  RecruitmentExperience,
  RecruitmentTeaching,
  RecruitmentPositions,
  RecruitmentDays,
} from "../shared/enum";


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
dateOfBirth: {
    type: Date,
    required: false
},
address: {
    type: String,
    required: false
},
highestQualification: { type: String, required: false },
specialization: { type: String, required: false },
university: { type: String, required: false },
completionYear: { type: Number, required: false },
experienceType: { type: String, required: false },
teachingExperience: { type: Number, required: false },
previousInstitutionName: { type: String, required: false },
previousDesignation: { type: String, required: false },
technicalSkills: { type: [String], required: false },
teachingSkills: { type: [String], required: false },
languages: { type: [String], required: false },
employmentType: { type: String,required: false },
teachingMode: { type: [String],required: false },
availableWorkingDays: { type: [String], required: false },
position: { type: String, required: false },
currentSalary: { type: Number, required: false },
joiningAvailability: { type: String, required: false },
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
 required: false,
},
candidateCity:{
    type: String,
    required: false,
},
positionApplied:{
    type: String,
    required: false,
},

currency:{
    type: String,
    required: false, 
},
expectedSalary:{
    type: Number,
    required: true, 
},
preferedWorkingHours:{
    type: String,
    required: false,
},
uploadResume:{
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
      dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      address: z.string().optional(),
      highestQualification: z.string().optional(),
      specialization: z.string().optional(),
      university: z.string().optional(),
      completionYear: z.preprocess((val) => val === "" || val == null ? undefined : typeof val === "string" ? parseInt(val, 10) : val, z.number().int().optional()),
      experienceType: z.enum([
          RecruitmentExperience.FRESHER,
          RecruitmentExperience.EXPERIENCED
      ]).optional(),
      employmentType: z.enum([
          RecruitmentEmployment.FULL_TIME,
          RecruitmentEmployment.HALF_TIME,
          RecruitmentEmployment.HOURLY
      ]).optional(),
      teachingExperience: z.preprocess((val) => val === "" || val == null ? undefined : typeof val === "string" ? parseFloat(val) : val, z.number().nonnegative().optional()),
      previousInstitutionName: z.string().optional(),
      previousDesignation: z.string().optional(),
      technicalSkills: z.preprocess((val) => typeof val === "string" ? val.split(",").map((item) => item.trim()).filter(Boolean) : val, z.array(z.string()).optional()),
      teachingSkills: z.preprocess((val) => typeof val === "string" ? val.split(",").map((item) => item.trim()).filter(Boolean) : val, z.array(z.string()).optional()),
      languages: z.preprocess((val) => typeof val === "string" ? val.split(",").map((item) => item.trim()).filter(Boolean) : val, z.array(z.string()).optional()),
      teachingMode: z.preprocess(
        (val) => typeof val === "string" ? val.split(",").map((item) => item.trim()).filter(Boolean) : val,
        z.array(z.enum([
          RecruitmentTeaching.ONLINE,
          RecruitmentTeaching.OFFLINE
        ])).optional()
      ),
      availableWorkingDays: z.preprocess(
        (val) => typeof val === "string" ? val.split(",").map((item) => item.trim()).filter(Boolean) : val,
        z.array(z.enum([
          RecruitmentDays.MONDAY,
          RecruitmentDays.TUESDAY,
          RecruitmentDays.WEDNESDAY,
          RecruitmentDays.THURSDAY,
          RecruitmentDays.FRIDAY,
          RecruitmentDays.SATURDAY,
          RecruitmentDays.SUNDAY
        ])).optional()
      ),
    
      currentSalary: z.preprocess((val) => val === "" || val == null ? undefined : typeof val === "string" ? parseFloat(val) : val, z.number().nonnegative().optional()),
      joiningAvailability: z.string().optional(),
      candidateEmail: z.string().email() ,
      candidatePhoneNumber: z.preprocess(
        (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
        z.number()
      ),
      candidateCountry: z.string().optional(),
      candidateCity: z.string().optional(),
      positionApplied: z.string().optional(),
      position: z.enum([
        RecruitmentPositions.DEVELOPER,
        RecruitmentPositions.UI_UX
      ]).optional(),
      currency: z.string().optional(),
      expectedSalary: z.preprocess(
        (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
        z.number()
      ),
      preferedWorkingHours: z.string(),
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
