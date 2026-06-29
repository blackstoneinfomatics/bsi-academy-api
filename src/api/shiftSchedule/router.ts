import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { userMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "GET",
      path: "/shiftschedule",
      options: {
        handler: handler.getAllUsers,
        description: userMessages.LIST,
        tags: ["api", "shiftschedule"],
        auth: {
          strategies: ["jwt"],
        },
      },
    },
    // {
    //   method: "GET",
    //   path: "/shiftschedule/{shiftscheduleId}",
    //   options: {
    //     handler: handler.getUserRecordById,
    //     description: userMessages.BYID,
    //     tags: ["api", "users"],
    //     auth: {
    //       strategies: ["jwt"],
    //     },
    //   },
    // },
    {
      method: "POST",
      path: "/shiftschedule",
      options: {
        handler: handler.createShiftschedule,
        description: userMessages.CREATE,
        tags: ["api", "shiftschedule"],
        auth: {
          strategies: ["jwt"],
        },
      },
    },
  {
  method: "PUT",
  path: "/shiftschedule",
  options: {
    handler: handler.updateShiftSchedule,
    description: "Update shift schedule",
    tags: ["api", "shiftschedule"],
    auth: {
      strategies: ["jwt"],
    },
  },
}

    // {
    //   method: "PUT",
    //   path: "/users/{userId}",
    //   options: {
    //     handler: handler.updateUser,
    //     description: userMessages.UPDATE,
    //     tags: ["api", "users"],
    //     auth: {
    //       strategies: ["jwt"],
    //     },
    //   },
    // },
  ];
  server.route(routes);
};
export = {
  name: "api-shiftschedule",
  register,
};
