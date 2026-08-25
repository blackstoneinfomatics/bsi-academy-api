import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { CustomServiceInvoiceValidation } from "../../models/finance_invoice";


import { customServiceInvoiceMessages } from "../../config/messages";
import { createCustomServiceInvoice, getCustomServiceInvoiceById } from "../../operations/createinvoice";


const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createCustomServiceInvoiceApiValidation = z.object({
  payload: CustomServiceInvoiceValidation,
});

export const getCustomServiceInvoiceByIdValidation = z.object({
  params: z.object({
    invoiceId: objectId,
  }),
});



export const sendCustomServiceInvoiceValidation = z.object({
  params: z.object({ invoiceId: objectId }),
  payload: z.object({
    paymentLink: z.string().url("Valid payment link is required").optional(),
  }).default({}),
});



export default {
  createCustomServiceInvoice: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createCustomServiceInvoiceApiValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.errors[0].message,
          })
          .code(400);
      }

      const result = await createCustomServiceInvoice(parsed.data.payload);

      return h
        .response({
          success: true,
          message: customServiceInvoiceMessages.CREATE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
        })
        .code(err.statusCode || 500);
    }
  },

  getCustomServiceInvoiceById: async (
    request: Request,
    h: ResponseToolkit,
  ) => {
    try {
      const parsed = getCustomServiceInvoiceByIdValidation.safeParse({
        params: request.params,
      });

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.errors[0].message,
          })
          .code(400);
      }

      const result = await getCustomServiceInvoiceById(
        parsed.data.params.invoiceId,
      );

      return h
        .response({
          success: true,
          message: customServiceInvoiceMessages.FETCH_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
        })
        .code(err.statusCode || 500);
    }
  },

 

 
};
