import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { auditLogMessages } from "../../config/messages";
import { throwError } from "../../helpers/throwError";
import {
  getAuditLogsByTenantService,
  getTenantActivitySummaryService,
  getTenantActivityTableService,
} from "../../operations/auditLog";

export const getAuditLogsByTenantValidation = z.object({
  params: z.object({
    tenantId: z.string().trim().min(1, auditLogMessages.TENANT_ID_REQUIRED),
  }),
  query: z
    .object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
      logType: z.enum(["SUCCESS", "REDIRECT", "ERROR", "INFO"]).optional(),
      action: z.enum(["CREATE", "UPDATE", "DELETE", "READ", "UNKNOWN"]).optional(),
      userId: z.string().trim().optional(),
      search: z.string().trim().optional(),
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .refine((q) => !q.fromDate || !q.toDate || q.fromDate <= q.toDate, {
      message: auditLogMessages.INVALID_DATE_RANGE,
    }),
});

const tenantIdQuery = z
  .string({ required_error: auditLogMessages.TENANT_ID_REQUIRED })
  .trim()
  .min(1, auditLogMessages.TENANT_ID_REQUIRED);

export const getTenantActivitySummaryValidation = z.object({
  query: z.object({
    tenantId: tenantIdQuery,
  }),
});

export const getTenantActivityTableValidation = z.object({
  query: z.object({
    tenantId: tenantIdQuery,
    page: z.coerce
      .number({ invalid_type_error: auditLogMessages.INVALID_PAGE })
      .int(auditLogMessages.INVALID_PAGE)
      .positive(auditLogMessages.INVALID_PAGE)
      .default(1),
    limit: z.coerce
      .number({ invalid_type_error: auditLogMessages.INVALID_LIMIT })
      .int(auditLogMessages.INVALID_LIMIT)
      .positive(auditLogMessages.INVALID_LIMIT)
      .max(100, auditLogMessages.INVALID_LIMIT)
      .default(10),
  }),
});

export default {
  getAuditLogsByTenant: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = getAuditLogsByTenantValidation.safeParse({
        params: request.params,
        query: request.query,
      });

      if (!parsed.success) {
        return throwError(parsed.error.errors[0].message, 400);
      }

      const { params, query } = parsed.data;
      const result = await getAuditLogsByTenantService(params.tenantId, query);

      return h
        .response({
          success: true,
          message: auditLogMessages.GET_TENANT_AUDIT_LOGS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || auditLogMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },
  getTenantActivitySummary: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = getTenantActivitySummaryValidation.safeParse({
        query: request.query,
      });

      if (!parsed.success) {
        return throwError(parsed.error.errors[0].message, 400);
      }

      const result = await getTenantActivitySummaryService(parsed.data.query.tenantId);

      return h
        .response({
          success: true,
          message: auditLogMessages.ACTIVITY_SUMMARY_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || auditLogMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getTenantActivityTable: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = getTenantActivityTableValidation.safeParse({
        query: request.query,
      });

      if (!parsed.success) {
        return throwError(parsed.error.errors[0].message, 400);
      }

      const { tenantId, page, limit } = parsed.data.query;
      const result = await getTenantActivityTableService(tenantId, page, limit);

      return h
        .response({
          success: true,
          message: auditLogMessages.ACTIVITY_TABLE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || auditLogMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },
};
