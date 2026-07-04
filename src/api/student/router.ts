import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { studentMessages } from "../../config/messages";



const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/student",
      options: {
        handler: handler.createStudent,
        description: studentMessages.CREATE,
        tags: ["api", "student"],
       },
    },

    {
      method: "GET",
      path: "/studentlist",
      options: {
        handler: handler.getAllStudents,
        description: studentMessages.LIST,
        tags: ["api", "studentlist"],
        auth: {
          strategies: ["jwt"],
        }, },
    },

 
    {
      method: "GET",
      path: "/studentlist/{studentId}",
      options: {
        handler: handler.getStudentRecordById,
        description: studentMessages.BYID,
        tags: ["api", "studentlist"],
        auth: {
          strategies: ["jwt"],
        }, },
    },
    {
      method: "GET",
      path: "/studentvisitor",
      options: {
        handler: handler.getStudentVisitor,
        description: studentMessages.LIST,
        tags: ["api", "studentlist"],
        auth: {
          strategies: ["jwt"],
        },  },
    },
    // {
    //   method: "GET",
    //   path: "/student",
    //   options: {
    //     handler: async (request, h) => {
    //       try {
    //         // Extract query parameters
    //         const { country, course, teacher, status, offset, limit } = request.query;

    //         // Call handler function to get filtered students
    //         const students = await handler.getFilteredStudents({
    //           country,
    //           course,
    //           teacher,
    //           status,
    //           offset,
    //           limit,
    //         });

    //         return h.response({
    //           message: "Filtered students retrieved successfully",
    //           students,
    //         }).code(200);
    //       } catch (error) {
    //         console.error("Error fetching filtered students:", error);
    //         return h.response({
    //           message: "Failed to retrieve filtered students",
    //           error: error.message,
    //         }).code(500);
    //       }
    //     },
    //     description: studentMessages.LIST,
    //     tags: ["api", "student"],
    //   },
    // },
  ];

  server.route(routes);
};

export = {
  name: "api-students",
  register,
};
