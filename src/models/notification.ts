// import mongoose, { Schema } from "mongoose";
// import { z } from "zod";
// import { INotification } from "../../types/models.types";
// import { notificationStatus } from "../config/messages";

// const notificationSchema = new Schema<INotification>(
//   {
//     tenantId: { type: String, required: true },
//     messages: {
//       type: String,
//       required: false,
//     },
//     senderId: {
//       type: String,
//       required: true,
//     },
//     senderName: {
//       type: String,
//       required: false
//     },
//     senderEmail:  {  
//        type: String,
//        required: false,
//      },
  
//     receiverId: { 
//        type: String,
//        required: false,
//      },
//     receiverName: {
//        type: String,
//         required: false
//      },
//     receiverEmail: { 
//       type: String, 
//       required: false,
//      },
//     notificationType: { 
//       type: String, 
//       required: true,
//      },
//      notificationStatus: { 
//       type: String, 
//       required: false,
//      },
//      isRead:{
//       type:Boolean,
//       required:true,
//      },

//      status: { type: String, required: false },
//      createdDate: { type: Date, required: false, default: Date.now },
//      createdBy: { type: String, required: false },
//      updatedDate: { type: Date, required: false, default: Date.now },
//      updatedBy: { type: String, required: false },
//   },
//   {
//     collection: "notification",
//     timestamps: false,
//   }
// );

// export const zodnotificationSchema = z.object({
//   tenantId: z.string(),
//   messages: z.string().optional(),

//   senderId: z.string(),
//   senderName: z.string(),
//   senderEmail: z.string(),

//   receiverId: z.string(),
//   receiverName: z.string(),
//   receiverEmail: z.string(),

//   notificationType: z.string().optional(),
//   notificationStatus:  z.enum([notificationStatus.SEEN, notificationStatus.UN_SEEN]),
//   status: z.string().optional(),
//   isRead: z.boolean(),
//   createdDate: z.date().optional(),
//   createdBy: z.string().optional(),

//   updatedDate: z.date().optional(),
//   updatedBy: z.string().optional(),
// });

// export default mongoose.model<INotification>("Notification",notificationSchema);



import mongoose, { Schema } from "mongoose";
import { z } from "zod";
import { INotification } from "../../types/models.types";
import { notificationStatus } from "../config/messages";

const notificationSchema = new Schema<INotification>(
  {
    tenantId: {
      type: String,
      required: false,
      index: true,
    },

    title: {
      type: String,
      required: false,
      trim: true,
    },

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
      required: false,
    },

    senderEmail: {
      type: String,
      required: false,
    },

    receiverId: {
      type: String,
      required: true,
    },

    receiverName: {
      type: String,
      required: false,
    },

    receiverEmail: {
      type: String,
      required: false,
    },

    notificationType: {
      type: String,
      required: true,
    },

    notificationStatus: {
      type: String,
      enum: Object.values(notificationStatus),
      default: notificationStatus.UN_SEEN,
    },

    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },

    readAt: {
      type: Date,
      required: false,
    },

    actionUrl: {
      type: String,
      required: false,
    },

    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },

    status: {
      type: String,
      required: false,
    },

    createdDate: {
      type: Date,
      default: Date.now,
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
    collection: "notification",
    timestamps: false,
  }
);

// Efficient notification list and unread-count queries
notificationSchema.index({
  receiverId: 1,
  tenantId: 1,
  createdDate: -1,
});

notificationSchema.index({
  receiverId: 1,
  tenantId: 1,
  isRead: 1,
});

notificationSchema.index(
  {
    tenantId: 1,
    receiverId: 1,
    notificationType: 1,
    "metadata.trialEndDate": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      notificationType: "TRIAL_EXPIRING",
      "metadata.trialEndDate": { $exists: true },
    },
  }
);

export const zodnotificationSchema = z.object({
  tenantId: z.string().optional(),
  title: z.string().optional(),
  messages: z.string().min(1),
  senderId: z.string().min(1),
  senderName: z.string().optional(),
  senderEmail: z.string().optional(),
  receiverId: z.string().min(1),
  receiverName: z.string().optional(),
  receiverEmail: z.string().optional(),
  notificationType: z.string().min(1),
  notificationStatus: z
    .enum([
      notificationStatus.SEEN,
      notificationStatus.UN_SEEN,
    ])
    .optional(),
  isRead: z.boolean().default(false),
  readAt: z.date().optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
  createdDate: z.date().optional(),
  createdBy: z.string().optional(),
  updatedDate: z.date().optional(),
  updatedBy: z.string().optional(),
});

export default mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
