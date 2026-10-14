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
  ];

  server.route(routes);
};

export = {
  name: "api-request",
  register,
};