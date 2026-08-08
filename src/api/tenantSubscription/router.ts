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

  ];
  server.route(routes);
};  





export = {
  name: 'api-tenantSubscription',
  register,
};