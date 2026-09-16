import { Request, ResponseToolkit } from "@hapi/hapi";
import {
  getDashboardCards,
  getTenantsGrowth,getTenantSubscriptionActivities,
  getAnalyticsChart,
  getRevenueOverview
} from "../../operations/analytics";
import { analyticsMessages } from "../../config/messages";
import { RevenuePeriod, TenantGrowthPeriod } from "../../shared/enum";
import { z } from "zod";

const getTenantsGrowthValidation = z.object({
  query: z.object({
    period: z
      .enum([
        TenantGrowthPeriod.WEEKLY,
        TenantGrowthPeriod.MONTHLY,
        TenantGrowthPeriod.YEARLY,
      ])
      .default(TenantGrowthPeriod.MONTHLY),
  }),
});

const getRevenueOverviewValidation = z.object({
  query: z.object({
    period: z
      .enum([
        RevenuePeriod.WEEKLY,
        RevenuePeriod.MONTHLY,
      ])
      .default(RevenuePeriod.WEEKLY),
  }),
});

export default {
  getDashboardCards: async (
    request: Request,
    h: ResponseToolkit
  ) => {
    try {
      const result = await getDashboardCards();

      return h
        .response({
          success: true,
          message: analyticsMessages.FETCH_CARD_COUNT_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: unknown) {
      const error = err as {
        message?: string;
        statusCode?: number;
      };

      return h
        .response({
          success: false,
          message: error.message || "Internal Server Error",
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  },

  getTenantsGrowthCount: async (
    request: Request,
    h: ResponseToolkit
  ) => {
     try {
    const { query } = getTenantsGrowthValidation.parse({
      query: request.query,
    });

    const result = await getTenantsGrowth(query.period);

      return h
        .response({
          success: true,
          message:analyticsMessages.GROWTH_CARD_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: unknown) {
      const error = err as {
        message?: string;
        statusCode?: number;
      };

      return h
        .response({
          success: false,
          message: error.message || "Internal Server Error",
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  },

 getTenantSubscriptionActivitiesOperation : async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const result =
      await getTenantSubscriptionActivities();

    return h
      .response({
        success: true,
        message: analyticsMessages.FETCH_ANALYTICS_ACTIVITY_SUCCESS,
        data: result,
      })
      .code(200);
  } catch (err: unknown) {
    const error = err as {
      message?: string;
      statusCode?: number;
    };

    return h
      .response({
        success: false,
        message:
          error.message || "Internal Server Error",
        errorCode: error.statusCode || 500,
      })
      .code(error.statusCode || 500);
  }
},


getAnalyticsChartCount: async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const result = await getAnalyticsChart();

    return h
      .response({
        success: true,
        message:
          analyticsMessages.ANALYSTICS_CARD_COUNT_SUCCESS,
        data: result,
      })
      .code(200);
  } catch (err: unknown) {
    const error = err as {
      message?: string;
      statusCode?: number;
    };

    return h
      .response({
        success: false,
        message: error.message || "Internal Server Error",
        errorCode: error.statusCode || 500,
      })
      .code(error.statusCode || 500);
  }
},

getRevenueOverviewOperation: async (
  request: Request,
  h: ResponseToolkit
) => {
try {
    const { query } = getRevenueOverviewValidation.parse({
      query: request.query,
    });

    const result = await getRevenueOverview(query.period);

    return h
      .response({
        success: true,
        message: analyticsMessages.FETCH_REVENUE_OVERVIEW_SUCCESS,
        data: result,
      })
      .code(200);
  } catch (err: unknown) {
    const error = err as {
      message?: string;
      statusCode?: number;
    };

    return h
      .response({
        success: false,
        message: error.message || "Internal Server Error",
        errorCode: error.statusCode || 500,
      })
      .code(error.statusCode || 500);
  }
},

};


