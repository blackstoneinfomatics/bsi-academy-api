import mongoose, { Schema } from "mongoose";
import { LogDocument } from "../../types/models.types";

const logSchema = new Schema<LogDocument>(
{
  userId: { type: String, required: true ,default: 'anonymous' },
  logType: { type: String, enum: ['SUCCESS' , 'REDIRECT' ,  'ERROR' , 'INFO'], required: true },
  action: { type: String , required : false}, 
  description: { type: String , required : false},
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

export default mongoose.model<LogDocument>('AuditLog',logSchema);