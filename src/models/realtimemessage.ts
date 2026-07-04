import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { RealTimeMessage } from "../../types/models.types";
import { notificationStatus } from "../config/messages";

const realtimeSchema = new Schema<RealTimeMessage>(
  {
    tenantId: { type: String, required: true },
    messages: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderEmail:  {  
       type: String,
       required: false,
     },
  
    receiverId: { 
       type: String,
       required: true,
     },
    receiverName: {
       type: String,
        required: true,
     },
    receiverEmail: { 
      type: String, 
      required: false,
     },
     notificationStatus: { 
      type: String,
      enum: [notificationStatus.SEEN, notificationStatus.UN_SEEN], 
      required: true,
     },
     isRead:{
      type:Boolean,
      required:true,
     },

     status: { type: String, required: false },
     createdDate: { type: Date, required: false, default: Date.now },
     createdBy: { type: String, required: false },
     updatedDate: { type: Date, required: false, default: Date.now },
     updatedBy: { type: String, required: false },
  },
  {
    collection: "Realtimemessage",
    timestamps: false,
  }
);

export const zodrealtimemessageSchema = z.object({
  tenantId: z.string(),
  messages: z.string(),

  senderId: z.string(),
  senderName: z.string(),
  senderEmail: z.string().optional(),

  receiverId: z.string(),
  receiverName: z.string(),
  receiverEmail: z.string().optional(),

  notificationStatus:  z.enum([notificationStatus.SEEN, notificationStatus.UN_SEEN]),
  status: z.string().optional(),
  isRead: z.boolean(),
  createdDate: z.string().optional(),
  createdBy: z.string().optional(),

  updatedDate: z.string().optional(),
  updatedBy: z.string().optional(),
});

export default mongoose.model<RealTimeMessage>("Realtimemessage",realtimeSchema);
