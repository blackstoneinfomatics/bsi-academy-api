
import { PipelineStage, Types } from "mongoose";
import { IAdminMeeting, IAdminMeetingCreate, ITeacher } from "../../types/models.types";
import adminmeeting from "../models/adminmeeting";
import User from "../models/users";
import { sendNotification } from "./notification";
import { getIO } from "../shared/socket";
import realtimemessage from "../models/realtimemessage";
import AppLogger from "../helpers/logging";


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

  export interface IMeetingMinutesUpdate {
  meetingStatus: string;
  duration: string;
 
  teacher: ITeacher[];  // Fix this from `string` to `ITeacher[]`
}


/**
 * Creates a new meeting.
 *
 * @param {IAdminMeetingCreate} payload - The data for the new meeting.
 */

export const admincreateMeeting = async (
  payload: IAdminMeetingCreate
): Promise<IAdminMeeting[] | { error: any }> => {
  try {
    const admin = await User.findOne({
      userName: payload.createdBy,
      role: "ADMIN",
    }).exec();

    if (!admin) {
      console.warn("Admin not found for user:", payload.createdBy);
      return { error: "No Admin found." };
    }

    if (!payload.teacher || payload.teacher.length === 0) {
      console.warn("No teachers provided in payload:", payload);
      return { error: "At least one teacher must be selected to create a meeting." };
    }

    const createdMeetings: IAdminMeeting[] = [];

    function generateCustomMeetingId() {
      const digits = Math.floor(1000 + Math.random() * 9000);
      const letters = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('');
      return `${digits}${letters}`;
    }

    const groupMeetingId = generateCustomMeetingId();
    const selectedDate = new Date(payload.selectedDate);
    selectedDate.setHours(0, 0, 0, 0); // ✅ Normalize selectedDate

    const now = new Date();
    now.setHours(0, 0, 0, 0); // ✅ Normalize current date for comparison

    if (selectedDate < now) {
      console.warn("Attempted to create meeting in the past:", selectedDate);
      return { error: "Meeting date cannot be in the past. Please select today or a future date." };
    }

    // ✅ Optional: Validate time for today's date
    if (selectedDate.getTime() === now.getTime()) {
      const [hours, minutes] = payload.startTime.split(":").map(Number);
      const startTime = new Date();
      startTime.setHours(hours, minutes, 0, 0);

      const currentTime = new Date();
      if (startTime < currentTime) {
        return { error: "Start time cannot be in the past for today's meeting." };
      }
    }

    for (const teacher of payload.teacher) {
      if (!teacher.teacherId || !teacher.teacherName || !teacher.teacherEmail) {
        console.warn("Skipping invalid teacher entry:", teacher);
        continue;
      }

      const newMeeting = new adminmeeting({
        meetingName: payload.meetingName,
        meetingId: groupMeetingId,
        admin: {
          adminId: admin._id.toString(),
          adminName: admin.userName,
          adminEmail: admin.email,
          adminRole: Array.isArray(admin.role) ? admin.role[0] : admin.role,
        },
        selectedDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        teacher: {
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          teacherEmail: teacher.teacherEmail,
        },
        description: payload.description,
        status: payload.status,
        meetingStatus: payload.meetingStatus ?? "Scheduled",
        createdDate: payload.createdDate || new Date(),
        createdBy: payload.createdBy,
        updatedDate: payload.updatedDate || new Date(),
        updatedBy: payload.updatedBy ?? "",
      });

      const savedMeeting = await newMeeting.save();
      console.log("Meeting created:", savedMeeting);
      createdMeetings.push(savedMeeting);

      try {
        const meetingDateText = savedMeeting.selectedDate
          ? new Date(savedMeeting.selectedDate).toDateString()
          : "";
        const requestName = admin.userName ?? "Admin";
        const requestUserId = admin._id?.toString() ?? "";
        const requestEmail = admin.email ?? "";
        const message = `${requestName} (Admin) scheduled meeting "${savedMeeting.meetingName}" on ${meetingDateText} from ${savedMeeting.startTime} to ${savedMeeting.endTime}.`;
        const messageContent =
          `New admin meeting scheduled:\n` +
          `- Meeting: ${savedMeeting.meetingName}\n` +
          `- Date: ${meetingDateText}\n` +
          `- Time: ${savedMeeting.startTime} - ${savedMeeting.endTime}\n` +
          `- Description: ${savedMeeting.description}`;

        await sendNotification({
          messages: message,
          senderId: requestUserId,
          senderName: requestName,
          senderEmail: requestEmail,
          isRead: false,
          receiverId: [teacher.teacherId],
          receiverName: [teacher.teacherName],
          receiverEmail: [teacher.teacherEmail],
          notificationType: "ADMIN_MEETING_SCHEDULED",
          notificationStatus: "Unseen",
          status: "active",
          createdBy: "system",
          updatedBy: "system",
        });

        const newMessage = new realtimemessage({
          messages: messageContent,
          isRead: false,
          senderId: requestUserId,
          senderName: requestName,
          senderEmail: requestEmail,
          receiverId: teacher.teacherId,
          receiverName: teacher.teacherName,
          receiverEmail: teacher.teacherEmail,
          notificationStatus: "Unseen",
          status: savedMeeting.status ?? payload.status ?? "Active",
          createdDate: new Date(),
          createdBy: "System",
          updatedDate: new Date(),
          updatedBy: "System",
        });

        const savedMessage = await newMessage.save();
        const io = getIO();
        io.to(newMessage.receiverId).emit("newmessage", savedMessage);
        AppLogger.info("Notification sent for admin meeting creation", {
          meetingId: savedMeeting.meetingId,
          receiverId: teacher.teacherId,
        });
      } catch (notifyError) {
        console.error(
          "Error sending notification for created admin meeting:",
          notifyError
        );
      }
    }

    if (createdMeetings.length === 0) {
      console.warn("No valid teacher entries found. No meetings created for payload:", payload);
      return { error: "No valid teachers found. No meetings were created." };
    }
    return createdMeetings;


    
  } catch (error) {
    console.error("Error creating meeting:", error);
    return { error };
  }
};







/**
 * Retrieves all meeting records grouped by meetingId, including teacher information.
 */
export const getAllAdminMeetingRecords = async (): Promise<{ totalCount: number; meetings: any[] }> => {
  try {
    const pipeline: PipelineStage[] = [
      {
        $sort: { createdDate: -1 } // Optional: sort before grouping
      },
      {
        $group: {
          _id: "$meetingId", // Group by meetingId
          records: { $push: "$$ROOT" } // Push entire meeting documents into 'records'
        }
      },
      {
        $project: {
          meetingId: "$_id",
          records: 1,
          _id: 0
        }
      },
      {
        $sort: { meetingId: -1 } // Optional: sort grouped results
      }
    ];

    const meetingsData = await adminmeeting.aggregate(pipeline);
    const totalCount = meetingsData.length;

    return { totalCount, meetings: meetingsData };
  } catch (error) {
    console.error("Error fetching meetings: ", error);
    throw new Error("Error fetching meetings");
  }
};



//Get by ID

const addmeeting = adminmeeting;

export const getAdminMeetingById = async (  id: string): Promise<IAdminMeeting | null> => {
  return addmeeting.findOne({
    _id: new Types.ObjectId(id),
  }).lean();
};


export const getMeetingsByMeetingId = async (
  meetingId: string
): Promise<IAdminMeeting[]> => {
  return addmeeting.find({ meetingId }).lean();
};




//Update
export const updateAdminMeetingById = async (
  meetingId: string,
  payload: Partial<IAdminMeetingUpdate>
): Promise<IAdminMeeting[] | null> => {
  const updateResult = await addmeeting.updateMany(
    { meetingId },          // Match by meetingId
    { $set: payload }
  );

  if (updateResult.modifiedCount === 0) {
    return null; // No documents updated
  }

  // Return updated documents
  return await addmeeting.find({ meetingId }).lean();
};



//updatevideocall

export const updateMeetingStatus = async (
  id: string,
  meetingStatus: string,
  duration: string,
  teacher: ITeacher[],
  updatedBy?: string
): Promise<IMeetingMinutesUpdate | null> => {
  const updated = await addmeeting.findOneAndUpdate(
 { meetingId: id },
    {
      $set: {
        meetingStatus,
        duration,
        teacher,
        updatedBy,
        updatedDate: new Date(),
      },
    },
    {
      new: true,
      projection: {
        meetingStatus: 1, // ✅ also project this to match interface
        duration: 1,
        teacher: 1,
        _id: 0,
      },
    }
  ).lean();

  // ✅ Manually cast the result to match your expected type
  return updated as IMeetingMinutesUpdate | null;
};

export const requestAdminMeetingReschedule = async (payload: any) => {
  try {
    console.log("[AdminMeeting] request reschedule payload:", payload);
    if (!payload?._id) {
      throw new Error("Meeting _id is required to request a reschedule.");
    }

    const meeting = await addmeeting.findOne({
      _id: new Types.ObjectId(payload._id),
    });

    if (!meeting) {
      throw new Error("Meeting not found.");
    }
    console.log("[AdminMeeting] existing meeting:", meeting);

    const rescheduleResult = await addmeeting.findOneAndUpdate(
      { _id: new Types.ObjectId(payload._id) },
      {
        $set: {
          meetingStatus: "Reschedulerequested",
          updatedDate: new Date(),
          updatedBy: payload.requestedBy ?? meeting.updatedBy ?? "system",
        },
      },
      { new: true }
    );

    if (!rescheduleResult) {
      throw new Error("Unable to mark meeting for reschedule.");
    }
    console.log("[AdminMeeting] rescheduleResult:", rescheduleResult);

   

    return {
      success: true,
      message: "Admin meeting reschedule requested successfully.",
      data: rescheduleResult,
    };
  } catch (error: any) {
    console.error("Error in requestAdminMeetingReschedule:", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};