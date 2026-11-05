import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { backupRequestMessages } from "../../config/messages";

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
  method: "GET",
  path: "/backup/download/{backupId}",
  options: {
    handler: handler.downloadTenantBackup,
    description: "Download tenant backup Excel file",
    tags: ["api", "backup"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},

{
  method: "GET",
  path: "/backup/status/{backupId}",
  options: {
    handler: handler.getTenantBackupStatus,
    description: "Get tenant backup status",
    tags: ["api", "backup"],
    // auth: {
    //   strategies: ["jwt"],
    // },
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

{
  method: "GET",
  path: "/tenant/backup/dashboard/cards",
  handler: handler.getTenantBackupCardsHandler,
  options: {
    // auth: {
    //   strategy: "jwt",
    // },
    description: backupRequestMessages.GET_BACKUP_CARDS,
    tags: ["api", "tenant", "backup"],
  },
},

{
  method: "GET",
  path: "/tenant/backup/list",
  handler: handler.getTenantBackupListHandler,
  options: {
    description: backupRequestMessages.GET_BACKUP_LIST,
    tags: ["api", "backup"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},

  ];

  server.route(routes);
};

export = {
  name: "api-request",
  register,
};