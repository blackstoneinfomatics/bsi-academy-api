import { Request, ResponseToolkit } from "@hapi/hapi";
import { planChangeRequestValidation } from "../../models/planChangeRequest";
import { backupRequestValidation } from "../../models/backupRequest";
import {
  createBackupRequest,
  createPlanChangeRequest,
  resolveRequestTenant,
} from "../../operations/requestTenant";
import {
  backupRequestMessages,
  planChangeRequestMessages,
} from "../../config/messages";

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

export default {
  createPlanChangeRequestHandler,
  createBackupRequestHandler,
};