import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { userMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
   
    {
      method: "POST",
      path: "/empwages",
      options: {
        handler: handler.createEmployeeWages,
        description: userMessages.CREATE,
        tags: ["api", "users"],
        auth: {
          strategies: ["jwt"],
        }, },
    },


{
  method: "GET",
  path: "/empwages",
  options: {
    handler: handler.getAllEmployeeWages,
    description: "Get Employee Wages",
    tags: ["api", "users"],
    auth: {
      strategies: ["jwt"],
    },
  },
},

{
  method: "PUT",
  path: "/empwages/{id}",
  options: {
    handler: handler.updateEmpWageById, // <- renamed for clarity
    description: "Update Wage Record by ID",
    tags: ["api", "users"],
    auth: {
      strategies: ["jwt"],
    },
  },
},



  ];
  server.route(routes);
};
export = {
  name: "api-wages",
  register,
};
