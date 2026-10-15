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
import { RequestStatus, SubscriptionStatus } from "../shared/enum";
import {
  planChangeRequestMessages,
  requestTenantMessages,
} from "../config/messages";
import { Lookup } from "../models/lookup";
import UserModel from "../models/users";
import { sendNotification } from "./notification";
import { generateRequestId } from "./rollcounter";
import PortalRequestModel, { portalRequestValidation } from "../models/portalRequest";
import { randomUUID } from "crypto";
import RefundRequestModel, { refundRequestValidation } from "../models/refundRequest";
import paymenttransaction from "../models/paymenttransaction";
import mongoose from "mongoose";



type RefundRequestInput = z.infer<
  typeof refundRequestValidation
>;

export type CreateBackupRequestInput = z.infer<
  typeof backupRequestValidation
>;

export type CreatePlanChangeRequestInput = z.infer<
  typeof planChangeRequestValidation
>;



type PortalRequestInput = z.infer<
  typeof portalRequestValidation
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
) => {
  const requestId = await generateRequestId();
  const request = await BackupRequestModel.create({
    ...payload,
    requestId,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
  });

  await notifySuperAdminOfRequest({
    requestId: request.requestId,
    tenant,
    notificationType: "BACKUP_REQUEST_SUBMITTED",
    title: `Backup request from ${tenant.tenantName}`,
    messages: `${tenant.tenantName} submitted a backup request.`,
    metadata: {
      backupStartDate: request.backupStartDate.toISOString(),
      backupEndDate: request.backupEndDate.toISOString(),
      additionalNotes: request.additionalNotes,
    },
  });

  return request;
};

const notifySuperAdminOfRequest = async ({
  requestId,
  tenant,
  notificationType,
  title,
  messages,
  metadata,
}: {
  requestId: string;
  tenant: { tenantId: string; tenantName: string };
  notificationType: string;
  title: string;
  messages: string;
  metadata: Record<string, unknown>;
}) => {
  try {
    const superAdmin = await Lookup.findOne({
      lookupKey: "SUPER_ADMIN",
      keyValue: "super_admin",
      status: "Active",
    })
      .select("userId")
      .lean();

    if (!superAdmin?.userId) {
      console.error(
        `[${notificationType}] Active Super Admin lookup with userId was not found; notification was not sent`
      );
      return;
    }

    const sender = await UserModel.findOne({
      tenantId: tenant.tenantId,
      userId: { $ne: superAdmin.userId },
      role: "ADMIN",
      status: "Active",
    })
      .select("userId tenantId userName email")
      .lean();

    if (
      !sender?.userId ||
      !sender.tenantId ||
      !sender.userName ||
      !sender.email
    ) {
      console.error(
        `[${notificationType}] Active tenant ADMIN sender was not found or is incomplete; notification was not sent`
      );
      return;
    }

    const result = await sendNotification({
      receiverId: superAdmin.userId,
      senderId: sender.userId,
      senderTenantId: sender.tenantId,
      senderName: sender.userName,
      senderEmail: sender.email,
      notificationType,
      title,
      messages,
      requestId,
      metadata: {
        ...metadata,
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
      },
    });

    if (!result.success) {
      console.error(
        `[${notificationType}] Failed to send request notification`,
        result.error ?? result.errors
      );
    }
  } catch (error) {
    console.error(`[${notificationType}] Failed to send request notification`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

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

  const requestId = await generateRequestId();
  const request = await PlanChangeRequestModel.create({
    ...payload,
    requestId,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    currentPlan: currentPlan.planName,
    newPlan: newPlan.planName,
  });

  await notifySuperAdminOfRequest({
    requestId: request.requestId,
    tenant,
    notificationType: "PLAN_CHANGE_REQUEST_SUBMITTED",
    title: `Plan change request from ${tenant.tenantName}`,
    messages: `${tenant.tenantName} requested a change from ${currentPlan.planName} to ${newPlan.planName}.`,
    metadata: {
      currentPlan: currentPlan.planName,
      newPlan: newPlan.planName,
      planStartDate: request.planStartDate.toISOString(),
      changeReason: request.changeReason,
      requestReason: request.requestReason,
    },
  });

  return { data: request };
};




export const createPortalRequestOperation = async (
  data: PortalRequestInput
) => {
  const requestId = await generateRequestId();

  const portalRequest = await PortalRequestModel.create({
    ...data,
    requestId,
    status: RequestStatus.PENDING,
  });
  const requestTypeLabel = portalRequest.requestType
    .replace(/_/g, " ")
    .toLowerCase();

  await notifySuperAdminOfRequest({
    requestId: portalRequest.requestId,
    tenant: {
      tenantId: portalRequest.tenantId,
      tenantName: portalRequest.tenantName,
    },
    notificationType: "PORTAL_REQUEST_SUBMITTED",
    title: `${requestTypeLabel} request from ${portalRequest.tenantName}`,
    messages: `${portalRequest.tenantName} submitted a ${requestTypeLabel} request for ${portalRequest.portalName}${portalRequest.featureName ? ` - ${portalRequest.featureName}` : ""}.`,
    metadata: {
      requestType: portalRequest.requestType,
      portalId: portalRequest.portalId,
      portalName: portalRequest.portalName,
      featureId: portalRequest.featureId,
      featureName: portalRequest.featureName,
      requestReason: portalRequest.requestReason,
    },
  });

  return portalRequest;
};




const REFUND_WINDOW_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const createRefundRequestOperation = async (
  data: RefundRequestInput
) => {

// Validate the MongoDB payment ID
if (!mongoose.isValidObjectId(data.paymentId)) {
  throw new Error("INVALID_PAYMENT_ID");
}

// Find successful payment belonging to this tenant
const payment = await paymenttransaction.findOne({
  _id: data.paymentId,
  tenantId: data.tenantId,
  paymentStatus: "SUCCESS",
  deletedAt: null,
});

if (!payment) {
  throw new Error("PAYMENT_NOT_FOUND");
}

// Get original payment details
const paymentDate = new Date(payment.paymentDate ?? NaN);
const paidAmount = Number(payment.amount);

// Use actual refundable amount, not paid amount
const refundAmount = Number(payment.refundableAmount);

// Verify refund amount
if (
  !Number.isFinite(refundAmount) ||
  refundAmount <= 0 ||
  refundAmount > paidAmount
) {
  throw new Error("INVALID_REFUND_AMOUNT");
}

// Check refund eligibility
const now = new Date();
const refundDeadline = new Date(
  paymentDate.getTime() + 7 * 24 * 60 * 60 * 1000
);

if (
  !Number.isFinite(paymentDate.getTime()) ||
  now < paymentDate ||
  now >= refundDeadline
) {
  throw new Error("REFUND_WINDOW_EXPIRED");
}

const daysRemaining = Math.ceil(
  (refundDeadline.getTime() - now.getTime()) /
    (1000 * 60 * 60 * 24)
);

  ; // Ensure this is a number

  if (isNaN(paidAmount)) {
    throw new Error("INVALID_PAYMENT_DETAILS");
  }

  if (
    !Number.isFinite(paymentDate.getTime()) ||
    !Number.isFinite(paidAmount) ||
    paidAmount <= 0 ||
    paymentDate.getTime() > Date.now()
  ) {
    throw new Error("INVALID_PAYMENT_DETAILS");
  }

  const elapsedMs = Date.now() - paymentDate.getTime();

  const eligible = elapsedMs < REFUND_WINDOW_DAYS * DAY_IN_MS;

  if (!eligible) {
    throw new Error("REFUND_WINDOW_EXPIRED");
  }

  const existingRequest = await RefundRequestModel.findOne({
    tenantId: data.tenantId,
    paymentId: data.paymentId,
    status: RequestStatus.PENDING,
  });

  if (existingRequest) {
    throw new Error("REFUND_REQUEST_ALREADY_EXISTS");
  }

  const requestId = await generateRequestId();
  const refundRequest = await RefundRequestModel.create({
    ...data,
    requestId,
    paymentDate,
    paidAmount,
    refundAmount,
    eligibilityStatus: "ELIGIBLE",
    daysRemaining,
    status: RequestStatus.PENDING,
  });

  await notifySuperAdminOfRequest({
    requestId: refundRequest.requestId,
    tenant: {
      tenantId: refundRequest.tenantId,
      tenantName: refundRequest.tenantName,
    },
    notificationType: "REFUND_REQUEST_SUBMITTED",
    title: `Refund request from ${refundRequest.tenantName}`,
    messages: `${refundRequest.tenantName} submitted a refund request for payment ${refundRequest.paymentId}.`,
    metadata: {
      paymentId: refundRequest.paymentId,
      paymentDate: refundRequest.paymentDate.toISOString(),
      paidAmount: refundRequest.paidAmount,
      refundAmount: refundRequest.refundAmount,
      refundReason: refundRequest.refundReason,
      newPlan: refundRequest.newPlan,
      additionalDetails: refundRequest.additionalDetails,
      refundMethod: refundRequest.refundMethod,
      eligibilityStatus: refundRequest.eligibilityStatus,
      daysRemaining: refundRequest.daysRemaining,
    },
  });

  return refundRequest;
};