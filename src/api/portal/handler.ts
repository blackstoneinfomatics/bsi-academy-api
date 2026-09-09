import { Request, ResponseToolkit } from "@hapi/hapi";
import { portalMessages } from "../../config/messages";
import { throwError } from "../../helpers/throwError";
import { z } from "zod";
import { PortalBaseValidation } from "../../models/portal";
import {
  createPortalService,
  getAllPortalService,
  getPortalDashboardCountService,
} from "../../operations/portal";
import { PortalStatus, RoleType } from "../../shared/enum";

const createPortalValidation = z.object({
  payload: PortalBaseValidation.pick({
    portalName: true,
    portalType: true,
    roleType: true,
    description: true,
  }),
});

export const getAllPortalValidation = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),

    search: z.string().optional(),

    status: z
      .enum([PortalStatus.ACTIVE, PortalStatus.INACTIVE, PortalStatus.ARCHIVED])
      .optional(),

    roleType: z
      .enum([
        RoleType.ACADEMIC,
        RoleType.ADMINISTRATION,
        RoleType.FINANCE,
        RoleType.TRANSPORT,
        RoleType.HOSTEL,
      ])
      .optional(),

    sortBy: z
      .enum(["portalName", "portalId", "createdAt"])
      .default("createdAt"),

    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export default {
  createPortal: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createPortalValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const result = await createPortalService(parsed.data?.payload as any);

      return h
        .response({
          success: true,
          message: portalMessages.CREATE_PORTAL_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getAllPortal: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = getAllPortalValidation.safeParse({
        query: request.query,
      });

      if (!parsed.success) {
        throwError(portalMessages.VALIDATION_FAILED, 400);
      }

      const result = await getAllPortalService(parsed.data?.query);

      return h
        .response({
          success: true,
          message: portalMessages.GET_PORTALS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getPortalDashboardCountHandler: async (
    request: Request,
    h: ResponseToolkit,
  ) => {
    try {
      const result = await getPortalDashboardCountService();

      return h
        .response({
          success: true,
          message: "Portal dashboard statistics fetched successfully.",
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },
};
