import { Request } from "@hapi/hapi";
import { getActiveTenantRecordByCode } from "./tenants";
import { z } from "zod";
import BackupRequestModel from "../models/tenantBackup";
import PlanModel from "../models/plan-model";
import PlanChangeRequestModel, {
  planChangeRequestValidation,
} from "../models/planChangeRequest";
import TenantSubscriptionModel from "../models/tenantsubscription";
import { BackupFormat, BackupStatus, RequestStatus, SubscriptionStatus } from "../shared/enum";
import {
  planChangeRequestMessages,
  requestTenantMessages,
} from "../config/messages";
import { Lookup } from "../models/lookup";
import UserModel from "../models/users";
import { sendNotification } from "./notification";
import { generateRequestId } from "./rollcounter";
import PortalRequestModel, { portalRequestValidation } from "../models/portalRequest";
import paymenttransaction from "../models/paymenttransaction";
import mongoose from "mongoose";
import RefundTransaction from "../models/refundTransaction";
import { RefundApprovalStatus, RefundStatus } from "../shared/enum";
import { throwError } from "../helpers/throwError";
import { randomUUID } from "crypto";
import { addTenantBackupJob } from "../bullMQ/queues/backup.queue";
import ExcelJS from "exceljs";
import { GridFSBucket, ObjectId } from "mongodb";
import { BACKUP_COLLECTIONS } from "../shared/utils/backup.collections";
import {
  flattenDocument,
  addWorksheetHeaders,
} from "../helpers/excel";import tenantBackup from "../models/tenantBackup";
import * as fs from "node:fs";
import * as path from "node:path";
import { finished } from "node:stream/promises";


export type CreatePlanChangeRequestInput = z.infer<
  typeof planChangeRequestValidation
>;



type PortalRequestInput = z.infer<
  typeof portalRequestValidation
>;

type RefundBaseValidation = {
  tenantId: string;
  tenantName: string;
  paymentId: string;
  refundMethod: string;
  refundReason: string;
  newPlan?: string;
  additionalDetails?: string;
};

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
  payload: any,
  tenant: {
    tenantId: string;
    tenantName: string;
  },
) => {
  // 1. Validate date range
  const { fromDate, toDate } = payload.dateRange;
  const {requestedBy , additionalNotes} = payload;

  if (new Date(fromDate) > new Date(toDate)) {
    throwError("From date cannot be greater than To date", 400);
  }

  // 2. Get active tenant subscription
  const subscription = await TenantSubscriptionModel.findOne({
    tenantId: tenant.tenantId,
    status: SubscriptionStatus.ACTIVE,
    deletedAt: null,
  }).lean();

  if (!subscription) {
    throwError("Active subscription not found", 404);
    return;
  }

  // 3. Generate backup ID
  const backupId = `BKU-${randomUUID()
        .replace(/-/g, "")
        .slice(0, 5)
        .toUpperCase()}`;

  // 4. Create backup record
  const backup = await BackupRequestModel.create({
    backupId,

    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,

    subscriptionId: subscription._id,

    requestedBy: requestedBy,

    dateRange: {
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    },

    // Excel is the default format
    format: BackupFormat.EXCEL,

    status: BackupStatus.PENDING,

    additionalNotes: additionalNotes,

    fileDetails: {
      fileId: null,
      fileName: null,
      mimeType: null,
      fileSize: 0,
      totalRecords: 0,
      collectionCounts: {},
      generatedAt: null,
      expiresAt: null,
    },

    createdBy: requestedBy,
  });

    await notifySuperAdminOfRequest({
    requestId: backup.backupId,
    tenant,
    notificationType: "BACKUP_REQUEST_SUBMITTED",
    title: `Backup request from ${tenant.tenantName}`,
    messages: `${tenant.tenantName} submitted a backup request.`,
    metadata: {
      backupStartDate: backup.dateRange.fromDate.toISOString(),
      backupEndDate: backup.dateRange.toDate.toISOString(),
      additionalNotes: backup.additionalNotes,
    },
  });

  try {
    await addTenantBackupJob({
      backupId: backup.backupId,
      tenantId: tenant.tenantId,
    });

  return {
    backupId: backup.backupId,
    tenantId: backup.tenantId,
    tenantName: backup.tenantName,
    subscriptionId: backup.subscriptionId,
    status: backup.status,
    format: backup.format,
    dateRange: backup.dateRange,
  };
  } catch (error) {
    await BackupRequestModel.updateOne(
      { backupId: backup.backupId },
      {
        $set: {
          status: "FAILED",
          errorMessage: "Failed to enqueue backup job",
        },
      }
    );

    throw error;
  }
};

const BACKUP_RETENTION_DAYS = 30;

const MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const GRIDFS_BUCKET_NAME = "tenant_backup_files";

export const getBackupBucket = (): GridFSBucket => {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not initialized");
  }

  return new GridFSBucket(db, {
    bucketName: GRIDFS_BUCKET_NAME,
  });
};


export const generateTenantBackupService = async ({
  backupId,
  tenantId,
}: {
  backupId: string;
  tenantId: string;
}) => {
  const startTime = Date.now();

  console.log("================================================");
  console.log("[Backup] GENERATION STARTED");
  console.log("[Backup] Request:", {
    backupId,
    tenantId,
    startedAt: new Date().toISOString(),
  });

  const db = mongoose.connection.db;

  if (!db) {
    console.error("[Backup] MongoDB connection not initialized");
    throw new Error("MongoDB connection not initialized");
  }

  console.log("[Backup] MongoDB connection verified");

  // 1. Fetch backup metadata.
  console.log("[Backup] Fetching backup metadata...");

  const backup = await BackupRequestModel.findOne({
    backupId,
    tenantId,
  }).lean();

  if (!backup) {
    console.error("[Backup] Backup request not found:", {
      backupId,
      tenantId,
    });

    throw new Error("Backup request not found");
  }

  console.log("[Backup] Metadata fetched:", {
    backupId: backup.backupId,
    status: backup.status,
    dateRange: backup.dateRange,
  });

  // 2. Initialize local storage.
  const BACKUP_DIRECTORY = path.resolve(
    process.cwd(),
    "storage",
    "tenant-backups"
  );

  await fs.promises.mkdir(BACKUP_DIRECTORY, {
    recursive: true,
  });

  // Prevent unsafe characters in filenames.
  const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeBackupId = backupId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const fileName = `tenant-backup-${safeTenantId}-${safeBackupId}.xlsx`;

  const filePath = path.join(BACKUP_DIRECTORY, fileName);

  console.log("[Backup] Local storage initialized:", {
    directory: BACKUP_DIRECTORY,
    fileName,
    filePath,
  });

  // 3. Idempotency check.
  if (
    backup.status === "COMPLETED" &&
    backup.fileDetails?.fileName
  ) {
    const existingFileName = path.basename(
      backup.fileDetails.fileName
    );

    const existingFilePath = path.join(
      BACKUP_DIRECTORY,
      existingFileName
    );

    try {
      await fs.promises.access(
        existingFilePath,
        fs.constants.R_OK
      );

      console.log("[Backup] Already completed. File exists:", {
        backupId,
        fileName: existingFileName,
      });

      return {
        success: true,
        backupId,
        status: "COMPLETED",
        fileName: existingFileName,
        fileSize: backup.fileDetails.fileSize,
        totalRecords: backup.fileDetails.totalRecords,
      };
    } catch {
      console.warn(
        "[Backup] Previously generated file is missing. Regenerating:",
        existingFilePath
      );
    }
  }

  // 4. Validate date range.
  const fromDate = new Date(backup.dateRange.fromDate);
  const toDate = new Date(backup.dateRange.toDate);

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate > toDate
  ) {
    console.error("[Backup] Invalid date range:", {
      fromDate,
      toDate,
    });

    throw new Error("Invalid backup date range");
  }

  const exclusiveToDate = new Date(toDate);
  exclusiveToDate.setDate(exclusiveToDate.getDate() + 1);

  console.log("[Backup] Date range validated:", {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    exclusiveToDate: exclusiveToDate.toISOString(),
  });

  // 5. Update status to PROCESSING.
  console.log("[Backup] Updating status to PROCESSING...");

  const processing = await BackupRequestModel.updateOne(
    {
      backupId,
      tenantId,
      status: {
        $in: ["PENDING", "PROCESSING", "COMPLETED"],
      },
    },
    {
      $set: {
        status: "PROCESSING",
        startedAt: new Date(),
        errorMessage: null,
      },
    }
  );

  if (!processing.matchedCount) {
    console.error("[Backup] Unable to update processing status:", {
      backupId,
      tenantId,
    });

    throw new Error("Backup request cannot be processed");
  }

  console.log("[Backup] Status updated to PROCESSING");

  let outputStream: fs.WriteStream | null = null;
  let totalRecords = 0;

  const collectionCounts: Record<string, number> = {};

  try {
    // 6. Create local Excel file.
    console.log("[Backup] Creating local Excel file...");

    outputStream = fs.createWriteStream(filePath);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: outputStream,
      useStyles: true,
      useSharedStrings: false,
    });

    workbook.creator = "Blackstone SaaS";
    workbook.created = new Date();

    console.log("[Backup] Excel workbook initialized");

    // 7. Process MongoDB collections.
    console.log("[Backup] Starting collection export:", {
      totalCollections: BACKUP_COLLECTIONS.length,
      collections: BACKUP_COLLECTIONS.map(
        (item) => item.collectionName
      ),
    });

    for (const config of BACKUP_COLLECTIONS) {
      const collectionStartTime = Date.now();

      console.log("------------------------------------------");
      console.log("[Backup] Processing collection:", {
        collection: config.collectionName,
        worksheet: config.sheetName,
      });

      const collection = db.collection(config.collectionName);

      const worksheet = workbook.addWorksheet(config.sheetName);

      const excludedFields = config.excludedFields ?? [];

      const query = {
        [config.tenantField]: tenantId,
        [config.dateField]: {
          $gte: fromDate,
          $lt: exclusiveToDate,
        },
      };

      console.log("[Backup] Collection query:", {
        collection: config.collectionName,
        query,
        excludedFields,
      });

      const cursor = collection.find(query, {
        batchSize: 500,
      });

      let collectionCount = 0;
      let headers: string[] = [];

      try {
        for await (const document of cursor) {
          const sanitized = flattenDocument(
            document,
            excludedFields
          );

          if (!headers.length) {
            headers = Object.keys(sanitized);

            console.log("[Backup] Worksheet headers generated:", {
              collection: config.collectionName,
              headers,
            });

            addWorksheetHeaders(worksheet, headers);
          }

          const rowValues = headers.map(
            (header) => sanitized[header] ?? ""
          );

          worksheet.addRow(rowValues).commit();

          collectionCount++;
          totalRecords++;

          if (collectionCount % 1000 === 0) {
            console.log("[Backup] Export progress:", {
              collection: config.collectionName,
              exportedRecords: collectionCount,
              totalRecords,
            });
          }
        }
      } finally {
        await cursor.close();
      }

      if (!headers.length) {
        worksheet.addRow(["No records found"]).commit();

        console.log("[Backup] No records found:", {
          collection: config.collectionName,
        });
      }

      worksheet.commit();

      collectionCounts[config.collectionName] = collectionCount;

      console.log("[Backup] Collection completed:", {
        collection: config.collectionName,
        records: collectionCount,
        duration: `${Date.now() - collectionStartTime}ms`,
      });
    }

    console.log("------------------------------------------");

    console.log("[Backup] All collections processed:", {
      totalRecords,
      collectionCounts,
    });

    // 8. Commit workbook to local storage.
    console.log("[Backup] Committing Excel workbook to local storage...");

    // Listen for stream completion before committing.
    const outputFinished = finished(outputStream);

    await workbook.commit();
    await outputFinished;

    // 9. Verify generated file.
    const fileStats = await fs.promises.stat(filePath);

    if (!fileStats.isFile() || fileStats.size === 0) {
      throw new Error("Generated Excel file is empty or invalid");
    }

    const generatedAt = new Date();

    const expiresAt = new Date(generatedAt);
    expiresAt.setDate(
      expiresAt.getDate() + BACKUP_RETENTION_DAYS
    );

    console.log("[Backup] Local file generated successfully:", {
      fileName,
      filePath,
      fileSize: fileStats.size,
      totalRecords,
    });

    // 10. Update backup metadata in MongoDB.
    console.log("[Backup] Updating backup metadata to COMPLETED...");

    const updated = await BackupRequestModel.updateOne(
      {
        backupId,
        tenantId,
      },
      {
        $set: {
          status: "COMPLETED",

          fileDetails: {
            fileName,
            filePath,
            mimeType: MIME_TYPE,
            fileSize: fileStats.size,
            totalRecords,
            collectionCounts,
            generatedAt,
            expiresAt,
          },

          completedAt: generatedAt,
          errorMessage: null,
        },
      }
    );

    if (!updated.matchedCount) {
      console.error("[Backup] Metadata update failed:", {
        backupId,
        tenantId,
      });

      throw new Error("Failed to update backup metadata");
    }

    console.log("[Backup] Metadata updated successfully");

    const duration = Date.now() - startTime;

    console.log("================================================");
    console.log("[Backup] GENERATION COMPLETED SUCCESSFULLY");

    console.log({
      backupId,
      tenantId,
      fileName,
      filePath,
      fileSize: fileStats.size,
      totalRecords,
      collectionCounts,
      duration: `${duration}ms`,
      generatedAt,
      expiresAt,
    });

    console.log("================================================");

    return {
      success: true,
      backupId,
      status: "COMPLETED",
      fileName,
      filePath,
      fileSize: fileStats.size,
      totalRecords,
      collectionCounts,
      generatedAt,
      expiresAt,
    };

  } catch (error) {
    console.error("================================================");
    console.error("[Backup] GENERATION FAILED");

    console.error({
      backupId,
      tenantId,
      error:
        error instanceof Error ? error.message : error,
      duration: `${Date.now() - startTime}ms`,
    });

    // 11. Local file cleanup.
    try {
      if (outputStream && !outputStream.destroyed) {
        outputStream.destroy();
      }

      await fs.promises.unlink(filePath);

      console.log("[Backup] Local Excel file deleted successfully");
    } catch (cleanupError) {
      if (
        (cleanupError as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        console.error("[Backup] Local file cleanup failed:", cleanupError);
      }
    }

    // 12. Update failure status.
    try {
      await BackupRequestModel.updateOne(
        {
          backupId,
          tenantId,
        },
        {
          $set: {
            status: "FAILED",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Backup generation failed",
          },
        }
      );
    } catch (statusError) {
      console.error(
        "[Backup] Failed to update backup status:",
        statusError
      );
    }

    console.error("================================================");

    throw error;
  }
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

  const selectedPlan = await findPlanByReference(payload.newPlan, true);
  if (!selectedPlan) {
    return {
      error: planChangeRequestMessages.NEW_PLAN_UNAVAILABLE,
      statusCode: 400 as const,
    };
  }

  if (String(selectedPlan._id) === String(currentPlan._id)) {
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
    newPlan: selectedPlan.planName,
  });

  await notifySuperAdminOfRequest({
    requestId: request.requestId,
    tenant,
    notificationType: "PLAN_CHANGE_REQUEST_SUBMITTED",
    title: `Plan change request from ${tenant.tenantName}`,
    messages: `${tenant.tenantName} requested a change from ${currentPlan.planName} to ${selectedPlan.planName}.`,
    metadata: {
      currentPlan: currentPlan.planName,
      newPlan: selectedPlan.planName,
      planStartDate: request.planStartDate.toISOString(),
      changeReason: request.changeReason,
      requestReason: request.requestReason,
    },
  });

  return { data: request };
};


export const downloadTenantBackupService = async ({
  backupId,
  tenantId,
}: {
  backupId: string;
  tenantId: string;
}) => {
  console.log("[Backup Download] Request received:", {
    backupId,
    tenantId,
  });

  // 1. Fetch completed backup.
  const backup = await BackupRequestModel.findOne({
    backupId,
    tenantId,
    status: "COMPLETED",
  }).lean();

  if (!backup) {
    throwError("Completed backup not found", 404);
    return;
  }

  // 2. Validate file details.
  const fileDetails = backup.fileDetails;

  if (!fileDetails?.fileName) {
    throwError("Backup file not available", 404);
    return;
  }

  // 3. Check expiration.
  const expiresAt = fileDetails.expiresAt;

  if (
    expiresAt &&
    new Date(expiresAt).getTime() < Date.now()
  ) {
    throwError("Backup file has expired", 410);
    return;
  }

  // 4. Resolve local storage path.
  const BACKUP_DIRECTORY = path.resolve(
    process.cwd(),
    "storage",
    "tenant-backups"
  );

  // Prevent path traversal.
  const fileName = path.basename(fileDetails.fileName);

  if (fileName !== fileDetails.fileName) {
    throwError("Invalid backup file name", 400);
    return;
  }

  const filePath = path.join(
    BACKUP_DIRECTORY,
    fileName
  );

  // 5. Verify file exists.
  try {
    await fs.promises.access(
      filePath,
      fs.constants.R_OK
    );
  } catch {
    console.error("[Backup Download] File not found:", {
      backupId,
      fileName,
      filePath,
    });

    throwError("Backup file not found in storage", 404);
    return;
  }

  // 6. Get file metadata.
  const fileStats = await fs.promises.stat(filePath);

  if (!fileStats.isFile()) {
    throwError("Invalid backup file", 404);
    return;
  }

  console.log("[Backup Download] File verified:", {
    backupId,
    fileName,
    filePath,
    fileSize: fileStats.size,
  });

  // 7. Create local file download stream.
  const downloadStream = fs.createReadStream(filePath);

  downloadStream.on("error", (error) => {
    console.error(
      "[Backup Download] Stream error:",
      error
    );
  });

  return {
    stream: downloadStream,
    fileName,
    fileSize: fileStats.size,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
};


export const getTenantBackupStatusService = async ({
  backupId,
  tenantId,
}: {
  backupId: string;
  tenantId: string;
}) => {
  console.log("[Backup Status] Request received:", {
    backupId,
    tenantId,
  });

  // 1. Fetch backup request.
  const backup = await BackupRequestModel.findOne({
    backupId,
    tenantId,
  }).lean();

  if (!backup) {
    throwError("Backup request not found", 404);
    return;
  }

  // 2. Check whether backup file is ready.
  const fileReady =
    backup.status === "COMPLETED" &&
    !!backup.fileDetails?.fileName;

  // 3. Prepare response.
  const response = {
    backupId: backup.backupId,
    status: backup.status,

    requestedAt: backup.createdAt,

    errorMessage:
      backup.status === "FAILED"
        ? backup.errorMessage
        : null,

    isDownloadAvailable: fileReady,

    file: fileReady
      ? {
          fileName: backup.fileDetails?.fileName,
          fileSize: backup.fileDetails?.fileSize,
          totalRecords: backup.fileDetails?.totalRecords,
          expiresAt: backup.fileDetails?.expiresAt,
          downloadUrl: `/backup/download/${backup.backupId}`,
        }
      : null,
  };

  console.log("[Backup Status] Response:", {
    backupId,
    status: backup.status,
    isDownloadAvailable: fileReady,
  });

  return response;
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
  data: RefundBaseValidation
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

  const existingRequest = await RefundTransaction.findOne({
    tenantId: data.tenantId,
    paymentId: data.paymentId,
    status: RefundApprovalStatus.PENDING,
  });

  if (existingRequest) {
    throw new Error("REFUND_REQUEST_ALREADY_EXISTS");
  }

  const requestId = await generateRequestId();
  const requestedDate = new Date();
  const refundRequest = await RefundTransaction.create({
    tenantId: data.tenantId,
    tenantName: data.tenantName,
    requestId,
    refundNumber: requestId,
    invoiceId: payment.invoiceId,
    paymentId: payment._id,
    subscriptionId: payment.subscriptionId,
    gateway: payment.gateway,
    paymentMethod: payment.paymentMethod,
    refundMethod: data.refundMethod,
    requestedDate,
    paymentDate,
    amount: refundAmount,
    currency: payment.currency,
    refundReason: data.refundReason,
    paidAmount,
    refundAmount,
    newPlan: data.newPlan,
    additionalDetails: data.additionalDetails,
    eligibilityStatus: "ELIGIBLE",
    daysRemaining,
    status: RefundApprovalStatus.PENDING,
    refundStatus: RefundStatus.PENDING,
    description: data.additionalDetails,
    createdBy: data.tenantId,
  });

  await notifySuperAdminOfRequest({
    requestId,
    tenant: {
      tenantId: data.tenantId,
      tenantName: data.tenantName,
    },
    notificationType: "REFUND_REQUEST_SUBMITTED",
    title: `Refund request from ${data.tenantName}`,
    messages: `${data.tenantName} submitted a refund request for payment ${payment.paymentNumber}.`,
    metadata: {
      paymentNumber: payment.paymentNumber,
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

export const getTenantBackupCards = async () => {
  try {
    const currentDate = new Date();

    const currentMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    const previousMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );

    const baseFilter = {
      deletedAt: null,
      backupId: { $exists: true, $ne: "" },
    };

    const [
      totalBackups,
      currentMonthBackups,
      previousMonthBackups,
      currentMonthDelivered,
      previousMonthDelivered,
    ] = await Promise.all([

      // Total backups - All time
      tenantBackup.countDocuments(baseFilter),

      // Current month backups
      tenantBackup.countDocuments({
        ...baseFilter,
        createdAt: {
          $gte: currentMonthStart,
          $lt: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1
          ),
        },
      }),

      // Previous month backups
      tenantBackup.countDocuments({
        ...baseFilter,
        createdAt: {
          $gte: previousMonthStart,
          $lt: currentMonthStart,
        },
      }),

      // Current month delivered backups
      tenantBackup.countDocuments({
        ...baseFilter,
        status: "COMPLETED",
        createdAt: {
          $gte: currentMonthStart,
          $lt: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1
          ),
        },
      }),

      // Previous month delivered backups
      tenantBackup.countDocuments({
        ...baseFilter,
        status: "COMPLETED",
        createdAt: {
          $gte: previousMonthStart,
          $lt: currentMonthStart,
        },
      }),

    ]);

    // Percentage calculation
    const calculatePercentage = (
      current: number,
      previous: number
    ) => {
      let percentage = 0;

      if (previous === 0) {
        percentage = current > 0 ? 100 : 0;
      } else {
        percentage = Math.abs(
          ((current - previous) / previous) * 100
        );
      }

      return {
        percentage: Number(percentage.toFixed(2)),
        trend:
          current > previous
            ? "UP"
            : current < previous
              ? "DOWN"
              : "SAME",
      };
    };

    return {
      totalBackups,

      currentMonthBackups: {
        count: currentMonthBackups,
        ...calculatePercentage(
          currentMonthBackups,
          previousMonthBackups
        ),
      },

      backupsDelivered: {
        count: currentMonthDelivered,
        ...calculatePercentage(
          currentMonthDelivered,
          previousMonthDelivered
        ),
      },
    };

  } catch (error) {
    console.error("Get Backup Cards Error:", error);
    throw error;
  }
};

export const getTenantBackupList = async ({
  page,
  limit,
  search,
  status,
}: {
  page: number;
  limit: number;
  search: string;
  status: string;
}) => {
  try {
    const skip = (page - 1) * limit;

    const filter: any = {
      deletedAt: null,
    };

    // Search by tenant name
    if (search) {
      filter.tenantName = {
        $regex: search,
        $options: "i",
      };
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    const [backupList, totalRecords] = await Promise.all([
      tenantBackup
        .find(filter)
        .select({
          _id: 1,
          backupId: 1,
          createdAt: 1,
          tenantName: 1,
          "dateRange.fromDate": 1,
          "dateRange.toDate": 1,
          "fileDetails.fileSize": 1,
          additionalNotes: 1,
          status: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      tenantBackup.countDocuments(filter),
    ]);

    return {
      backupList,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
      },
    };

  } catch (error) {
    console.error("Get Tenant Backup List Operation Error:", error);
    throw error;
  }
};