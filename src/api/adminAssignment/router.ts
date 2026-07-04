import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler"; 

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/adminassignment",
      options: {
        handler: handler.createAssignment,
        description: "Create a new admin assignment",
        tags: ["api", "admin-assignment"],
        // auth: {
        //   strategies: ["jwt"]
        // }
      }
    },
    {
  method: "GET",
  path: "/adminassignment",
  options: {
    handler: handler.getAdminAssignmentsByCourseAndLevel,
    description: "Get admin assignments by courseId and levelId",
    tags: ["api", "admin-assignment"],
    // auth: {
    //   strategies: ["jwt"]
    // }
  }
},
 {
  method: "GET",
  path: "/adminassignment/assignment",
  options: {
    handler: handler.getAdminAssignmentsByCourseNameAndLevelName,
    description: "Get admin assignments by courseName and levelName",
    tags: ["api", "admin-assignment"],
    // auth: {
    //   strategies: ["jwt"]
    // }
  }
}

  ];

  server.route(routes);
};

export = {
  name: "api-adminassignment",
  version: "1.0.0",
  register
};
