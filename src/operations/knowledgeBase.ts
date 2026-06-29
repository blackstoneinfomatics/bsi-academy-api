import { IKnowledgeBase, IKnowledgeBaseCreate } from "../../types/models.types";
import KnowledgeBase from "../models/knowledgebase";
import Course from "../models/course";
import { uploadedFormat } from "../config/messages";
import knowledgebase from "../models/knowledgebase";

/**
 * Creates a new knowledge base entry.
 *
 * @param {IKnowledgeBaseCreate} payload 
 */
export const createKnowledgeBase = async (payload: IKnowledgeBaseCreate): Promise<IKnowledgeBase | { error: any }> => {
  try {
    // 1. Check if Course exists
    const existingCourse = await Course.findOne({ courseName: payload.courseName });

    if (!existingCourse) {
      return { error: "Course with the given courseName does not exist." };
    }

   
    if (payload.uploadedFormat === uploadedFormat.PDF && payload.uploadedFormat === uploadedFormat.VIDEO) {
      return { error: "Uploaded format cannot be both PDF and VIDEO at the same time." };
    }

    

    const finalPayload = {
      courseName: payload.courseName,
      subjectTitle: payload.subjectTitle,
      uploadedFormat: payload.uploadedFormat,
      uploadedFile: payload.uploadedFile ?? undefined,
      status: payload.status,
      createdDate: payload.createdDate || new Date(),
      createdBy: payload.createdBy,
      lastUpdatedBy: payload.updatedBy,
      lastUpdatedDate: payload.updatedDate|| new Date(),
    };

    
    const knowledgeBase = await KnowledgeBase.create(finalPayload);

    return knowledgeBase;

  } catch (error) {
    console.error(error);
    return { error };
  }
};


export default async function getAllknowledge() {
  const result = await knowledgebase.find();  // Simply retrieve all records without any filters
  return result;
}
