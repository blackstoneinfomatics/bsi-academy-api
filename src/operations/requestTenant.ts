import { Request } from "@hapi/hapi";
import { getActiveTenantRecordByCode } from "./tenants";
import { z } from "zod";
import BackupRequestModel, {
  backupRequestValidation,
} from "../models/backupRequest";
import PlanModel from "../models/plan-model";
import PlanChangeRequestModel, {
  planChangeRequestValidation,
} from "../models/planChangeRequest";
import TenantSubscriptionModel from "../models/tenantsubscription";
import { SubscriptionStatus } from "../shared/enum";
import {
  planChangeRequestMessages,
  requestTenantMessages,
} from "../config/messages";

export type CreateBackupRequestInput = z.infer<
  typeof backupRequestValidation
>;

export type CreatePlanChangeRequestInput = z.infer<
  typeof planChangeRequestValidation
>;

export type RequestTenantResolution =
  | {
      tenantId: string;
      tenantName: string;
      plan?: string;
    }
  | {
      error: string;
      statusCode: 400 | 401 | 403 | 404;
    };

export const resolveRequestTenant = async (
  req: Request
): Promise<RequestTenantResolution> => {
  const tenantHeader = req.headers.tenantid;
  if (typeof tenantHeader !== "string" || !tenantHeader.trim()) {
    return { error: requestTenantMessages.TENANT_HEADER_REQUIRED, statusCode: 400 };
  }
  const tenantId = tenantHeader.trim();

  const tenant = await getActiveTenantRecordByCode(tenantId);
  if (!tenant) {
    return { error: requestTenantMessages.TENANT_NOT_FOUND, statusCode: 404 };
  }

  return {
    tenantId: tenant.tenantCode,
    tenantName: tenant.tenantName,
    plan: tenant.plan,
  };
};

export const createBackupRequest = async (
  payload: CreateBackupRequestInput,
  tenant: { tenantId: string; tenantName: string }
) =>
  BackupRequestModel.create({
    ...payload,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
  });

const findPlanByReference = async (reference: string, activeOnly: boolean) =>
  PlanModel.findOne({
    $or: [{ planId: reference }, { planName: reference }],
    ...(activeOnly ? { status: "Active" } : {}),
    deletedAt: null,
  }).lean();

export const createPlanChangeRequest = async (
  payload: CreatePlanChangeRequestInput,
  tenant: { tenantId: string; tenantName: string; plan?: string }
) => {
  const activeSubscription = await TenantSubscriptionModel.findOne({
    tenantId: tenant.tenantId,
    status: SubscriptionStatus.ACTIVE,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  const currentPlan = activeSubscription
    ? await PlanModel.findById(activeSubscription.planId).lean()
    : tenant.plan
      ? await findPlanByReference(tenant.plan, false)
      : null;

  if (!currentPlan) {
    return {
      error: planChangeRequestMessages.CURRENT_PLAN_UNAVAILABLE,
      statusCode: 400 as const,
    };
  }

  const suppliedCurrentPlan = await findPlanByReference(
    payload.currentPlan,
    false
  );
  if (
    !suppliedCurrentPlan ||
    String(suppliedCurrentPlan._id) !== String(currentPlan._id)
  ) {
    return {
      error: planChangeRequestMessages.CURRENT_PLAN_MISMATCH,
      statusCode: 400 as const,
    };
  }

  const newPlan = await findPlanByReference(payload.newPlan, true);
  if (!newPlan) {
    return {
      error: planChangeRequestMessages.NEW_PLAN_UNAVAILABLE,
      statusCode: 400 as const,
    };
  }

  if (String(newPlan._id) === String(currentPlan._id)) {
    return {
      error: planChangeRequestMessages.SAME_PLAN,
      statusCode: 400 as const,
    };
  }

  const request = await PlanChangeRequestModel.create({
    ...payload,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    currentPlan: currentPlan.planName,
    newPlan: newPlan.planName,
  });

  return { data: request };
};