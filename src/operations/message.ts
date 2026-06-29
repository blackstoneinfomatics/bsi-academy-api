import {  IMessage, IMessageCreate } from "../../types/models.types";
import message from "../models/message";
import { GetAllRecordsParams } from "../shared/enum";
import Message from "../models/message"
export const createMessage = async (
  payload: IMessageCreate
): Promise<{ totalCount: number; message: IMessageCreate[] } | { error: any }> => {
  try {
    // Create a new assignment
    const newMessage = new message({
      teacher: {
        teacherId: payload.teacher?.teacherId || "",
        teacherName: payload.teacher?.teacherName || "",
        teacherEmail: payload.teacher?.teacherEmail || "",
      },
      student: {
        studentId: payload.student?.studentId || "",
        studentFirstName: payload.student?.studentFirstName || "",
        studentLastName: payload.student?.studentLastName || "",
        studentEmail: payload.student?.studentEmail || "",
      },
      attachmentsType: payload.attachmentsType || [], // Attachments array (could be empty)
      sender: payload.sender || "",
      receiver: payload.receiver || "",
      group: payload.group || "",
      status: payload.status || "", // Default status if not provided
      createdDate: payload.createdDate || new Date(),
      createdBy: payload.createdBy || "", // Default createdBy if not provided
      updatedDate: payload.updatedDate || new Date(),
      updatedBy: payload.updatedBy || "",
      roomId: payload.roomId || "",
      message:payload.message||""
    });

    // Save the new assignment to the database
    const MessageRecord = await newMessage.save();

    // Count total assignments in the database
    const totalCount = await message.countDocuments();

    return { totalCount, message: [MessageRecord] };
  } catch (error) {
    return { error };
  }
};

export const createStudentMessageList = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; Message: IMessage[] }> => {
  const { studentId, teacherId, sortBy = "_id", sortOrder = "asc", offset = 1, limit = 10 } = params;

  if (!studentId || !teacherId) {
    throw new Error("Both Student ID and Teacher ID are required");
  }

  const query = {
    $or: [
      { "teacher.teacherId": teacherId, "student.studentId": studentId },
      { "teacher.teacherId": studentId, "student.studentId": teacherId }
    ]
  };

  console.log(">> Query:", query);

  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  try {
    const skip = Math.max(0, (Number(offset) - 1) * Number(limit));

    // Fetching messages and counting total messages
    const [messages, totalCount] = await Promise.all([
      Message.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean() as Promise<IMessage[]>,
      Message.countDocuments(query)
    ]);

    return { totalCount, Message: messages }; 
  } catch (error) {
    console.error("Error fetching messages for student:", error);
    throw new Error("Failed to fetch messages for the student");
  }
};








export const createTeacherMessageList = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; messages: IMessage[] }> => {
  const { roomId, sortBy = "_id", sortOrder = "asc", offset = 1, limit = 10 } = params;

  if (!roomId) {
    throw new Error("Teacher ID is required");
  }

  // Update query to filter messages where the sender is "teacher" and matches the teacherId
  const query: any = { roomId };
  console.log("Query:", query);

  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  try {
    const skip = Math.max(0, (Number(offset) - 1) * Number(limit));

    // Fetch the messages and total count
    const [messages, totalCount] = await Promise.all([
      Message.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean<IMessage[]>()
        .exec(), // Use .lean() for performance
      Message.countDocuments(query).exec(),
    ]);

    // Ensure property name matches expected structure
    return { totalCount, messages };
  } catch (error) {
    console.error("Error fetching messages for teacher:", error);
    throw new Error("Failed to fetch messages for the teacher");
}
};
   

//////////////////////////////////SUPERVISOR//////////////////////////////

export const createSupervisorMessage = async (
  payload: IMessageCreate
): Promise<{ totalCount: number; message: IMessageCreate[] } | { error: any }> => {
  try {
    // Create a new assignment
    const newMessage = new message({
      teacher: {
        teacherId: payload.teacher?.teacherId || "",
        teacherName: payload.teacher?.teacherName || "",
        teacherEmail: payload.teacher?.teacherEmail || "",
      },
      supervisor: {
        supervisorId: payload.supervisor?.supervisorId || "",
        supervisorFirstName: payload.supervisor?.supervisorFirstName || "",
        supervisorLastName: payload.supervisor?.supervisorLastName || "",
        supervisorEmail: payload.supervisor?.supervisorEmail || "",
      },
      attachmentsType: payload.attachmentsType || [], // Attachments array (could be empty)
      sender: payload.sender || "",
      receiver: payload.receiver || "",
      group: payload.group || "",
      status: payload.status || "", // Default status if not provided
      createdDate: payload.createdDate || new Date(),
      createdBy: payload.createdBy || "", // Default createdBy if not provided
      updatedDate: payload.updatedDate || new Date(),
      updatedBy: payload.updatedBy || "",
      roomId: payload.roomId || "",
      message:payload.message||""
    });

    // Save the new assignment to the database
    const MessageRecord = await newMessage.save();

    // Count total assignments in the database
    const totalCount = await message.countDocuments();

    return { totalCount, message: [MessageRecord] };
  } catch (error) {
    return { error };
  }
};


export const createSupervisorMessageList = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; Message: IMessage[] }> => {
  const {  supervisorId, teacherId, sortBy = "_id", sortOrder = "asc", offset = 1, limit = 10 } = params;

  if (!supervisorId || !teacherId) {
    throw new Error("Both Supervior ID and Teacher ID are required");
  }

  const query = {
    $or: [
      { "teacher.teacherId": teacherId, "supervisor.supervisorId": supervisorId },
      { "teacher.teacherId": supervisorId, " supervisor.supervisorId": teacherId }
    ]
  };

  console.log(">> Query:", query);

  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  try {
    const skip = Math.max(0, (Number(offset) - 1) * Number(limit));

    // Fetching messages and counting total messages
    const [messages, totalCount] = await Promise.all([
      Message.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean() as Promise<IMessage[]>,
      Message.countDocuments(query)
    ]);

    return { totalCount, Message: messages }; 
  } catch (error) {
    console.error("Error fetching messages for student:", error);
    throw new Error("Failed to fetch messages for the student");
  }
};


export const createGetTeacherMessageList = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; messages: IMessage[] }> => {
  try {
    const { roomId, sortBy = "_id", sortOrder = "asc", offset = 1, limit = 10 } = params;

    if (!roomId) {
      throw new Error("Room ID is required");
    }

    // Validate numeric parameters
    const pageOffset = Math.max(0, (Number(offset) - 1) * Number(limit));
    const pageLimit = Math.max(1, Number(limit));

    const query: any = { roomId };

    // Ensure sorting field exists in the schema
    const allowedSortFields = ["_id", "createdAt", "updatedAt", "sender"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "_id";
    const sortOptions: any = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    console.log("Executing Query:", query, "Sorting:", sortOptions);

    // Fetch messages & total count
    const [messages, totalCount] = await Promise.all([
      Message.find(query)
        .sort(sortOptions)
        .skip(pageOffset)
        .limit(pageLimit)
        .lean<IMessage[]>()
        .exec(),
      Message.countDocuments(query).exec(),
    ]);

    console.log(`Fetched ${messages.length} messages out of ${totalCount} total.`);

    return { totalCount, messages };
  } catch (error) {
    console.error("🔥 Error fetching messages:", error);
    throw new Error("Failed to fetch messages for the teacher");
  }
};
