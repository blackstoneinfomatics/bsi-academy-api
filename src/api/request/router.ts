import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/backup-request",
      options: {
        handler: handler.createBackupRequestHandler,
        tags: ["api", "request"],
        description: "Submit a tenant backup request",
      },
    },
    {
      method: "POST",
      path: "/plan-change-request",
      options: {
        handler: handler.createPlanChangeRequestHandler,
        tags: ["api", "request"],
        description: "Submit a tenant plan change request",
      },
    },

    {
      method: "POST",
      path: "/portal-request/create",
      handler: handler.createPortalRequest,
      options: {
        tags: ["api", "request"],
        description: "Create a portal or feature request",
        auth: "jwt",
      },
    },

     {
      method: "POST",
      path: "/refund-request/create",
      handler: handler.createRefundRequest,
      options: {
        auth: "jwt",
        tags: ["api", "request"],
        description: "Create a refund request",
      },
    },
  ];

  server.route(routes);
};

export = {
  name: "api-request",
  register,
};