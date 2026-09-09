import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { portalMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/portal",
      options: {
        handler: handler.createPortal,
        description: portalMessages.CREATE_PORTAL,
        tags: ["api", "portal"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/portal",
      handler: handler.getAllPortal,
      options: {
        description: portalMessages.GET_PORTALS,
        tags: ["api", "Portal"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
    {
      method: "GET",
      path: "/portal/dashboard/count",
      handler: handler.getPortalDashboardCountHandler,
      options: {
        description: portalMessages.DASBOARD_CARD_COUNT,
        tags: ["api", "Portal"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
  ];
  server.route(routes);
};
export = {
  name: "api-portal",
  register,
};
