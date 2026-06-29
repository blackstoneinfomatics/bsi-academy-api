/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodGetAllRecordsQuerySchema, zodGetAllUserRecordsQuerySchema } from "../../shared/zod_schema_validation";
import UserShiftSchedule from "../../models/usershiftschedule";
import { GetAlluserRecordsParams } from "../../shared/enum";
import { badRequest } from "@hapi/boom";
import { getAllTeachers, getDayWiseShiftSchedule, updateShiftScheduleService,  } from "../../operations/shiftshedule";



interface ShiftSchedulePayload {
    academicCoachId: string;
    teacherId: string;
    supervisorId:string;
    name: string;
    email: string;
    role: string;
    workhrs: number;
    startdate: string;
    enddate: string;
    fromtime: string;
    totime: string;
    createdDate: string;
    createdBy: string;
    lastUpdatedBy: string;
}

// // Input Validations for users list
// const getUsersListInputValidation = z.object({
//   query: zodGetAllRecordsQuerySchema.pick({
//     tenantId: true,
//     searchText: true,
//     sortBy: true,
//     sortOrder: true,
//     offset: true,
//     limit: true,
//   }),
// });

let getUsersListInputValidation = z.object({
  query: zodGetAllUserRecordsQuerySchema.pick({
    role: true,
    date: true
  })
});



// Input Validation for Create a User
const createInputValidation = z.object({
 
});

export default {

async getAllUsers(req: Request, h: ResponseToolkit) {
  try {
    // Validate and parse the request query
    const { query } = getUsersListInputValidation.parse({
      query: req.query,
    });

    // Define the filter with correct type
    const filter: GetAlluserRecordsParams = {
      role: query.role, // role is required
      date: query.date, // date is optional
    };
  
    // Fetch filtered records
    return await getAllTeachers (filter);
  } catch (error: unknown) {
    // Handle validation errors with type guards
    if (error instanceof Error) {
      return badRequest(error);
    } else {
      return badRequest("Unknown error occurred");
    }
  }
},

  // Create a new user
  async createShiftschedule(req: Request, h: ResponseToolkit) {
    const payload = req.payload as ShiftSchedulePayload ;

    const {
    academicCoachId,
    teacherId,
    supervisorId,
    name,
    email,
    role,
    workhrs,
    startdate,
    enddate,
    fromtime,
    totime,
    createdDate,
    createdBy,
    lastUpdatedBy
    } = payload;

    //const hashedPassword = await hashPassword(decryptPassword(password));

    return createShiftschedule({
      academicCoachId,
      teacherId,
      supervisorId,
      name,
      email,
      role,
      workhrs,
      startdate,
        enddate,
        fromtime,
        totime,
        createdDate,
        createdBy,
        lastUpdatedBy
    });
  },

//getBYId
async getShiftscheduleById(req: Request, h: ResponseToolkit) {
  const id = String(req.query.id);
  const type = String(req.query.type); // expected: 'teacherId', 'employeeId', etc.

  if (!id || !type) {
    return h.response({ error: "Missing id or type" }).code(400);
  }

  // Build the dynamic query object
  const query: Record<string, string> = {};
  query[type] = id;

  const result = await getDayWiseShiftSchedule(query);
  return result;
}
,
async updateShiftSchedule(req: Request, h: ResponseToolkit){
  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return h
        .response({ statusCode: 400, message: "employeeId is required" })
        .code(400);
    }

    const payload = req.payload as Record<string, any>;  // FIXED ✔

    const result = await updateShiftScheduleService(employeeId, payload);

    return h
      .response({
        statusCode: 200,
        message: "Shift schedule updated successfully",
        data: result,
      })
      .code(200);

  } catch (error) {
    return h.response({ error}).code(500);
  }
}








}

async function createShiftschedule(arg0: { academicCoachId: string; teacherId: string; supervisorId:string; name: string; email: string; role: string; workhrs: number; startdate: string; enddate: string; fromtime: string; totime: string; createdDate: string; createdBy: string; lastUpdatedBy: string; }) {
const shiftScheduleRecord = await UserShiftSchedule.create(arg0);
console.log(shiftScheduleRecord);
return shiftScheduleRecord;
};



