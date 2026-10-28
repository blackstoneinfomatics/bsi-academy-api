import mongoose, { Types } from "mongoose";
import UpdateModel from "../models/update";
import { CreateUpdateInput } from "../models/update";
import Tenants from "../models/tenants";
import planModel from "../models/plan-model";
import TenantSubscription from "../models/tenantsubscription";
import TenantUsers from "../models/users";
import emailTemplates from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";
import { sendNotification } from "./notification";
import { appStatus, updateMessage } from "../config/messages";
import { Lookup } from "../models/lookup";
import { throwError } from "../helpers/throwError";
import {
  PurchaseActivationMode,
  PurchaseRequestStatus,
  PurchasePaymentStatus,
  SubscriptionStatus,
  PaymentStatus,
} from "../shared/enum";
import { randomUUID } from "crypto";
import purchaseRequest from "../models/purchaseRequest";

interface GetUpdatesListParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
}

interface CreatePurchaseRequestParams {
  tenantId: string;
  updateId: string;
  activationMode: PurchaseActivationMode;
  requestedBy: string;
}

interface GetTenantUpdateDetailsInput {
  updateId: string;
  tenantId: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

const sendUpdateEmail = async (payload: CreateUpdateInput): Promise<void> => {
  const selectedTenantCodes = (payload.selectedTenants || [])
    .map((tenantCode) => tenantCode.trim())
    .filter(Boolean);

  console.log(
    "sendUpdateEmail >> start",
    JSON.stringify({
      emailNotificationEnabled: payload.sendNotification?.email,
      selectedTenants: selectedTenantCodes,
    }),
  );

  if (!payload.sendNotification?.email || selectedTenantCodes.length === 0) {
    console.log(
      "sendUpdateEmail >> skipped: notification disabled or no tenants selected",
    );

    return;
  }

  const emailTemplate = await emailTemplates
    .findOne({
      templateKey: "Publich_Update",
      status: "Active",
    })
    .exec();

  if (!emailTemplate) {
    console.log("❌ sendUpdateEmail >> Email template not found");

    return;
  }

  console.log(
    "✅ sendUpdateEmail >> Email template found",
    emailTemplate.templateKey,
  );

  const subscriptions = await TenantSubscription.find({
    tenantId: { $in: selectedTenantCodes },
    deletedAt: null,
  })
    .select({
      tenantId: 1,
      _id: 0,
    })
    .lean();

  console.log(
    "sendUpdateEmail >> subscriptions found",
    JSON.stringify(subscriptions),
  );

  const tenantCodes =
    subscriptions.length > 0
      ? subscriptions.map((subscription) => subscription.tenantId)
      : selectedTenantCodes;

  const tenants = await Tenants.find({
    tenantCode: { $in: tenantCodes },
  })
    .select({
      tenantCode: 1,
      emailId: 1,
    })
    .lean();

  console.log("sendUpdateEmail >> tenants found", JSON.stringify(tenants));

  const recipients = tenants
    .filter((tenant) => tenant.emailId)
    .map((tenant) => ({
      email: tenant.emailId,
    }));

  console.log("sendUpdateEmail >> recipients", JSON.stringify(recipients));

  if (recipients.length === 0) {
    console.log("sendUpdateEmail >> skipped: no recipients resolved");

    return;
  }

  const title = escapeHtml(payload.title);

  const description = escapeHtml(payload.description).replace(/\n/g, "<br />");

  const category = escapeHtml(payload.category);

  const priority = escapeHtml(payload.priority || "");

  const publishDate = new Date(payload.publishDate).toDateString();

  const attachments = (payload.attachments || [])
    .map((attachment) => escapeHtml(attachment))
    .join(", ");

  const htmlPart = emailTemplate.templateContent
    .replace(/<title>/g, title)
    .replace(/<description>/g, description)
    .replace(/<category>/g, category)
    .replace(/<priority>/g, priority)
    .replace(/<publishDate>/g, publishDate)
    .replace(/<attachments>/g, attachments);

  console.log("sendUpdateEmail >> template prepared");

  const subject = payload.title;

  console.log("📨 Sending update email to:", JSON.stringify(recipients));

  await sendEmailClient(recipients, subject, htmlPart);

  console.log("✅ sendUpdateEmail >> Update email sent successfully");
};

const sendUpdateInAppNotification = async (
  payload: CreateUpdateInput,
  updateId: string,
): Promise<void> => {
  const selectedTenantCodes = (payload.selectedTenants || [])
    .map((tenantCode) => tenantCode.trim())
    .filter(Boolean);

  if (!payload.sendNotification?.inApp || selectedTenantCodes.length === 0) {
    return;
  }

  const recipients = await TenantUsers.find({
    tenantId: { $in: selectedTenantCodes },
    status: appStatus.ACTIVE,
  })
    .select({
      tenantId: 1,
      userId: 1,
      userName: 1,
      email: 1,
      _id: 0,
    })
    .lean();

  const recipientsByTenant = new Map<
    string,
    { userId: string; userName?: string; email?: string }[]
  >();

  for (const recipient of recipients) {
    const tenantId = recipient.tenantId;
    const userId = recipient.userId;
    if (!tenantId || !userId) continue;

    const tenantRecipients = recipientsByTenant.get(tenantId) || [];
    tenantRecipients.push({
      userId,
      userName: recipient.userName,
      email: recipient.email,
    });
    recipientsByTenant.set(tenantId, tenantRecipients);
  }

  if (recipientsByTenant.size === 0) {
    console.warn(
      "sendUpdateInAppNotification >> skipped: no active tenant users resolved",
    );
    return;
  }
  const sender = await Lookup.findOne({
    lookupKey: "SUPER_ADMIN",
    keyValue: "super_admin",
    status: "Active",
  })
    .select("userId keyName")
    .lean();

  if (!sender?.userId) {
    console.error(
      "[update-notification] Active Super Admin lookup with userId was not found; notifications were not sent",
    );
    return;
  }

  const senderTenant = await TenantUsers.findOne({
    userId: sender.userId,
    status: appStatus.ACTIVE,
  })
    .select("tenantId")
    .lean();

  if (!senderTenant?.tenantId) {
    console.error(
      `[update-notification] Active TenantUsers record with tenantId was not found for Super Admin ${sender.userId}; notifications were not sent`,
    );
    return;
  }

  for (const [tenantId, tenantRecipients] of recipientsByTenant) {
    const result = await sendNotification({
      tenantId,
      senderTenantId: senderTenant.tenantId,
      receiverTenantId: tenantId,
      title: payload.title,
      messages: payload.description,
      senderId: sender.userId,
      senderName: sender.keyName,
      receiverId: tenantRecipients.map((recipient) => recipient.userId),
      receiverName: tenantRecipients.map((recipient) => recipient.userName),
      receiverEmail: tenantRecipients.map((recipient) => recipient.email),
      notificationType: "UPDATE_PUBLISHED",
      notificationStatus: "Unseen",
      isRead: false,
      status: "active",
      metadata: {
        updateId,
        category: payload.category,
        priority: payload.priority,
        publishDate: payload.publishDate,
        description: payload.description,
        attachments: payload.attachments || [],
      },
      createdBy: "system",
      updatedBy: "system",
    });

    if (!result.success) {
      console.error(
        `Failed to save in-app update notification for tenant ${tenantId}`,
        result.error ?? result.errors,
      );
    }
  }
};

const resolveAudienceTenantIds = async (
  payload: CreateUpdateInput,
): Promise<string[]> => {
  const activeFilter = {
    status: "ACTIVE",
    deletedAt: null,
  };

  if (payload.audience.includes("All Tenants")) {
    const subscriptions = await TenantSubscription.find(activeFilter)
      .select({ tenantId: 1, _id: 0 })
      .lean();

    return subscriptions.map((subscription) => subscription.tenantId);
  }

  if (payload.audience.includes("Select Tenants")) {
    const selectedTenants = await Tenants.find({
      $or: [
        { tenantCode: { $in: payload.selectedTenants || [] } },
        { tenantName: { $in: payload.selectedTenants || [] } },
      ],
    })
      .select({ tenantCode: 1, _id: 0 })
      .lean();

    const selectedTenantCodes = selectedTenants.map(
      (tenant) => tenant.tenantCode,
    );
    const selectedSubscriptionIds = (payload.selectedTenants || [])
      .filter((tenantId) => mongoose.isValidObjectId(tenantId))
      .map((tenantId) => new mongoose.Types.ObjectId(tenantId));

    const subscriptions = await TenantSubscription.find({
      ...activeFilter,
      $or: [
        { tenantId: { $in: selectedTenantCodes } },
        { _id: { $in: selectedSubscriptionIds } },
      ],
    })
      .select({ tenantId: 1, _id: 0 })
      .lean();

    return subscriptions.map((subscription) => subscription.tenantId);
  }

  if (payload.planName) {
    const subscriptions = await TenantSubscription.find({
      ...activeFilter,
      planName: payload.planName,
    })
      .select({ tenantId: 1, _id: 0 })
      .lean();

    return subscriptions.map((subscription) => subscription.tenantId);
  }

  return [];
};

const resolveTenantNames = async (tenantCodes: string[]): Promise<string[]> => {
  if (tenantCodes.length === 0) {
    return [];
  }

  const tenants = await Tenants.find({
    tenantCode: { $in: tenantCodes },
  })
    .select({ tenantName: 1, _id: 0 })
    .lean();

  return tenants.map((tenant) => tenant.tenantName);
};

const calculatePercentage = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) {
      return {
        percentage: 0,
        direction: "same",
      };
    }

    return {
      percentage: 100,
      direction: "up",
    };
  }

  const percentage = Math.round(((current - previous) / previous) * 100);

  let direction: "up" | "down" | "same" = "same";

  if (percentage > 0) {
    direction = "up";
  } else if (percentage < 0) {
    direction = "down";
  }

  return {
    percentage: Math.abs(percentage),
    direction,
  };
};

export const createUpdate = async (payload: CreateUpdateInput) => {
  const selectedTenants = await resolveAudienceTenantIds(payload);
  const selectedTenantNames = await resolveTenantNames(selectedTenants);
  const resolvedPayload = {
    ...payload,
    selectedTenants,
  };

  const update = await UpdateModel.create({
    title: payload.title,

    category: payload.category,

    audience: payload.audience,

    selectedTenants,

    selectedTenantsCount: selectedTenants.length,

    selectedTenantNames,

    description: payload.description,

    publishDate: payload.publishDate,

    releaseDate: payload.releaseDate,

    priority: payload.priority,

    attachments: payload.attachments || [],

    sendNotification: {
      email: payload.sendNotification?.email || false,
      inApp: payload.sendNotification?.inApp || false,
    },

    email: payload.email,

    recipientEmail: payload.recipientEmail,

    recipientEmails: payload.recipientEmails || [],

    purchaseTenant: payload.purchaseTenant || 0,

    monthlyPrice: payload.monthlyPrice,

    discount: payload.discount,

    status: payload.status || "Scheduled",

    views: 0,
  });

  try {
    await sendUpdateEmail(resolvedPayload);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.log("sendUpdateEmail >> FAILED", error?.message || err);
  }

  try {
    await sendUpdateInAppNotification(resolvedPayload, update._id.toString());
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error(
      "sendUpdateInAppNotification >> FAILED",
      error?.message || err,
    );
  }

  return {
    update,
    selectedTenants,
    selectedTenantsCount: selectedTenants.length,
  };
};

export const publishScheduledUpdates = async () => {
  const result = await UpdateModel.updateMany(
    {
      status: "Scheduled",
      publishDate: { $lte: new Date() },
      deletedAt: null,
    },
    {
      $set: { status: "Published" },
    },
  );

  return result.modifiedCount;
};

export const getUpdateDashboardCards = async () => {
  const now = new Date();

  // Current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Previous month
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    currentTotalUpdates,
    previousTotalUpdates,

    currentPublishedUpdates,
    previousPublishedUpdates,

    currentScheduledUpdates,
    previousScheduledUpdates,

    currentTotalPurchaseRequests,
    previousTotalPurchaseRequests,

    // currentViewsResult,
    // previousViewsResult,
  ] = await Promise.all([
    UpdateModel.countDocuments({
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Published",
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Published",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Scheduled",
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Scheduled",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    purchaseRequest.countDocuments({
      deletedAt: null,
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    purchaseRequest.countDocuments({
      deletedAt: null,
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // UpdateModel.aggregate([
    //   {
    //     $match: {
    //       createdAt: {
    //         $gte: currentMonthStart,
    //         $lt: nextMonthStart,
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       totalViews: {
    //         $sum: {
    //           $ifNull: ["$views", 0],
    //         },
    //       },
    //     },
    //   },
    // ]),

    // UpdateModel.aggregate([
    //   {
    //     $match: {
    //       createdAt: {
    //         $gte: previousMonthStart,
    //         $lt: currentMonthStart,
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       totalViews: {
    //         $sum: {
    //           $ifNull: ["$views", 0],
    //         },
    //       },
    //     },
    //   },
    // ]),
  ]);

  // const currentTotalViews =
  //   currentViewsResult[0]?.totalViews || 0;

  // const previousTotalViews =
  //   previousViewsResult[0]?.totalViews || 0;

  const totalUpdatesChange = calculatePercentage(
    currentTotalUpdates,
    previousTotalUpdates,
  );

  const publishedUpdatesChange = calculatePercentage(
    currentPublishedUpdates,
    previousPublishedUpdates,
  );

  const scheduledUpdatesChange = calculatePercentage(
    currentScheduledUpdates,
    previousScheduledUpdates,
  );

  const totalPurchaseRequestsChange = calculatePercentage(
    currentTotalPurchaseRequests,
    previousTotalPurchaseRequests,
  );


  return {
    totalUpdates: {
      count: currentTotalUpdates,
      percentage: totalUpdatesChange.percentage,
      direction: totalUpdatesChange.direction,
    },

    publishedUpdates: {
      count: currentPublishedUpdates,
      percentage: publishedUpdatesChange.percentage,
      direction: publishedUpdatesChange.direction,
    },

    scheduledUpdates: {
      count: currentScheduledUpdates,
      percentage: scheduledUpdatesChange.percentage,
      direction: scheduledUpdatesChange.direction,
    },

    totalPurchaseRequests: {
      count: currentTotalPurchaseRequests,
      percentage: totalPurchaseRequestsChange.percentage,
      direction: totalPurchaseRequestsChange.direction,
    },

    // totalViews: {
    //   count: currentTotalViews,
    //   percentage: totalViewsChange.percentage,
    //   direction: totalViewsChange.direction,
    // },
  };
};

export const getUpdatesList = async (params: GetUpdatesListParams) => {
  const { page, limit, search, status, category, priority } = params;

  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Priority filter
  if (priority) {
    filter.priority = priority;
  }

  // Search filter
  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    filter.$or = [
      {
        title: searchRegex,
      },
      {
        description: searchRegex,
      },
      {
        category: searchRegex,
      },
    ];
  }

  const [updates, totalRecords] = await Promise.all([
    UpdateModel.find(filter)
      .select({
        title: 1,
        description: 1,
        category: 1,
        priority: 1,
        monthlyPrice: 1,
        discount: 1,
        audience: 1,
        selectedTenantNames: 1,
        createdAt: 1,
        publishDate: 1,
        status: 1,
      })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    UpdateModel.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    data: updates,

    pagination: {
      currentPage: page,
      limit,
      totalRecords,
      totalPages,
    },
  };
};

export const getTenantUpdates = async (tenantId: string) => {
  const updates = await UpdateModel.find({
    selectedTenants: tenantId,
    deletedAt: null,
  })
    .select({
      title: 1,
      description: 1,
      category: 1,
      publishDate: 1,
      status: 1,
    })
    .sort({ createdAt: -1 })
    .lean();

  if (!updates.length) {
    return [];
  }

  const updateIds = updates.map((update) => update._id);

  const purchaseRequests = await purchaseRequest.find({
    "tenant.tenantId": tenantId,
    "update.updateId": { $in: updateIds },
    deletedAt: null,
  })
    .select({
      "update.updateId": 1,
      status: 1,
      requestedAt: 1,
    })
    .sort({ requestedAt: -1 })
    .lean();


  const purchaseRequestMap = new Map<
    string,
    { status: string; requestedAt: Date }
  >();

  for (const purchase of purchaseRequests) {
    const updateId = String(purchase.update.updateId);

    if (!purchaseRequestMap.has(updateId)) {
      purchaseRequestMap.set(updateId, {
        status: purchase.status,
        requestedAt: purchase.requestedAt,
      });
    }
  }

  return updates.map((update) => {
    const purchase = purchaseRequestMap.get(String(update._id));

    return {
      ...update,
      requestedDate: purchase?.requestedAt ?? null,
      purchaseStatus: purchase?.status ?? "NOT PURCHASED",
    };
  });
};

export const getUpdateById = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Update not found") as Error & {
      statusCode?: number;
    };
    error.statusCode = 404;
    throw error;
  }

  const update = await UpdateModel.findById(id)
    .select({
      _id: 1,
      title: 1,
      category: 1,
      description: 1,
      audience: 1,
      selectedTenants: 1,
      selectedTenantsCount: 1,
      selectedTenantNames: 1,
      monthlyPrice: 1,
      discount: 1,
      publishDate: 1,
      priority: 1,
      createdAt: 1,
      attachments: 1,
    })
    .lean();

  if (!update) {
    const error = new Error("Update not found") as Error & {
      statusCode?: number;
    };
    error.statusCode = 404;
    throw error;
  }

  return update;
};

const BILLING_CYCLE_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface GetPurchaseQuoteParams {
  tenantId: string;
  updateId: string;
  activationMode: PurchaseActivationMode;
}

const roundMoney = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

const getRemainingDays = (subscriptionEndDate: Date, now: Date): number =>
  Math.max(
    0,
    Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / DAY_IN_MS),
  );

export const getPurchaseQuoteService = async ({
  tenantId,
  updateId,
  activationMode,
}: GetPurchaseQuoteParams) => {

  if (!Object.values(PurchaseActivationMode).includes(activationMode)) {
    throwError("Invalid activation mode", 400);
  }

  const tenant = await Tenants.findOne({
    tenantCode: tenantId,
    deletedAt: null,
  }).lean();

  if (!tenant) {
    throwError("Tenant not found", 404);
    return;
  }

  const now = new Date();

  const update = await UpdateModel.findOne({
    _id: new Types.ObjectId(updateId),
    deletedAt: null,
  }).lean();

  if (!update) {
    throwError("Active update pricing not found", 404);
    return;
  }

  const subscription = await TenantSubscription.findOne({
    tenantId: tenant.tenantCode,
    status: SubscriptionStatus.ACTIVE,
    paymentStatus: PaymentStatus.PAID,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!subscription) {
    throwError("Active tenant subscription not found", 404);
    return;
  }

  const subscriptionStartDate = subscription.startDate
    ? new Date(subscription.startDate)
    : null;

  const subscriptionEndDate = subscription.endDate
    ? new Date(subscription.endDate)
    : null;

  if (!subscriptionStartDate || !subscriptionEndDate) {
    throwError("Subscription  start and end date is required", 400);
    return;
  }

  if (
    Number.isNaN(subscriptionStartDate.getTime()) ||
    Number.isNaN(subscriptionEndDate.getTime()) ||
    subscriptionEndDate <= subscriptionStartDate
  ) {
    throwError("Invalid subscription billing dates", 400);
  }

  const plan = await planModel
    .findOne({
      _id: subscription.planId,
      status: "Active",
    })
    .lean();

  if (!plan) {
    throwError("Subscription plan not found", 404);
    return;
  }

  const gstRateValue = plan.billingPeriods?.[0]?.gstRate;

  if (
    gstRateValue === undefined ||
    !Number.isFinite(Number(gstRateValue)) ||
    Number(gstRateValue) < 0 ||
    Number(gstRateValue) > 100
  ) {
    throwError("Invalid GST rate in plan billing period", 400);
  }

  const gstRate = Number(gstRateValue);
  const monthlyAmount = Number(update.monthlyPrice);
  const discountValue = Number(update.discount ?? 0);

  if (
    !Number.isFinite(monthlyAmount) ||
    monthlyAmount < 0 ||
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    discountValue > 100 ||
    !Number.isFinite(gstRate) ||
    gstRate < 0 ||
    gstRate > 100
  ) {
    throwError("Invalid feature pricing or plan GST configuration", 400);
  }

  const totalPeriodDays = BILLING_CYCLE_DAYS;

  const remainingDays = getRemainingDays(subscriptionEndDate, now);

  const commonData = {
    activationMode,
    tenantId: String(tenant.tenantCode),
    tenantName: tenant.tenantName,

    tenantSubscriptionId: String(subscription._id),
    currentPlanId: String(plan._id),
    currentPlanName: plan.planName,
    subscriptionStartDate,
    subscriptionEndDate,

    updateId: String(update._id),
    updateName: update.title,
    category:update.category,
    monthlyAmount,
    discountValue,
    currency: "INR",
  };

  if (activationMode === PurchaseActivationMode.NEXT_PLAN) {
    return {
      ...commonData,
    };
  }

  if (remainingDays <= 0) {
    throwError("No remaining subscription days", 400);
  }

  const subAmount = roundMoney(
    (monthlyAmount / totalPeriodDays) * remainingDays,
  );

  const discountAmount = roundMoney(subAmount * (discountValue / 100));


  const gstAmount = roundMoney(subAmount * (gstRate / 100));

  const totalAmount = roundMoney((subAmount + gstAmount) - discountAmount);

  return {
    ...commonData,
    remainingDays,
    totalPeriodDays,
    subAmount,
    discountAmount,
    gstRate,
    gstAmount,
    totalAmount,
  };
};


export const createPurchaseRequestService = async ({
  tenantId,
  updateId,
  activationMode,
  requestedBy,
}: CreatePurchaseRequestParams) => {
  const now = new Date();

  const tenant = await Tenants.findOne({
    tenantCode: tenantId,
    deletedAt: null,
  }).lean();

  if (!tenant) {
    throwError("Tenant not found", 404);
    return;
  }

   const update = await UpdateModel.findOne({
    _id: new Types.ObjectId(updateId),
    deletedAt: null,
  }).lean();

  if (!update) {
    throwError("update not found", 404);
    return;
  }

  // 3. Validate tenant eligibility
  if (!update.selectedTenants?.includes(tenantId)) {
    throwError("update is not available for this tenant", 403);
    return;
  }

   const subscription = await TenantSubscription.findOne({
    tenantId: tenant.tenantCode,
    status: SubscriptionStatus.ACTIVE,
    paymentStatus: PaymentStatus.PAID,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!subscription) {
    throwError("Active tenant subscription not found", 404);
    return;
  }

  const subscriptionStartDate = subscription.startDate
    ? new Date(subscription.startDate)
    : null;

  const subscriptionEndDate = subscription.endDate
    ? new Date(subscription.endDate)
    : null;

  if (!subscriptionStartDate || !subscriptionEndDate) {
    throwError("Subscription  start and end date is required", 400);
    return;
  }

  if (
    Number.isNaN(subscriptionStartDate.getTime()) ||
    Number.isNaN(subscriptionEndDate.getTime()) ||
    subscriptionEndDate <= subscriptionStartDate
  ) {
    throwError("Invalid subscription dates", 400);
    return;
  }

  // 5. Fetch current plan
  const plan = await planModel.findOne({
    _id: subscription.planId,
    deletedAt: null,
  }).lean();

  if (!plan) {
    throwError("Subscription plan not found", 404);
    return;
  }

  // 6. Read feature pricing
  const monthlyAmount = Number(update.monthlyPrice);
  const discountValue = Number(update.discount ?? 0);

  if (
    !Number.isFinite(monthlyAmount) ||
    monthlyAmount < 0 ||
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    discountValue > 100
  ) {
    throwError("Invalid feature pricing or discount", 400);
    return;
  }

  // 7. Calculate subscription duration
  const totalPeriodDays = Math.max(
    1,
    Math.ceil(
      (subscriptionEndDate.getTime() -
        subscriptionStartDate.getTime()) /
        DAY_IN_MS,
    ),
  );

  const remainingDays = Math.max(
    0,
    Math.ceil(
      (subscriptionEndDate.getTime() - now.getTime()) / DAY_IN_MS,
    ),
  );

  // 8. Calculate pricing
  let subAmount: number;
  let discountAmount: number;
  let gstRate: number;
  let gstAmount: number;
  let totalAmount: number;

  if (activationMode === PurchaseActivationMode.IMMEDIATE) {
    if (now < subscriptionStartDate || remainingDays <= 0) {
      throwError("Subscription is not currently active", 400);
      return;
    }

    gstRate = Number(plan.billingPeriods?.[0]?.gstRate ?? 0);

    if (
      !Number.isFinite(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      throwError("Invalid GST rate configured on plan", 400);
      return;
    }

    subAmount = roundMoney(
    (monthlyAmount / BILLING_CYCLE_DAYS) * remainingDays,
  );

   discountAmount = roundMoney(subAmount * (discountValue / 100));


  gstAmount = roundMoney(subAmount * (gstRate / 100));

  totalAmount = roundMoney((subAmount + gstAmount) - discountAmount);

  } else {
    // NEXT_PLAN: store the monthly pricing snapshot.
    // Recalculate applicable tax when the next subscription takes effect.
    subAmount = 0;
    discountAmount =0;
    gstRate = 0;
    gstAmount = 0;
    totalAmount = 0;
  }

  const existingRequest = await purchaseRequest.findOne({
    "tenant.tenantId": tenantId,
    "update.updateId": new Types.ObjectId(updateId),
    status: {
      $in: [
        PurchaseRequestStatus.PENDING_APPROVAL,
        PurchaseRequestStatus.APPROVED,
        PurchaseRequestStatus.PAYMENT_PENDING,
        PurchaseRequestStatus.SCHEDULED,
      ],
    },
    deletedAt: null,
  }).lean();

  if (existingRequest) {
    throwError(
      "A purchase request already exists for this feature",
      409,
    );
    return;
  }

  // 10. Save using your existing PurchaseRequestSchema
  const PurchaseRequest = await purchaseRequest.create({
    purchaseNumber: `PUR-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 5)
      .toUpperCase()}`,

    status: PurchaseRequestStatus.PENDING_APPROVAL,
    activationMode,
    requestedAt: now,

    tenant: {
      tenantId: String(tenant.tenantCode),
      tenantName: String(tenant.tenantName),
      requestedBy,
    },

    subscription: {
      tenantSubscriptionId: subscription._id,
      currentPlanId: plan._id,
      currentPlanName: plan.planName,
      subscriptionStartDate,
      subscriptionEndDate,
      remainingDays,
      totalPeriodDays,
    },

    update: {
      updateId: update._id,
      updateName: update.title,
      category:update.category,
      monthlyAmount,
      discountValue,
    },

    pricing: {
      subAmount,
      discountAmount,
      gstRate,
      gstAmount,
      totalAmount,
      currency: "INR",
    },

    approval: {
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    },

    payment: {
      paymentId: null,
      paymentStatus:
        activationMode === PurchaseActivationMode.IMMEDIATE
          ? PurchasePaymentStatus.PENDING
          : PurchasePaymentStatus.NOT_REQUIRED,
    },

    activatedAt: null,
    deletedAt: null,
  });

      const superAdminTenant = await Lookup.findOne({
               lookupKey: "SUPER_ADMIN",
               status: "Active",
             }).lean();
     
             if (!superAdminTenant) {
               throwError("Super admin tenant not found", 404);
             }
     
             const superAdminUser = await TenantUsers.findOne({
               tenantId: superAdminTenant?.tenantId,
               role: "SUPERADMIN",
               status: appStatus.ACTIVE,
             })
               .select("userId tenantId userName role email")
               .lean<{
                 userId: string;
                 tenantId: string;
                 userName: string;
                 email:string;
                 role: string[];
               }>();

               const admin = await TenantUsers.findOne({
                tenantId:tenantId,
                userId:requestedBy,
                role:"ADMIN",
                status:appStatus.ACTIVE,
               })
                .select("userId tenantId userName role email")
               .lean<{
                 userId: string;
                 tenantId: string;
                 userName: string;
                 email:string;
                 role: string[];
               }>();

    await sendNotification({
      requestId:PurchaseRequest.purchaseNumber,
      tenantId :superAdminUser?.tenantId,
      senderTenantId:tenantId,
      receiverTenantId: superAdminUser?.tenantId,
      title: `Update Request by ${admin?.userName}`,
      messages: `New Update purchase request for ${update.title} `,
      senderId: admin?.userId,
      senderName: admin?.userName,
      receiverId: superAdminUser?.userId,
      receiverName:superAdminUser?.userName,
      receiverEmail:superAdminUser?.email,
      notificationType: "UPDATE_REQUESTED",
      notificationStatus: "Unseen",
      isRead: false,
      status: "active",
      metadata: {
        updateId,
        category: update.category,
      },
      createdBy: "system",
      updatedBy: "system",
    });

  // 11. Return only required response fields
  return {
    purchaseRequestId: PurchaseRequest._id,
    purchaseNumber: PurchaseRequest.purchaseNumber,
    status: PurchaseRequest.status,
    activationMode: PurchaseRequest.activationMode,
  };
};

export const getTenantUpdateDetails = async ({
  updateId,
  tenantId,
}: GetTenantUpdateDetailsInput) => {
  if (!mongoose.isValidObjectId(updateId)) {
    throw new Error(updateMessage.UPDATE_INVALID_ID);
  }

  // Fetch update details.
  const update = await UpdateModel.findOne({
    _id: updateId,
    deletedAt: null,
  })
    .select("title category description status")
    .lean();

  if (!update) {
    throw new Error(updateMessage.UPDATE_NOT_FOUND);
  }

  // Find the purchase request for this feature and tenant.
  // updates._id matches purchaserequest.featureId.
  const purchaseRequestRecord = await purchaseRequest.findOne({
    featureId: update._id,
    tenantId,
    deletedAt: null,
  })
    .select("status requestedAt")
    .sort({ requestedAt: -1 })
    .lean();

  return {
    _id: update._id,
    title: update.title,
    category: update.category,
    description: update.description,
    status: update.status,

    purchaseStatus: purchaseRequestRecord?.status ?? "Not Requested",
    requestedAt: purchaseRequestRecord?.requestedAt ?? null,
  };
};