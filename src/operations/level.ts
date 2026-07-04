import { ILevel } from "../../types/models.types";
import Level from "../models/level";
import { commonMessages } from "../config/messages";
import AppLogger from "../helpers/logging";

export const createLevel = async (
  payload: Partial<ILevel>
): Promise<{ totalCount: number; level: ILevel } | { error: any }> => {
  try {
    const result = new Level({
      courseId: payload.courseId || "",
      level: payload.level || "",
      duration: payload.duration || "",
      description: payload.description || "",
      createdDate: new Date(),
      createdBy: payload.createdBy || "System",
    });

    const levelRecord = await result.save();
    const totalCount = await Level.countDocuments();

    return { totalCount, level: levelRecord.toObject() };
  } catch (error) {
    console.error("Error creating level:", error);
    return { error };
  }
};

export const getLevelsByCourseId = async (
  courseId: string
): Promise<{ totalCount: number; levels: ILevel[] }> => {
  const query = { courseId };

  const [levels, totalCount] = await Promise.all([
    Level.find(query).exec(),
    Level.countDocuments(query).exec(),
  ]);

  AppLogger.info(commonMessages.GET_ALL_LIST_SUCCESS, { totalCount });

  return { totalCount, levels };
};

export const updateLevel = async ({
  courseId,
  level,
  description
}: {
  courseId: string;
  level: string;
  description: Buffer;
})=>{
   const selectLevel = await Level.findOne({
    courseId: courseId,
    level: level
  });

  // Level not found
  if (!selectLevel) {
    throw new Error("Level not found for this course");
  }

  selectLevel.description = description;
 
  const updated = await selectLevel.save();

  return updated;
}

