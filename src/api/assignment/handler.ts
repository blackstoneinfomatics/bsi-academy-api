import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import {
  createAssignment,
  createAssignmentforGroup,
  getAssignmentByObjectId,
  getAssignmentForStudentId,
  getAssignmentRecords,
  getAssignments,
  getStudentCardCount,
  getTeacherStudentsAssignmentCount,
  updateAssignmentsAnswer,
} from "../../operations/assignments"; // Replace with your service logic
import * as Stream from "stream";
import { isNil } from "lodash";
import { badRequest, notFound } from "@hapi/boom";
import mongoose from "mongoose"; // make sure this is at the top
import { IAssignment } from "../../../types/models.types";
import { assignemntMessages } from "../../config/messages";
import assignments from "../../models/assignments";
import {
  zodGetAllUserRecordsQuerySchema,
  zodGetAssignmentList,
} from "../../shared/zod_schema_validation";
import {
  GetAllAssignmentRecordsParams,
  GetAlluserRecordsParams,
} from "../../shared/enum";
import { Readable } from "stream";

// Input Validations for student list
const getAssignmnentListInputValidation = z.object({
  query: z.object({
    studentId: z.string().optional(),
    studentName: z.string().optional(),
    sessionClassType: z.string().optional(),
    assignmentId: z.string().optional(),
    assignmentName: z.string().optional(),
    questionName: z.string().optional(),
    title: z.string().optional(),
    questionType: z.string().optional(),
    typeofQuestion: z.string().optional(),
    assignedTeacher: z.string().optional(),
    assignmentType: z.object({
      type: z.string(), // Ensure type is required
      name: z.string(), // Ensure name is required
    }),
    chooseType: z.boolean().optional(),
    trueorfalseType: z.boolean().optional(),
    question: z.string().optional(),
    hasOptions: z.boolean().optional(),
    options: z
      .object({
        optionOne: z.string().optional(),
        optionTwo: z.string().optional(),
        optionThree: z.string().optional(),
        optionFour: z.string().optional(),
      })
      .optional(),
    status: z.string().optional(),
    createdDate: z.date().optional(),
    createdBy: z.string().optional(),
    updatedDate: z.date().optional(),
    updatedBy: z.string().optional(),
    level: z.string().optional(),
    courses: z.string().optional(),
    assignedDate: z.date().optional(),
    dueDate: z.date().optional(),
    answer: z.string().optional(),
    answerValidation: z.string().optional(),
    assignmentStatus: z.string().optional(),
  }),
});

let getAssignmentInputValidation = z.object({
  query: zodGetAssignmentList.pick({
    studentId: true,
    assignmentId: true,
  }),
});

// Helper function to convert a readable stream to a buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on("error", (err: any) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Helper function to safely parse JSON
function parseJSONSafe(input: any): any {
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch (error) {
      console.error("Invalid JSON string:", input, error);
      return null;
    }
  }
  return input;
}
const processFileBuffer = async (file: any): Promise<Buffer | undefined> => {
  if (file instanceof Stream.Readable) {
    return await streamToBuffer(file);
  } else if (typeof file === "string") {
    return Buffer.from(file, "base64");
  }
  return undefined;
};

export default {
  // Handler for creating assignments

  async createAssignment(req: Request, h: ResponseToolkit) {
    try {
      console.log("🚀 Handler triggered: createAssignment");

      const payload = req.payload as any;

      console.log("📥 Raw payload received:", payload);
      const assignmentCount = await assignments.countDocuments({
        studentId: payload.studentId,
      });
      const nextIdNumber = assignmentCount + 1;
      // 🔧 Step 1: Reconstruct nested assignment array from flat form keys
      function reconstructAssignments(flat: Record<string, any>): any[] {
        const assignments: any[] = [];
        const shared: Record<string, any> = {};

        for (const key in flat) {
          const match = key.match(/^assignments\[(\d+)]\[(.+)]$/);
          if (match) {
            const index = parseInt(match[1], 10);
            const field = match[2];

            assignments[index] = assignments[index] || {};
            assignments[index][field] = flat[key];
          } else {
            shared[key] = flat[key];
          }
        }

        return assignments.map((a) => ({
          ...shared,
          ...a,
        }));
      }

      const rawPayloadArray = reconstructAssignments(payload);
      console.log("📦 Normalized payload array:", rawPayloadArray);

      if (!rawPayloadArray.length) {
        return h
          .response({ error: "Payload must be a non-empty array" })
          .code(400);
      }

      const {
        studentId,
        studentName,
        title,
        course,
        level,
        sessionClassType,
        assignedTeacherId,
        assignedTeacher,
      } = rawPayloadArray[0];

      console.log("🔍 Extracted shared fields:", {
        studentId,
        studentName,
        title,
        sessionClassType,
        assignedTeacherId,
        assignedTeacher,
      });
      // ✅ Generate assignmentId here (for this one group of questions)
     
      const sharedAssignmentId = `REG-ASS-${String(Math.floor(1 + Math.random() * 99)).padStart(2, '0')}`;

      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return h.response({ error: "Invalid studentId" }).code(400);
      }

      const preparedAssignments = [];

      for (const [index, rawPayload] of rawPayloadArray.entries()) {
        console.log(`\n🔄 Processing assignment at index ${index}`);
        console.log("📦 Raw assignment payload:", rawPayload);
        console.log(
          "🧩 Raw assignmentType value at index",
          index,
          ":",
          rawPayload.assignmentType
        );

        // 🔹 Assignment Type
        let assignmentType: IAssignment["assignmentType"];
        try {
          const parsedType =
            typeof rawPayload.assignmentType === "string"
              ? JSON.parse(rawPayload.assignmentType)
              : rawPayload.assignmentType;

          console.log("🧩 Parsed assignmentType:", parsedType);

          if (
            !parsedType ||
            typeof parsedType !== "object" ||
            ![
              "quiz",
              "writing",
              "reading",
              "image identification",
              "word match",
              "reading comprehension",
            ].includes(parsedType.type)
          ) {
            console.error(
              "❌ Invalid assignmentType at index",
              index,
              parsedType
            );
            return h.response({ error: "Invalid assignmentType" }).code(400);
          }

          assignmentType = {
            type: parsedType.type,
            name: parsedType.name || "",
          };
          console.log("✅ Final assignmentType:", assignmentType);
        } catch (err) {
          console.error("❌ Error parsing assignmentType:", err);
          return h
            .response({ error: "Failed to parse assignmentType" })
            .code(400);
        }
        // Parse and process payload fields
        const chooseType =
          rawPayload.chooseType === "true" || rawPayload.chooseType === true;
        const trueorfalseType =
          rawPayload.trueorfalseType === "true" ||
          rawPayload.trueorfalseType === true;

        // 🔹 Options
        let options = {
          optionOne: "",
          optionTwo: "",
          optionThree: "",
          optionFour: "",
        };
        try {
          const parsedOptions =
            typeof rawPayload.options === "string"
              ? JSON.parse(rawPayload.options)
              : rawPayload.options || {};

          options = {
            optionOne: parsedOptions.optionOne || "",
            optionTwo: parsedOptions.optionTwo || "",
            optionThree: parsedOptions.optionThree || "",
            optionFour: parsedOptions.optionFour || "",
          };
          console.log("📝 Parsed options:", options);
        } catch (err) {
          console.error("❌ Error parsing options:", err);
          return h.response({ error: "Failed to parse options" }).code(400);
        }

        // 🔹 File Processing
        const audioFileBuffer = rawPayload.audioFile
          ? await streamToBuffer(rawPayload.audioFile)
          : null;
        const uploadFileBuffer = rawPayload.uploadFile
          ? await streamToBuffer(rawPayload.uploadFile)
          : null;
        // image Refactor

        // 🔹 Image Upload Processing (refactored)
        let uploadFileBufferNew: Buffer | null = null;
        if (rawPayload.uploadFile) {
          try {
            if (typeof rawPayload.uploadFile._data === "object") {
              // Case: Hapi stream upload (from multipart/form)
              uploadFileBufferNew = rawPayload.uploadFile._data;
            } else if (rawPayload.uploadFile instanceof Buffer) {
              // Case: Already a Buffer
              uploadFileBufferNew = rawPayload.uploadFile;
            } else {
              // Fallback to stream handling
              uploadFileBufferNew = await streamToBuffer(rawPayload.uploadFile);
            }
            console.log(
              "🖼️ Image file processed, size:",
              uploadFileBufferNew != null ? uploadFileBufferNew.length : 0
            );
          } catch (err) {
            console.error("❌ Failed to process uploaded image:", err);
            return h.response({ error: "Image file upload failed" }).code(400);
          }
        }

        // 🔹 Final Assignment Object
        const newAssignment = {
          assignmentName: rawPayload.assignmentName || "",
          assignmentType,
          questionName: rawPayload.questionName || "",
          questionType: rawPayload.questionType || "",
          typeofQuestion: rawPayload.typeofQuestion || "",
          question: rawPayload.question || "",
          hasOptions: rawPayload.hasOptions,
          options,
          trueorfalseType,
          chooseType,
          status: rawPayload.status,
          createdDate: rawPayload.createdDate
            ? new Date(rawPayload.createdDate)
            : new Date(),
          createdBy: rawPayload.createdBy || "System",
          updatedDate: rawPayload.updatedDate
            ? new Date(rawPayload.updatedDate)
            : new Date(),
          updatedBy: rawPayload.updatedBy || "",
          level: rawPayload.level || "",
          courses: rawPayload.courses || "",
          assignedDate: rawPayload.assignedDate
            ? new Date(rawPayload.assignedDate)
            : new Date(),
          dueDate: rawPayload.dueDate
            ? new Date(rawPayload.dueDate)
            : new Date(),
          answer: "",
          answerValidation: rawPayload.answerValidation || "",
          assignmentStatus: rawPayload.assignmentStatus || "",
          audioFile: audioFileBuffer || undefined,
          uploadFile: uploadFileBufferNew || undefined,
          score: 0,
          rating: "",
        };
        console.log("📌 Prepared assignment object:", newAssignment);

        preparedAssignments.push(newAssignment);
      }

      // 🔗 Add Shared Fields
      const finalAssignments = preparedAssignments.map((item) => ({
        ...item,
        studentId,
        assignmentId: sharedAssignmentId, // ✅ same ID for all
        studentName: studentName || "",
        sessionClassType: sessionClassType || "",
        assignedTeacherId: assignedTeacherId || "",
        assignedTeacher: assignedTeacher || "",
        title: title || "",
        level: level || "",
        course: course || "",
      }));
      console.log("✅ Final assignment payload ready:", finalAssignments);

      // 💾 Insert into DB
      const result = await createAssignment(finalAssignments);
      console.log("✅ Final result from createAssignment:", result);

      return h.response(result).code(200);
    } catch (error) {
      console.error("❌ Internal server error:", error);
      return h.response({ error: "Internal server error" }).code(500);
    }
  },

  //Group Assignment
  async createGroupAssignment(req: Request, h: ResponseToolkit) {
    try {
      console.log("🚀 Handler triggered: createAssignment");

      const payload = req.payload as any;
      console.log("📥 Raw payload received:", payload);

      // Group assignment ID in format GRP-ASS-01
      const groupAssignmentId = payload.groupAssignmentId || `GRP-ASS-${String(Math.floor(1 + Math.random() * 99)).padStart(2, '0')}`;
      

      // ✅ Parse and validate students list BEFORE reconstructing
      let studentsList: { studentId: string; studentName: string }[] = [];
      try {
        studentsList = JSON.parse(payload.students);
        if (!Array.isArray(studentsList)) {
          throw new Error("Students must be an array");
        }
        // Validate each student has required fields
        studentsList.forEach((student) => {
          if (!student.studentId || !student.studentName) {
            throw new Error("Each student must have studentId and studentName");
          }
        });
      } catch (err) {
        console.error("❌ Failed to parse students array:", err);
        return h
          .response({ error: "Invalid students format: ", err })
          .code(400);
      }

      // 🔧 Step 1: Reconstruct nested assignment array from flat form keys
      function reconstructAssignments(flat: Record<string, any>): any[] {
        const assignments: any[] = [];
        const shared: Record<string, any> = {};

        for (const key in flat) {
          const match = key.match(/^assignments\[(\d+)]\[(.+)]$/);
          if (match) {
            const index = parseInt(match[1], 10);
            const field = match[2];
            assignments[index] = assignments[index] || {};
            assignments[index][field] = flat[key];
          } else if (key !== "students") {
            // Explicitly exclude students from shared
            shared[key] = flat[key];
          }
        }

        return assignments.map((a) => ({
          ...shared,
          ...a,
        }));
      }

      const rawPayloadArray = reconstructAssignments(payload);
      console.log("📦 Normalized payload array:", rawPayloadArray);

      if (!rawPayloadArray.length) {
        return h
          .response({ error: "Payload must be a non-empty array" })
          .code(400);
      }

      // 🔄 Extract shared metadata for assignment from the first entry
      const {
        title,
        course,
        level,
        sessionClassType,
        assignedTeacherId,
        assignedTeacher,
        groupId,
      } = rawPayloadArray[0];

      const preparedAssignments = [];

      for (const [index, rawPayload] of rawPayloadArray.entries()) {
        console.log(`\n🔄 Processing assignment at index ${index}`);
        console.log("📦 Raw assignment payload:", rawPayload);

        // 🔹 Assignment Type
        let assignmentType: IAssignment["assignmentType"];
        try {
          const parsedType =
            typeof rawPayload.assignmentType === "string"
              ? JSON.parse(rawPayload.assignmentType)
              : rawPayload.assignmentType;

          if (
            !parsedType ||
            typeof parsedType !== "object" ||
            ![
              "quiz",
              "writing",
              "reading",
              "image identification",
              "word match",
              "reading comprehension",
            ].includes(parsedType.type)
          ) {
            return h.response({ error: "Invalid assignmentType" }).code(400);
          }

          assignmentType = {
            type: parsedType.type,
            name: parsedType.name || "",
          };
        } catch (err) {
          return h
            .response({ error: "Failed to parse assignmentType" })
            .code(400);
        }

        // 🔹 Options
        let options = {
          optionOne: "",
          optionTwo: "",
          optionThree: "",
          optionFour: "",
        };
        try {
          const parsedOptions =
            typeof rawPayload.options === "string"
              ? JSON.parse(rawPayload.options)
              : rawPayload.options || {};

          options = {
            optionOne: parsedOptions.optionOne || "",
            optionTwo: parsedOptions.optionTwo || "",
            optionThree: parsedOptions.optionThree || "",
            optionFour: parsedOptions.optionFour || "",
          };
        } catch (err) {
          return h.response({ error: "Failed to parse options" }).code(400);
        }

        // 🔹 File Processing
        const audioFileBuffer = rawPayload.audioFile
          ? await streamToBuffer(rawPayload.audioFile)
          : null;

        let uploadFileBufferNew: Buffer | null = null;
        if (rawPayload.uploadFile) {
          try {
            if (typeof rawPayload.uploadFile._data === "object") {
              uploadFileBufferNew = rawPayload.uploadFile._data;
            } else if (rawPayload.uploadFile instanceof Buffer) {
              uploadFileBufferNew = rawPayload.uploadFile;
            } else {
              uploadFileBufferNew = await streamToBuffer(rawPayload.uploadFile);
            }
          } catch (err) {
            return h.response({ error: "Image file upload failed" }).code(400);
          }
        }

        const newAssignment = {
          assignmentName: rawPayload.assignmentName || "",
          assignmentType,
          questionName: rawPayload.questionName || "",
          questionType: rawPayload.questionType || "",
          typeofQuestion: rawPayload.typeofQuestion || "",
          question: rawPayload.question || "",
          hasOptions: rawPayload.hasOptions,
          options,
          trueorfalseType:
            rawPayload.trueorfalseType === "true" ||
            rawPayload.trueorfalseType === true,
          chooseType:
            rawPayload.chooseType === "true" || rawPayload.chooseType === true,
          status: rawPayload.status,
          createdDate: rawPayload.createdDate
            ? new Date(rawPayload.createdDate)
            : new Date(),
          createdBy: rawPayload.createdBy || "System",
          updatedDate: rawPayload.updatedDate
            ? new Date(rawPayload.updatedDate)
            : new Date(),
          updatedBy: rawPayload.updatedBy || "",
          level: rawPayload.level || "",
          courses: rawPayload.courses || "",
          assignedDate: rawPayload.assignedDate
            ? new Date(rawPayload.assignedDate)
            : new Date(),
          dueDate: rawPayload.dueDate
            ? new Date(rawPayload.dueDate)
            : new Date(),
          answer: "",
          answerValidation: rawPayload.answerValidation || "",
          assignmentStatus: rawPayload.assignmentStatus || "",
          audioFile: audioFileBuffer || undefined,
          uploadFile: uploadFileBufferNew || undefined,
          score: 0,
          rating: "",
        };

        preparedAssignments.push(newAssignment);
      }

      // ✅ Generate assignment copies per student
      const allStudentAssignments = [];

      for (const student of studentsList) {
        const { studentId, studentName } = student;

        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
          console.warn("⚠️ Skipping invalid studentId:", studentId);
          continue;
        }


        const studentAssignments = preparedAssignments.map((item) => ({
          ...item,
          studentId,
          studentName,
          assignmentId: groupAssignmentId,
          groupId,
          sessionClassType: sessionClassType || "",
          assignedTeacherId: assignedTeacherId || "",
          assignedTeacher: assignedTeacher || "",
          title: title || "",
          level: level || "",
          course: course || "",
        }));

        allStudentAssignments.push(...studentAssignments);
      }

      if (!allStudentAssignments.length) {
        return h
          .response({ error: "No valid assignments generated" })
          .code(400);
      }

      const result = await createAssignmentforGroup(allStudentAssignments);
      console.log("✅ Final result from createAssignment:", result);

      return h.response(result).code(200);
    } catch (error) {
      console.error("❌ Internal server error:", error);
      return h.response({ error: "Internal server error" }).code(500);
    }
  },

  async getAssignmentsByStudentId(req: Request, h: ResponseToolkit) {
    const { assignmentId, _id } = req.query;

    // Clean and validate parameters
    const cleanAssignmentId = assignmentId?.toString().trim();
    const cleanId = _id?.toString().trim();

    try {
      const results = await getAssignments({
        assignmentId: cleanAssignmentId,
        _id: cleanId,
      });

      if (results.length === 0) {
        return h
          .response({
            status: "not_found",
            message: "No assignments found",
            query: {
              assignmentId: cleanAssignmentId,
              _id: cleanId,
              note: "Query was executed but returned empty results",
            },
          })
          .code(404);
      }

      return h
        .response({
          status: "success",
          count: results.length,
          data: results,
        })
        .code(200);
    } catch (error: any) {
      console.error("Database error:", error);
      return h
        .response({
          status: "error",
          message: error.message,
          details: {
            receivedQuery: {
              assignmentId: assignmentId?.toString(),
              _id: _id?.toString(),
            },
            cleanedQuery: {
              assignmentId: cleanAssignmentId,
              _id: cleanId,
            },
          },
        })
        .code(400);
    }
  },

  async getByStudentId(req: Request, h: ResponseToolkit) {
    const { studentId } = req.query;

    const cleanStudentId = studentId?.toString().trim();

    if (!cleanStudentId) {
      return h
        .response({
          status: "error",
          message: "studentId is required",
        })
        .code(400);
    }

    try {
      const results = await getAssignmentForStudentId({
        studentId: cleanStudentId,
      });

      if (results.length === 0) {
        return h
          .response({
            status: "not_found",
            message: "No assignments found for the given studentId",
            studentId: cleanStudentId,
          })
          .code(404);
      }

      return h
        .response({
          status: "success",
          count: results.length,
          data: results,
        })
        .code(200);
    } catch (error: any) {
      console.error("Database error:", error);
      return h
        .response({
          status: "error",
          message: error.message,
          studentId: cleanStudentId,
        })
        .code(400);
    }
  },

  async getStudentCount(req: Request, h: ResponseToolkit) {
    const { studentId } = req.query;
    const cleanStudentId = studentId?.toString().trim();

    if (!cleanStudentId) {
      return h
        .response({
          status: "error",
          message: "studentId is required",
        })
        .code(400);
    }

    try {
      const results = await getStudentCardCount({ studentId: cleanStudentId });

      return h
        .response({
          status: "success",
          data: results,
        })
        .code(200);
    } catch (error: any) {
      console.error("Database error:", error);
      return h
        .response({
          status: "error",
          message: error.message,
          studentId: cleanStudentId,
        })
        .code(400);
    }
  },

  //getbyObjectId

  async getByObjectId(req: Request, h: ResponseToolkit) {
    const id = req.params.id; // ✅ This will now work
    const result = await getAssignmentByObjectId(String(id));

    if (isNil(result)) {
      return notFound(assignemntMessages.USER_NOT_FOUND);
    }

    return result;
  },

  //  Update an Assignment
  async bulkUpdateAssignments(req: Request, h: ResponseToolkit) {
    try {
      const { assignmentId } = req.query as { assignmentId: string };
      const payloadAnswers = req.payload as {
        _id: string;
        answer: string;
        updatedBy: string;
      }[];

      if (!assignmentId) {
        return h
          .response({ error: "assignmentId query param is required" })
          .code(400);
      }

      if (!Array.isArray(payloadAnswers) || payloadAnswers.length === 0) {
        return h
          .response({ error: "Payload must be a non-empty array" })
          .code(400);
      }

      const result = await updateAssignmentsAnswer(
        assignmentId,
        payloadAnswers
      );

      return h.response(result).code(200);
    } catch (error) {
      console.error("Error in bulk assignment update:", error);
      return h.response({ error: "Internal Server Error" }).code(500);
    }
  },

  async getTeacherStudentAssignmentCount(req: Request, h: ResponseToolkit) {
    const { teacherId } = req.query;
    const cleanTeacherId = teacherId?.toString().trim();

    if (!cleanTeacherId) {
      return h
        .response({
          status: "error",
          message: "teacherId is required",
        })
        .code(400);
    }

    try {
      const results = await getTeacherStudentsAssignmentCount({
        teacherId: cleanTeacherId,
      });

      return h
        .response({
          status: "success",
          data: results,
        })
        .code(200);
    } catch (error: any) {
      console.error("Database error:", error);
      return h
        .response({
          status: "error",
          message: error.message,
          teacherId: cleanTeacherId,
        })
        .code(400);
    }
  },

  async getAssignmentQuestionList(req: Request, h: ResponseToolkit) {
    try {
      // Parse and validate the query parameters
      const { query } = getAssignmentInputValidation.parse({
        query: req.query,
      });

      const { studentId, assignmentId } = query;
      // Build the filter object
      const filter: GetAllAssignmentRecordsParams = {
        studentId,
        assignmentId,
      };
      if (studentId) {
        filter.studentId = studentId;
      }
      if (assignmentId) {
        filter.assignmentId = assignmentId;
      }

      // Fetch user records using the filter
      const result = await getAssignmentRecords(filter);

      return result;
    } catch (error) {
      console.error("Validation Error:", error);
      return badRequest("Validation error: ");
    }
  },
};
