import { ResponseToolkit, Request } from "@hapi/hapi";
import { admincreateMeeting, getAdminMeetingById, getAllAdminMeetingRecords ,getMeetingsByMeetingId, updateAdminMeetingById, updateMeetingStatus, requestAdminMeetingReschedule as requestAdminMeetingRescheduleOperation } from "../../operations/adminmeeting";
import { IAdminMeetingCreate, ITeacher } from "../../../types/models.types";
import { isNil } from "lodash";
import { addAminMeetingMessages } from "../../config/messages";
import { notFound } from "@hapi/boom";
import AppLogger from "../../helpers/logging";


export interface IAdminMeetingUpdate{
  meetingName:string,
  selectedDate: Date,
  status?:string,
  meetingStatus?: string,
  startTime:string,
  endTime:string,
  updatedDate?:Date,
  updatedBy?:string,
  description:string,
  }



export default {


  //Create Admin Meeting
  async createAdminMeeting(req: Request, h: ResponseToolkit) {
    try {
      const rawPayload = req.payload as any;
  
      // Normalize selectedDate to midnight
      const selectedDate = new Date(rawPayload.selectedDate);
      selectedDate.setHours(0, 0, 0, 0);
  
      const payload: IAdminMeetingCreate = {
        meetingName: rawPayload.meetingName,
        selectedDate,
        startTime: rawPayload.startTime,
        endTime: rawPayload.endTime,
        description: rawPayload.description,
        status: rawPayload.status,
        meetingStatus: rawPayload.meetingStatus ?? "Scheduled",
        createdDate: rawPayload.createdDate ? new Date(rawPayload.createdDate) : new Date(),
        createdBy: rawPayload.createdBy,
        updatedDate: rawPayload.updatedDate ? new Date(rawPayload.updatedDate) : new Date(),
        updatedBy: rawPayload.updatedBy ?? "",
        teacher: Array.isArray(rawPayload.teacher) ? rawPayload.teacher : [],
      };
  
      console.log("Normalized selectedDate in handler:", selectedDate);
      AppLogger.log({
        level: "info",
        message: "Payload received",
        data: payload
      });
  
      const meetings = await admincreateMeeting(payload);

      if ("error" in meetings) {
        return h.response({ error: meetings.error }).code(400);
      }
  
      return h.response({
        message: "Meetings created successfully for each teacher.",
        data: meetings
      }).code(201);
  
    } catch (error) {
      console.error("Error in createAdminMeeting handler:", error);
      return h.response({ error }).code(400);
    }
  },
  
  
  
  
  
  //Admin Meeting List

    async getAllAdminMeeting(req: Request, h: ResponseToolkit) {
      try {
        const meetings = await getAllAdminMeetingRecords();
        return h.response({ message: "Meetings retrieved successfully", data: meetings }).code(200);
      } catch (error) {
        return h.response({ error }).code(500);
      }
    },

  //get by ID
      async getAdminMeetingRecordById(req: Request, h: ResponseToolkit){
        const result = await getAdminMeetingById(String(req.params.meetingId));
  
        if (isNil(result)) {
             return notFound(addAminMeetingMessages.USER_NOT_FOUND);
             }
  
    return result;
      },

        //get by MeetinngId
async getAdminMeetingRecordByMeetingId(req: Request, h: ResponseToolkit) {
  const meetingId = String(req.query.meetingId);

  const result = await getMeetingsByMeetingId(meetingId); // Note plural function

  if (isNil(result) || result.length === 0) {
    return notFound(addAminMeetingMessages.USER_NOT_FOUND);
  }

  return result;
},

  
//Update

async updateAdminMeetingRecordById(req: Request, h: ResponseToolkit) {
  try {
    const payload = req.payload as Partial<IAdminMeetingUpdate>;

    if (!payload) {
      return h.response({ message: "Request payload is missing" }).code(400);
    }

    const {
      selectedDate,
      startTime,
      endTime,
      meetingStatus,
      updatedBy,
      updatedDate,
      meetingName,
      description,
    } = payload;

    // Validate essential fields
    if (!selectedDate || !startTime || !endTime) {
      return h
        .response({ message: "Missing required reschedule fields" })
        .code(400);
    }

    // Build update object
    const updatedPayload: Partial<IAdminMeetingUpdate> = {
      selectedDate: new Date(selectedDate),
      startTime,
      endTime,
      meetingStatus: meetingStatus || "Rescheduled",
      updatedBy: updatedBy || "admin",
      updatedDate: updatedDate || new Date(),
    };

    if (meetingName) updatedPayload.meetingName = meetingName;
    if (description) updatedPayload.description = description;

    // Update all records sharing the meetingId
    const result = await updateAdminMeetingById(req.params.meetingId, updatedPayload);

    if (!result) {
      return h.response({ message: "No matching meetings found to update" }).code(404);
    }

    return h
      .response({ message: "Meetings rescheduled successfully", data: result })
      .code(200);

  } catch (error) {
    console.error("Error while updating meetings:", error);
    return h
      .response({ message: "Internal Server Error", error })
      .code(500);
  }
},



//Update meeting minutes
async updateAdminMeeting(req: Request, h: ResponseToolkit) {
  try {
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Raw payload:", req.payload);

    const meetingId = req.params.meetingbyId;
    const payload = req.payload as {
      duration: string;
      meetingStatus: string;
      teacher: ITeacher[];
      updatedBy?: string;
    };


    const result = await updateMeetingStatus(
      meetingId,
      payload.meetingStatus,
      payload.duration,
      payload.teacher,
      payload.updatedBy
    );

    if (!result) {
      return h.response({ message: addAminMeetingMessages.USER_NOT_FOUND }).code(404);
    }

    return h.response(result).code(200);
  } catch (error) {
    console.error("Error updating meeting minutes and attendees:", error);
    return h.response({ message: "Internal Server Error", error }).code(500);
  }
},

async requestAdminMeetingReschedule(req: Request, h: ResponseToolkit) {
  try {
    const payload = req.payload as any;
    const result = await requestAdminMeetingRescheduleOperation(payload);

    return h
      .response(result)
      .code(result.success ? 200 : 400);
  } catch (error: any) {
    console.error("Error in requestAdminMeetingReschedule handler:", error);
    return h
      .response({ success: false, message: error.message ?? "Internal Server Error" })
      .code(500);
  }
}




}






  