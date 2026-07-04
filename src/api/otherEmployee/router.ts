import { Server, ServerRoute } from "@hapi/hapi";
import {  otherEmployeesMessages, userMessages } from "../../config/messages";
import handler from "./handler";



const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/otheremployee",
      options: {
        handler: handler.createOtherEmployee,
        description: otherEmployeesMessages.CREATE,
        tags: ["api", "recruitment"],
        payload: {
          output: "stream",
          parse: true,
          maxBytes: 50 * 1024 * 1024,
          multipart: true,
          allow: "multipart/form-data",
        },
        auth: {
          strategies: ["jwt"],
        }, },
      
    },
     

   {
      method: "PUT",
      path: "/otheremployee/{_id}",
      options: {
        handler: handler.updateOtherEmployee,
        description: otherEmployeesMessages.CREATE,
        tags: ["api", "recruitment"],
        auth: {
          strategies: ["jwt"],
        }, },
      
    },


    {
      method: "GET",
      path: "/otheremp/countriescount",
      options: {
        handler: handler.getOhterEmpCountries,
        description: userMessages.LIST,
        tags: ["api", "users"],
        auth: {
          strategies: ["jwt"],
        },  },
    },

    {
      method: "GET",
      path: "/otheremp/{id}",
      options: {
        handler: handler.getOhterEmpById,
        description: userMessages.LIST,
        tags: ["api", "users"],
        auth: {
          strategies: ["jwt"],
        }, },
    },
];
server.route(routes);
};
export = {
name: "api-otheremployee",
register,
};