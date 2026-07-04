// ==============================
// router.ts
// ==============================

import { Server, ServerRoute } from "@hapi/hapi";

import handler from "./handler";

import { userMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    // CREATE PLAN
    {
      method: "POST",

      path: "/plans",

      options: {
        handler: handler.createPlan,

        description: userMessages.CREATE,

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // GET ALL PLANS
    {
      method: "GET",

      path: "/plans",

      options: {
        handler: handler.getPlans,

        description: userMessages.LIST,

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // GET PLAN BY ID
    {
      method: "GET",

      path: "/plans/{planId}",

      options: {
        handler: handler.getPlanById,

        description: userMessages.BYID,

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // UPDATE PLAN
    {
      method: "PUT",

      path: "/plans/{planId}",

      options: {
        handler: handler.updatePlan,

        description: userMessages.UPDATE,

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // DELETE PLAN
    {
      method: "DELETE",

      path: "/plans/{planId}",

      options: {
        handler: handler.deletePlan,

        description: userMessages.DELETE,

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
  ];

  server.route(routes);
};

export = {
  name: "api-plans",
  register,
};
