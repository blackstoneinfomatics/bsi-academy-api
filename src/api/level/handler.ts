import { z } from "zod";
import { ResponseToolkit, Request } from "@hapi/hapi";
import { createLevel,getLevelsByCourseId, updateLevel } from "../../operations/level";
import { zodLevelSchema } from "../../models/level";

// Validation Schema
const createLevelValidation = z.object({
  payload: zodLevelSchema.pick({
    courseId: true,
    level: true,
    duration: true,
    description: true,
    createdBy: true,
  }).partial(),
});

const updateLevelValidation = z.object({
  payload : zodLevelSchema.pick({
     courseId: true,
    level: true,
    description: true,
  })
})

export default {
  // POST /levels
  async createLevel(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createLevelValidation.parse({ payload: req.payload });
     const descriptionBuffer =
      typeof payload.description === "string"
        ? Buffer.from(payload.description, "utf-8")
        : Buffer.from("", "utf-8");
      const newLevel = await createLevel({
        courseId: payload.courseId || "",
        level: payload.level || "",
        duration: payload.duration || "",
        description: descriptionBuffer,
        createdDate: new Date(),
        createdBy: payload.createdBy || "System",
      });

      return h
        .response({ message: "Level created successfully", data: newLevel })
        .code(201);
    } catch (error) {
      console.error("Error creating level:", error);
      return h
        .response({ error: "Failed to create level", details: error })
        .code(500);
    }
  },

  async getLevelsByCourseId(req: Request, h: ResponseToolkit) {
  try {
    const { courseId } = req.params;

    const result = await getLevelsByCourseId(courseId);
      const levels = result.levels.map((level: any) => ({
      ...level._doc, 
      description: level.description?.toString('utf-8') || '',
    }));

    return h.response({ total: result.totalCount, data: levels }).code(200);
  } catch (error) {
    return h.response({ error: "Failed to fetch levels", details: error }).code(500);
  }
},

async updateLevel (req: Request, h: ResponseToolkit) {
   try{
      const { payload } = updateLevelValidation.parse({ payload: req.payload });
     const descriptionBuffer =
      typeof payload.description === "string"
        ? Buffer.from(payload.description, "utf-8")
        : Buffer.from("", "utf-8");
      const newLevel = await updateLevel({
        courseId: payload.courseId || "",
        level: payload.level || "",
        description: descriptionBuffer,
      }
      );

       return h
        .response({ message: "Level updated successfully", data: newLevel })
        .code(201);

   }catch(error){
        return h.response({ error: "Failed to fetch levels", details: error }).code(500);

   }
} 

};
