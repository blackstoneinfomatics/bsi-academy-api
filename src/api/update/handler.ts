import { Request, ResponseToolkit } from "@hapi/hapi";
import { createUpdate, getUpdateById, getUpdateDashboardCards, getUpdatesList } from "../../operations/update";
import { createUpdateValidation } from "../../models/update";
import { z } from "zod";
import { updateMessage } from "../../config/messages";

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
}

}