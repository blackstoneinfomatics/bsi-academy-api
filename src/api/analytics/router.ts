import { Server, ServerRoute } from "@hapi/hapi";
import { analyticsMessages } from "../../config/messages";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

{
  method: "GET",
  path: "/dashboard/cards",
  options: {
    handler: handler.getDashboardCards,
    description: analyticsMessages.GET_CARD_COUNT_SUCCESS,
    tags: ["api", "dashboard"],
      // auth: {
        //   strategies: ["jwt"],
        // },
  },
},

{
  method: "GET",
  path: "/analytics/tenants-growth",
  options: {
    handler: handler.getTenantsGrowthCount,
    description: analyticsMessages.ANALYTICS_GROWTH_CARD,
    tags: ["api", "analytics"],
      // auth: {
        //   strategies: ["jwt"],
        // },
  },
},
    
  ];
  server.route(routes);
};
export = {
  name: "api-analyticscount",
  register,
};
