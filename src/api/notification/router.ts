
import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import Joi from "joi";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    
    {
      method: "GET",
      path: "/notification/getlist",
      options: {
        handler:handler.getnotificationList,  
        tags: ["api", "notification"],  
        auth: {
          strategies: ["jwt"],
        }, },
    },

    {
      method: "GET",
      path: "/notification/{notificationId}",
      options: {
        handler:handler.getNotificationsHandler,
        tags: ["api", "notifications"],
        description: "Get notifications by receiverId",
        auth: {
          strategies: ["jwt"],
        },  },
    },

    {
      method: "PUT",
      path: "/notification/{notificationId}",
      options: {
        cors:true,
        handler: handler.updateNotificationById,
        tags: ["api", "notification"],
        description: "Update a notification's status to seen",
        auth: {
          strategies: ["jwt"],
        }, }
    }
    

    //   {
    //     method: "PUT",
    //     path: "/notification/bulkupdate",
    //     options: {
    //       handler:handler.createTeacherMessageList ,  
    //       tags: ["api", "notification"],  
    //     },
    //   },


  ];
  server.route(routes);
};

export = {
  name: "api-notification",
  register,
};

