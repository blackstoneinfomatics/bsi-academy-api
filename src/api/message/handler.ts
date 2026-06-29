import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import crypto from "crypto"; // For hashing

import { zodMessageSchema } from "../../models/message";
import { createGetTeacherMessageList, createMessage, createStudentMessageList, createSupervisorMessage, createSupervisorMessageList, createTeacherMessageList } from "../../operations/message";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";

const createMessageValidation = z.object({
  payload: zodMessageSchema
    .pick({
      supervisor:true,
      student: true,
      teacher: true,
      status: true,
      message: true,
      attachmentstype: true,
      sender: true,
      receiver: true,
      group: true,
      timeZone: true,
      createdBy: true,
      createdDate: true,
      updatedBy: true,
      updatedDate: true,
    })
    .partial(), // Allow partial inputs
});

const getAllStudentInput = z.object({
  query: zodGetAllRecordsQuerySchema.pick({
    roomId:true,
    supervisorId:true,
    teacherId:true,
    studentId:true,
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    filterValues: true,
  }),
}); 

export default {
  async createMessage(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createMessageValidation.parse({ payload: req.payload });
  
      // Ensure studentId and teacherId exist
      if (!payload.student?.studentId || !payload.teacher?.teacherId) {
        return h.response({ error: "Both studentId and teacherId are required" }).code(400);
      }
  
      // Generate a deterministic roomId based on studentId and teacherId
      const studentId = payload.student.studentId;
      const teacherId = payload.teacher.teacherId;
      const roomId = crypto.createHash("sha256").update(studentId + teacherId).digest("hex");
  
      // Create a map for groupName to groupId
      const groupMap = new Map<string, string>();
  
      // Map over the groups and generate groupId for each group
      const groupsWithIds =
        payload.group?.map((groupItem) => {
          // Check if groupId already exists in the map
          let groupId = groupMap.get(groupItem.groupName);
  
          // If groupId doesn't exist, generate one and store it in the map
          if (!groupId) {
            groupId = crypto.createHash("sha256").update(groupItem.groupName).digest("hex");
            groupMap.set(groupItem.groupName, groupId); // Store the groupId for future use
          }
  
          return {
            groupId, // Use the same groupId for all students in the group
            groupName: groupItem.groupName || "",
            members:
              groupItem.members?.map((member) => ({
                userId: member?.userId || "",
                userName: member?.userName || "",
              })) || [],
          };
        }) || [];
  
      // Construct the message object with separate roomId and groupId
      const result = await createMessage({
        teacher: {
          teacherId: payload.teacher.teacherId,
          teacherName: payload.teacher?.teacherName || "",
          teacherEmail: payload.teacher?.teacherEmail || "",
        },
        student: {
          studentId: payload.student.studentId,
          studentFirstName: payload.student?.studentFirstName || "",
          studentLastName: payload.student?.studentLastName || "",
          studentEmail: payload.student?.studentEmail || "",
        },
        attachmentsType: payload.attachmentstype?.map((attachment) => ({
          fileName: attachment.fileName || "",
          fileType: attachment.fileType || "",
          fileUrl: attachment.fileUrl || "",
        })) || [],
        sender: payload.sender || "",
        receiver: payload.receiver || "",
        group: groupsWithIds, // Updated group with groupId
        status: payload.status || "",
        createdDate: new Date(),
        createdBy: payload.createdBy || "system",
        updatedDate: new Date(),
        updatedBy: payload.updatedBy || "system",
        roomId, // Set the deterministic roomId
        timeZone: payload.timeZone || "",
        message: payload.message || "",
        
      });
  
      console.log(">> Created Message:", result);
  
      return h.response({ message: "Message created successfully", roomId }).code(201);
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        return h.response({ error: "Invalid input", details: error.errors }).code(400);
      }
      return h.response({ error: "Internal server error" }).code(500);
    }
  }
,  




  async createStudentMessageList(req: Request, h: ResponseToolkit) {
    try {
      // Parse and validate the query object
      const { query } = getAllStudentInput.parse({
        query: {
          ...req.query,
          filterValues: req.query?.filterValues
            ? JSON.parse(req.query.filterValues as string)
            : {},
        },
      });
  
      return createStudentMessageList(query); // Ensure a valid return statement in the try block
    } catch (error) {
      // Handle the error appropriately
      console.error("Error in getClassesForStudent handler:", error);
      throw error; // Re-throw the error or handle it based on your application's requirement
    }
  }
  ,

  async createTeacherMessageList(req: Request, h: ResponseToolkit) {
    try {
      // Parse and validate the query object
      const { query } = getAllStudentInput.parse({
        query: {
          ...req.query,
          filterValues: req.query?.filterValues
            ? JSON.parse(req.query.filterValues as string)
            : {},
        },
      });
  
      return createTeacherMessageList(query); // Ensure a valid return statement in the try block
    } catch (error) {
      // Handle the error appropriately
      console.error("Error in getClassesForStudent handler:", error);
      throw error; // Re-throw the error or handle it based on your application's requirement
}
},

/////////////////////////////////SUPERVISOR/////////////////////////////////
async createSupervisorMessage(req: Request, h: ResponseToolkit) {
  try {
    const { payload } = createMessageValidation.parse({ payload: req.payload });

    // Ensure studentId and teacherId exist
    if (!payload.supervisor?.supervisorId || !payload.teacher?.teacherId) {
      return h.response({ error: "Both studentId and teacherId are required" }).code(400);
    }

    // Generate a deterministic roomId based on studentId and teacherId
    const supervisorId = payload.supervisor.supervisorId;
    const teacherId = payload.teacher.teacherId;
    const roomId = crypto.createHash("sha256").update(supervisorId + teacherId).digest("hex");

    // Create a map for groupName to groupId
    const groupMap = new Map<string, string>();

    // Map over the groups and generate groupId for each group
    const groupsWithIds =
      payload.group?.map((groupItem) => {
        // Check if groupId already exists in the map
        let groupId = groupMap.get(groupItem.groupName);

        // If groupId doesn't exist, generate one and store it in the map
        if (!groupId) {
          groupId = crypto.createHash("sha256").update(groupItem.groupName).digest("hex");
          groupMap.set(groupItem.groupName, groupId); // Store the groupId for future use
        }

        return {
          groupId, // Use the same groupId for all students in the group
          groupName: groupItem.groupName || "",
          members:
            groupItem.members?.map((member) => ({
              userId: member?.userId || "",
              userName: member?.userName || "",
            })) || [],
        };
      }) || [];

    // Construct the message object with separate roomId and groupId
    const result = await createSupervisorMessage({
      teacher: {
        teacherId: payload.teacher.teacherId,
        teacherName: payload.teacher?.teacherName || "",
        teacherEmail: payload.teacher?.teacherEmail || "",
      },
      supervisor: {
        supervisorId: payload.supervisor.supervisorId,
        supervisorFirstName: payload.supervisor?.supervisorFirstName || "",
        supervisorLastName: payload.supervisor?.supervisorLastName || "",
        supervisorEmail: payload.supervisor?.supervisorEmail || "",
      },
      attachmentsType: payload.attachmentstype?.map((attachment) => ({
        fileName: attachment.fileName || "",
        fileType: attachment.fileType || "",
        fileUrl: attachment.fileUrl || "",
      })) || [],
      sender: payload.sender || "",
      receiver: payload.receiver || "",
      group: groupsWithIds, // Updated group with groupId
      status: payload.status || "",
      createdDate: new Date(),
      createdBy: payload.createdBy || "system",
      updatedDate: new Date(),
      updatedBy: payload.updatedBy || "system",
      roomId, // Set the deterministic roomId
      timeZone: payload.timeZone || "",
      message: payload.message || "",
      
    });

    console.log(">> Created Message:", result);

    return h.response({ message: "Message created successfully", roomId }).code(201);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return h.response({ error: "Invalid input", details: error.errors }).code(400);
    }
    return h.response({ error: "Internal server error" }).code(500);
  }
}
,  


async createSupervisorMessageList(req: Request, h: ResponseToolkit) {
  try {
    // Parse and validate the query object
    const { query } = getAllStudentInput.parse({
      query: {
        ...req.query,
        filterValues: req.query?.filterValues
          ? JSON.parse(req.query.filterValues as string)
          : {},
      },
    });

    return createSupervisorMessageList(query); // Ensure a valid return statement in the try block
  } catch (error) {
    // Handle the error appropriately
    console.error("Error in getClassesForStudent handler:", error);
    throw error; // Re-throw the error or handle it based on your application's requirement
  }
}
,

async createGetTeacherMessageList(req: Request, h: ResponseToolkit) {
  try {
    // Parse and validate the query object
    const { query } = getAllStudentInput.parse({
      query: {
        ...req.query,
        filterValues: req.query?.filterValues
          ? JSON.parse(req.query.filterValues as string)
          : {},
      },
    });

    return createGetTeacherMessageList(query); // Ensure a valid return statement in the try block
  } catch (error) {
    // Handle the error appropriately
    console.error("Error in getClassesForStudent handler:", error);
    throw error; // Re-throw the error or handle it based on your application's requirement
}
},

};
