
import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Define the routes for this module
  const routes: ServerRoute[] = [

  {
    method: "POST",
    path: "/supervisorfeedbacks",
    options: {
      handler:handler.createSupervisorFeedback ,  
      tags: ["api", "supervisorfeedback"],  
      auth: {
        strategies: ["jwt"],
      }, },
  },

  // {
  //   method: "GET",
  //   path: "/supervisorfeedback",
  //   options: {
  //     handler:handler.getAllSupervisorRecords,  
  //     tags: ["api", "supervisorfeedback"],  
  //     // auth: {
  //     //   strategies: ["jwt"],
  //     // },
  //   },
  // },




  ];

// Register the defined routes with the Hapi server
  server.route(routes);
};

export = {
  name: "api-supervisorfeedback",
  register,
};

