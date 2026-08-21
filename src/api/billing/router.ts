import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { billingMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/billing",
      options: {
        handler: handler.createBilling,
        description: billingMessages.CREATE,
        tags: ["api", "billing"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },


    {
      method: "GET",
      path: "/billing",
      options: {
        handler: handler.getBillings,
        description: billingMessages.GET_ALL,
        tags: ["api", "billing"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/billing/{billingId}",
      options: {
        handler: handler.getBillingById,
        description: billingMessages.GET_BY_ID,
        tags: ["api", "billing"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },


{
      method: "GET",
      path: "/billing/cards",
      options: {
        handler: handler.getBillingCards,
        description: billingMessages.GET_COUNT,
        tags: ["api", "billing"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

  ];

  server.route(routes);
};

export = {
  name: "api-billing",
  register,
};
