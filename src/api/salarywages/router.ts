import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
   
    

    {
      method: "GET",
      path: "/salarywages",
      options: {
        handler: handler.getAllSalaryList,
        // description: userMessages.CREATE,
        tags: ["api", "expense"],
        // auth: {
        //   strategies: ["jwt"],
        // }, 
      },
    },
      {
        method: "GET",
        path: "/salarywagesCardCount",
        options: {
          handler: handler.getAllSalaryCard,
          // description: userMessages.CREATE,
          tags: ["api", "expense"],
          auth: {
            strategies: ["jwt"],
          }, },
      },
        {
          method: "GET",
          path: "/salarywagesById",
          options: {
            handler: handler.getByEmployeeId,
            tags: ["api", "expense"],
          },
        },



      {
        method: "PUT",
        path: "/salarywages/{employeeId}",
        options: {
          handler: handler.updateSalaryWages,
          // description: userMessages.CREATE,
          tags: ["api", "expense"],
          // auth: {
          //   strategies: ["jwt"],
          // },
         },
      },

  ];
  server.route(routes);
};
export = {
  name: "api-salarywages",
  register,
};
