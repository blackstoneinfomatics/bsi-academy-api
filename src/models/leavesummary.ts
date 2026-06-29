import  { model, Schema } from "mongoose";
import {  IleaveSummary } from "../../types/models.types";
import { z } from "zod";
import { appStatus, commonMessages, leave, leaveStatus } from "../config/messages";

const leaveSummarySchema = new Schema<IleaveSummary>(
  {
    name: {  type: String, required: true },
    employeeId: {  type: String, required: true },
    role: {  type: String, required: true },
    fromDate: { type: Date, required: true, default: Date.now },
    toDate: { type: Date, required: true, default: Date.now },
    leaveStatus: { type: String, required: true },
    leaveType: { type: String, required: true },
    leavesTaken: { type: String, required: false },
    remainingLeaves: { type: String, required: false },
    approvedId: {type: String, required: true},
    approvedName: {type: String, required: true},
    reason: {type: String, required: true},
    updatedLeave: { type: String, required: false },
    status: { type: String, required: false },
    createdDate: { type: Date, required: false, default: Date.now },
    createdBy: { type: String, required: false },
    updatedDate: { type: Date, required: false, default: Date.now },
    updatedBy: { type: String, required: false },
  },
  {
    collection: "LeaveSummary",
    timestamps: false,
  }
);

export const zodleaverequestSchema = z.object({
  name: z.string(),
  employeeId: z.string(),
  role: z.string(),
  fromDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  toDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  leaveType: z.enum([leaveStatus.PAID, leaveStatus.CASUAL, leaveStatus.SICK]),
  leaveStatus: z.enum([leave.APPROVED, leave.REJECTED, leave.WAITINGLIST]),
  approvedId: z.string(),
  leavesTaken: z.string().optional(),
  remainingLeaves: z.string().optional(),
  approvedName: z.string(),
  updatedLeave: z.string().optional(),
  reason: z.string(),
  status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]),
  createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  createdBy: z.string(),
  UpdatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: commonMessages.INVALID_DATE_FORMAT,
  }).transform((val) => new Date(val)).optional(),
  UpdatedBy: z.string().optional(),


});


export default model<IleaveSummary>("LeaveSummary", leaveSummarySchema);
