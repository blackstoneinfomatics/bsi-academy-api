import { Request, ResponseToolkit } from "@hapi/hapi";
import {
  getAllTransactions,
  getFinanceTodayActivities,
  getFinanceTransactionCardCount,
  getRevenueDashboardSummary,
  getRevenueGrowth,
} from "../../operations/finance";
import { z } from "zod";
import { SubscriptionInvoiceStatus } from "../../shared/enum";
import { commonMessages, financeMessages } from "../../config/messages";



export const getRevenueGrowthValidation = z.object({
  query: z.object({
    view: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  }),
});

export const getFinanceRevenueGraphValidation = getRevenueGrowthValidation;

export const getSubscriptionInvoicesValidation = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(),
    status: z
      .enum([
        SubscriptionInvoiceStatus.PENDING,
        SubscriptionInvoiceStatus.PAID,
        SubscriptionInvoiceStatus.OVERDUE,
        SubscriptionInvoiceStatus.CANCELLED,
        SubscriptionInvoiceStatus.FAILED,
        SubscriptionInvoiceStatus.REFUNDED,
        SubscriptionInvoiceStatus.PARTIALLY_PAID,
      ])
      .optional(),

    tenantName: z.string().optional(),
    planName: z.string().optional(),
    invoiceFromDate: z.coerce.date().optional(),
    invoiceToDate: z.coerce.date().optional(),
    dueFromDate: z.coerce.date().optional(),
    dueToDate: z.coerce.date().optional(),
    sortBy: z
      .enum([
        "invoiceDate",
        "dueDate",
        "invoiceNumber",
        "totalAmount",
        "createdAt",
      ])
      .default("createdAt"),  
    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc"),
  }),
});

export default {

  async getFinanceTransactions(req: Request, h: ResponseToolkit) {
    const { query } = getSubscriptionInvoicesValidation.parse({
      query: req.query,
    });

    const reminders = await getAllTransactions(query);

    return h
      .response({
        success: true,
        message: financeMessages.TRANSACTIONS_FETCHED,
        data: reminders,
      })
      .code(200);
  },

  async getFinanceTransactionsCards(req: Request, h: ResponseToolkit) {
    const reminders = await getFinanceTransactionCardCount();
    return h
      .response({
        success: true,
        message: financeMessages.TRANSACTION_CARD_COUNT_FETCHED,
        data: reminders,
      })
      .code(200);
  },


  async getFinanceDashboardCount(request: Request, h: ResponseToolkit) {
    try {
      const result = await getRevenueDashboardSummary();

      return h
        .response({
          success: true,
          message: financeMessages.DASHBOARD_COUNT_FETCHED,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err?.message || commonMessages.INTERNAL_SERVER_ERROR,
          errorCode: err?.statusCode || 500,
        })
        .code(err?.statusCode || 500);
    }
  },

  async getFinanceRevenueGraph(request: Request, h: ResponseToolkit) {
    try {
      const { query } = getFinanceRevenueGraphValidation.parse({
        query: request.query,
      });

      const result = await getRevenueGrowth(query);

      return h
        .response({
          success: true,
          message: financeMessages.REVENUE_GRAPH_FETCHED,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err?.message || commonMessages.INTERNAL_SERVER_ERROR,
          errorCode: err?.statusCode || 500,
        })
        .code(err?.statusCode || 500);
    }
  },

  async getFinanceTodayActivities(request: Request, h: ResponseToolkit) {
    try {
      const result = await getFinanceTodayActivities();

      return h
        .response({
          success: true,
          message: financeMessages.TODAY_ACTIVITIES_FETCHED,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err?.message || financeMessages.TODAY_ACTIVITIES_FETCH_FAILED,
          errorCode: err?.statusCode || 500,
        })
        .code(err?.statusCode || 500);
    }
  },

};
