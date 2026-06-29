import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { evaluationMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
  
    {
      method: "POST",
      path: "/evaluation",
      options: {
        handler: handler.createEvaluation,
        description: evaluationMessages.CREATE,
        tags: ["api", "student"],
        auth: {
          strategies: ["jwt"],
        },},
    },

    {
      method: "GET",
      path: "/evaluationlist",
      options: {
        handler: handler.getAllEvaluationList,
        description: evaluationMessages.LIST,
        tags: ["api", "evaluationlist"],
        auth: {
          strategies: ["jwt"],
        },},
    },
    {
      method: "PUT",
      path: "/evaluation/{evaluationId}",
      options: {
       handler: handler.updateEvaluation,
       description: evaluationMessages.UPDATE,
       tags: ["api", "evaluation"],
       auth: {
        strategies: ["jwt"],
      }, },
    },
  
    {
      method: "PUT",
      path: "/invoice/{evaluationId}",
      options: {
       handler: handler.updateInvoice,
       description: evaluationMessages.UPDATE,
       tags: ["api", "evaluation"],
       auth: {
        strategies: ["jwt"],
      }, },  
    },

    {
      method: "GET",
      path: "/evaluationlist/{evaluationId}",
      options: {
        handler: handler.getEvaluationRecordById,
        description: evaluationMessages.BYID,
        tags: ["api", "evaluationlist"],
         },
    },

    {
      method: "GET",
      path: "/totaltrialclass",
      options: {
        handler: handler.getTotaltrialClassCount,
        description: evaluationMessages.BYID,
        tags: ["api", "evaluationlist"],
        auth: {
          strategies: ["jwt"],
        },  },
    },

    {
      method: "GET",
      path: "/teacherstatus",
      options: {
        handler: handler.getAssignedTeacherCount,
        description: evaluationMessages.BYID,
        tags: ["api", "evaluationlist"],
        auth: {
          strategies: ["jwt"],
        },},
    },

     {
          method: "GET",
          path: "/preferedteacher",
          options: {
            handler: handler.getPreferedTeacher,
            description: evaluationMessages.BYID,
            tags: ["api", "evaluationlist"],
            auth: {
              strategies: ["jwt"],
            },  },
        },
         
        {
          method: "GET",
          path: "/studentcourse",
          options: {
            handler: handler.getStudentCourse,
            description: evaluationMessages.BYID,
            tags: ["api", "evaluationlist"],
            auth: {
              strategies: ["jwt"],
            }, },
        },
        {
          method: "GET",
          path: "/countiescount",
          options: {
            handler: handler.getCountries,
            description: evaluationMessages.BYID,
            tags: ["api", "evaluationlist"],
            auth: {
              strategies: ["jwt"],
            },  },
        },
        {
          method: "GET",
          path: "/trialbyteacher",
          options: {
            handler: handler.getTrialbyTeacher,
            description: evaluationMessages.BYID,
            tags: ["api", "evaluationlist"],
            auth: {
              strategies: ["jwt"],
            }, },
        },
        {
          method: "GET",
          path: "/alltrialclass",
          options: {
            handler: handler.getTrialClass,
            description: evaluationMessages.BYID,
            tags: ["api", "evaluationlist"],
            auth: {
              strategies: ["jwt"],
            }, 
           },
        },
        {
          method: "GET",
          path: "/teachertrialclass",
          options: {
            handler: handler.getTrialClassByTeacher,
            description: evaluationMessages.BYID,
            tags: ["api", "evaluationlist"],
            auth: {
              strategies: ["jwt"],
            },  
          },
        },
  ];
  server.route(routes);
};
export = {
  name: "api-evaluation",
  register,
};
