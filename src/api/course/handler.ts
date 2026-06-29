import { z } from "zod";
import { ResponseToolkit, Request } from "@hapi/hapi";
import { zodCourseSchema } from "../../models/course";
import { createCourses, getAllCourse } from "../../operations/course";


const createCourseValidation = z.object({
  payload: zodCourseSchema.pick({
    course: true,
    courseName: true,
    level: true,
    status: true,
    createdBy: true,
    lastUpdatedBy: true,
  }).partial(),
});


  
  

export default {
  async createCourses(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createCourseValidation.parse({ payload: req.payload });

      const result = await createCourses({
        course: {
          courseId: payload.course?.courseId || "",
          courseTitle: payload.course?.courseTitle || "",
          courseDuration: payload.course?.courseDuration || "",
          courseDescription: payload.course?.courseDescription || "",
          courseLevel: payload.course?.courseLevel || "",
        },
        courseName: payload.courseName || "",
        level: payload.level || '',
        status: payload.status || "Active",
        createdDate: new Date(),
        createdBy: payload.createdBy || "System",
        lastUpdatedDate: new Date(),
        lastUpdatedBy: payload.lastUpdatedBy || "System",
      });
      
      return h.response({ message: "Course created successfully", data: result }).code(201);
    } catch (error) {
      console.error(" Error creating course:", error);
      return h.response({ error: "Failed to create course", details: error }).code(500);
    }
  },


 async getAllCourse(req: Request, h: ResponseToolkit) {
     try {
       const result = await getAllCourse();
       return h.response(result).code(200);
     } catch (error) {
       // Handle errors (validation or other errors)
       return h.response({ error }).code(400);
     }
   },

 
  
  
}  