import { Request, ResponseToolkit } from "@hapi/hapi";
import { z, ZodError } from "zod";
import { SubscriptionInvoiceBaseValidation } from "../../models/subscriptionInvoice";
import {
  createSubscriptionInvoice,
  getSubscriptionInvoiceDashboardCount,
  getSubscriptionInvoiceById,
  getSubscriptionInvoices,
  getAllTransactions,
  getFinanceTransactionCardCount,
} from "../../operations/subcriptionInvoice";
import { SubscriptionInvoiceStatus } from "../../shared/enum";
import { subscriptionInvoiceMessages } from "../../config/messages";
import { throwError } from "../../helpers/throwError";

export const createSubscriptionInvoiceValidation = z.object({
  payload: SubscriptionInvoiceBaseValidation.pick({
    planId: true,
    tenantId: true,
    billingPeriodId: true,
    invoiceDate: true,
    dueDate: true,
    currency: true,
    paymentTerms: true,
    discountAmount: true,
    invoiceNumber: true,
    subscriptionId: true,
    subtotal: true,
    taxAmount: true,
    totalAmount: true,
    nextReminderDate: true,
    notes: true,
    attachments: true,
    createdBy: true,
  }).refine((data) => data.dueDate >= data.invoiceDate, {
    path: ["dueDate"],
    message: "Due date must be greater than or equal to invoice date.",
  }),
});

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const getSubscriptionInvoiceByIdValidation = z.object({
  params: z.object({
    invoiceId: objectId,
  }),
});

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
  createSubscriptionInvoice: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createSubscriptionInvoiceValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const result = await createSubscriptionInvoice(
        parsed.data?.payload as any,
        parsed.data?.payload.tenantId as string,
      );

      return h
        .response({
          message: subscriptionInvoiceMessages.CREATE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {

      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500) 
    }
  },

  getSubscriptionInvoiceDashboardCount: async (
    request: Request,
    h: ResponseToolkit,
  ) => {
    try {
      const result = await getSubscriptionInvoiceDashboardCount();

      return h
        .response({
          success: true,
          message:
            subscriptionInvoiceMessages.FETCH_ALL_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500) 
    }
  },

  getSubscriptionInvoices: async (request: Request, h: ResponseToolkit) => {
  try {
    const { query } = getSubscriptionInvoicesValidation.parse({
      query: request.query,
    });

    const result = await getSubscriptionInvoices(query);

    return h.response({
      success: true,
      message: subscriptionInvoiceMessages.FETCH_DASHBOARD_COUNT_SUCCESS,
      data: result,
    }).code(200);

  } catch (err: any) {
    return h.response({
          success: false,
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500) 
  }
},

  getSubscriptionInvoiceById: async (request: Request, h: ResponseToolkit) => {
    try {
      const { params } = getSubscriptionInvoiceByIdValidation.parse({
        params: request.params,
      });

      const result = await getSubscriptionInvoiceById(params.invoiceId);

      return h
        .response({
          success: true,
          message: subscriptionInvoiceMessages.FETCH_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500) 
    }
  },

  async getFinanceTransactions(req: Request, h: ResponseToolkit) {
    const { query } = getSubscriptionInvoicesValidation.parse({
      query: req.query,
    });

    const reminders = await getAllTransactions(query);

    return h
      .response({
        success: true,
        data: reminders,
      })
      .code(200);
  },

  async getFinanceTransactionsCards(req: Request, h: ResponseToolkit) {
    

    const reminders = await getFinanceTransactionCardCount();

    return h
      .response({
        success: true,
        data: reminders,
      })
      .code(200);
  },
};
