import { IAssignment, IAssignmentCreate } from "../../types/models.types";
import assignment from "../models/assignments";
import alstudents from "../models/alstudents";
import { Types } from "mongoose";
import Stream from "stream";
import assignments from "../models/assignments";
import { GetAllAssignmentRecordsParams } from "../shared/enum";
import classShedule from "../models/classShedule";
import { group } from "console";

interface AssignmentQuery {
  assignmentId?: string;
  _id?: string;
}

interface IAssignmentUpdatePayload {
  _id: string;
  answer: string;
  answerValidation: string;
  updatedBy?: string;
}
/**
 * Creates a new assignment record in the database.
 * @param {IAssignmentCreate} payload - The data required to create a new assignment record.
 * @returns {Promise<{ totalCount: number; assignments: IAssignmentCreate[] } | { error: any }>}
 */



// Type for options
type AssignmentOptions = {
  optionOne: string;
  optionTwo: string;
  optionThree: string;
  optionFour: string;
};

export const createAssignment = async (
  payload: Partial<IAssignment>[]
): Promise<
  { totalCount: number; assignments: IAssignment[] } | { error: any }
> => {
  try {
    console.log("🚀 createAssignment triggered");
    console.log("📥 Raw payload received:", payload);

    if (!payload || payload.length === 0) {
      console.error("❌ Payload is empty");
      return { error: "Payload is empty" };
    }

    const assignmentRecords: Partial<IAssignment>[] = [];
    const allowedTypes = [
      "quiz",
      "writing",
      "reading",
      "image identification",
      "word match",
      "reading comprehension",
    ];
    console.log("✅ Allowed types:", allowedTypes);

    for (const [index, item] of payload.entries()) {
      console.log(`\n🔄 Processing assignment index: ${index}`);
      console.log("📦 Full item:", item);

      if (!item.studentId) {
        console.warn("⚠️ Skipping record due to missing studentId");
        continue;
      }

      console.log("🔍 Finding student by ID:", item.studentId);
      const studentDetails = await alstudents.findById(item.studentId).exec();
      if (!studentDetails) {
        console.warn("⚠️ Invalid studentId:", item.studentId);
        continue;
      }

      const studentId = studentDetails._id.toString();
      const studentName = studentDetails.username || "";
      const sessionClassType = studentDetails.sessionClassType || "";
      const level = studentDetails.level || "";
      const course = studentDetails.student.course || "";
      console.log("✅ Student found:", {
        studentId,
        studentName,
        sessionClassType,
        level,
        course,
      });

      console.log("🔍 Finding student by ID:", item.studentId);

      const assignedTeacher = item.assignedTeacher;
      const assignedTeacherId = item.assignedTeacherId;

      console.log("👩‍🏫 Assigned Teacher:", {
        assignedTeacher,
        assignedTeacherId,
      });

      const assignmentType = item.assignmentType;
      console.log("🧩 assignmentType object:", assignmentType);
      console.log("🔍 assignmentType.type:", assignmentType?.type);

      if (!assignmentType || !allowedTypes.includes(assignmentType.type)) {
        console.warn(
          `⚠️ Invalid assignmentType at index ${index}:`,
          assignmentType
        );
        continue;
      }

      const parsedOptions: AssignmentOptions = {
        optionOne: item.options?.optionOne || "",
        optionTwo: item.options?.optionTwo || "",
        optionThree: item.options?.optionThree || "",
        optionFour: item.options?.optionFour || "",
      };
      console.log("📝 Parsed options:", parsedOptions);

      const newAssignment: Partial<IAssignment> = {
        studentId,
        studentName,
        sessionClassType,
        course,
        level,
        assignmentId: item.assignmentId,
        title: item.title || "",
        assignmentName: item.assignmentName || "",
        questionName: item.questionName || "",
        questionType: item.questionType || "",
        typeofQuestion: item.typeofQuestion || "",
        assignedTeacher,
        assignedTeacherId, // ✅ Now this is just a string
        assignmentType,
        chooseType: item.chooseType === true,
        trueorfalseType: item.trueorfalseType === true,
        question: item.question || "",
        hasOptions: item.hasOptions || false,
        options: parsedOptions,
        audioFile: item.audioFile,
        uploadFile: item.uploadFile,
        status: item.status,
        createdDate: new Date(),
        createdBy: item.createdBy || "System",
        updatedDate: new Date(),
        updatedBy: item.updatedBy || "",
        assignedDate: item.assignedDate || new Date(),
        dueDate: item.dueDate || new Date(),
        answer: "",
        answerValidation: item.answerValidation || "",
        assignmentStatus: item.assignmentStatus,
        score: 0,
        rating: "",
      };

      console.log("📌 New assignment record prepared:", newAssignment);
      assignmentRecords.push(newAssignment);
    }

    console.log(
      "🧾 Total valid assignments prepared:",
      assignmentRecords.length
    );
    if (assignmentRecords.length === 0) {
      console.error("❌ No valid assignments to insert");
      return { error: "No valid assignments to insert" };
    }

    console.log("📤 Inserting assignments into DB...");
    const insertedAssignments = await assignment.insertMany(assignmentRecords);
    console.log("✅ Assignments inserted:", insertedAssignments.length);

    const totalCount = await assignment.countDocuments();
    console.log("📊 Total assignment count in DB:", totalCount);

    return { totalCount, assignments: insertedAssignments as IAssignment[] };
  } catch (error) {
    console.error("❌ Error in createAssignment:", error);
    return { error };
  }
};

// //Get All Assignment

// export const getAllAssignment = async (query: {
//   assignmentType: { type: string; name: string };
//   status?: string | undefined;
//   createdDate?: Date | undefined;
//   createdBy?: string | undefined;
//   assignmentName?: string | undefined;
//   assignedTeacher?: string | undefined;
//   chooseType?: boolean | undefined;
//   trueorfalseType?: boolean | undefined;
//   question?: string | undefined;
//   hasOptions?: boolean | undefined;
//   options?:
//     | {
//         optionOne?: string | undefined;
//         optionTwo?: string | undefined;
//         optionThree?: string | undefined;
//         optionFour?: string | undefined;
//       }
//     | undefined;
//   updatedDate?: Date | undefined;
//   updatedBy?: string | undefined;
//   level?: string | undefined;
//   courses?: string | undefined;
//   assignedDate?: Date | undefined;
//   dueDate?: Date | undefined;
// }): Promise<{
//   assignments: Partial<IAssignmentCreate>[];
//   totalCount: number;
// }> => {
//   try {
//     // Fetch the assignments from the database
//     const assignmentsCreate = await assignment.find().lean().exec();

//     // You can either return Partial<IAssignment> directly if you're not worried about the missing properties
//     const assignments: Partial<IallAssignment>[] = assignmentsCreate;

//     // Get the total count of assignments
//     const totalCount = await assignment.countDocuments();

//     return { assignments, totalCount };
//   } catch (error) {
//     console.error("Error fetching assignments:", error);
//     throw new Error("Failed to fetch assignments.");
//   }
// };

export const createAssignmentforGroup = async (
  payload: Partial<IAssignment>[]
): Promise<
  { totalCount: number; assignments: IAssignment[] } | { error: any }
> => {
  try {
    console.log("🚀 createAssignment triggered");
    console.log("📥 Raw payload received:", payload);

    if (!payload || payload.length === 0) {
      console.error("❌ Payload is empty");
      return { error: "Payload is empty" };
    }

    const assignmentRecords: Partial<IAssignment>[] = [];
    const allowedTypes = [
      "quiz",
      "writing",
      "reading",
      "image identification",
      "word match",
      "reading comprehension",
    ];
    console.log("✅ Allowed types:", allowedTypes);

    for (const [index, item] of payload.entries()) {
      console.log(`\n🔄 Processing assignment index: ${index}`);
      console.log("📦 Full item:", item);

      if (!item.studentId) {
        console.warn("⚠️ Skipping record due to missing studentId");
        continue;
      }

      console.log("🔍 Finding student by ID:", item.studentId);
      const studentDetails = await alstudents.findById(item.studentId).exec();
      if (!studentDetails) {
        console.warn("⚠️ Invalid studentId:", item.studentId);
        continue;
      }

      const studentId = studentDetails._id.toString();
      const studentName = studentDetails.username || "";
      const sessionClassType = studentDetails.sessionClassType || "";
      const level = studentDetails.level || "";
      const course = studentDetails.student?.course || "";
      // ✅ Fetch the groupId from classschedule
      console.log(
        "🔍 Finding class schedule to extract groupId for:",
        studentId,
        sessionClassType
      );
      const schedule = await classShedule.findOne({
        "student.studentId": studentId,
        sessionClassType,
      });

      const groupId = schedule?.classLink || "";
      console.log("📛 Found groupId (classLink):", groupId);
      console.log("✅ Student found:", {
        studentId,
        studentName,
        sessionClassType,
        level,
        course,
        groupId,
      });

      console.log("🔍 Finding student by ID:", item.studentId);

      const assignedTeacher = item.assignedTeacher;
      const assignedTeacherId = item.assignedTeacherId;

      console.log("👩‍🏫 Assigned Teacher:", {
        assignedTeacher,
        assignedTeacherId,
      });

      const assignmentType = item.assignmentType;
      console.log("🧩 assignmentType object:", assignmentType);
      console.log("🔍 assignmentType.type:", assignmentType?.type);

      if (!assignmentType || !allowedTypes.includes(assignmentType.type)) {
        console.warn(
          `⚠️ Invalid assignmentType at index ${index}:`,
          assignmentType
        );
        continue;
      }

      const parsedOptions: AssignmentOptions = {
        optionOne: item.options?.optionOne || "",
        optionTwo: item.options?.optionTwo || "",
        optionThree: item.options?.optionThree || "",
        optionFour: item.options?.optionFour || "",
      };
      console.log("📝 Parsed options:", parsedOptions);

      const newAssignment: Partial<IAssignment> = {
        studentId,
        studentName,
        sessionClassType,
        course,
        level,
        groupId,
        assignmentId: item.assignmentId,
        title: item.title || "",
        assignmentName: item.assignmentName || "",
        questionName: item.questionName || "",
        questionType: item.questionType || "",
        typeofQuestion: item.typeofQuestion || "",
        assignedTeacher,
        assignedTeacherId, // ✅ Now this is just a string
        assignmentType,
        chooseType: item.chooseType === true,
        trueorfalseType: item.trueorfalseType === true,
        question: item.question || "",
        hasOptions: item.hasOptions || false,
        options: parsedOptions,
        audioFile: item.audioFile,
        uploadFile: item.uploadFile,
        status: item.status,
        createdDate: new Date(),
        createdBy: item.createdBy || "System",
        updatedDate: new Date(),
        updatedBy: item.updatedBy || "",
        assignedDate: item.assignedDate || new Date(),
        dueDate: item.dueDate || new Date(),
        answer: "",
        answerValidation: item.answerValidation || "",
        assignmentStatus: item.assignmentStatus,
        score: 0,
        rating: "",
      };

      console.log("📌 New assignment record prepared:", newAssignment);
      assignmentRecords.push(newAssignment);
    }

    console.log(
      "🧾 Total valid assignments prepared:",
      assignmentRecords.length
    );
    if (assignmentRecords.length === 0) {
      console.error("❌ No valid assignments to insert");
      return { error: "No valid assignments to insert" };
    }

    console.log("📤 Inserting assignments into DB...");
    const insertedAssignments = await assignment.insertMany(assignmentRecords);
    console.log("✅ Assignments inserted:", insertedAssignments.length);

    const totalCount = await assignment.countDocuments();
    console.log("📊 Total assignment count in DB:", totalCount);

    return { totalCount, assignments: insertedAssignments as IAssignment[] };
  } catch (error) {
    console.error("❌ Error in createAssignment:", error);
    return { error };
  }
};

export const getAssignments = async ({
  assignmentId,
  _id,
}: AssignmentQuery): Promise<IAssignment[]> => {
  if (!assignmentId && !_id) {
    throw new Error("Must provide either assignmentId or _id");
  }

  const query: any = {};

  if (_id) {
    if (!Types.ObjectId.isValid(_id)) {
      throw new Error("Invalid _id format");
    }
    query._id = new Types.ObjectId(_id);
  }

  if (assignmentId) {
    // Exact match with string trimming
    query.assignmentId = assignmentId.trim();
  }

  console.log("Final query:", JSON.stringify(query)); // Debug log

  return await assignments
    .find(query)
    .collation({ locale: "en", strength: 2 }) // Case-insensitive
    .sort({ createdDate: -1 })
    .lean<IAssignment[]>()
    .exec();
};

export const getAssignmentForStudentId = async ({
  studentId,
}: {
  studentId: string;
}): Promise<IAssignment[]> => {
  const trimmedId = studentId.trim();

  return await assignments
    .aggregate([
      {
        $match: {
          studentId: trimmedId,
        },
      },
      {
        $sort: {
          createdDate: -1, // latest assignment first
        },
      },
      {
        $group: {
          _id: "$assignmentId",
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceWith: "$doc",
      },
    ])
    .exec();
};

export const getStudentCardCount = async ({
  studentId,
}: {
  studentId: string;
}): Promise<{
  totalAssignments: number;
  totalCompleted: number;
  totalPending: number;
}> => {
  const trimmedId = studentId.trim();

  const allAssignments = await assignments
    .find({ studentId: trimmedId })
    .lean();

  let totalCompleted = 0;
  let totalPending = 0;
  const result = await assignments
    .aggregate([
      {
        $match: {
          studentId: trimmedId,
        },
      },
      {
        $group: {
          _id: "$assignmentStatus",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          assignmentStatus: "$_id",
          count: 1,
        },
      },
    ])
    .exec();

  const response = {
    totalAssigned: 0,
    totalCompleted: 0,
    totalPending: 0,
  };

  for (const assignment of allAssignments) {
    if (assignment.assignmentStatus === "Completed") {
      totalCompleted++;
    } else if (
      assignment.assignmentStatus === "Assigned" ||
      assignment.assignmentStatus === "Pending"
    ) {
      totalPending++;
    }
  }

  return {
    totalAssignments: allAssignments.length,
    totalCompleted,
    totalPending,
  };
};

//getByObjectId

export const getAssignmentByObjectId = async (
  id: string
): Promise<IAssignment | null> => {
  return assignment
    .findOne({
      _id: new Types.ObjectId(id),
    })
    .lean() as unknown as IAssignment | null;
};

// Update Assignments

export const updateAssignmentsAnswer = async (
  assignmentId: string,
  payloads: {
    _id: string;
    answer: string;
    updatedBy: string;
  }[]
): Promise<{
  updated: { _id: string; isCorrect: boolean; score: number; status: string }[];
  failed: { _id: string; reason: string }[];
  totalScore: number;
}> => {
  const updatedResults: {
    _id: string;
    isCorrect: boolean;
    score: number;
    status: string;
  }[] = [];
  const failedResults: { _id: string; reason: string }[] = [];

  for (const item of payloads) {
    const { _id, answer, updatedBy } = item;

    try {
      const assignmentDoc = await assignment.findOne({ _id, assignmentId });

      if (!assignmentDoc) {
        failedResults.push({
          _id,
          reason: "Assignment not found for provided assignmentId",
        });
        continue;
      }

      const isCorrect = assignmentDoc.answerValidation === answer;
      const score = isCorrect ? 1 : 0;

      await assignment.findByIdAndUpdate(
        _id,
        {
          answer,
          updatedBy,
          updatedDate: new Date(),
          assignmentStatus: "Completed",
          score,
        },
        { new: true }
      );

      updatedResults.push({
        _id,
        isCorrect,
        score,
        status: "Updated",
      });
    } catch (error: any) {
      failedResults.push({ _id, reason: error.message });
    }
  }

  let totalScore = 0;

  // After all updates, calculate the new totalScore and rating
  try {
    const relatedAssignments = await assignment.find({ assignmentId });

    totalScore = relatedAssignments.reduce(
      (sum, doc) => sum + Number(doc.score || 0),
      0
    );

    const totalCount = relatedAssignments.length;
    const averageScore = totalCount > 0 ? totalScore / totalCount : 0;

    const rating = Number((averageScore * 5).toFixed(2)); // Convert to 5-star scale

    // Update all documents in this assignment group with the new rating
    await assignment.updateMany({ assignmentId }, { $set: { rating } });
  } catch (error) {
    console.error("Rating update failed:", error);
  }

  return {
    updated: updatedResults,
    failed: failedResults,
    totalScore,
  };
};

export const getTeacherStudentsAssignmentCount = async ({
  teacherId,
}: {
  teacherId: string;
}): Promise<{
  teacherId: string;
  teacherName: string;
  totalStudents: number;
  assignments: {
    total: number;
    assigned: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  students: Array<{
    studentId: string;
    studentName: string;
    assignments: {
      total: number;
      assigned: number;
      completed: number;
      pending: number;
      overdue: number;
    };
    performance: {
      completionRate: number;
      accuracy: number;
    };
  }>;
}> => {
  const trimmedId = teacherId.trim();

  // Get all assignments for this teacher
  const assignments = await assignment
    .aggregate([
      {
        $match: {
          assignedTeacherId: trimmedId,
        },
      },
      {
        $group: {
          _id: "$studentId",
          studentName: { $first: "$studentName" },
          teacherName: { $first: "$assignedTeacher" },
          assignments: {
            $push: {
              status: "$assignmentStatus",
              dueDate: "$dueDate",
              isCorrect: {
                $cond: [{ $eq: ["$answer", "$answerValidation"] }, 1, 0],
              },
            },
          },
        },
      },
      {
        $project: {
          studentId: "$_id",
          studentName: 1,
          teacherName: 1,
          assignments: 1,
          _id: 0,
        },
      },
    ])
    .exec();

  // Calculate statistics
  let totalAssigned = 0;
  let totalCompleted = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  const now = new Date();

  const studentsWithStats = assignments.map(
    (student: {
      assignments: {
        status: string;
        isCorrect: number;
        dueDate: string | number | Date;
      }[];
      studentId: any;
      studentName: any;
    }) => {
      let studentAssigned = 0;
      let studentCompleted = 0;
      let studentPending = 0;
      let studentOverdue = 0;
      let correctAnswers = 0;
      let totalAnswered = 0;

      student.assignments.forEach(
        (assignment: {
          status: string;
          isCorrect: number;
          dueDate: string | number | Date;
        }) => {
          if (assignment.status === "Assigned") {
            studentAssigned++;
            totalAssigned++;
          }
          if (assignment.status === "Completed") {
            studentCompleted++;
            totalCompleted++;
            totalAnswered++;
            correctAnswers += assignment.isCorrect;
          }
          if (assignment.status === "InProgress") {
            studentPending++;
            totalPending++;
            if (new Date(assignment.dueDate) < now) {
              studentOverdue++;
              totalOverdue++;
            }
          }
        }
      );

      const studentTotal = studentAssigned + studentCompleted + studentPending;
      const completionRate =
        studentTotal > 0 ? (studentCompleted / studentTotal) * 100 : 0;
      const accuracy =
        totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0;

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        assignments: {
          total: studentTotal,
          assigned: studentAssigned,
          completed: studentCompleted,
          pending: studentPending,
          overdue: studentOverdue,
        },
        performance: {
          completionRate: parseFloat(completionRate.toFixed(2)),
          accuracy: parseFloat(accuracy.toFixed(2)),
        },
      };
    }
  );

  const teacherName =
    assignments.length > 0 ? assignments[0].teacherName : "Unknown";

  return {
    teacherId: trimmedId,
    teacherName,
    totalStudents: studentsWithStats.length,
    assignments: {
      total: totalAssigned + totalCompleted + totalPending,
      assigned: totalAssigned,
      completed: totalCompleted,
      pending: totalPending,
      overdue: totalOverdue,
    },
    students: studentsWithStats,
  };
};
interface IAssignmentData {
  _id: any;
  assignmentId: string;
  assignmentName?: string;
  assignmentType?: any;
  questionName?: string;
  assignedDate: Date;
  dueDate: Date;
  assignmentStatus: string;
}

export const getAssignmentRecords = async (
  params: GetAllAssignmentRecordsParams
): Promise<{ assignmentData: IAssignmentData[]; totalCount: number }> => {
  const { studentId, assignmentId } = params;

  // Construct query based on role if provided
  const query: any = {};

  console.log(">>>>", query);

  if (studentId) {
    query.studentId = studentId;
  }
  if (assignmentId) {
    query.assignmentId = assignmentId;
  }

  console.log(">>>>>>", query.studentId, query.assignmentId);
  // Fetch all users matching the query and return plain JavaScript objects using .lean()
  let assignmentRawtData;
  let totalCount;

  assignmentRawtData = await assignment.find(query).exec();
  totalCount = await assignment.countDocuments(query);

  // Get the total count of users matching the query
  const assignmentData = assignmentRawtData.map((item) => ({
    _id: item._id,
    assignmentId: item.assignmentId,
    assignmentName: item.assignmentName,
    assignmentType: {
      type: item.assignmentType?.type || "",
    },
    questionName: item.questionName,
    assignedDate: item.assignedDate,
    dueDate: item.dueDate,
    assignmentStatus: item.assignmentStatus,
  }));
  return { assignmentData, totalCount }; // Return both users and totalCount
};
