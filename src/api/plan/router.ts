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

    // ADD BILLING PERIOD
    {
      method: "POST",

      path: "/plans/{planId}/billing-period",

      options: {
        handler: handler.addBillingPeriod,

        description: "Add a new billing period to an existing Plan",

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // UPDATE BILLING PERIOD
    {
      method: "PUT",

      path: "/plans/{planId}/billing-period/{billingPeriodId}",

      options: {
        handler: handler.updateBillingPeriod,

        description: "Update an individual billing period's price and discount",

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },


{
      method: "GET",

      path: "/plans/dashboard",

      options: {
        handler: handler.getPlanDashboard,

        description: userMessages.DASHBOARD,

        tags: ["api", "plans"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // GET PLAN ANALYTICS
    {
      method: "GET",

      path: "/plans/analytics",

      options: {
        handler: handler.getPlanAnalytics,

        description: "Get plan revenue analytics by period",

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
