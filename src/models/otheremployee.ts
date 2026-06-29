import mongoose, { Schema } from "mongoose";
import { IOtherEmployee } from "../../types/models.types";
import { z } from "zod";
import { commonMessages } from "../config/messages";

const otherEmployeeSchema = new Schema<IOtherEmployee>(
    {
    firstName:
    {
     type: String,
     required: true,
    },
    lastName:
    {
     type: String,
     required: true,
    },
    email:
    {
    type: String,
    required: true,
    },
    phoneNumber:
    {
    type: Number,
    required: true,
    },
    nationality:
    {
        type: String,
        required: false
    },
    country:
    {
    type: String,
    required: true,
    },
    city:
    {
    type: String,
    required: true,
    },
    dateOfBirth:
    {
        type: String,
        required: true,
    },
    gender: 
    {
     type: String,
     required: false
    },
    residentialAddress:
    {
    type: String,
     required: false
    },
    higherQualification:
    {
        type: String,
         required: false
    },
    universityName:
    {
        type: String,
         required: false
    },
    previousJob:
    {
        type: String,
         required: false
    },
    experience:
    {
        type: String,
         required: false 
    },
    bankName:
    {
        type: String,
        required: false 
    },
    accountNumber:
    {
        type: Number,
        required: false 
    },
    bankCode:
    {
        type: String,
        required: false   
    },
    passportNumber:
    {
        type: String,
        required: false  
    },
    languagesKnown:
    {
        type: String,
        required: false     
    },
    emergencyContactNumber:
    {
        type: Number,
        required: false    
    },
    relationshipWithEmployee:
    {
        type: String,
        required: true, 
    },
    address:
    {
        type: String,
        required: true,
    },
    designation:
    {
    type: String,
    required: true, 
    },
    department:
    {
    type: String,
    required: true, 
    },
    preferedWorkingHours:
    {
    type: Number,
    required: true,   
    },
    preferedShiftFrom:{
    type: String,
    required: true,  
    },
    preferedShiftTo:{
        type: String,
        required: true,  
    },
    comments:
    {
    type: String,
    required: true,   
    },
    profileImage:
    {
    type: String,
    required: true,    
    },
    applicationDate:
    {
    type: Date,
    required: true,
    },
    currency:
    {
    type: String,
    required: true, 
    },
    expectedSalary:
    {
    type: Number,
    required: true, 
    },
    applicationStatus:
    {
    type: String,
    required: false,
    },
    preferedWorkingDays:
    {
    type: String,
    required: false,
    },
    resume:
    {
    type: Buffer,
    required: false,
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
    collection: "otheremployee",
    timestamps: false,
    }  

    );
    export const zodOtherEmployeeSchema = z.object({
        firstName: z.string().min(3),
        lastName: z.string().min(1),
        email: z.string().email(),
        phoneNumber:z.preprocess(
            (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
            z.number()
          ),
        nationality: z.string(),
        country:z.string(),
        city: z.string(),
        dateOfBirth:z.string(),
        gender: z.string(),
        residentialAddress: z.string(),
        higherQualification: z.string(),
        universityName: z.string(),
        previousJob: z.string(),
        experience: z.preprocess(
            (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
            z.number()
          ),
        bankName: z.string(),
        accountNumber: z.preprocess(
            (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
            z.number()
          ),
        bankCode: z.string(),
        passportNumber: z.string(),
        languagesKnown: z.string(),
        emergencyContactNumber: z.preprocess(
            (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
            z.number()
          ),
        relationshipWithEmployee: z.string(),
        address: z.string(),
        designation: z.string(),
        department: z.string(),
        preferedWorkingHours: z.preprocess(
            (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
            z.number()
          ),
        preferedShiftFrom: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in 24-hour format HH:MM"),
        preferedShiftTo: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in 24-hour format HH:MM"),
        comments: z.string(),
        profileImage: z.string().optional(),
        applicationDate:  z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: commonMessages.INVALID_DATE_FORMAT,
          }).transform((val) => new Date(val)),
        currency: z.string(),
        expectedSalary: z.preprocess(
            (val) => (typeof val === "string" ? parseInt(val, 10) : val), 
            z.number()
          ),
        applicationStatus: z.string(),
        preferedWorkingDays: z.string().optional(),
        status: z.string(),
        createdBy: z.string().optional(),
        createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: commonMessages.INVALID_DATE_FORMAT,
          }).transform((val) => new Date(val)).optional(),
          updatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: commonMessages.INVALID_DATE_FORMAT,
          }).transform((val) => new Date(val)).optional(),

        updatedBy: z.string().optional()
    })
    export default mongoose.model<IOtherEmployee>("Otheremployee", otherEmployeeSchema);
    