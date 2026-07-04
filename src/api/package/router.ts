import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
   
    {
      method: "POST",
      path: "/package",
      options: {
        handler: handler.createPackage,
        // description: userMessages.CREATE,
        tags: ["api", "package"],
        auth: {
          strategies: ["jwt"],
        },  },
    },

    {
      method: "PUT",
      path: "/package/{packageId}",      
      options: {
        handler: handler.updatePackageHandler,
        // description: userMessages.CREATE,
        tags: ["api", "package"],
        auth: {
          strategies: ["jwt"],
        },  },
    },

    {
        method: "GET",
        path: "/package",
        options: {
          handler: handler.getAllCreatePackage,
          // description: userMessages.CREATE,
          tags: ["api", "package"],
          auth: {
            strategies: ["jwt"],
          }, },
      },
 

  ];
  server.route(routes);
};
export = {
  name: "api-package",
  register,
};
