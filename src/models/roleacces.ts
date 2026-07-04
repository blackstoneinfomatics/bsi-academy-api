import mongoose, { Schema } from "mongoose";
import {  IAccessModel } from "../../types/models.types";
import { z } from "zod";

const roleAccess = new Schema<IAccessModel>(
  {
    tenantId: { type: String, required: true },
    employeeId: { type: String, required: false },
    employeeName: { type: String, required: false },
    contact: { type: String, required: false },
    designation: { type: [String], required: false },
    dateOfJoining: { type: Date, required: false },
    roleAccess: {
      admin: { type: Boolean, required: false },
      adminmodules: {
        dashboard: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        evaluation: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        students: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        employees: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        courses: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
         meetings: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        classes: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        finance: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        analytics: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        messages: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        settings: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
      },
      academicCoach: { type: Boolean, required: false },
      academicmodules: {
        dashboard: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        trialmanagement: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        schedule: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        managestudents: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        manageteachers: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        messages: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        support: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          deleted: { type: Boolean, required: false },
        },
      },
      supervisor: { type: Boolean, required: false },
      supervisormodules: {
        dashboard: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        recruitment: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        meetingandtraining: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        teachers: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        messages: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        support: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
      },
      teacher: { type: Boolean, required: false },
      teachermodules: {
        dashboard: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        meeting: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        schedule: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        liveclass: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        assignment: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        messages: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        analytics: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        support: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
      },
      student: { type: Boolean, required: false },
      studentmodules: {
        dashboard: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        classes: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        assignments: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        payments: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        knowledgebase: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
          messages: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
        support: {
          read: { type: Boolean, required: false },
          write: { type: Boolean, required: false },
          delete: { type: Boolean, required: false },
        },
      },
    },
    status: { type: String, required: false },
    createdDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: String, required: true },
    updatedDate: { type: Date, required: true, default: Date.now },
    updatedBy: { type: String, required: false },
  },
  {
    collection: 'roleAccess',
    timestamps: false,
  }
);

export const zodroleAccessSchema = z.object({
  tenantId: z.string(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  contact: z.string().optional(),
  designation: z.array(z.string()).min(1),
  dateOfJoining: z.string().optional(),

  roleAccess: z.object({
    admin: z.boolean().optional(),
    adminmodules: z.object({
      dashboard: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      evaluation: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      students: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      employees: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      courses: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
        meetings: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      classes: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      finance: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      analytics: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      messages: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      settings: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
    }).optional(),

    academicCoach: z.boolean().optional(),
    academicmodules: z.object({
      dashboard: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      trialmanagement: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      managestudents: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      manageteachers: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      schedule: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      messages: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      support: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
    }).optional(),

    supervisor: z.boolean().optional(),
    supervisormodules: z.object({
      dashboard: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      recruitment: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      meetingandtraining: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      teachers: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      messages: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      support: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
    }).optional(),

    teacher: z.boolean().optional(),
    teachermodules: z.object({
      dashboard: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      meeting: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      schedule: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      liveclass: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      assignment: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      messages: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      analytics: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      support: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
    }).optional(),

    student: z.boolean().optional(),
    studentmodules: z.object({
      dashboard: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      classes: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      assignments: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      payments: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      knowledgebase: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
      support: z.object({
        read: z.boolean().optional(),
        write: z.boolean().optional(),
        delete: z.boolean().optional(),
      }).optional(),
    }).optional(),
  }),

  status: z.string().optional(),
  createdDate: z.union([z.string(), z.date()]).optional(),
  createdBy: z.string(),
  updatedDate: z.union([z.string(), z.date()]).optional(),
  updatedBy: z.string().optional(),
});

export default mongoose.model<IAccessModel>("roleAccess", roleAccess);

