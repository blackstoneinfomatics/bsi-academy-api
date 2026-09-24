import { Request, ResponseToolkit } from "@hapi/hapi";
import { revenueMessages } from "../../config/messages";
import { getRevenueDashboardStatsService, getLatestTenantRevenueService, getRevenueNetRevenueOverviewService, getMonthRevenueService } from "../../operations/revenue";
import { z } from "zod";
import { FilterOptions } from "../../shared/enum";

const getMonthRevenueValidation = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sortBy: z.enum(["requestedDate", "amount", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
});

const getNetRevenueOverviewValidation = z.object({
      query: z.object({
        filter: z.enum([FilterOptions.WEEKLY ,FilterOptions.MONTHLY,FilterOptions.YEARLY]).default(FilterOptions.MONTHLY),
      })
});

export default {
  getRevenueDashboardCount: async (request:Request,h: ResponseToolkit) => {
    try {
      const result = await getRevenueDashboardStatsService();
      return h
        .response({
          success: true,
          message: revenueMessages.DASHBOARD_CARD_COUNT_FETCH_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.message || "Internal Server Error",
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  },

  getRevenueLatestTenant: async (request:Request,h: ResponseToolkit) => {
    try{
      const result = await getLatestTenantRevenueService();
      return h
        .response({
          success: true,
          message: revenueMessages.LATEST_TENANT_REVENUE_FETCH_SUCCESS,
          data: result,
        })
        .code(200);
    }catch(error:any){
      return h
        .response({
          success: false,
          message: error.message || "Internal Server Error",
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  },

  getRevenueNetRevenueOverview: async(request:Request,h: ResponseToolkit) => {
    try{
       const { query } = getNetRevenueOverviewValidation.parse({
        query: request.query,
      });

      const result = await getRevenueNetRevenueOverviewService(query.filter);
      
      return h
        .response({
          success: true,
          message: revenueMessages.NEW_TENANT_REVENUE_FETCH_SUCCESS,
          data: result,
        })
        .code(200);

    }catch(error:any){
      return h
        .response({
          success: false,
          message: error.message || "Internal Server Error",
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  },

  getRevenueMonthRevenue: async(request:Request,h: ResponseToolkit) => {
    try{
       const { query } = getMonthRevenueValidation.parse({
         query: request.query,
       })

      const result = await getMonthRevenueService(query);
      return h 
        .response({
          success: true,
          message: result.message || revenueMessages.MONTHLY_TENANT_REVENUE_FETCH_SUCCESS,
          data: result,
        })

    }catch(error:any){
      return h
        .response({
          success: false,
          message: error.message || "Internal Server Error",
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  }
};
