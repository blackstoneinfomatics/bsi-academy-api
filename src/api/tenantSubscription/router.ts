import { Server, ServerRoute } from "@hapi/hapi";
import handler from './handler';


const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [


{
      method: 'GET',
      path: '/tenantsubscription',
      options: {
        handler: handler.getTenantSubscriptionDetails,
        tags: ['api', 'tenantSubscription'],
        // auth: {
        //   strategies: ['jwt']
        // },
      },
    },

    {
  method: "GET",
  path: "/tenant-subscription/{tenantId}",
  options: {
    handler: handler.getTenantSubscriptionByTenantId,
    description: "Get tenant subscription by tenant ID",
    tags: ["api", "tenant-subscription"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},

{
  method: "GET",

  path: "/tenant-subscriptions/dashboard",

  options: {
    handler:
      handler.getTenantSubscriptionDashboard,

    description:
      "Get tenant subscription dashboard",

    tags: ["api", "tenant-subscriptions"],

    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},

{
  method: "GET",

  path: "/subscription/analytics/growth",

  options: {
    handler:
      handler.getTenantSubscriptionGrowthAnalytics,

    description:
      "Get tenant subscription growth analytics",

    tags: ["api", "tenant-subscriptions"],

    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},

{
  method: "GET",
  path: "/tenantsubscription/analytics/card",
  options: {
    handler: handler.getTenantSubscriptionanalyticsCard,
    description: "Get tenant subscription analytics card",
    tags: ["api", "tenantSubscription"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},

{
  method: "GET",
  path: "/tenant-subscription-activities",
  options: {
    handler: handler.getTenantSubscriptionActivities,
    description: "Get today's tenant subscription activities",
    tags: ["api", "tenant-subscription"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
},



  ];
  server.route(routes);
};  


export = {
  name: 'api-tenantSubscription',
  register,
};