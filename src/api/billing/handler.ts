import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { BillingValidation } from "../../models/billing";
import { BillingStatus } from "../../shared/enum";
import {
  createBilling,
  getBillingById,
  getBillings,
} from "../../operations/billing";
import { billingMessages } from "../../config/messages";


export const createBillingValidation = z.object({
  payload: BillingValidation.pick({
    billingName: true,
    paymentDate: true,
    amount: true,
    category: true,
    paymentMethod: true,
    addedBy: true,
    status: true,
    createdBy: true,
  }),
});

export const getBillingByIdValidation = z.object({
  params: z.object({
    billingId: z.string().trim().min(1, "Billing ID is required"),
  }),
});

export const getBillingsValidation = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(),
    status: z
      .enum([
        BillingStatus.PAID,
        BillingStatus.PENDING,
        BillingStatus.OVERDUE,
        BillingStatus.CANCELLED,
      ])
      .optional(),
    category: z.string().optional(),
    paymentMethod: z.string().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    sortBy: z
      .enum(["paymentDate", "billingName", "amount", "createdAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export default {
  createBilling: async (request: Request, h: ResponseToolkit) => {
    try {
      const { payload } = createBillingValidation.parse({
        payload: request.payload,
      });
    const sharedId = `BILLING-ID-${String(Math.floor(1 + Math.random() * 99)).padStart(2, '0')}`;

      const result = await createBilling({
        ...payload,
        billingId: sharedId,
        createdBy: payload.createdBy || payload.addedBy,
      });

      return h
        .response({
          success: true,
          message: billingMessages.CREATE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err?.message || billingMessages.VALIDATION_FAILED,
          ...(err?.errors ? { errors: err.errors } : {}),
        })
        .code(err?.statusCode || 500);
    }
  },

  getBillings: async (request: Request, h: ResponseToolkit) => {
    try {
      const { query } = getBillingsValidation.parse({
        query: request.query,
      });

      const result = await getBillings(query);

      return h
        .response({
          success: true,
          message: billingMessages.GET_ALL_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err?.message || billingMessages.VALIDATION_FAILED,
          ...(err?.errors ? { errors: err.errors } : {}),
        })
        .code(err?.statusCode || 500);
    }
  },

  getBillingById: async (request: Request, h: ResponseToolkit) => {
    try {
      const { params } = getBillingByIdValidation.parse({
        params: request.params,
      });

      const billing = await getBillingById(params.billingId);

      return h
        .response({
          success: !!billing,
          message: billing
            ? billingMessages.GET_BY_ID_SUCCESS
            : billingMessages.BILLING_NOT_FOUND,
          data: billing,
        })
        .code(billing ? 200 : 404);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err?.message || billingMessages.VALIDATION_FAILED,
          ...(err?.errors ? { errors: err.errors } : {}),
        })
        .code(err?.statusCode || 500);
    }
  },

  
};
