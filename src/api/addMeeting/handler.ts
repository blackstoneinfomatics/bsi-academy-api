import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import addmeeting, { zodAddMeetingSchema } from "../../models/addmeeting";
import { createMeeting, getAllMeetingRecords, getMeetingRecordById, meetingByIdRecord, updateMeetingById, updateMeetingMinutesAndAttendees } from "../../operations/addmeeting";
import { isNil } from "lodash";
import { notFound } from "@hapi/boom";
import { addMeetingMessages, ClassSchedulesMessages } from "../../config/messages";
import { checkMeetingConflict, getMeetingById, mergeMeetingPayload } from "../../shared/utils/meetingUtils";
import { supervisorAddMeeting } from "../../kafka/producers/supervisorProducer";
import { ITeacher, IParticipant, IOrganizer } from "../../../types/models.types";
import { academicAvailableTeachers } from "../../kafka/producers/academicProducer";


const createInputValidation = z.object({
  payload: zodAddMeetingSchema.pick({
    meetingName: true,
    meetingId: true,
    selectedDate: true,
    startTime: true,
    endTime: true,
    organizer: true,
    description: true,
    status: true,
    teacher: true,
    meetingStatus: true,
    meetingminutes: true,
    createdDate: true,
    createdBy: true,
    duration:true,
    updatedDate: true,
    participants: true,
  }),
});

export const updateMeetingInputValidation = z.object({
  selectedDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
});


 


export default {
  async createMeeting(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createInputValidation.parse({ payload: req.payload });
  
      // ✅ Parse organizer safely (can be stringified or object)
      let organizer: IOrganizer | undefined;
  
      const organizerInput = (req.payload as any)?.organizer ?? payload.organizer;
      if (typeof organizerInput === "string") {
        try {
          const o = JSON.parse(organizerInput);
          const rawRole = o.role ?? o.organizerRole;
          const normRole = typeof rawRole === "string" ? rawRole.toLowerCase().replace(/\s+/g, "") : undefined;
          organizer = {
            organizerId: o.organizerId,
            organizerName: o.organizerName,
            organizerEmail: o.organizerEmail,
            role: (normRole as any),
          };
        } catch (err) {
          console.error("Failed to parse organizer string:", err);
        }
      } else if (typeof organizerInput === "object" && organizerInput !== null) {
        const rawRole = (organizerInput as any).role ?? (organizerInput as any).organizerRole;
        const normRole = typeof rawRole === "string" ? rawRole.toLowerCase().replace(/\s+/g, "") : undefined;
        organizer = {
          organizerId: (organizerInput as any).organizerId,
          organizerName: (organizerInput as any).organizerName,
          organizerEmail: (organizerInput as any).organizerEmail,
          role: (normRole as any),
        };
      }
  
      // ✅ Parse participants safely
      const participants = Array.isArray(payload.participants)
        ? payload.participants.map((p: any) => ({
            participantId: p.participantId,
            participantName: p.participantName,
            participantEmail: p.participantEmail,
            role: p.role,
            attendee: p.attendee || p.role,
          }))
        : [];
  
      // 🧠 Shared meetingId for all records
      const meetingId = payload.meetingId || `ALFMT-${String(Math.floor(1 + Math.random() * 99)).padStart(2, '0')}`;
  
      // ✅ Create per-participant records in service
      const meetingResult = await createMeeting({
        meetingName: payload.meetingName,
        meetingId,
        selectedDate: payload.selectedDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        description: payload.description,
        meetingStatus: payload.meetingStatus,
        createdDate: payload.createdDate,
        createdBy: payload.createdBy,
        status: payload.status ?? "Active",
        meetingminutes: payload.meetingminutes,
        duration: payload.duration,
        participants,
        organizer, // ✅ pass organizer here
        updatedDate: payload.updatedDate,
      });
  
      if ((meetingResult as any)?.error) {
        return h.response({ error: (meetingResult as any).error }).code(400);
      }
  
      return h
        .response({
          message: "✅ Meeting created successfully",
          data: meetingResult,
        })
        .code(201);
  
    } catch (error) {
      console.error("❌ Error creating meeting:", error);
      return h.response({ error: (error as Error).message }).code(400);
    }
  }
  
  
  
,
async getAllMeetings(req: Request, h: ResponseToolkit) {
  const { supervisorId, offset, limit, sortBy } = req.query;

  // if (!supervisorId) {
  //   return h.response({ message: "supervisorId is required" }).code(400);
  // }

  const queryForService = {
    supervisorId: Array.isArray(supervisorId) ? supervisorId[0] : supervisorId,
    offset: offset ? String(offset) : null,
    limit: limit ? String(limit) : null,
    sortBy: (Array.isArray(sortBy) ? sortBy[0] : sortBy) ?? "createdDate",
  };

  return getAllMeetingRecords(queryForService);
}





,

  //get by ID



      async  getMeetingById(req: Request, h: ResponseToolkit) {
        const { meetingId } = req.query;
      
        if (!meetingId) {
          return h.response({ error: 'meetingId is required in query params' }).code(400);
        }
      
        const result = await getMeetingRecordById(meetingId as string);
      
        if (!result.length) {
          return h.response({ message: 'No meetings found' }).code(404);
        }
      
        return h.response({ total: result.length, meetings: result }).code(200);
      },

//Update Meeting 
async updateMeetingRecordById(req: Request, h: ResponseToolkit) {
  console.log("🔵 API HIT: updateMeetingRecordById");

  try {
    const payload = req.payload as any;
    console.log("➡️ Raw Payload:", payload);

    if (!payload || Object.keys(payload).length === 0) {
      return h.response({ message: "Request payload is empty" }).code(400);
    }

    // 🟡 Step 1: Validate payload (ONLY allowed fields)
    console.log("🟡 Step 1: Validating payload");
    const validatedPayload = updateMeetingInputValidation.parse(payload);
    console.log("✅ Validated Payload:", validatedPayload);

    // 🟡 Step 2: Fetch meeting from DB
    console.log("🟡 Step 2: Fetching meeting from DB");
    const meeting = await getMeetingById(req.params.meetingId);

    if (!meeting) {
      return h.response({ message: "Meeting not found" }).code(404);
    }

    console.log("📦 Existing Meeting:", meeting);

    // 🟡 Step 3: Check if time/date changed
    console.log("🟡 Step 3: Checking time/date change");

    const newDate = validatedPayload.selectedDate
      ? new Date(validatedPayload.selectedDate)
      : meeting.selectedDate;

    const newStart = validatedPayload.startTime ?? meeting.startTime;
    const newEnd = validatedPayload.endTime ?? meeting.endTime;

    const isTimeChanged =
      newDate.getTime() !== meeting.selectedDate.getTime() ||
      newStart !== meeting.startTime ||
      newEnd !== meeting.endTime;

    console.log("⏰ Is Time Changed?", isTimeChanged);

    // 🟡 Step 4: Conflict check (ONLY if time changed)
    if (isTimeChanged) {
      console.log("🟠 Time changed → checking conflicts");

      // ✅ Teacher = participant[0]
      const teacher = meeting.participants?.[0];
      if (!teacher?.participantId) {
        return h
          .response({ message: "Teacher not found for this meeting" })
          .code(400);
      }

      if (!meeting.organizer?.organizerId) {
        return h
          .response({ message: "Organizer not found for this meeting" })
          .code(400);
      }

      const hasConflict = await checkMeetingConflict(
        teacher.participantId,
        meeting.organizer.organizerId,
        " ",
        newDate.toISOString(),
        newStart,
        newEnd,
        req.params.meetingId
      );

      console.log("🔥 Conflict result:", hasConflict);

      if (hasConflict) {
        return h
          .response({ message: "Time slot already occupied" })
          .code(400);
      }
    }

    // 🟡 Step 5: Build update object (ONLY allowed fields)
    console.log("🟡 Step 5: Building update object");

    const updateData = {
      ...(validatedPayload.selectedDate && {
        selectedDate: newDate,
      }),
      ...(validatedPayload.startTime && {
        startTime: validatedPayload.startTime,
      }),
      ...(validatedPayload.endTime && {
        endTime: validatedPayload.endTime,
      }),
      ...(validatedPayload.description && {
        description: validatedPayload.description,
      }),
      meetingStatus: "Rescheduled",
      updatedDate: new Date(),
    };

    console.log("🧩 Update Data:", updateData);

    // 🟡 Step 6: Update DB
    console.log("🟡 Step 6: Updating DB");

    const result = await updateMeetingById(
      req.params.meetingId,
      updateData
    );

    if (!result) {
      return h.response({ message: "Meeting not found" }).code(404);
    }

    console.log("✅ Meeting updated successfully");

    return h.response({
      message: "Meeting rescheduled successfully",
      data: result,
    }).code(200);

  } catch (error) {
    console.error("❌ Error updating meeting:", error);
    return h.response({ message: "Internal Server Error" }).code(500);
  }
}


,



//Update meeting minutes
async updateMeetingMinutesRecordById(req: Request, h: ResponseToolkit) {
  try {
    const meetingId = req.params.meetingbyId;
    const payload = req.payload as any;
const result = await updateMeetingMinutesAndAttendees(
  meetingId,
  payload?.meetingminutes,
  payload?.meetingStatus,
  payload?.duration,
  Array.isArray(payload?.teacher) ? payload.teacher : [],
  payload?.updatedBy
);


    if (!result) {
      return h.response({ message: "Meeting not found" }).code(404);
    }

    return h.response(result).code(200);

  } catch (error) {
    console.error(error);
    return h.response({ message: "Server Error" }).code(500);
  }
}
,

async getMeetingByIdRecord (req: Request, h: ResponseToolkit) {

    try {
        // Fetch the student by ID
        const result = await meetingByIdRecord(String(req.params.id));
  
        // Handle not found case
        if (isNil(result)) {
          return h
            .response({ message: ClassSchedulesMessages.NOT_FOUND })
            .code(404);
        }
  
       
        return h.response(result).code(200);
      } catch (error) {
        // Handle errors (unexpected or other)
        return h
          .response({ error })
          .code(500);
      }

}
  


}



