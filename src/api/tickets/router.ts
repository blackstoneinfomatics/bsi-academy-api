import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/tickets",
      options: {
        handler: handler.create,
        auth: "jwt",
        tags: ["api", "tickets"],
        description: "Raise a ticket",
      },
    },
    {
      method: "GET",
      path: "/tickets",
      options: {
        handler: handler.list,
        auth: "jwt",
        tags: ["api", "tickets"],
        description:
          "List raised, received, or (for Super Admin) all tickets, with optional role and status filters",
      },
    },
    {
      method: "GET",
      path: "/tickets/{ticketId}/history",
      options: {
        handler: handler.history,
        auth: "jwt",
        tags: ["api", "tickets"],
        description: "Get ticket history",
      },
    },

{
  method: "GET",
  path: "/tickets/dashboard/cards",
  options: {
    handler: handler.dashboardCards,
    auth: "jwt",
    tags: ["api", "tickets"],
    description: "Get ticket dashboard card counts",
  },
},

    {
      method: "PATCH",
      path: "/tickets/{ticketId}/forward",
      options: {
        handler: handler.forward,
        auth: "jwt",
        tags: ["api", "tickets"],
        description: "Forward a ticket",
      },
    },
    {
      method: "PATCH",
      path: "/tickets/{ticketId}/acknowledge",
      options: {
        handler: handler.acknowledge,
        auth: "jwt",
        tags: ["api", "tickets"],
        description:
          "Acknowledge a ticket; optionally sendEmail and/or sendNotification",
      },
    },
    {
      method: "PATCH",
      path: "/tickets/{ticketId}/resolve",
      options: {
        handler: handler.resolve,
        auth: "jwt",
        tags: ["api", "tickets"],
        description:
          "Resolve a ticket; optionally sendEmail and/or sendNotification",
      },
    },
    {
      method: "PATCH",
      path: "/tickets/{ticketId}/reopen",
      options: {
        handler: handler.reopen,
        auth: "jwt",
        tags: ["api", "tickets"],
        description: "Reopen a resolved ticket",
      },
    },
    {
      method: "GET",
      path: "/tickets/{ticketId}",
      options: {
        handler: handler.details,
        auth: "jwt",
        tags: ["api", "tickets"],
        description: "Get ticket details",
      },
    },
  ];

  server.route(routes);
};

export = {
  name: "api-tickets",
  register,
};