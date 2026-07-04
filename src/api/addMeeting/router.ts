import { Server, ServerRoute } from "@hapi/hapi";
import { addMeetingMessages, recruitmentMessages } from "../../config/messages";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/addMeeting",
      options: {
        handler: handler.createMeeting,
        description: addMeetingMessages.CREATE,
        tags: ["api", "addmeeting"],
        payload: {
          parse: true,
          allow: "application/json", 
          maxBytes: 50 * 1024 * 1024, // ✅ Optional: Limit request size
        },
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
    
      {
          method: "GET",
          path: "/allMeetings",
          options: {
            handler: handler.getAllMeetings,
            description: addMeetingMessages.LIST,
            tags: ["api", "recruitment"],
            auth: {
              strategies: ["jwt"],
            },
          },
        },

{
  method: 'GET',
  path: '/allmeeting',
  options: {
    handler: handler.getMeetingById,
    description: 'Get meetings by meetingId',
    tags: ['api', 'teacherMeeting'],
    auth: {
      strategies: ['jwt'],
    },
  },
},

      
        {
          method: "PUT",
          path: "/meeting/{meetingId}",
          options: {
              handler: handler.updateMeetingRecordById,
              description: addMeetingMessages.LIST,
              tags: ["api", "recruitment"],
              payload: {
                  output: "data",  
                  parse: true,
                  allow: "application/json", 
              },
              // auth: {
              //   strategies: ["jwt"],
              // },
          },
        },

{
  method: "PUT",
  path: "/meetingminutes/{meetingbyId}",
  options: {
    handler: handler.updateMeetingMinutesRecordById,
    description: addMeetingMessages.LIST,
    tags: ["api", "recruitment"],
    payload: {
      parse: true,
      allow: "application/json"
    }
  }
},

{
  method: 'GET',
  path: '/allmeeting/{id}',
  options: {
    handler: handler.getMeetingByIdRecord,
    description: 'Get meetings by meetingId',
    tags: ['api', 'teacherMeeting'],
    auth: {
      strategies: ['jwt'],
    },
  },
},

       
  ];
  server.route(routes);
};

export = {
  name: "api-addMeeting",
  register,
};
