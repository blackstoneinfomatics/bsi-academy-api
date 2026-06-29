
import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Define the routes for this module
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/courses",
      options: {
        handler:handler.createCourses,  
        tags: ["api", "course"],  
        auth: {
          strategies: ["jwt"],
        },  },
    },

    {
        method: "GET",
        path: "/courses",
        options: {
          handler:handler.getAllCourse,  
          tags: ["api", "course"],  
          auth: {
            strategies: ["jwt"],
          }, },
      },
  ];


  // Register the defined routes with the Hapi server
  server.route(routes);
};

export = {
  name: "api-course",
  register,
};

