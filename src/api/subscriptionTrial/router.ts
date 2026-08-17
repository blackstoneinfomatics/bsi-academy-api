import { Server, ServerRoute } from "@hapi/hapi";
import { subscriptionTrialMessages } from "../../config/messages";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

    {
          method: "PUT",
          path: "/subscription-trials/{trialId}",
          options: {
            handler: handler.updateSubscriptionTrial,
            description: subscriptionTrialMessages.UPDATE,
            tags: ["api", "subscription-trial"],
            // auth: {
            //   strategies: ["jwt"],
            // },
          },
        },
    {
      method: "GET",
      path: "/subscription-trials/dashboard-count",
      options: {
        handler: handler.getSubscriptionTrialDashboardCount,
        description: subscriptionTrialMessages.GET_DASHBOARD_COUNT,
        tags: ["api", "subscription-trial"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/subscription-trials",
      options: {
        handler: handler.getSubscriptionTrials,
        description: subscriptionTrialMessages.GET_ALL,
        tags: ["api", "subscription-trial"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/subscription-trials/{trialId}",
      options: {
        handler: handler.getSubscriptionTrialById,
        description: subscriptionTrialMessages.GET_BY_ID,
        tags: ["api", "subscription-trial"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
  ];
  server.route(routes);
};
export = {
  name: "api-subscriptiontrial",
  register,
};
