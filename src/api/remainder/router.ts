// ==============================
// router.ts
// ==============================

import { Server, ServerRoute } from "@hapi/hapi";

import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    // CREATE REMINDER
    {
      method: "POST",
      path: "/reminders",
      options: {
        handler: handler.createReminder,
        description: "Create a new reminder configuration",
        tags: ["api", "reminders"],
      },
    },

    // GET ALL REMINDERS
    {
      method: "GET",
      path: "/reminders",
      options: {
        handler: handler.getReminders,
        description: "Retrieve all reminder configurations",
        tags: ["api", "reminders"],
      },
    },

    // GET REMINDER BY ID
    {
      method: "GET",
      path: "/reminders/{reminderId}",
      options: {
        handler: handler.getReminderById,
        description: "Retrieve a reminder configuration by reminderId",
        tags: ["api", "reminders"],
      },
    },

    // UPDATE REMINDER
    {
      method: "PUT",
      path: "/reminders/{reminderId}",
      options: {
        handler: handler.updateReminder,
        description: "Update an existing reminder configuration",
        tags: ["api", "reminders"],
      },
    },

    // DELETE REMINDER
    {
      method: "DELETE",
      path: "/reminders/{reminderId}",
      options: {
        handler: handler.deleteReminder,
        description: "Delete a reminder configuration by reminderId",
        tags: ["api", "reminders"],
      },
    },

    // GET REMINDER DISPATCH HISTORY
    {
      method: "GET",
      path: "/reminders/{reminderId}/history",
      options: {
        handler: handler.getReminderHistory,
        description: "Retrieve dispatch history for a reminder configuration",
        tags: ["api", "reminders"],
      },
    },
  ];

  server.route(routes);
};

export = {
  name: "api-reminders",
  register,
};
