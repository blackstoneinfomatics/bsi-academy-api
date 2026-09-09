import { Request, ResponseToolkit } from "@hapi/hapi";
import {
  getDashboardCards,
  getTenantsGrowth ,
} from "../../operations/analytics";
import { analyticsMessages } from "../../config/messages";

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
      const { period } = request.query as {
        period?: string;
      };

      const result = await getTenantsGrowth(period);

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
};

