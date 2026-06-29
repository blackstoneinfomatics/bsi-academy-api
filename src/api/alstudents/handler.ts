// Handler object
import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import {
  createAlStudent,
  getAllalstudentsList,
  getalstudentsById,
  getStudentCountriesCount,
  getStudentlevel,
  getStudentPercentage,
  getStudentRecordCount,
  updateStudent,
} from "../../operations/alstudents";
import { alstudentsMessages } from "../../config/messages";
import { isNil } from "lodash";
import { zodAlStudentSchema } from "../../models/alstudents";
import EvaluationModel from "../../models/evaluation";
import { Readable } from "stream";

// Input validation schema
const getAllalstudentsListInputValidation = z.object({
  query: zodGetAllRecordsQuerySchema.pick({
    academicCoachId:true,
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    studentId: true,
    filterValues: true,
  }),
});

// Input Validation for Create a User
const createInputValidation = z.object({
  payload: zodAlStudentSchema.pick({
    student: true,
    username: true,
    role: true,
    profilepic: true,
  }),
});

// Convert a Readable stream into a Buffer
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


// Handler object
const handler = {
  // Handler for getting all students
  async getAllalstudentsList(req: Request, h: ResponseToolkit) {
  try {
    // Parse and validate the request query using zod
    const parsedQuery = getAllalstudentsListInputValidation.parse({
      query: {
        ...req.query,
        filterValues: (() => {
          try {
            return req.query?.filterValues
              ? JSON.parse(req.query.filterValues as string)
              : {};
          } catch {
            throw new Error("Invalid filterValues JSON format.");
          }
        })(),
      },
    });

    const query = parsedQuery.query;

    // Call service
    const result = await getAllalstudentsList(query);

    return h.response(result).code(200);

  } catch (error) {
    return h.response({ error }).code(400);
  }
}
,

  // Handler for getting student by ID
  async getalstudentsById(req: Request, h: ResponseToolkit) {
    try {
      // Extract student ID from request params
      const studentId = String(req.params.alstudentsId);
      console.log("Fetching Student ID:", studentId);

      // Fetch student details asynchronously
      const studentDetailsPromise = getalstudentsById(studentId);
      const studentDetails = await studentDetailsPromise;

      // Handle not found case
      if (isNil(studentDetails)) {
        return h
          .response({ message: alstudentsMessages.ALFURQANSTUDENTS_NOT_FOUND })
          .code(404);
      }

      console.log("Found Student Details:", studentDetails);

      // Fetch student evaluation details asynchronously
      const studentEvaluationDetailsPromise = EvaluationModel.findOne({
        "student.studentId": studentDetails?.student?.studentId,
      }).lean();
      const studentEvaluationDetails = await studentEvaluationDetailsPromise;

      console.log("Student Evaluation Details:", studentEvaluationDetails);

      // Return the found student details
      return h.response({ studentDetails, studentEvaluationDetails }).code(200);
    } catch (error) {
      console.error("Error fetching student:", error);

      return h.response({ message: "Internal Server Error", error }).code(500);
    }
  },

  async createStudentPortal(req: Request, h: ResponseToolkit) {
    // Create a new user
    const { payload } = createInputValidation.parse({
      payload: req.payload,
    });

    //const hashedPassword = await hashPassword(decryptPassword(password));

    return createAlStudent({
      student: {
        studentId: payload.student?.studentId || "",
        studentEmail: payload.student?.studentEmail || "",
        studentPhone: payload.student?.studentPhone || 0,
        gender: payload.student.gender || "",
      },
      username: payload.username || " ",
      role: payload.role || " ",
    });
  },

  async getAllStudentCount(req: Request, h: ResponseToolkit) {
    return getStudentRecordCount();
  },

  async getStudentGenderCount(req: Request, h: ResponseToolkit) {
    return getStudentPercentage();
  },
  async getStudentCountryCount(req: Request, h: ResponseToolkit) {
    return getStudentCountriesCount();
  },
  async getStudentlevel(req: Request, h: ResponseToolkit) {
    const studentId = req.query.studentId; // if it's in the query
    if (!studentId) {
      return h.response({ error: "Student ID is required" }).code(400);
    }

    return getStudentlevel(studentId);
  },


  async updateStudentProfile(req: Request, h: ResponseToolkit) {
    try {
      const studentId = req.params.id; // get _id from URL
      if (!studentId) {
        return h.response({ error: "_id is required in URL" }).code(400);
      }

      const payload = req.payload as any;
      console.log('Received payload keys:', Object.keys(payload));

      // Handle student data from form fields with brackets notation
      let studentData: any = {};
      
      // Map form fields to student object
      Object.keys(payload).forEach(key => {
        // Match pattern like student[fieldName]
        const match = key.match(/^student\[(.*?)\]$/);
        if (match) {
          const fieldName = match[1];
          studentData[fieldName] = payload[key];
        }
      });

      // If no nested fields found, try parsing as JSON string
      if (Object.keys(studentData).length === 0 && payload.student) {
        if (typeof payload.student === "string") {
          try {
            studentData = JSON.parse(payload.student);
          } catch (error) {
            return h.response({ error: "Invalid student data format" }).code(400);
          }
        } else {
          studentData = payload.student;
        }
      }

      // Handle profile picture
      let uploadFileBuffer: Buffer | undefined;
      if (payload.profilepic) {
        if (payload.profilepic._data) {
          // Handle stream data from multipart
          uploadFileBuffer = await streamToBuffer(payload.profilepic);
        } else if (Buffer.isBuffer(payload.profilepic)) {
          uploadFileBuffer = payload.profilepic;
        } else if (typeof payload.profilepic === "string") {
          try {
            uploadFileBuffer = Buffer.from(payload.profilepic, "base64");
          } catch (error) {
            return h.response({ error: "Invalid profile picture format" }).code(400);
          }
        }
      }
      // 🔹 Update student
      const result = await updateStudent({
        _id: studentId,
        student: {
          studentId: studentData.studentId || "",
          studentEmail: studentData.studentEmail || "",
          studentPhone: studentData.studentPhone || 0,
          course: studentData.course || "",
          package: studentData.package || "",
          city: studentData.city || "",
          country: studentData.country || "",
          gender: studentData.gender || "",
        },
        username: payload.username || " ",
        role: payload.role || " ",
        profilepic: uploadFileBuffer,
        updatedDate: new Date(),
      });

      if (!result) {
        return h.response({ error: "Student not found" }).code(404);
      }

      return h.response(result).code(200);
    } catch (error: any) {
      console.error("Error updating student profile:", error);
      return h.response({ error: error.message }).code(500);
    }
  },
};

export { handler };
