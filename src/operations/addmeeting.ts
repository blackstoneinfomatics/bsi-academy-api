import { IMeeting, IMeetingCreate, ITeacher } from "../../types/models.types";

import Meeting from "../models/addmeeting";
import User from "../models/users";
import cron from "node-cron";
import { GetAllRecordsParams } from "../shared/enum";
import mongoose, { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import adminmeeting from "../models/adminmeeting";

const addmeeting = Meeting;

export interface IMeetingUpdate {
  meetingName: string;
  selectedDate: Date;
  status?: string;
  meetingStatus?: string;
  startTime: string;
  endTime: string;
  updatedDate?: Date;
  updatedBy?: string;
  description: string;
}

export interface IMeetingMinutesUpdate {
  meetingStatus: string;
  duration?: string;
  meetingminutes: string;
  teacher: ITeacher[]; // Fix this from `string` to `ITeacher[]`
}

/**
 * Creates a new meeting.
 *
 * @param {IMeetingCreate} payload - The data for the new meeting.
 */
 

/**
 * Retrieves all meeting records with optional filters.
 */

export const getAllMeetingRecords = async (
  params: GetAllRecordsParams
): Promise<{
  totalCount: number;
  meetings: IMeeting[];
  groupedAutoMeetings: {
    meetingId: string;
    meetingName: string;
    participants: any[];
  }[];
}> => {
  try {
    const { offset, limit, supervisorId } = params;

    console.log("✅ supervisorId received:", supervisorId);

    // Fetch auto-scheduled meetings
    const adminMeetings = await adminmeeting
      .find({
        "teacher.teacherId": supervisorId,
      })
      .lean();
    console.log("✅ adminMeetings found:", adminMeetings.length);

    // Fetch manually added meetings
    const addMeetings = await Meeting.find({
      "organizer.organizerId": supervisorId,
    }).lean();

    console.log("✅ addMeetings found:", addMeetings.length);

    // Combine and paginate
    const combinedMeetings = [...adminMeetings, ...addMeetings].sort(
      (a, b) =>
        new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );

    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : combinedMeetings.length;
    const paginated = combinedMeetings.slice(start, end);

    console.log("✅ total combinedMeetings:", combinedMeetings.length);
    console.log("✅ paginated meetings returned:", paginated.length);

    // Group ONLY auto-scheduled meetings by meetingId
    // ✅ Group ONLY auto-scheduled meetings from the addMeeting (Meeting) collection
    const groupedMap = new Map<
      string,
      { meetingId: string; meetingName: string; participants: any[] }
    >();

     const autoMeetings = await Meeting.find({
      status: "Active",
    }).lean();

    for (const meeting of autoMeetings) {
      // ✅ Only group if meetingId starts with "auto-"
      if (!meeting.meetingName?.startsWith("Auto-")) continue;
    
      const id = meeting.meetingId;
      const name = meeting.meetingName;

      if (!groupedMap.has(id)) {
        groupedMap.set(id, {
          meetingId: id,
          meetingName: name,
          participants: [],
        });
      }
console.log("✅ Processing meeting for grouping:", groupedMap);
      // Add participant (use appropriate field from your schema)
      // Assuming meeting has a participant/teacher/student field — adjust accordingly
      if (Array.isArray(meeting.teacher) && meeting.teacher.length > 0) {
        groupedMap.get(id)!.participants.push(...meeting.teacher);
      } else if (meeting.teacher) {
        groupedMap.get(id)!.participants.push(meeting.teacher); // fallback if `participants` field not present
      }
    }

    const groupedAutoMeetings = Array.from(groupedMap.values());

    return {
      totalCount: combinedMeetings.length,
      meetings: paginated as IMeeting[],
      groupedAutoMeetings,
    };
  } catch (error) {
    console.error("❌ Error fetching meetings:", error);
    throw new Error("Error fetching meetings: " + error);
  }
};

export const createMeeting = async ( payload: IMeetingCreate): Promise<IMeeting | IMeeting[] | { error: any }> => {
  try {
    // Extract and sanitize supervisor fields from payload

    // Convert selectedDate to a Date object
    const meetingDate = new Date(payload.selectedDate);
    const { startTime, endTime } = payload;

    // Check for overlapping meeting
    const conflictingMeeting = await Meeting.findOne({
      selectedDate: meetingDate,
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    if (conflictingMeeting) {
      return {
        error:
          "A meeting is already scheduled at this time. Please choose a different time slot.",
      };
    }

    // Generate/normalize meetingId (keep provided id if present)
  //  const meetingId = payload.meetingId || `meet-${uuidv4()}`;
  
  const meetingId =   generateAFTCode("AFM");


    // Check for past date
    if (meetingDate < new Date()) {
      return {
        error:
          "Meeting date cannot be in the past. Please select a future date.",
      };
    }

    // If multiple participants are provided, create one record per participant
    const participants = Array.isArray(payload.participants)
      ? payload.participants
      : [];
    if (participants.length > 0) {
      const docs = participants.map((participant) => ({
        meetingName: payload.meetingName,
        meetingId,
        organizer: payload.organizer,
        selectedDate: meetingDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        participants: [participant],
        description: payload.description,
        meetingStatus: payload.meetingStatus,
        status: payload.status,
        createdBy: payload.createdBy,
        createdDate: payload.createdDate,
        updatedDate: payload.updatedDate,
        meetingminutes: payload.meetingminutes,
        duration: payload.duration,
      }));

      const saved = await Meeting.insertMany(docs);
      return saved as unknown as IMeeting[];
    }

    // Otherwise, create a single meeting document
    const newMeeting = new Meeting({
      ...payload,
      organizer: payload.organizer,
      meetingId,
    });

    const savedMeeting = await newMeeting.save();
    return savedMeeting;
  } catch (error) {
    console.error("Error creating meeting:", error);
    return { error };
  }
};

// Auto Schedule Weekly Meeting - for ALL teachers (new, old, logged-in or not)
const autoScheduleMeeting = async () => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based index

    const isFebruary = month === 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Define base dates based on month
    let baseDays = isFebruary ? [14, 28] : [15, 30];

    // Ensure the dates exist in the month (e.g., for Feb with 29 days)
    baseDays = baseDays.map((day) => Math.min(day, daysInMonth));

    // Convert base days to Date objects, adjust if Sunday
    const meetingDates = baseDays.map((day) => {
      const date = new Date(year, month, day, 10, 0, 0); // 10:00 AM
      const isSunday = date.getDay() === 0; // 0 = Sunday
      if (isSunday) {
        date.setDate(date.getDate() + 1); // move to Monday
      }
      return date;
    });

    const startTime = "10:00";
    const endTime = "10:30";

    const supervisor = await User.findOne({ role: "SUPERVISOR" });
    if (!supervisor) {
      console.log("❌ No supervisor found. Cannot schedule a meeting.");
      return;
    }

    const teachers = await User.find({
      role: { $in: ["TEACHER"] },
      status: "Active",
    });
    if (teachers.length === 0) {
      console.log("❌ No active teachers found.");
      return;
    }

    for (const date of meetingDates) {
      // ✅ Generate a unique meetingId per date
      const formattedDate = date.toISOString().split("T")[0]; // e.g., "2025-07-29"
      const baseMeetingId = generateAFTCode("AFM");

      for (const teacher of teachers) {
        const existingMeeting = await Meeting.findOne({
          selectedDate: date,
          "supervisor.supervisorId": supervisor._id.toString(),
          "teacher.teacherId": teacher._id.toString(),
        });

        if (existingMeeting) {
          console.log(
            `⚠️ Meeting already scheduled for ${
              teacher.userName
            } on ${date.toDateString()}`
          );
          continue;
        }

        const newMeeting = new Meeting({
          meetingId: baseMeetingId, // 🔁 Use the same meetingId for all teachers on the same date
          meetingName: `Auto-Scheduled Meeting on ${date.toDateString()}`,
          description: "This is an automatically scheduled meeting.",
          createdDate: new Date(),
          selectedDate: date,
          startTime: startTime,
          endTime: endTime,
          createdBy: supervisor.userName,
          teacher: [
            {
              teacherId: teacher._id.toString(),
              teacherName: teacher.userName,
              teacherEmail: teacher.email,
            },
          ],
          supervisor: {
            supervisorId: supervisor._id.toString(),
            supervisorName: supervisor.userName,
            supervisorEmail: supervisor.email,
            supervisorRole: Array.isArray(supervisor.role)
              ? supervisor.role[0]
              : supervisor.role,
          },
          meetingStatus: "Scheduled",
          status: "Active",
        });

        await newMeeting.save();
        console.log(
          `✅ Scheduled meeting for ${
            teacher.userName
          } on ${date.toDateString()}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error auto-scheduling meetings:", error);
  }
};

// CRON Job to run auto-scheduling at 23:55 every day
cron.schedule("55 23 * * *", async () => {
  console.log("⏰ Running the auto-scheduling job every 23:55...");
  await autoScheduleMeeting();
});

//Get by ID

export const getMeetingRecordById = async (
  meetingId: string
): Promise<{ source: "supervisor" | "admin"; data: any }[]> => {
  const trimmedId = meetingId.trim();

  const [supervisorMatches, adminMatches] = await Promise.all([
    addmeeting.find({ meetingId: trimmedId }).lean(),
    adminmeeting.find({ meetingId: trimmedId }).lean(),
  ]);

  return [
    ...supervisorMatches.map((data) => ({
      source: "supervisor" as const,
      data,
    })),
    ...adminMatches.map((data) => ({ source: "admin" as const, data })),
  ];
};

//Update

export const updateMeetingById = async (
  id: string,
  payload: Partial<IMeeting>
) => {
  return addmeeting
    .findByIdAndUpdate(id, { $set: payload }, { new: true })
    .lean();
};


//Update meeting minutes

// Backend Controller
export const updateMeetingMinutesAndAttendees = async (
  meetingId: string,
  meetingminutes: string,
  meetingStatus: string,
  duration: string,
  teacher: ITeacher[],
  updatedBy?: string
): Promise<Partial<IMeetingMinutesUpdate> | null> => {
  console.log("🔍 Backend received:", { meetingId, teacher, duration, meetingminutes });
  
  try {
    const updated = await addmeeting
      .findOneAndUpdate(
        { meetingId },

        {
          $set: {
            duration,
            meetingminutes,
            meetingStatus,
            teacher: Array.isArray(teacher) ? teacher : [],
            updatedBy,
            updatedDate: new Date(),
          },
        },
        {
          new: true,
          projection: {
            meetingminutes: 1,
            teacher: 1,
            duration: 1,
            meetingStatus: 1,
            _id: 0,
          },
        }
      )
      .lean();

    console.log("✅ Updated document:", updated);
    return updated as unknown as Partial<IMeetingMinutesUpdate> | null;
  } catch (error) {
    console.error("❌ Update error:", error);
    throw error;
  }
};

export const meetingByIdRecord = async (
  _id: string
): Promise<IMeeting | null> => {
  return addmeeting
    .findOne({
      _id: new Types.ObjectId(_id),
    })
    .lean();
};

function generateAFTCode(preName: string) {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${preName}${num}`;
}
