import { z } from "zod";
import { model, Schema } from "mongoose";
import { IKnowledgeBase } from "../../types/models.types";
import { addKnowledgeBaseMessages, uploadedFormat } from "../config/messages";



const knowledgeBaseSchema = new Schema<IKnowledgeBase>(
    {
      courseName:{
        type: String,
        required: true,
      },
      subjectTitle: {
        type: String,
        required: true,
      },
      uploadedFormat: {
        type: String,
        required: true,
      },
      uploadedFile: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: false,
        trim: true,
      },
      createdDate: {
        type: Date,
        required: false,
        
      },
      createdBy: {
        type: String,
        required: false,
        trim: true,
      },
      updatedDate: {
        type: Date,
        required: false,
      },
      updatedBy: {
        type: String,
        required: false,
        trim: true,
      },
    },
    {
      timestamps: false,
    }
  );
  
 

  export const zodknowledgeBaseValidationSchema = z.object({
    courseName: z.string(), 
    subjectTitle: z.string(),
    uploadedFormat: z.enum([uploadedFormat.PDF, uploadedFormat.VIDEO,]),
    uploadedFile: z.any(),
    
    status: z.string(),
    createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: addKnowledgeBaseMessages.INVALID_DATE_FORMAT,
    }).transform((val) => new Date(val)),
    createdBy: z.string(),
    updatedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: addKnowledgeBaseMessages.INVALID_DATE_FORMAT,
    }).transform((val) => new Date(val)),
    updatedBy: z.string(),
    
  });
  
export default model<IKnowledgeBase>("KnowledgeBase", knowledgeBaseSchema);
