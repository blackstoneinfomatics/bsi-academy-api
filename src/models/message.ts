import mongoose, { Schema } from "mongoose";
import { IMessageCreate } from "../../types/models.types";
import { z } from "zod";

const messageSchema = new Schema<IMessageCreate>(
  {
    roomId: {  
      type: String,
      required: true,
    },
    teacher: {
      teacherId: { type: String, required: false },
      teacherName: { type: String, required: false },
      teacherEmail: { type: String, required: false },
    },
    student: {
      studentId: { type: String, required: false },
      studentFirstName: { type: String, required: false },
      studentLastName: { type: String, required: false },
      studentEmail: { type: String, required: false },
    },
    supervisor: {
      supervisorId: { type: String, required: false },
      supervisorFirstName: { type: String, required: false },
      supervisorLastName: { type: String, required: false },
      supervisorEmail: { type: String, required: false },
    },
    message: { type: String, required: false },
    attachmentsType: {
      type: [
        {
          fileName: { type: String, required: false },
          fileType: { type: String, required: false },
          fileUrl: { type: String, required: false },
        },
      ],
      required: false,
    },
    sender: { type: String, required: false },
    receiver: { type: String, required: false },
    group: {
      type: [
        {
          groupId: { type: String, required: false },
          groupName: { type: String, required: false },
          members: {
            type: [
              {
                userId: { type: String, required: false },
                userName: { type: String, required: false },
              },
            ],
            required: false,
          },
        },
      ],
      required: false,
    },
    status: { type: String, required: false },
    timeZone: { type: String, required: false },
    createdDate: { type: Date, required: false, default: Date.now },
    createdBy: { type: String, required: false },
    updatedDate: { type: Date, required: false, default: Date.now },
    updatedBy: { type: String, required: false },
  },
  {
    collection: "message",
    timestamps: false,
  }
);

export const zodMessageSchema = z.object({
  // Teacher info
  roomId: z.string().optional(), 
  teacher: z.object({
    teacherId: z.string(),
    teacherName: z.string(),
    teacherEmail: z.string(),
  }).optional(),

  // Student info
  student: z.object({
    studentId: z.string(),
    studentFirstName: z.string(),
    studentLastName: z.string(),
    studentEmail: z.string(),
    studentPhone: z.number(),
    createdBy: z.string(),
  }).optional(),

   // Supervisor info
  supervisor: z.object({
    supervisorId: z.string(),
    supervisorFirstName: z.string(),
    supervisorLastName: z.string(),
    supervisorEmail: z.string(),
    supervisorPhone: z.number(),
    createdBy: z.string(),
  }).optional(),
  // Message information
  message: z.string(),
  status: z.string().optional(),
  timeZone: z.string().optional(),

  // Attachment information
  attachmentstype: z.array(
    z.object({
      fileName: z.string().optional(),
      fileType: z.string().optional(),
      fileUrl: z.string().optional(),
    })
  ).optional(),

  // Sender and Receiver
  sender: z.string(),
  receiver: z.string(),

  // Group information
  group: z.array(
    z.object({
      groupId: z.string(),
      groupName: z.string(),
      members: z.array(
        z.object({
          userId: z.string(),
          userName: z.string(),
        })
      ),
    })
  ),
  

  // Metadata
  createdBy: z.string().optional(),
  createdDate: z.date().optional(),
  updatedBy: z.string().optional(),
  updatedDate: z.date().optional(),
});

export default mongoose.model<IMessageCreate>("Message", messageSchema);
