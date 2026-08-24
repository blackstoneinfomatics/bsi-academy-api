import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

    {
      method: "GET",
      path: "/finance/transactions",
      options: {
        handler: handler.getFinanceTransactions, 
        tags: ["api", "finance"],  
      },
    }
,
    {
      method: "GET",
      path: "/finance/transactions/cards",
      options: {
        handler: handler.getFinanceTransactionsCards, 
        tags: ["api", "finance"],  
      },
    }
    ,
    {
      method: "GET",
      path: "/finance/analytics/count",
      options: {
        handler: handler.getFinanceDashboardCount,
        description: "Get finance dashboard card counts and summary values for total revenue, collected, pending and refunded",
        tags: ["api", "finance"],
      },
    },
    {
      method: "GET",
      path: "/finance/dashboard/graph",
      options: {
        handler: handler.getFinanceRevenueGraph,
        description: "Get revenue graph data with month/year filtering",
        tags: ["api", "finance"],
      },
    },
    {
      method: "GET",
      path: "/finance/today-activities",
      options: {
        handler: handler.getFinanceTodayActivities,
        description: "Get today's finance activity entries for the dashboard table",
        tags: ["api", "finance"],
      },
    },
   
  ];
  server.route(routes);
};
export = {
  name: "api-finance",
  register,
};
