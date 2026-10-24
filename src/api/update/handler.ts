import { Request, ResponseToolkit } from "@hapi/hapi";
import {
  createPurchaseRequestService,
  createUpdate,
  getPurchaseQuoteService,
  getTenantUpdateDetails,
  getTenantUpdates,
  getUpdateById,
  getUpdateDashboardCards,
  getUpdatesList,
} from "../../operations/update";
import { createUpdateValidation } from "../../models/update";
import { z } from "zod";
import { updateMessage } from "../../config/messages";
import { throwError } from "../../helpers/throwError";

export const getUpdatesListValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(10),

    search: z.string().optional(),

    status: z
      .enum([
        "Draft",
        "Scheduled",
        "Published",
        "Archived",
      ])
      .optional(),

    category: z.string().optional(),

    priority: z
      .enum(["Low", "Medium", "High"])
      .optional(),
  }),
});

export const getTenantUpdatesValidation = z.object({
  params: z.object({
    tenantId: z
      .string()
      .trim()
      .min(1, updateMessage.TENANT_UPDATE_TENANT_ID_REQUIRED),
  }),
});

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const GetPurchaseQuoteValidation = z.object({
  params: z.object({
    updateId: objectId,
  }),
  query: z.object({
    activationMode: z.enum(["IMMEDIATE", "NEXT_PLAN"]),
  }),
});

export const createPurchaseQuoteValidation = z.object({
  params: z.object({
    updateId: objectId,
  }),
  query: z.object({
    activationMode: z.enum(["IMMEDIATE", "NEXT_PLAN"]),
    requestedBy: z.string().trim().min(1, "Requested By is required")
  }),
});

export const getTenantUpdateDetailsValidation = z.object({
  params: z.object({
    updateId: objectId,
  }),
});

export default
{ 
  async createUpdateHandler(
  request: Request,
  h: ResponseToolkit
) {
  try {

    const parsed = createUpdateValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0]?.message || "Invalid update payload",
          errorCode: 400,
        })
        .code(400);
    }

    const result = await createUpdate(parsed.data);

    return h
      .response({
        success: true,
        message: updateMessage.CREATE_UPDATE_SUCCESS,
        data: result,
      })
      .code(201);

  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };

    return h
      .response({
        success: false,
        message: error.message || "Internal Server Error",
        errorCode: error.statusCode || 500,
      })
      .code(error.statusCode || 500);
  }
},

  async getUpdateDashboardCardsHandler(
    request: Request,
    h: ResponseToolkit,
  ) {
    try {
      const result = await getUpdateDashboardCards();

      return h
        .response({
          success: true,
          message: updateMessage.UPDATE_CARDS_SUCCESS,
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
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  async getUpdatesListHandler (
  request: Request,
  h: ResponseToolkit,
) {
  try {
    const { query } =
      getUpdatesListValidation.parse({
        query: request.query,
      });

    const result = await getUpdatesList(query);

    return h
      .response({
        success: true,
        message: updateMessage.UPDATE_TABLE_SUCCESS,
        data: result.data,
        pagination: result.pagination,
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
          err?.message ||
          "Internal Server Error",
        errorCode:
          err?.statusCode || 500,
      })
      .code(err?.statusCode || 500);
  }
},

  async getTenantUpdatesHandler(
    request: Request,
    h: ResponseToolkit,
  ) {
    const parsed = getTenantUpdatesValidation.safeParse({
      params: request.params,
    });

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message:
            parsed.error.issues[0]?.message ||
            updateMessage.TENANT_UPDATE_TENANT_ID_REQUIRED,
          errorCode: 400,
        })
        .code(400);
    }

    try {
      const result = await getTenantUpdates(parsed.data.params.tenantId);

      return h
        .response({
          success: true,
          message: updateMessage.TENANT_UPDATES_FETCHED_SUCCESS,
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
            err.message || updateMessage.TENANT_UPDATES_FETCH_FAILED,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  async getUpdateByIdHandler (
  request: Request,
  h: ResponseToolkit
) {
  try {
    const { id } = request.params as {
      id: string;
    };

    const result = await getUpdateById(id);

    return h
      .response({
        success: true,
        message: updateMessage.UPDATE_GETBYID_SUCCESS,
        data: result,
      })
      .code(200);

  } catch (error: unknown) {

    const err = error as {
      message?: string;
      statusCode?: number;
    };

    console.error(
      "❌ Get Update By ID Error:",
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

async createPurchase(request: Request,
  h: ResponseToolkit){
     try {
    const parsed = createPurchaseQuoteValidation.safeParse({
      params: request.params,
      query: request.query,
    });
       
    const tenantId = request.headers.tenantid as string;


    if (!parsed.success) {
      throwError(parsed.error.issues[0].message, 400);
    }

     const paramData = parsed?.data?.params as any;
     const queryData = parsed?.data?.query as any;

    const result = await createPurchaseRequestService({
      tenantId,
      updateId: paramData.updateId,
      activationMode: queryData.activationMode,
      requestedBy:queryData.requestedBy,
    });

    return h.response({
      success: true,
      message: updateMessage.CREATE_UPDATE_SUCCESS,
      data: result,
    }).code(200);
  } catch (error) {
    throw error;
  }
  },

async getPurchaseQuote (
  request: Request,
  h: ResponseToolkit,
){
  try {
    const parsed = GetPurchaseQuoteValidation.safeParse({
      params: request.params,
      query: request.query,
    });
       
    const tenantId = request.headers.tenantid as string;


    if (!parsed.success) {
      throwError(parsed.error.issues[0].message, 400);
    }

     const paramData = parsed?.data?.params as any;
     const queryData = parsed?.data?.query as any;

    const result = await getPurchaseQuoteService({
      tenantId,
      updateId: paramData.updateId,
      activationMode: queryData.activationMode,
    });

    return h.response({
      success: true,
      message: "Purchase quote calculated successfully",
      data: result,
    }).code(200);
  } catch (error) {
    throw error;
  }
},

async getTenantUpdateDetailsHandler (
  request: Request,
  h: ResponseToolkit
) {
  try {
    const validation = getTenantUpdateDetailsValidation.safeParse({
      params: request.params,
    });

    if (!validation.success) {
      return h.response({
        success: false,
        message: updateMessage.UPDATE_VALIDATION_FAILED,
        data: null,
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      }).code(400);
    }

    const tenantId = request.headers.tenantid as string;

    if (!tenantId) {
      return h.response({
        success: false,
        message: updateMessage.UPDATE_TENANT_FAILED,
        data: null,
      }).code(401);
    }

    const result = await getTenantUpdateDetails({
      updateId: validation.data.params.updateId,
      tenantId,
    });

    return h.response({
      success: true,
      message: updateMessage.UPDATE_FETCHED_SUCCESS,
      data: result,
    }).code(200);
  } catch (error: unknown) {
    const err = error as { message?: string };
    const message = err.message || updateMessage.UPDATE_FETCH_FAILED;

    const statusCode =
      message === updateMessage.UPDATE_INVALID_ID
        ? 400
        : message === updateMessage.UPDATE_NOT_FOUND
          ? 404
          : 500;

    return h.response({
      success: false,
      message,
      data: null,
    }).code(statusCode);
  }
}


}