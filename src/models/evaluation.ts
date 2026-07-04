import { model, Schema } from "mongoose";
import { IEvaluation } from "../../types/models.types";
import { z } from "zod";
import { appStatus, classType, commonMessages, evaluationStatus, learningInterest, preferredTeacher, referenceSource } from "../config/messages";

const TimeSlotSchema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
);

const evaluationSchema = new Schema<IEvaluation>({
tenantId: { type: String, required: true },
trialId : {
      type: String,
    required: false,
},
academicCoachId: {
    type: String,
    required: true,
  },
  student: {
     studentRegisterId: {
       type: String,
       required: true,
    },
    studentId: {
       type: String,
       required: true,
    },
    studentFirstName: {
        type: String,
        required: true,
    },
    studentLastName: {
        type: String,
        required: true,
    },
    studentEmail: {
        type: String,
        required: true,
    },
    studentGender:{
        type: String,
        required: false, 
    },
    studentPhone: {
        type: Number,
        required: true,
    },
    studentCity:{
        type: String,
        required: true,
    },
    studentCountry: {
        type: String,
        required: true,
    },
    studentCountryCode: {
        type: String,
        required: true,
    },
    learningInterest: {
        type: String,
        required: true,
    },
    numberOfStudents: {
        type: Number,
        required: true,
    },
    preferredTeacher: {
        type: String,
        required: true,
    }, 
    preferredFromTime: {
        type: String,
        required: false,
    },
    preferredToTime: {
        type: String,
        required: false,
    }, 
    timeZone: {
        type: String,
        required: true,
    },
    referralSource: {
        type: String,
        required: true,
    },
    preferredDate: {
        type: Date,
        required: false,
    },
    evaluationStatus: {
        type: String,
        required: true,
    }, 
    
    status: { 
        type: String,
        required: true,
    },
    createdDate: {
        type: Date,
        required: true,
    },
    createdBy: {
        type: String,
        required: false,
    }
  },
  classType: {
    type: String,
    required: false, 
  },
  teacher: {
    teacherId: {
       type: String,
       required: false,
    },
    teacherName: {
        type: String,
        required: false,
    },
   
    teacherEmail: {
        type: String,
        required: false,
    }
   
  },
  weeklySlots: {
    type: Map,
    of: [TimeSlotSchema],
    required: false,
  },
  joiningDate:{
        type: Date,
        required: false,  
    } ,
  classDay:{
    type: Array,
    required: false,
  },
  
  startTime:{
    type: Array,
    required: false,
  },
  endTime:{
    type: Array,
    required: false,
  },
    isLanguageLevel: {
        type: Boolean,
        required: true,
    },
    languageLevel: {
        type: String,
        required: true,
    },
    isReadingLevel: {
        type: Boolean,
        required: true,
    },
    readingLevel: {
        type: String,
    },
    isGrammarLevel: {
        type: Boolean,
        required: true,
            },
    grammarLevel: {
        type: String,
        required: true,
    },
    hours: {
        type: Number,
        required: true,
    },
    subscription: {
        subscriptionId: {
            type: String,
            required: true,
        },
        subscriptionName: {
            type: String,
            required: true,
        },
        subscriptionPricePerHr: {
            type: Number,
            required: true,
        },
        subscriptionDays: {
            type: Number,
            required: true,
        },  
        subscriptionStartDate: {
            type: Date,
            required: true,
        },
        subscriptionEndDate: {
            type: Date,
            required: true,
        }
    },
    planTotalPrice: {
        type: Number,
        required: true
    },
    classStartDate: {
        type: Date,
        required: true,
    },
    classEndDate: {
        type: Date,
        required: true,
    },
    classStartTime: {
        type: String,
        required: true,
    },
    classEndTime: {
        type: String,
        required: true,
    },
    accomplishmentTime: {
        type: String,
    },
    studentRate:{
        type: Number,  
        required: true,
    },
    expectedFinishingDate: {
        type: Number,
        required: true,
    },
    gardianName: {
        type: String,
        required: true,
    },
    gardianEmail: {
        type: String,
        required: true,
        },
    gardianPhone: {
        type: String,
        required: true,
    },
    gardianCity: {
        type: String,
        required: true,
    },
    gardianCountry: {
        type: String,
        required: true,
    },
    gardianTimeZone: {
        type: String,
        required: true,
    },
    gardianLanguage: {
        type: String,
        required: true,
    },
    assignedTeacher:{
        type: String,
        required: false
    },
    assignedTeacherId:{
        type: String,
        required: false
    },
    assignedTeacherEmail:{
        type: String,
        required: false
    },
    studentStatus: {
        type: String,
        required: false,
    },
    classStatus: {
        type: String,
        required: false,
    },
   comments:{
    type: String,
    required: false
   },
    trialClassStatus:{
        type: String,
        required: false,
    },
    invoiceStatus: {
     type: String,
     required: false
    },
    paymentLink:{
      type: String,
      required: false
    },
    paymentStatus:{
    type: String,
    required: false
    },
    teacherStatus:{
    type: String,
    required: false
    },
    amount: {
    type: String,
    required: false  
    },
    currency: {
    type: String,
    required: false  
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
        required: false,
    },
    updatedDate: {
        type: Date,
        required: false,
    },
    updatedBy: {
        type: String,
        required: false,
    },

},
{
    collection: "evaluations",
    timestamps: false,
}
);

const ZodTimeSlotSchema = z.object({
  from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid from time (HH:mm)"),
  to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid to time (HH:mm)"),
});
const WeeklySlotMapSchema = z.record(z.string(), z.array(ZodTimeSlotSchema));

export const zodEvaluationSchema = z.object({
    tenantId: z.string(),
    academicCoachId: z.string(),
    student: z.object({
        studentRegisterId: z.string().optional(),
        studentId: z.string().optional(),
        studentFirstName: z.string(),
        studentLastName: z.string(),
        studentGender: z.string().optional(),
        studentEmail: z.string(),
        studentPhone: z.number(),
        studentCity: z.string().optional(),
        studentCountry: z.string(),
        studentCountryCode: z.string(),
        learningInterest: z.enum([learningInterest.QURAN, learningInterest.ISLAMIC, learningInterest.ARABIC]),
        numberOfStudents: z.number(),
        preferredTeacher: z.enum([preferredTeacher.TEACHER_1, preferredTeacher.TEACHER_2, preferredTeacher.TEACHER_3]),
        preferredFromTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in 24-hour format HH:MM"),
        preferredToTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in 24-hour format HH:MM"),
        timeZone: z.string(),
        referralSource: z.enum([referenceSource.FRIEND, referenceSource.SOCIALMEDIA, referenceSource.EMAIL, referenceSource.GOOGLE, referenceSource.OTHER]),
        preferredDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: commonMessages.INVALID_DATE_FORMAT,
          }).transform((val) => new Date(val)).optional(),
        evaluationStatus: z.enum([evaluationStatus.PENDING, evaluationStatus.INPROGRESS, evaluationStatus.COMPLETED]),
        status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]),
        createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: commonMessages.INVALID_DATE_FORMAT,
          }).transform((val) => new Date(val)).optional(),
        createdBy: z.string().optional(),
      
    }),
    joiningDate:  z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
    weeklySlots: WeeklySlotMapSchema.optional(),
    classType:z.enum([classType.REGULARCLASS, classType.GROUPCLASS]).optional(),
    teacher:z.object ({
        teacherId: z.string().optional(),
        teacherName: z.string().optional(),
        teacherEmail:z.string().optional()
      }).optional(),
      classDay:z.array(
        z.object({
            label: z.string(),
            value: z.string(),
        })
    ).optional(),
      totalHourse:z.number().optional(),
      startTime:z.array(
        z.object({
            label: z.string(),
            value: z.string(),
        })
    ).optional(),
      endTime:z.array(
        z.object({
            label: z.string(),
            value: z.string(),
        })
    ).optional(),
    isLanguageLevel: z.boolean(),
    languageLevel: z.string(),
    isReadingLevel: z.boolean(),
    readingLevel: z.string().optional(),
    isGrammarLevel: z.boolean(),
    grammarLevel: z.string(),
    hours: z.number(),
    subscription: z.object({
        subscriptionName: z.string(),
    }),
    planTotalPrice: z.number(),
    classStartDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)),
    classEndDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
    classStartTime: z.string(),
    classEndTime: z.string(),
    gardianName: z.string(),
    gardianEmail: z.string(),
    gardianPhone: z.string(),
    gardianCity: z.string(),
    gardianCountry: z.string(),
    gardianTimeZone: z.string(),
    gardianLanguage: z.string(),
    assignedTeacher: z.string(),
    accomplishmentTime: z.string().optional(),
    studentRate: z.number().optional().optional(),
    studentStatus: z.string().optional(),
    classStatus: z.string().optional(),
    comments: z.string().optional(),
    trialClassStatus: z.string(),
    invoiceStatus: z.string().optional(),
    paymentLink: z.string().optional(),
    paymentStatus: z.string().optional(),
    teacherStatus: z.string().optional(),
    amount: z.string().optional(),
    currency: z.string().optional(),
    status: z.string().optional(),
    preferredTrialFromTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in 24-hour format HH:MM").optional(),
    preferredTrialToTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in 24-hour format HH:MM").optional(),
    preferredTrialDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional().optional(),
          createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
    createdBy: z.string().optional(),
    updatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional().optional(),
    updatedBy: z.string().optional(),
});

export default model<IEvaluation>("Evaluation", evaluationSchema);