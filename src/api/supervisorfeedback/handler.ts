import { z } from "zod";
import { ResponseToolkit, Request } from "@hapi/hapi";
import { zodFeedbackSchema } from "../../models/feedback";
import { } from "../../operations/feedback";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { createSupervisorFeedback, getAllSupervisorRecords } from "../../operations/supervisorfeedback";

const createFeedbackValidation = z.object({
  payload: zodFeedbackSchema.pick({
    sessionId:true,
    student: true,
    teacher: true,
    classDay: true,
    preferedTeacher: true,
    teacherRatings: true,
    course: true,
    level: true,
    startDate: true,
    endDate: true,
    studentsRating: true,
    supervisorRating:true, 
    startTime: true,
    endTime: true,
    feedbackmessage: true,
    createdBy: true,
    lastUpdatedBy: true,
    supervisor: true
  }).partial(),
});
// Define your Zod validation schema
const createInputFeedbackValidation = z.object({
  query: zodGetAllRecordsQuerySchema.pick({
    studentId:true,
    supervisorId:true,
    teacherId:true,
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    filterValues: true,
  }),
});
export default {

  /////////////////////SUPERVISOR///////////////////////
  async createSupervisorFeedback(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createFeedbackValidation.parse({ payload: req.payload });

      // Ensure studentsRating is always set
      const result = await createSupervisorFeedback({
        sessionId:payload.sessionId!,
        supervisor: payload.supervisor!,
        teacher: payload.teacher || {},
        classDay: payload.classDay ?? "",
        preferedTeacher: payload.preferedTeacher!,
        course: payload.course!,

        // Ensure studentsRating is set with default values if not provided
        supervisorRating: {
          knowledgeofstudentsandcontent: payload.supervisorRating?.knowledgeofstudentsandcontent ?? 0,
          assessmentofstudents: payload.supervisorRating?.assessmentofstudents ?? 0,
          communicationandcollaboration: payload.supervisorRating?.communicationandcollaboration ?? 0,
          professionalism: payload.supervisorRating?.professionalism ?? 0,
        },
        startDate: new Date(payload.startDate!),
        endDate: new Date(payload.endDate!),
        startTime: payload.startTime ?? "",
        endTime: payload.endTime ?? "",
        feedbackmessage: payload.feedbackmessage ?? "",
        createdDate: new Date(),
        createdBy: payload.createdBy ?? "System",
        lastUpdatedDate: new Date(),
        lastUpdatedBy: payload.lastUpdatedBy ?? "System",
        level: 0,
        teacherRatings: {
          listeningAbility: 0,
          readingAbility:0,
          overallPerformance: 0,
          communicationConcentration: 0
        },
        studentsRating: {
          classUnderstanding: 0,
          engagement: 0,
          homeworkCompletion: 0
        }
      });

      return h.response({ message: "Feedback created successfully", data: result }).code(201);
    } catch (error) {
      console.error("Error creating feedback:", error);
      return h.response({ error: "Failed to create feedback" }).code(500);
    }
  },



  async getAllSupervisorRecords(req: Request, h: ResponseToolkit) {
    try {
        // ✅ Ensure supervisorId is included in the query
        const supervisorId = req.query?.supervisorId as string;
        if (!supervisorId) {
            return h.response({ error: "Supervisor ID is required" }).code(400);
        }

        // ✅ Safely parse additional filters if provided
        const filterValues = req.query?.filterValues 
            ? JSON.parse(req.query.filterValues as string)
            : {};

        // ✅ Merge supervisorId into the filterValues
        const parsedQuery = {
            ...req.query,
            filterValues: {
                ...filterValues,
                supervisorId, // Ensure supervisorId is always included
            },
        };

        // ✅ Validate query parameters using Zod
        const { query } = createInputFeedbackValidation.parse({ query: parsedQuery });

        // ✅ Fetch records using the validated query
        return getAllSupervisorRecords(query);
    } catch (error) {
        console.error("Error fetching supervisor records:", error);
        return h.response({ error: "Invalid request" }).code(400);
    }
}


};
