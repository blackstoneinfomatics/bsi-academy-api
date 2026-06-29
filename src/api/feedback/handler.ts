import { z } from "zod";
import { ResponseToolkit, Request } from "@hapi/hapi";
import { zodFeedbackSchema } from "../../models/feedback";
import { createFeedback, createSupervisorFeedback, createTeacherFeedback, getAllFeedbackRecords, getAllSupervisorRecords, getcreateAllTeacherFeedback } from "../../operations/feedback";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { supervisorFeedBackList } from "../../kafka/producers/supervisorProducer";
import AlStudentsModel from "../../models/alstudents";
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
  async createFeedback(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createFeedbackValidation.parse({ payload: req.payload });

      // Ensure studentsRating is always set
      const result = await createFeedback({
        sessionId:payload.sessionId!,
        student: payload.student!,
        teacher: payload.teacher || {},
        classDay: payload.classDay || "",
        preferedTeacher: payload.preferedTeacher!,
        course: payload.course!,

        // Ensure studentsRating is set with default values if not provided
        studentsRating: {
          classUnderstanding: payload.studentsRating?.classUnderstanding ?? 0,
          engagement: payload.studentsRating?.engagement ?? 0,
          homeworkCompletion: payload.studentsRating?.homeworkCompletion ?? 0,
        },

        startDate: new Date(payload.startDate!),
        endDate: new Date(payload.endDate!),
        startTime: payload.startTime || "",
        endTime: payload.endTime || "",
        feedbackmessage: payload.feedbackmessage || "",
        createdDate: new Date(),
        createdBy: payload.createdBy || "System",
        lastUpdatedDate: new Date(),
        lastUpdatedBy: payload.lastUpdatedBy || "System",
        level: payload.level || 0,
        teacherRatings: {
          listeningAbility: payload.teacherRatings?.listeningAbility || 0,
          readingAbility: payload.teacherRatings?.readingAbility || 0,
          overallPerformance: payload.teacherRatings?.overallPerformance || 0,
          communicationConcentration: payload.teacherRatings?.communicationConcentration || 0,

        },
      });
      if(result){
          await supervisorFeedBackList({data : result});
        }
      return h.response({ message: "Feedback created successfully", data: result }).code(201);
    } catch (error) {
      console.error("Error creating feedback:", error);
      return h.response({ error: "Failed to create feedback" }).code(500);
    }
  },

  async createTeacherFeedback(req: Request, h: ResponseToolkit) {
    try {
      // Validate the incoming payload
      const { payload } = createFeedbackValidation.parse({ payload: req.payload });

      // Ensure necessary attributes, using defaults if they are missing
      const result = await createTeacherFeedback({
        sessionId:payload.sessionId!,
        student: payload.student!,
        teacher: payload.teacher || {},
        classDay: payload.classDay || '',
        preferedTeacher: payload.preferedTeacher!,
        course: payload.course!,

        // Ensure ratings have default values if they are missing
        teacherRatings: {
          listeningAbility: payload.teacherRatings?.listeningAbility ?? 0,
          readingAbility: payload.teacherRatings?.readingAbility ?? 0,
          overallPerformance: payload.teacherRatings?.overallPerformance ?? 0,
          communicationConcentration: payload.teacherRatings?.communicationConcentration ?? 0,
        },

        level: payload.level ?? 0,

        // Ensure startDate and endDate are set as Date objects
        startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
        endDate: payload.endDate ? new Date(payload.endDate) : new Date(),

        // Handle times, setting empty arrays if they are missing
        startTime: payload.startTime || '',
        endTime: payload.endTime || '',

        // Feedback message with fallback if missing
        feedbackmessage: payload.feedbackmessage || "",

        // Dates for creation and update with current timestamp
        createdDate: new Date(),
        createdBy: payload.createdBy || "System",
        lastUpdatedDate: new Date(),
        lastUpdatedBy: payload.lastUpdatedBy || "System",
        studentsRating: {
          classUnderstanding: 0,
          engagement: 0,
          homeworkCompletion: 0
        },
       
      });

      return h.response({ message: "Feedback created successfully", data: result }).code(201);
    } catch (error) {
      console.error("Error creating feedback:", error);
      return h.response({ error: "Failed to create feedback" }).code(500);
    }
  },

  async createAllTeacherFeedback(req: Request, h: ResponseToolkit) {
    try {
      // Ensure req.query is treated as an object
      const queryParams = req.query as Record<string, any>;
  
      // Parse and validate the request query using zod
      const parsedQuery = createInputFeedbackValidation.parse({
        query: {
          ...queryParams,
          filterValues: (() => {
            try {
              return queryParams?.filterValues
                ? JSON.parse(queryParams.filterValues as string)
                : {};
            } catch {
              throw new Error("Invalid filterValues JSON format.");
            }
          })(),
        },
      });
  
      const query = parsedQuery.query;
  
      // Call your service or database function to fetch data
      const result = await getcreateAllTeacherFeedback(query);
  
      // Return the response
      return h.response(result).code(200);
    } catch (error) {
      // Handle errors (validation or other errors)
      return h.response({ error }).code(400);
    }
  },
  





  /////////////////////SUPERVISOR///////////////////////
  async createSupervisorFeedback(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createFeedbackValidation.parse({ payload: req.payload });

      // Ensure studentsRating is always set
      const result = await createSupervisorFeedback({
        sessionId:payload.sessionId!,
        supervisor: payload.supervisor!,
        teacher: payload.teacher || {},
        classDay: payload.classDay || "",
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
        startTime: payload.startTime || "",
        endTime: payload.endTime || "",
        feedbackmessage: payload.feedbackmessage || "",
        createdDate: new Date(),
        createdBy: payload.createdBy || "System",
        lastUpdatedDate: new Date(),
        lastUpdatedBy: payload.lastUpdatedBy || "System",
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
,

async getAllStudentTeacherFeedback(req: Request, h: ResponseToolkit) {
  let filterValues: any = {};

  // 1. Parse filterValues from query if present as a string
  if (typeof req.query.filterValues === "string") {
    try {
      filterValues = JSON.parse(req.query.filterValues);
    } catch {
      filterValues = {};
    }
  } else {
    // 2. Build filterValues from individual query params
    filterValues = {};

    // --- Normalize course filter ---
  if (req.query.course) {
  filterValues.course = {
    courseName: Array.isArray(req.query.course)
      ? req.query.course
      : [req.query.course]
  };
}


    // --- Normalize dateRange filter ---
    if (req.query["dateRange.from"] && req.query["dateRange.to"]) {
      filterValues.dateRange = {
        from: req.query["dateRange.from"],
        to: req.query["dateRange.to"]
      };
    }
  }

  // 3. Build the full query object for validation
  const queryObj = {
    ...req.query,
    filterValues,
  };

  // 4. Validate the query parameters using Zod
  const { query } = createInputFeedbackValidation.parse({ query: queryObj });

  // 5. Ensure offset and limit are strings or null
  const queryForService = {
    ...query,
    offset:
      query.offset !== null && query.offset !== undefined
        ? String(query.offset)
        : null,
    limit:
      query.limit !== null && query.limit !== undefined
        ? String(query.limit)
        : null,
  };

  // 6. Call the service with the normalized and validated query
  return getAllFeedbackRecords(queryForService);
}

}


