import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import {
  PaymentGateway,
  RefundApprovalStatus,
  RefundStatus,
} from "../../shared/enum";
import { refundMessages } from "../../config/messages";
import {
    getRefundDashboardStatsService,
  getRefundTransactionsByIdService,
  getRefundTransactionsService,
} from "../../operations/refundtransaction";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const getRefundTransactionByIdValidation = z.object({
  params: z.object({
    refundId: objectId,
  }),
});
export const getAllRefundQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),

    tenantName: z.string().optional(),

    refundStartDate: z.coerce.date().optional(),
    refundEndDate: z.coerce.date().optional(),

    status: z
      .enum([
        RefundApprovalStatus.APPROVED,
        RefundApprovalStatus.PENDING,
        RefundApprovalStatus.REJECTED,
      ])
      .optional(),

    refundStatus: z
      .enum([RefundStatus.FAILED, RefundStatus.PAID, RefundStatus.PENDING])
      .optional(),

    paymentMethod: z.string().optional(),

    gateway: z.enum([PaymentGateway.MANUAL, PaymentGateway.STRIPE]).optional(),

    sortBy: z.enum(["requestedDate", "amount", "createdAt"]).optional(),

    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export default {
  getRefundTransactions: async (request: Request, h: ResponseToolkit) => {
    try {
      const { query } = getAllRefundQueryValidation.parse({
        query: request.query,
      });

      const result = await getRefundTransactionsService(query);

      return h
        .response({
          success: true,
          message: refundMessages.GET_REFUND_TRANSACTIONS_SUCCESS,
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

  getRefundTransactionById: async (request: Request, h: ResponseToolkit) => {
    try {
      const { params } = getRefundTransactionByIdValidation.parse({
        params: request.params,
      });
      const result = await getRefundTransactionsByIdService(params.refundId);

      return h
        .response({
          success: true,
          message: refundMessages.GET_REFUND_BY_ID_SUCCESS,
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

  getRefundDashboardCount: async (request: Request, h: ResponseToolkit) => {
    try {
      const data = await getRefundDashboardStatsService();

      return h
        .response({
          success: true,
          message: refundMessages.DASHBOARD_CARD_COUNT_FETCH_SUCCESS,
          data,
        })
        .code(200);
    } catch (err) {
        
      return h
        .response({
          success: false,
          message: refundMessages.INTERNAL_SERVER_ERROR,
          statusCode: 500,
        })
        .code(500);
    }
  },
};
