
import { ICourse } from "../../types/models.types";
import course from "../models/course";
import { commonMessages } from "../config/messages";
import AppLogger from "../helpers/logging";


export const createCourses = async (
    payload: Partial<ICourse>
  ): Promise<{ totalCount: number; course: ICourse } | { error: any }> => {
  try {
    const autoGenerateCourseId = (): string => {
      const digits = Math.floor(1000 + Math.random() * 9000); // 4 digits
      const letters = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
      ).join('');
      return `${digits}${letters}`;
    };

    const generateCourseId = autoGenerateCourseId();
    const result = new course({
      course: {
        courseId: generateCourseId,
        courseTitle: payload.course?.courseTitle || "",
        courseDuration: payload.course?.courseDuration || "",
        courseDescription: payload.course?.courseDescription || "",
        courseLevel: payload.course?.courseLevel || "",
      },
      courseName: payload.courseName || "",
      level:payload.level || "",
        
      status: payload.status || "Active",
      createdDate: new Date(),
      createdBy: payload.createdBy || "System",
      lastUpdatedDate: new Date(),
      lastUpdatedBy: payload.lastUpdatedBy || "System",
    });

    const courseRecord = await result.save();
    const totalCount = await course.countDocuments();

    return { totalCount, course: courseRecord.toObject() };
  } catch (error) {
    console.error(" Error creating course:", error);
    return { error };
  }
};

export const getAllCourse = async (
): Promise<{ totalCount: number; courses: ICourse[] }> => {

  const query = {};

  const [courses, totalCount] = await Promise.all([
    course.find(query).exec(),             
    course.countDocuments(query).exec(),   
  ]);

  AppLogger.info(commonMessages.GET_ALL_LIST_SUCCESS, { totalCount });

  return { totalCount, courses };
};



