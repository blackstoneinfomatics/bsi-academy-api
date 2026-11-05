import { Request, ResponseToolkit } from "@hapi/hapi";
import { planChangeRequestValidation } from "../../models/planChangeRequest";
import {
  createBackupRequest,
  createPlanChangeRequest,
  createPortalRequestOperation,
  createRefundRequestOperation,
  getTenantBackupCards,
  getTenantBackupList,
  getTenantBackupStatusService,
  downloadTenantBackupService,
  resolveRequestTenant,
} from "../../operations/requestTenant";
import {
  backupRequestMessages,
  planChangeRequestMessages,
  portalRequestMessages,
  refundRequestMessages,
} from "../../config/messages";
import { portalRequestValidation } from "../../models/portalRequest";
import { z } from "zod";
import { throwError } from "../../helpers/throwError";


export const CreateRefundRequestValidation = z.object({
  tenantId: z.string().trim().min(1, "Tenant ID is required"),

  tenantName: z.string().trim().min(1, "Tenant name is required"),

  paymentId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid payment ID"),

  refundMethod: z.string().trim().min(1, "Refund method is required"),

  refundReason: z.string().trim().max(500).min(1, "Refund reason is required"),

  newPlan: z.string().trim().optional(),

  additionalDetails: z.string().trim().optional(),
});

export const backupStatusValidation = z.object({
  backupId: z
    .string()
    .trim()
    .min(1, "Backup ID is required"),
});

export const downloadTenantBackupValidation = z.object({
  params: z.object({
    backupId: z.string().trim().min(1, "Backup ID is required"),
  }),
});

export const backupRequestValidation = z.object({
  additionalNotes: z.string().trim().optional(),
  dateRange: z.object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  }),
   requestedBy: z.string().trim().min(1, "Requested by is required"),
});

const createPlanChangeRequestHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  const parsed = planChangeRequestValidation.safeParse(req.payload);
  if (!parsed.success) {
    return h.response({ error: parsed.error.flatten() }).code(400);
  }

  try {
    const tenant = await resolveRequestTenant(req);
    if ("error" in tenant) {
      const statusCode = tenant.statusCode ?? 400;
      return h.response({ error: tenant.error }).code(statusCode);
    }

    const result = await createPlanChangeRequest(parsed.data, tenant);
    if ("error" in result) {
      const statusCode = result.statusCode ?? 400;
      return h.response({ error: result.error }).code(statusCode);
    }

    return h
      .response({
        message: planChangeRequestMessages.SUBMITTED,
        data: result.data,
      })
      .code(201);
  } catch (error) {
    console.error(planChangeRequestMessages.CATCH_LOG, {
      error: error instanceof Error ? error.message : String(error),
    });
    return h
      .response({ error: planChangeRequestMessages.SUBMIT_FAILED })
      .code(500);
  }
};

const getTenantBackupStatus = async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const { backupId } = request.params as {
      backupId: string;
    };

   const tenantId = request.headers["tenantid"] as string;

    if (!tenantId) {
      throwError("Tenant ID is required", 400);
    }

    const result = await getTenantBackupStatusService({
      backupId,
      tenantId:tenantId,
    });

    return h.response({
      success: true,
      message: "Backup status fetched successfully",
      data: result,
    }).code(200);

  } catch (error) {
    console.error("[Backup Status] Failed:", error);

    return h.response({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch backup status",
    }).code(
      error instanceof Error &&
      "statusCode" in error
        ? Number(error.statusCode)
        : 500
    );
  }
};


const downloadTenantBackup = async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const { params } = downloadTenantBackupValidation.parse({
      params: request.params,
    });

    const tenantId = request.headers["tenantid"] as string;

    if (!tenantId) {
      throwError("Tenant ID is required", 400);
    }

    const result = await downloadTenantBackupService({
      backupId: params.backupId,
      tenantId,
    });

    return h
      .response(result?.stream)
      .type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .header(
        "Content-Disposition",
        `attachment; filename="${result?.fileName.replace(/[\r\n"]/g, "_")}"`
      )
      .header("Content-Length", String(result?.fileSize));

  } catch (error: any) {
    console.error("Error in downloadTenantBackup:", error);

    return h
      .response({
        success: false,
        message: error.message || "Internal Server Error",
        errorCode: error.statusCode || 500,
      })
      .code(error.statusCode || 500);
  }
};

const createBackupRequestHandler = async (
  req: Request,
  h: ResponseToolkit
) => {
  const parsed = backupRequestValidation.safeParse(req.payload);
  if (!parsed.success) {
    return h.response({ error: parsed.error.flatten() }).code(400);
  }

  try {
    const tenant = await resolveRequestTenant(req);
    if ("error" in tenant) {
      const statusCode = tenant.statusCode ?? 400;
      return h.response({ error: tenant.error }).code(statusCode);
    }

    const result = await createBackupRequest(parsed.data, tenant);
    return h
      .response({
        message: backupRequestMessages.SUBMITTED,
        data: result,
      })
      .code(201);
  } catch (error) {
    console.error(backupRequestMessages.CATCH_LOG, {
      error: error instanceof Error ? error.message : String(error),
    });
    return h
      .response({ error: backupRequestMessages.SUBMIT_FAILED })
      .code(500);
  }
};

const createPortalRequest = async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const validation = portalRequestValidation.safeParse(
      request.payload
    );

    if (!validation.success) {
      return h.response({
        success: false,
        message: portalRequestMessages.VALIDATION_FAILED,
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      }).code(400);
    }

    const result = await createPortalRequestOperation(
      validation.data
    );

    return h.response({
      success: true,
      message: portalRequestMessages.SUBMITTED,
      data: result,
    }).code(201);
  } catch (error: unknown) {
    console.error(portalRequestMessages.CATCH_LOG, error);

    return h.response({
      success: false,
      message: portalRequestMessages.SUBMIT_FAILED,
    }).code(500);
  }
};

const createRefundRequest = async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
   const validation = CreateRefundRequestValidation.safeParse(
  request.payload
);

    if (!validation.success) {
      return h.response({
        success: false,
        message: refundRequestMessages.VALIDATION_FAILED,
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      }).code(400);
    }

    const result = await createRefundRequestOperation(
      validation.data
      );

    return h.response({
      success: true,
      message: refundRequestMessages.SUBMITTED,
      data: result,
    }).code(201);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "";

    const knownErrors: Record<string, { statusCode: number; message: string }> = {
      PAYMENT_NOT_FOUND: {
        statusCode: 404,
        message: refundRequestMessages.PAYMENT_NOT_FOUND,
      },
      INVALID_PAYMENT_DETAILS: {
        statusCode: 400,
        message: refundRequestMessages.INVALID_PAYMENT_DETAILS,
      },
      REFUND_WINDOW_EXPIRED: {
        statusCode: 400,
        message: refundRequestMessages.REFUND_WINDOW_EXPIRED,
      },
      REFUND_REQUEST_ALREADY_EXISTS: {
        statusCode: 409,
        message: refundRequestMessages.REFUND_REQUEST_ALREADY_EXISTS,
      },
    };

    const knownError = knownErrors[errorMessage];

    if (knownError) {
      return h.response({
        success: false,
        message: knownError.message,
      }).code(knownError.statusCode);
    }

    console.error(refundRequestMessages.CATCH_LOG, error);

    return h.response({
      success: false,
      message: refundRequestMessages.SUBMIT_FAILED,
    }).code(500);
  }
};

const getTenantBackupCardsHandler = async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const result = await getTenantBackupCards();

    return h.response({
      success: true,
      message: backupRequestMessages.GET_BACKUP_CARDS_SUCCESS,
      data: result,
    }).code(200);

  } catch (error) {
    console.error("Get Backup Cards Error:", error);

    return h.response({
      success: false,
      message: backupRequestMessages.GET_BACKUP_CARDS_FAILED,
    }).code(500);
  }
};

const getTenantBackupListHandler = async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
    } = request.query as {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    };

    const result = await getTenantBackupList({
      page: Number(page),
      limit: Number(limit),
      search: String(search),
      status: String(status),
    });

    return h.response({
      success: true,
      message: backupRequestMessages.GET_BACKUP_LIST_SUCCESS,
      data: result,
    }).code(200);

  } catch (error) {
    console.error("Get Tenant Backup List Error:", error);

    return h.response({
      success: false,
      message: backupRequestMessages.GET_BACKUP_LIST_FAILED,
    }).code(500);
  }
}

export default {
  createPlanChangeRequestHandler,
  createBackupRequestHandler,
  createPortalRequest,
  downloadTenantBackup,
  createRefundRequest,
  getTenantBackupStatus,
  getTenantBackupCardsHandler,
  getTenantBackupListHandler,
};