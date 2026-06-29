import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./hanlder";
import { addAminMeetingMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [


      {
          method: "POST",
          path: "/addadminMeeting",
          options: {
            handler: handler.createAdminMeeting,
            description: addAminMeetingMessages.CREATE,
            tags: ["api", "adminmeeting"],
            payload: {
              parse: true,
              allow: "application/json", 
            },
            auth: {
              strategies: ["jwt"],
            },
          },
        },

         {
              method: "GET",
              path: "/allAdminMeeting",
              options: {
                handler: handler.getAllAdminMeeting,
                description: addAminMeetingMessages.LIST,
                tags: ["api", "adminmeeting"],
                // auth: {
                //   strategies: ["jwt"],
                // },
               },
          },

           {
                method: "GET",
                path: "/allAdminMeeting/{meetingId}",
                options: {
                  handler: handler.getAdminMeetingRecordById,
                  description: addAminMeetingMessages.LIST,
                  tags: ["api", "adminmeeting"],
                  auth: {
                    strategies: ["jwt"],
                  }, },
           },

   {
  method: "GET",
  path: "/allAdminMeeting/meetingId",
  options: {
    handler: handler.getAdminMeetingRecordByMeetingId,
    description: addAminMeetingMessages.LIST,
    tags: ["api", "adminmeeting"],
    auth: {
      strategies: ["jwt"],
    },
  },
},

          
          {
            method: "PUT",
            path: "/allAdminMeeting/{meetingId}",
            options: {
                handler: handler.updateAdminMeetingRecordById,
                description: addAminMeetingMessages.LIST,
                tags: ["api", "adminmeeting"],
                payload: {
                    output: "data",  // Ensure payload is treated as parsed data
                    parse: true,
                    allow: "application/json", // Ensure JSON is allowed
                    maxBytes: 50 * 1024 * 1024,
                },
                // auth: {
                //   strategies: ["jwt"],
                // }, 
              },
          },

          {
            method: "PUT",
            path: "/allAdminMeeting/update/{meetingbyId}",
            options: {
              handler: handler.updateAdminMeeting,
              description: addAminMeetingMessages.LIST,
              tags: ["api", "adminmeeting"],
              payload: {
                parse: true,
                allow: "application/json"
              }
            }
          },
          {
            method: "POST",
            path: "/allAdminMeeting/request-reschedule",
            options: {
              handler: handler.requestAdminMeetingReschedule,
              description: addAminMeetingMessages.UPDATE,
              tags: ["api", "adminmeeting"],
              payload: {
                parse: true,
                allow: "application/json"
              },
              auth: {
                strategies: ["jwt"],
              },
            },
          }





  ];
  server.route(routes);
};

export = {
  name: "admin-addMeeting",
  register,
};
