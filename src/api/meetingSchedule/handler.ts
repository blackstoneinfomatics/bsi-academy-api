
import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation"; // Assuming this is your schema
import { getAcademicCoachId, getAllAcademicCoach, getAllMeetings} from "../../operations/meetingSchdeule";
import { meetingSchedulesMessages } from "../../config/messages";
import { isNil } from "lodash";
import { notFound } from "@hapi/boom";

// Input Validations for student list
const getmeetingScheduleListInputValidation = z.object({
  query: zodGetAllRecordsQuerySchema.pick({
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    academicCoachId: true,
  }),
});

const handler = {
  async getAllAcademicCoach(req: Request, h: ResponseToolkit) {
    try {
      // Explicitly parse and validate the query using zod
      const parsedQuery = getmeetingScheduleListInputValidation.parse({
        query: {
          ...req.query,
          filterValues: req.query?.filterValues
            ? JSON.parse(req.query.filterValues)
            : {},
        },
      });

      // Get the validated query (parsedQuery.query will have the validated data)
      const query = parsedQuery.query;

      // Fetch records from the database using the validated query
      const academicCoaches = await getAllAcademicCoach(query);
      return academicCoaches;
    } catch (error) {
      // Return a 400 error if validation fails
      return h.response({ error: "Invalid query parameters" }).code(400);
    }
  },
  
  async allMeeting(req:Request, h: ResponseToolkit) {
    try {
      const result = await getAllMeetings(); // ✅ Correct await syntax
      return h.response(result).code(200);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      return h.response({ error: "Invalid query parameters" }).code(400);
    }
  },

  async getAcademicCoachId(req: Request, h: ResponseToolkit) {
    console.log("id>>",req.params.academicCoachId);
    const result = await getAcademicCoachId(String(req.params.academicCoachId));
  // console.log("id>>",req.params.academicCoachId)
    if (isNil(result)) {
      return notFound(meetingSchedulesMessages.BYID);
    }
  
    return result;
  },
  }

export default handler;
