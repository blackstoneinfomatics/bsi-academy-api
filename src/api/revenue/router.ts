import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { revenueMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

    {
      method: "GET",
      path: "/revenue/dashboard/count",
      options: {
        handler: handler.getRevenueDashboardCount,
        description: revenueMessages.DASHBOARD_CARD_COUNT_FETCH,
        tags: ["api", "revenue"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/revenue/latesttenant",
      options: {
        handler: handler.getRevenueLatestTenant,
        description: revenueMessages.LATEST_TENANT_REVENUE_FETCH,
        tags: ["api", "revenue"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method:"GET",
      path:"/revenue/netrevenue-overview",
      options:{
        handler:handler.getRevenueNetRevenueOverview,
        description:revenueMessages.NEW_TENANT_REVENUE_FETCH,
        tags:["api","revenue"],
        // auth:{
        //   strategies:["jwt"],
        // },
      }
    },

    {
      method:"GET",
      path:"/revenue/month-revenue",
      options:{
        handler:handler.getRevenueMonthRevenue,
        description:revenueMessages.MONTHLY_TENANT_REVENUE_FETCH,
        tags:["api","revenue"],
        // auth:{
        //   strategies:["jwt"],
        // },
      }
    }

    //  {
    //   method: "GET",
    //   path: "/refund-transactions",
    //   options: {
    //     handler: handler.getRefundTransactions,
    //     description: refundMessages.GET_REFUND_TRANSACTIONS,
    //     tags: ["api", "refund-transaction"],
    //     // auth: {
    //     //   strategies: ["jwt"],
    //     // },
    //   },
    // },

    // {
    //   method: "GET",
    //   path: "/refund-transactions/{refundId}",
    //   options: {
    //     handler: handler.getRefundTransactionById,
    //     description: refundMessages.GET_REFUND_BY_ID,
    //     tags: ["api", "refund-transaction"],
    //     // auth: {
    //     //   strategies: ["jwt"],
    //     // },
    //   },
    // },

    // {
    //   method: "PUT",
    //   path: "/refund-transactions/{refundId}",
    //   options: {
    //     handler: handler.updateRefundTransaction,
    //     description: refundMessages.UPDATE_REFUND,
    //     tags: ["api", "refund-transaction"],
    //     // auth: {
    //     //   strategies: ["jwt"],
    //     // },
    //   },
    // },


  ];
  server.route(routes);
};
export = {
  name: "api-revenue",
  register,
};
