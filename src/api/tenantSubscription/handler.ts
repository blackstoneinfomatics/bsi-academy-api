import { ResponseToolkit, Request } from "@hapi/hapi";
import { getActiveTenantSubscriptionRecord, getTenantSubscriptionDashboard } from "../../operations/tenantSubscription.";


export default {
   async getTenantSubscriptionDetails(req: Request, h: ResponseToolkit) {
    return getActiveTenantSubscriptionRecord();
  },
  
   async getTenantSubscriptionDashboard(
  req: Request,
  h: ResponseToolkit
) {
  try {
    const result =
      await getTenantSubscriptionDashboard();

    return h
      .response({
        success: true,
        message:
          "Tenant subscription dashboard fetched successfully.",
        data: result,
      })
      .code(200);

  } catch (error: any) {

    console.error(
      "Tenant Subscription Dashboard Error:",
      error
    );

    return h
      .response({
        success: false,
        message:
          error.message ||
          "Failed to fetch tenant subscription dashboard.",
      })
      .code(500);
  }
},


};
