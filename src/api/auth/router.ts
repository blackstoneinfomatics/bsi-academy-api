import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { authMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/signin",
      options: {
        handler: handler.signIn,
        description: authMessages.SIGN_IN,
        tags: ["api", "auth"],
      },
    },
    {
      method: "POST",
      path: "/signout",
      options: {
        handler: handler.signOut,
        description: authMessages.SIGN_OUT,
        tags: ["api", "auth"],
        auth: {
          strategies: ["jwt"],
        },
      },
    },
{
      method: "POST",
      path: "/studentsignin",
      options: {
        handler: handler.studentSignIn,
        description: authMessages.SIGN_IN,
        tags: ["api", "auth"],
      },
    },
    {
      method: "PUT",
      path: "/change-password/{userId}",
      options: {
        handler: handler.changePassword,
        description: authMessages.CHANGE_PASSWORD,
        tags: ["api", "auth"],
        auth: {
          strategies: ["jwt"],
        },
      },
    },
    {
      method: "POST",
      path: "/check-email",
      options: {
        handler: handler.checkEmail,  // New handler for checking email
        description: "Check if email exists",
        tags: ["api", "auth"],
      },
    },
    {
      method: "POST",
      path: "/allcheck-email",
      options: {
        handler: handler.allcheckEmail,  // New handler for checking email
        description: "Check if email exists",
        tags: ["api", "auth"],
      },
    },

    {
          method: "GET",
          path: "/ac/availabletime",
          options: {
            handler: handler.getAcademicAvaialableTime,
            description: "Get available  time for academic coach",
            tags: ["api", "alstudents"],
           },
        },
        {
          method: "GET",
          path: "/teacher/availabletime",
          options: {
            handler: handler.getTeacherAvaialableTime,
            description: "Get available  time for academic coach",
            tags: ["api", "alstudents"],
           },
        },

    
  ];
  server.route(routes);
};
export = {
  name: "api-auth",
  register,
};
