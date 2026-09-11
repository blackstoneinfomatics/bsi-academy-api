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
import {createCustomTenantPortalService,updateTenantPortalStatusService} from "../../operations/tenantPortal"
import { PortalStatus, PortalType, RoleType } from "../../shared/enum";
import { getTenantPortals } from "../../operations/tenantPortal";
import { TenantPortalBaseValidation } from "../../models/tenantPortal";

const createPortalValidation = z.object({
  payload: PortalBaseValidation.pick({
    portalName: true,
    portalType: true,
    roleType: true,
    description: true,
  }),
});
export const createTenantPortalValidation = z.object({
  payload: TenantPortalBaseValidation.pick({
    tenantId: true,
    portalName: true,
    roleType: true,
    portalType: true,
    userLimit: true,
    isEnabled: true,
    description: true,
    createdBy: true,
  }),
});

export const getTenantPortalByIdValidation = z.object({
  params: z.object({
    tenantId: z.string(),
  }),
});
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const updateTenantPortalStatusValidation = z.object({
  params: z.object({
    tenantPortalId: objectId,
  }),

  payload: z.object({
    isEnabled: z.boolean({
      required_error: "isEnabled",
    }),
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

export const getTenantPortalValidation = z.object({
  params: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),

  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),

    search: z.string().optional(),

    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),

    roleType: z
      .enum(["ACADEMIC", "ADMINISTRATION", "FINANCE", "TRANSPORT", "HOSTEL"])
      .optional(),

    portalType: z.enum(["DEFAULT", "CUSTOM"]).optional(),

    isEnabled: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        return val === "true";
      }),

    sortBy: z
      .enum(["createdAt", "portalName", "portalCode"])
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

  createPortalToTenant: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createTenantPortalValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        const err = parsed.error.errors[0];

        const field = err.path.filter((p) => p !== "payload").join(".");

        throwError(`${field}: ${err.message}`, 400);
      }

      const result = await createCustomTenantPortalService(
        parsed.data?.payload,
      );
      return h
        .response({
          success: true,
          message: portalMessages.CREATE_PORTAL_TO_TENANT_SUCCESS,
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

  getAllTenantPortal: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = getTenantPortalValidation.safeParse({
        params: request.params,
        query: request.query,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const data = parsed.data;

      const tenantId = data?.params.tenantId;
      const query = data?.query;

      const result = await getTenantPortals(query, tenantId || "");

      return h
        .response({
          success: true,
          message: portalMessages.GET_TENANT_PORTALS_SUCCESS,
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
          message: portalMessages.DASBOARD_CARD_COUNT_SUCCESS,
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

  getTenantPortalDashboardHandler: async (
    request: Request,
    h: ResponseToolkit,
  ) => {
    try {
      const result = "";
      return h
        .response({
          success: true,
          message: portalMessages.DASBOARD_CARD_COUNT_SUCCESS,
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

  updateTenantPortal: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateTenantPortalStatusValidation.safeParse({
        params: request.params,
        payload: request.payload,
      });

      if (!parsed.success || !parsed.data) {
        const err = parsed.error.errors[0];

        const field = err.path.filter((p) => p !== "payload").join(".");

        throwError(`${field}: ${err.message}`, 400);
      }

      const result = await updateTenantPortalStatusService(
        parsed?.data?.params.tenantPortalId as any,
        parsed?.data?.payload.isEnabled as any,
      );
      return h
        .response({
          success: true,
          message: portalMessages.UPDATE_PORTAL_SUCCESS,
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
