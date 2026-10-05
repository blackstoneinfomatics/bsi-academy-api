import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { dashboardMessages, dashboardsaasMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

 {
  method: "GET",
  path: "/api/dashboard/cards",
  options: {
    handler: handler.getDashboardCardsHandler,
    description: dashboardsaasMessages.DASHBOARD_COUNT,
    tags: ["api", "dashboard"],

    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},

{
  method: "GET",
  path: "/api/tenants/upcoming-renewals",
  options: {
    handler: handler.getUpcomingTenantRenewalsHandler,
    description: dashboardsaasMessages.EXPIRING_TENANTS,
    tags: ["api", "tenants"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
}, 

{
  method: "GET",
  path: "/api/tenants/recent",
  options: {
    handler: handler. getRecentlyAddedTenantsHandler,
    description: dashboardMessages.RECENT_ACTIVITIES,
    tags: ["api", "tenants"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
}
    
  ];
  server.route(routes);
};
export = {
  name: "api-dashboardsaas",
  register,
};
