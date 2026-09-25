import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { auditLogMessages } from "../../config/messages";
import { throwError } from "../../helpers/throwError";
import { getAuditLogsByTenantService } from "../../operations/auditLog";

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
};
