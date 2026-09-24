import { Server, ServerRoute } from "@hapi/hapi";
import handler from './handler';
import { tenantSubscriptionMessages } from "../../config/messages";

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
    description: tenantSubscriptionMessages.GET_BY_TENANTID,
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
      tenantSubscriptionMessages.GET_DASHBOARD,

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
      tenantSubscriptionMessages.GET_GROWTH_ANALYSTICS,

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
    description: tenantSubscriptionMessages.GET_ANALYTICS_CARD,
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
    description: tenantSubscriptionMessages.GET_ACTIVITIES,
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