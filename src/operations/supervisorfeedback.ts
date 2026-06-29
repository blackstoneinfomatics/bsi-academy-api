import { IFeedbackCreate, ISupervisorFeedbackCreate } from "../../types/models.types";
import feedback from "../models/feedback";
import { GetAllRecordsParams } from "../shared/enum";
import { commonMessages } from "../config/messages";
import AppLogger from "../helpers/logging";



export const createSupervisorFeedback = async (
  payload: ISupervisorFeedbackCreate
): Promise<{ totalCount: number; feedback: ISupervisorFeedbackCreate } | { error: any }> => {
  try {
    const newFeedback = new feedback({
      sessionId:payload.sessionId!,
      supervisor: payload.supervisor!,
      teacher: payload.teacher || {},
      classDay: payload.classDay ?? "",
      preferedTeacher: payload.preferedTeacher!,
      course: payload.course!,
      
      // Fix: Access supervisorRating correctly
      supervisorRating: {
        knowledgeofstudentsandcontent: payload.supervisorRating?.knowledgeofstudentsandcontent ?? 0,
        assessmentofstudents: payload.supervisorRating?.assessmentofstudents ?? 0,
        communicationandcollaboration: payload.supervisorRating?.communicationandcollaboration ?? 0,
        professionalism: payload.supervisorRating?.professionalism ?? 0,
      },
      
      startDate: new Date(),
      endDate: new Date(),
      startTime: payload.startTime ?? "",
      endTime: payload.endTime ?? "",
      feedbackmessage: payload.feedbackmessage ?? "",
      createdDate: new Date(),
      createdBy: payload.createdBy ?? "System",
      lastUpdatedDate: new Date(),
      lastUpdatedBy: payload.lastUpdatedBy ?? "System",
    });

    const feedbackRecord = await newFeedback.save();
    const totalCount = await feedback.countDocuments();

    return { totalCount, feedback: feedbackRecord };
  } catch (error) {
    console.error("Error creating feedback:", error);
    return { error };
  }
};


// ✅ Ensure this function correctly filters by supervisorId
export const getAllSupervisorRecords = async (
    params: GetAllRecordsParams
  ): Promise<{ totalCount: number; applicants: IFeedbackCreate[] }> => {
    const { supervisorId, searchText, sortBy, sortOrder, offset, limit } = params;
  
    if (!supervisorId) {
      throw new Error("Supervisor ID is required");
    }
  
    // ✅ Ensure supervisorId is always included in the query
    const query: any = { 'supervisor.supervisorId': supervisorId };
  
    // ✅ Allow searching by student name or email
    if (searchText) {
      query.$or = [
        { 'supervisor.supervisorFirstName': { $regex: searchText, $options: "i" } },
        { 'supervisor.supervisorLastName': { $regex: searchText, $options: "i" } },
        { 'supervisor.supervisorEmail': { $regex: searchText, $options: "i" } },
      ];
    }
  
    console.log("Constructed Query:", JSON.stringify(query, null, 2)); // ✅ Log the constructed query
  
    // ✅ Sorting options
    const sortOptions: any = { [sortBy || "createdDate"]: sortOrder === "asc" ? 1 : -1 };
  
    const studentQuery = feedback.find(query).sort(sortOptions);
  
    // ✅ Apply pagination if provided
    const pageOffset = Number(offset) || 1;
    const pageLimit = Number(limit) || Number(commonMessages.LIMIT);
    const skip = Math.max(0, (pageOffset - 1) * pageLimit);
  
    studentQuery.skip(skip).limit(pageLimit);
  
    try {
      // ✅ Execute both query and count concurrently
      const [applicants, totalCount] = await Promise.all([
        studentQuery.exec(),
        feedback.countDocuments(query).exec(),
      ]);
  
      // ✅ Log success
      AppLogger.info(commonMessages.GET_ALL_LIST_SUCCESS, { totalCount });
  
      return { totalCount, applicants };
    } catch (error) {
      console.error("Error fetching supervisor records:", error);
      throw new Error("Failed to fetch records");
    }
  };
  


