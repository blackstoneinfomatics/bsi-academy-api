import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { userMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
   
    {
      method: "POST",
      path: "/expense",
      options: {
        handler: handler.createExpense,
        // description: userMessages.CREATE,
        tags: ["api", "expense"],
        auth: {
          strategies: ["jwt"],
        }, },
    },

    {
        method: "GET",
        path: "/expense",
        options: {
          handler: handler.getAllExpenses,
          // description: userMessages.CREATE,
          tags: ["api", "expense"],
          auth: {
            strategies: ["jwt"],
          }, },
      },
      {
        method: "GET",
        path: "/expenseCardCounts",
        options: {
          handler: handler.getAllExpensesCardCount,
          // description: userMessages.CREATE,
          tags: ["api", "expense"],
          auth: {
            strategies: ["jwt"],
          }, },
      },

  ];
  server.route(routes);
};
export = {
  name: "api-expense",
  register,
};
