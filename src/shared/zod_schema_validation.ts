import { z } from "zod";
import { isEncryptedPassword } from "./common";
import { userMessages } from "../config/messages";

export const zodGetAllRecordsQuerySchema = z.object({
  id: z.string().optional(),
  meetingId: z.string().optional(),
  courseId: z.string().optional(),
  roomId: z.string().optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  supervisorId: z.string().optional(),
  academicCoachId: z.string().optional(),
  searchText: z.string().default(""),
  sortBy: z.string().default("lastUpdatedDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  offset: z.string().nullable().default(null),
  limit: z.string().nullable().default(null),
  trialClassStatus: z.string().optional(),
  filterValues: z
    .object({
      course: z
        .object({
          courseName: z.union([z.string(), z.array(z.string())]).optional(),
        })
        .optional(),
      sessionClassType: z.union([z.string(), z.array(z.string())]).optional(),
      scheduleStatus: z.union([z.string(), z.array(z.string())]).optional(),
      timing: z.string().optional(), // If timing is a string, adjust as needed
      teacher: z.string().optional(),
meetingStatus: z.union([z.string(), z.array(z.string())]).optional(),
       startTime: z.union([z.string(), z.array(z.string())]).optional(),
      status: z.string().optional(),
        dateRange: z
      .object({
        from: z.string(),
        to: z.string(),
      })
      .optional(),
    })
    .optional()
    .default({}), 
});

export const zodGetAllUserRecordsQuerySchema = z.object({
  role: z.string().min(3).optional(),
  date:z.string().optional(),
});

export const zodAuthenticationSchema = z.object({
  username: z.string().min(3),
  password: z
    .string()
    .refine((value) => isEncryptedPassword(value), {
      message: userMessages.ENCRYPT_PASSWORD_ERROR,
    }),
});

export const zodGetAssignmentList = z.object({
  studentId: z.string().optional(),
  assignmentId:z.string().optional(),
});


export const zodAlStudentInvoiceSchemaValidation = z.object({
  sortBy: z.string().default("lastUpdatedDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  offset: z.string().nullable().default(null),
  limit: z.string().nullable().default(null),
  type: z.enum(["weekly", "monthly", "yearly"]).default("yearly"),
  year: z.string().default(() => new Date().toISOString().split("T")[0]), 
});


export const zodAlStudentPaymentSchemaValidation = z.object({
  userId:z.string().optional(),
  studentId:z.string().optional(),
  _id:z.string().optional(),
  userName: z.string().optional(),
  paymentStatus: z.string().optional(),
  paymentAmount: z.string().optional(),
  paymentDate: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().default("lastUpdatedDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  offset: z.string().nullable().default(null),
  limit: z.string().nullable().default(null),
  searchText: z.string().default(""),
});



export const zodGetAllApplicantsRecordsQuerySchema = z.object({
  searchText: z.string().default(""),
  sortBy: z.string().default("positionApplied"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  offset: z.coerce.number().nullable().default(null),
  limit: z.coerce.number().nullable().default(null),
  filterValues: z
    .object({
      applicationStatus: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .transform((val) =>
          val === undefined ? undefined : Array.isArray(val) ? val : [val]
        ),
      positionApplied: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .transform((val) =>
          val === undefined ? undefined : Array.isArray(val) ? val : [val]
        ),
      dateRange: z
        .object({
          from: z.string().refine((date) => !isNaN(Date.parse(date)), {
            message: "Invalid from date",
          }),
          to: z.string().refine((date) => !isNaN(Date.parse(date)), {
            message: "Invalid to date",
          }),
        })
        .optional(),
    })
    .optional(),
});


export const zodGetAllTeachersRecordsQuerySchema = z.object({
  teacherGroup : z.string().optional(),
  supervisorId: z.string().optional()
})

