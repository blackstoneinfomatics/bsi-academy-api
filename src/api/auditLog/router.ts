import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { auditLogMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "GET",
      path: "/audit-log/tenant/{tenantId}",
      handler: handler.getAuditLogsByTenant,
      options: {
        description: auditLogMessages.GET_TENANT_AUDIT_LOGS,
        tags: ["api", "AuditLog"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
  ];
  server.route(routes);
};
export = {
  name: "api-auditLog",
  register,
};
