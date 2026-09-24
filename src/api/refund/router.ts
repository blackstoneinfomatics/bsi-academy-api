import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { refundMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

    {
      method: "GET",
      path: "/refund-transactions/dashboard-count",
      options: {
        handler: handler.getRefundDashboardCount,
        description: refundMessages.DASHBOARD_CARD_COUNT_FETCH,
        tags: ["api", "refund-transaction"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

     {
      method: "GET",
      path: "/refund-transactions",
      options: {
        handler: handler.getRefundTransactions,
        description: refundMessages.GET_REFUND_TRANSACTIONS,
        tags: ["api", "refund-transaction"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/refund-transactions/{refundId}",
      options: {
        handler: handler.getRefundTransactionById,
        description: refundMessages.GET_REFUND_BY_ID,
        tags: ["api", "refund-transaction"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "PUT",
      path: "/refund-transactions/{refundId}",
      options: {
        handler: handler.updateRefundTransaction,
        description: refundMessages.UPDATE_REFUND,
        tags: ["api", "refund-transaction"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },


  ];
  server.route(routes);
};
export = {
  name: "api-refund-transaction",
  register,
};
