
import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { leaveRequestMessages, leaveStatus } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/leaverequest",
      options: {
        handler:handler.createLeaveRequestHandler ,  
        tags: ["api", "leaverequest"],  
        auth: {
          strategies: ["jwt"],
        }, 
       },
    },
{
  method: "PUT",
  path: "/leavesummary/{id}", // ✅ changed path
  options: {
    handler: handler.updateLeaveRequestHandler, // name is fine to keep
    tags: ["api", "LeaveSummary"],
    auth: {
      strategies: ["jwt"],
    },
  }
},


    
       {
            method: "GET",
            path: "/leaverequest/list",
            options: {
              handler: handler.getleaverequestList,
              description: leaveRequestMessages.LIST,
              tags: ["api", "LeaveSummary"],
              auth: {
                strategies: ["jwt"],
              },  },
         },

         {
          method: "GET",
          path: "/leavesummary/list",
          options: {
            handler: handler.getleaveSummaryList,
            description: leaveRequestMessages.LIST,
            tags: ["api", "LeaveSummary"],
            auth: {
              strategies: ["jwt"],
            },  },
         },


{
  method: "GET",
  path: "/leaverequest",
  options: {
    handler: handler.getLeaveRecordById,
    description: leaveRequestMessages.LIST,
    tags: ["api", "LeaveRequest"],
    auth: {
      strategies: ["jwt"],
    },
  },
},


                 
          {
            method: "GET",
            path: "/leaveSummary/{id}",
            options: {
              handler: handler.getLeaveSummaryRecordById,
              description: leaveRequestMessages.LIST,
              tags: ["api", "LeaveSummary"],
          
              auth: {
                strategies: ["jwt"],
              },  },
          },

//card count
    {
      method: "GET",
      path: "/leaverequest/card",
      options: {
        handler: handler.getLeaveRequestCount,
        description: leaveRequestMessages.WIDGET_COUNT,
        tags: ["api", "leaverequest"],
        auth: {
          strategies: ["jwt"],
        },
      },
    },

  ];


  server.route(routes);
};

export = {
  name: "api-leaverequest",
  register,
};

