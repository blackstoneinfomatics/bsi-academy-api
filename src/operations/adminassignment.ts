import adminassignments from "../models/adminassignment";
import { IAdminAssignment } from "../../types/models.types";
import AppLogger from "../helpers/logging";
import { assignemntMessages } from "../config/messages";

export const saveAdminAssignment = async (
  payload: Partial<IAdminAssignment>
): Promise<{ saved: IAdminAssignment } | { error: any }> => {
  try {
    const result = new adminassignments(payload);
    const saved = await result.save();

    AppLogger.info(assignemntMessages.ASSIGNMENT_CREATED, {
      assignmentId: saved.assignmentId,
      questionName: saved.questionName,
    });

    return { saved };
  } catch (error) {
    console.error("❌ Error saving admin assignment:", error);
    return { error };
  }
};

export const getAdminAssignmentsByCourseAndLevel = async (
  courseId: string,
  levelId: string
): Promise<{ assignments: any[]; totalCount: number } | { error: any }> => {
  try {
    const queryMatch = {
      courseId: { $regex: new RegExp(`^${courseId}$`, "i") },
      levelId: { $regex: new RegExp(`^${levelId}$`, "i") },
    };

    const result = await adminassignments.aggregate([
      { $match: queryMatch },
      {
        $group: {
          _id: "$assignmentId",
          assignmentName: { $first: "$assignmentName" },
          courseId: { $first: "$courseId" },
          courseName: { $first: "$courseName" },
          levelId: { $first: "$levelId" },
          levelName: { $first: "$levelName" },
          createdBy: { $first: "$createdBy" },
          createdDate: { $first: "$createdDate" },
          questionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          assignmentId: "$_id",
          assignmentName: 1,
          courseId: 1,
          courseName: 1,
          levelId: 1,
          levelName: 1,
          createdBy: 1,
          createdDate: 1,
          questionCount: 1,
        },
      },
      { $sort: { createdDate: -1 } },
    ]);

    return { assignments: result, totalCount: result.length };
  } catch (error) {
    console.error("❌ Error fetching assignments:", error);
    return { error };
  }
};
export const getAdminAssignmentsByCourseNameAndLevelName = async (
  courseName: string,
  levelName: string
): Promise<{ assignments: any[]; totalCount: number } | { error: any }> => {
  try {
    const grouped = await adminassignments.aggregate([
      {
        $match: {
          courseName,
          levelName,
        },
      },
      {
        $group: {
          _id: "$assignmentId",
          assignmentName: { $first: "$assignmentName" },
          questionCount: { $sum: 1 },
          assignments: { $push: "$$ROOT" }, 
        },
      },
      {
        $project: {
          _id: 0,
          assignmentId: "$_id",
          assignmentName: 1,
          questionCount: 1,
          assignments: 1,
        },
      },
      {
        $sort: { assignmentName: 1 },
      },
    ]);

    return {
      assignments: grouped,
      totalCount: grouped.length,
    };
  } catch (error) {
    console.error("❌ Error fetching grouped questions:", error);
    return { error };
  }
};


