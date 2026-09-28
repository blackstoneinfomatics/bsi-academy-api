import mongoose, { Schema } from "mongoose";
import { LogDocument } from "../../types/models.types";

const logSchema = new Schema<LogDocument>(
{
  logId: { type: String, required: true },
  tenantId: { type: String, default: null },
  userId: { type: String, required: true ,default: 'anonymous' },
  role: { type: String, required: false },
  logType: { type: String, enum: ['SUCCESS' , 'REDIRECT' ,  'ERROR' , 'INFO'], required: true },
  action: { type: String , required : false}, 
  description: { type: String , required : false},
  readableDescription: {
  type: String,
  required: false
},
  route: { type: String , required : false}, 
  errorMessage: { type: String , required : false},
  stack: { type: String , required : false},
  ip: { type: String ,required : false },
  meta: { type: Schema.Types.Mixed , required: false },
 createdDate:{type: Date, default:Date.now ,required : false}
},
  {
    collection: "AuditLog",
    timestamps: false, 
  }
);

const auditLogCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 },
  },
  { collection: "auditlog_counters", versionKey: false }
);

const AuditLogCounter = mongoose.model("AuditLogCounter", auditLogCounterSchema);

export const generateAuditLogId = async (): Promise<string> => {
  const counter = await AuditLogCounter.findOneAndUpdate(
    { _id: "LOG" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  return `LOG-${String(counter.sequence).padStart(3, "0")}`;
};

export default mongoose.model<LogDocument>('AuditLog',logSchema);