import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler"; 

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/levels",
      options: {
        handler: handler.createLevel,
        description: "Create a new level",
        tags: ["api", "level"],
        auth: {
          strategies: ["jwt"]
        }
      }
    },

    {
  method: "GET",
  path: "/levels/{courseId}",
  options: {
    handler: handler.getLevelsByCourseId,
    description: "Get levels by courseId",
    tags: ["api", "level"],
    auth: {
      strategies: ["jwt"]
    }
  }
},
{
  method : "PUT",
  path : "/update-levels",
  options:{
    handler:handler.updateLevel,
     description: "update level by level",
    tags: ["api", "level"],
    auth: {
      strategies: ["jwt"]
    }
  }
}

  ];

  server.route(routes);
};

export = {
  name: "api-level",
  version: "1.0.0",
  register
};
