import { Request, ResponseToolkit } from "@hapi/hapi";
import { getDashboardCards, getRecentlyAddedTenants, getUpcomingTenantRenewals } from "../../operations/dashboardsaas";
import { dashboardsaasMessages } from "../../config/messages";

export default {
 getDashboardCardsHandler: async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const result = await getDashboardCards();

    return h
      .response({
        success: true,
        message: dashboardsaasMessages.DASHBOARD_COUNT_SUCCESS,
        data: result,
      })
      .code(200);

  } catch (error: unknown) {

    const err = error as {
      message?: string;
      statusCode?: number;
    };

    return h
      .response({
        success: false,
        message:
          err?.message || "Internal Server Error",
        errorCode:
          err?.statusCode || 500,
      })
      .code(err?.statusCode || 500);
  }
},

getUpcomingTenantRenewalsHandler: async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const result = await getUpcomingTenantRenewals();

    return h
      .response({
        success: true,
        message: dashboardsaasMessages.EXPIRING_TENANTS_SUCCESS,
        data: result,
      })
      .code(200);
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      statusCode?: number;
    };

    console.error(
      "❌ Get Upcoming Tenant Renewals Error:",
      err?.message || error
    );

    return h
      .response({
        success: false,
        message: err?.message || "Internal Server Error",
        errorCode: err?.statusCode || 500,
      })
      .code(err?.statusCode || 500);
  }
},

getRecentlyAddedTenantsHandler : async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const result = await getRecentlyAddedTenants();

    return h
      .response({
        success: true,
        message: "Recently added tenants fetched successfully",
        data: result,
      })
      .code(200);
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      statusCode?: number;
    };

    console.error(
      "❌ Get Recently Added Tenants Error:",
      err?.message || error
    );

    return h
      .response({
        success: false,
        message: err?.message || "Internal Server Error",
        errorCode: err?.statusCode || 500,
      })
      .code(err?.statusCode || 500);
  }
},

};