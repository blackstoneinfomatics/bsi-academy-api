import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { userMessages } from "../../config/messages";

const register = async (
  server: Server
): Promise<void> => {

  const routes: ServerRoute[] = [

    // CREATE SUBSCRIPTION
    {
      method: "POST",
      path: "/create-subscriptions",

      options: {
        handler: handler.createSubscription,

        description: userMessages.CREATE,

        tags: ["api", "subscriptions"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // GET ALL SUBSCRIPTIONS
    {
      method: "GET",
      path: "/subscriptions",

      options: {
        handler: handler.getSubscriptions,

        description: userMessages.LIST,

        tags: ["api", "subscriptions"],

        auth: {
          strategies: ["jwt"],
        },
      },
    },

    // GET SUBSCRIPTION BY ID
    {
      method: "GET",
      path: "/subscriptions/{subscriptionId}",

      options: {
        handler: handler.getSubscriptionById,

        description: userMessages.BYID,

        tags: ["api", "subscriptions"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // UPDATE SUBSCRIPTION
    {
      method: "PUT",
      path: "/subscriptions/{subscriptionId}",

      options: {
        handler: handler.updateSubscription,

        description: userMessages.UPDATE,

        tags: ["api", "subscriptions"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // CANCEL SUBSCRIPTION
    {
      method: "PUT",
      path: "/subscriptions/cancel/{subscriptionId}",

      options: {
        handler: handler.cancelSubscription,

        description: "Cancel Subscription",

        tags: ["api", "subscriptions"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    // DELETE SUBSCRIPTION
    {
      method: "DELETE",
      path: "/subscriptions/{subscriptionId}",

      options: {
        handler: handler.deleteSubscription,

        description: userMessages.DELETE,

        tags: ["api", "subscriptions"],

        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
    {
      method: "PUT",
      path:"/subscriptions/upgrade/{subscriptionId}",
      options:{
        handler: handler.updateSubscription,
        description: userMessages.UPDATE,
        tags: ["api", "subscriptions"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      }
    }

    // UPGRADE PLAN
    // {
    //   method: "PUT",
    //   path: "/subscriptions/upgrade/{subscriptionId}",

    //   options: {
    //     handler: handler.upgradeSubscription,

    //     description: "Upgrade Subscription",

    //     tags: ["api", "subscriptions"],

    //     auth: {
    //       strategies: ["jwt"],
    //     },
    //   },
    // },

  ];

  server.route(routes);
};

export = {
  name: "api-subscriptionSaas",
  register,
};