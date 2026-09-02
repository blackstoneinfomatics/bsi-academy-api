import { Server, ServerRoute } from "@hapi/hapi";
import { subscriptionInvoiceMessages } from "../../config/messages";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/subscription-invoices",
      options: {
        handler: handler.createSubscriptionInvoice,
        description: subscriptionInvoiceMessages.CREATE,
        tags: ["api", "subscription-invoice"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/subscription-invoices/dashboard-count",
      options: {
        handler: handler.getSubscriptionInvoiceDashboardCount,
        description: subscriptionInvoiceMessages.GET_DASHBOARD_COUNT,
        tags: ["api", "subscription-invoice"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

     {
      method: "GET",
      path: "/subscription-invoices",
      options: {
        handler: handler.getSubscriptionInvoices,
        description: subscriptionInvoiceMessages.GET_ALL,
        tags: ["api", "subscription-invoice"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/subscription-invoices/{invoiceId}",
      options: {
        handler: handler.getSubscriptionInvoiceById,
        description: subscriptionInvoiceMessages.GET_BY_ID,
        tags: ["api", "subscription-invoice"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/subscription-invoices/tenant/{tenantId}",
      options: {
        handler: handler.getSubscriptionInvoiceByTenantId,
        description: "Get subscription invoices by tenant ID",
        tags: ["api", "subscription-invoice"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

  ];
  server.route(routes);
};
export = {
  name: "api-subcriptioninvoice",
  register,
};
