import { Server, ServerRoute } from "@hapi/hapi";
import {  recruitmentMessages } from "../../config/messages";
import handler from "./handler";



const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/recruit",
      options: {
        handler: handler.createRecruitement,
        description: recruitmentMessages.CREATE,
        tags: ["api", "recruitment"],
        payload: {
          output: "stream",
          parse: true,
          maxBytes: 50 * 1024 * 1024,
          multipart: true,
          allow: "multipart/form-data",
        },
      },
    },
     {
          method: "GET",
          path: "/applicants",
          options: {
            handler: handler.getAllApplicants,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            // auth: {
            //   strategies: ["jwt"],
            // },
            },
        },
        {
          method: "GET",
          path: "/applicants/{applicantId}",
          options: {
            handler: handler.getApplicantRecordById,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
        
            // auth: {
            //   strategies: ["jwt"],
            // },
           },
        },

        {
          method: "PUT",
          path: "/applicants/{applicantId}",
          options: {
            handler: handler.updateApplicantRecordById,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            auth: {
              strategies: ["jwt"],
            }, 
           },
        },
        {
          method: "PUT",
          path: "/admin/{id}",
          options: {
            handler: handler.updateAdminApplicantRecordById,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            // payload: {
            //   output: "stream",
            //   parse: true,
            //   maxBytes: 50 * 1024 * 1024,
            //   multipart: true,
            //  // allow: "multipart/form-data",
            // },
            // auth: {
            //   strategies: ["jwt"],
            // },
          },
        },
        {
          method: "GET",
          path: "/applicants/countriescount",
          options: {
            handler: handler.getTeacherCountriesCount,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            auth: {
              strategies: ["jwt"],
            }, },
        },

         {
          method: "GET",
          path: "/teacher",
          options: {
            handler: handler.getTeacherList,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            auth: {
              strategies: ["jwt"],
            },
            },
        },

          {
          method: "GET",
          path: "/application",
          options: {
            handler: handler.getApplicationData,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            // auth: {
            //   strategies: ["jwt"],
            // },
            },
        },

   {
          method: "GET",
          path: "/teacherfemalemale",
          options: {
            handler: handler.getTeacherListFemaleMale,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            auth: {
              strategies: ["jwt"],
            },
            },
        },

        
   {
          method: "GET",
          path: "/teacheroverview",
          options: {
            handler: handler.getTeacherDetailsOverview,
            description: recruitmentMessages.LIST,
            tags: ["api", "recruitment"],
            auth: {
              strategies: ["jwt"],
            },
            },
        },
];
server.route(routes);
};
export = {
name: "api-recruitment",
register,
};