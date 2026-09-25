import {
  ITenant,
  ITenantCreate,
  ITenantDetailsFeatureAccess,
  ITenantDetailsModuleAccess,
  ITenantDetailsResponse,
  ITenantPortalFeature,
  ITenantSettings,
  ITenantSettingsPayload,
  TenantAccessLabel,
} from "../../types/models.types";
import { appStatus, syncJob} from "../config/messages";
import TenantModel from "../models/tenants";
import TenantSettingsModel from "../models/tenant_setting";
import SubscriptionTrial from "../models/subcriptionTrial";
import { isEmpty, isNil, isEqual } from "lodash";
import { badRequest, Boom, conflict, notFound } from "@hapi/boom";
import {
  GetAllRecordsParams,
  PaymentStatus,
  PortalStatus,
  Status,
  SubscriptionStatus,
} from "../shared/enum";
import AppLogger from "../helpers/logging";
import { Types } from "mongoose";
import { config } from "../config/env";
import axios from "axios";
import { generateTenant } from "./rollcounter";
import { TenantWelcomeMail } from "./trailExperiedMail";
import { throwError } from "../helpers/throwError";
import plan from "../models/plan-model";
import TenantSubscription from "../models/tenantsubscription";
import TenantPortalConfig from "../models/tenantPortalConfig";
import TenantPortal from "../models/tenantPortal";

import { Model, PipelineStage } from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  tenantDashboardMessages,
  tenantsMessages,
} from "../config/messages";
import {
  PortalType,
  RefundStatus,
} from "../shared/enum";
import PaymentTransaction from "../models/paymenttransaction";
import RefundTransaction from "../models/refundTransaction";
import AuditLog from "../models/auditlog";
import portalModule from "../models/portalModule";
/**
 * Creates a new student.
 *
 * @param {ITenantCreate} payload - The data of the user to be created.
 * @returns {Promise<ITenant>} - A promise that resolves to the created user document.
 */

export const createTenant = async (
  payload: ITenantCreate,
): Promise<ITenant | { error: any }> => {
  const tenantCode = await generateTenant("TEN", 6);
  const newTenant = new TenantModel({
    ...payload,
    tenantCode,
  });

  const savedTenant = await newTenant.save();

  await TenantWelcomeMail(savedTenant);

  return savedTenant.toObject();
};

/**
 * Retrieves a tenant record by its tenantCode.
 *
 * @param {string} tenantCode - The tenantCode of the tenant document.
 * @returns {Promise<ITenant | null>} - A promise that resolves to the tenant record or null if not found.
 */
export const getActiveTenantRecordByCode = async (
  tenantCode: string,
): Promise<ITenant | null> => {
  return TenantModel.findOne({
    tenantCode,
    status: appStatus.ACTIVE,
  }).lean();
};


export const updateTenantDetailsByTenantId = async (
  tenantId: string,
  payload: Partial<ITenant>,
): Promise<ITenant | null | Boom> => {
  const { organizationName, tenantJobCode } = payload;

  const existingTenant = await TenantModel.findOne({
    _id: new Types.ObjectId(tenantId),
    status: appStatus.ACTIVE,
  }).exec();

  if (!existingTenant) {
    return notFound(tenantsMessages.TENANT_NOT_FOUND);
  }

  // Check Duplicate for OrganizationName (excluding the current tenant)
  if (!isNil(organizationName)) {
    const organizationNameDuplicate = await TenantModel.findOne({
      _id: { $ne: new Types.ObjectId(tenantId) }, // Exclude current tenant
      organizationName,
      status: appStatus.ACTIVE,
    }).exec();

    if (organizationNameDuplicate) {
      return conflict(tenantsMessages.ORGANIZATION_NAME_EXISTS);
    }
  }

  // Check Duplicate for TenantJobCode (excluding the current tenant)
  if (!isNil(tenantJobCode)) {
    const tenantJobCodeDuplicate = await TenantModel.findOne({
      tenantJobCode,
      status: appStatus.ACTIVE,
      _id: { $ne: new Types.ObjectId(tenantId) }, // Exclude current tenant
    }).exec();

    if (tenantJobCodeDuplicate) {
      return conflict(tenantsMessages.TENANT_JOB_CODE_EXISTS);
    }
  }

  // Update the tenant details
  const updatedTenant = await TenantModel.findOneAndUpdate(
    { _id: new Types.ObjectId(tenantId) },
    { $set: payload },
    { new: true }, // Return the updated document
  ).lean();

  if (!updatedTenant) {
    return notFound(tenantsMessages.UPDATE_FAILED);
  }

  return updatedTenant;
};

export const generateRefreshToken = async (keyValue: any) => {
  const { clientId, clientSecret, code } = keyValue;
  const tokenResponse = await axios.post(
    config.atsConfig.zoho_job_access_token_import,
    new URLSearchParams({
      grant_type: syncJob.AUTHORIZATION_CODE,
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }).toString(),
    {
      headers: {
        "Content-Type": syncJob.CONTENT_TYPE[2],
      },
    },
  );
  return tokenResponse;
};

/**
 * Retrieves a tenant record by its tenantCode.
 *
 * @param {string} tenantCode - The tenantCode of the tenant document.
 * @returns {Promise<ITenant | null>} - A promise that resolves to the tenant record or null if not found.
 */
export const getActiveTenantRecordByJobCode = async (
  tenantCode: string,
): Promise<ITenant | null> => {
  return TenantModel.findOne({
    tenantJobCode: tenantCode,
    status: appStatus.ACTIVE,
  }).lean();
};

/**
 * Creates a new tenant settings.
 *
 * @param {ITenantSettingsPayload} payload - The data of the tenant settings to be created.
 * @returns {Promise<ITenantSettings>} - A promise that resolves to the created tenant settings document.
 */
export const createTenantSettings = async (
  payload: ITenantSettingsPayload,
): Promise<ITenantSettings | Boom> => {
  const { keyName, tenantId, keyValue } = payload;

  const recordExists = await TenantSettingsModel.findOne({
    keyName,
    tenantId,
    status: appStatus.ACTIVE,
  }).exec();

  if (!isNil(recordExists) && !isEmpty(recordExists)) {
    return badRequest(tenantsMessages.KEY_ALREADY_EXIST);
  }

  let refreshToken: any;
  if (keyName === tenantsMessages.KEYNAMES[0]) {
    const refreshTokenData = await generateRefreshToken(keyValue);
    if (refreshTokenData.data.error) {
      return badRequest(refreshTokenData.data.error);
    }
    refreshToken = refreshTokenData.data.refresh_token;
  }

  // Create a new payload with refreshToken
  let newPayload = {
    ...payload,
    keyValue: keyValue,
  };

  if (keyName !== tenantsMessages.KEYNAMES[6]) {
    newPayload = {
      ...newPayload,
      keyValue: {
        ...keyValue,
        refreshToken,
      },
    };
  }

  // Create a new instance of the TenantSettingsModel with the provided data
  const newTenantSettings = new TenantSettingsModel(newPayload);

  // Save the new user to the database
  const savedTenantSettings = await newTenantSettings.save();

  // Convert the savedTenantSettings to a plain object and return
  return savedTenantSettings.toObject();
};

/**
 * Retrieves all tenant settings records for a given tenant, with sorting.
 *
 * @param {GetAllRecordsParams} params
 * @returns {Promise<{ tenantSettings: ITenantSettings[]; totalCount: number }>}  - A promise that resolves to an object containing:
 *  - `totalCount`: The total number of tenant settings records matching the query.
 *  - `tenantSettings`: An array of tanant settings records for the given tenant.
 */
export const getAllTenantSettingsRecords = async (
  params: GetAllRecordsParams,
): Promise<{ totalCount: number; tenantSettings: ITenantSettings[] }> => {
  const { tenantId, modules, keyNames, sortBy } = params;

  // Log the start of the function execution
  AppLogger.info(tenantsMessages.GET_ALL_LIST_START, { params });

  const query: any = {
    tenantId,
    status: appStatus.ACTIVE,
  };

  if (!isNil(modules) && !isEmpty(modules)) {
    query.module = { $in: modules };
  }
  if (!isNil(keyNames) && !isEmpty(keyNames)) {
    query.keyName = { $in: keyNames };
  }

  const tenantSettingsQuery = TenantSettingsModel.find(query).sort(sortBy);

  const [tenantSettings, totalCount] = await Promise.all([
    tenantSettingsQuery.exec(),
    TenantSettingsModel.countDocuments(query).exec(),
  ]);

  // Log the successful retrieval of tenant settings.
  AppLogger.info(tenantsMessages.GET_ALL_LIST_SUCCESS, {
    totalCount: totalCount,
  });

  return { totalCount, tenantSettings };
};

/**
 * Updates a tenant settings record by their tenantSettingsId.
 *
 * @param {string} tenantSettingsId - The Object ID of the tenantSettings document.
 * @param {Partial<ITenantSettingsPayload>} payload - The data to update.
 * @returns {Promise<ITenantSettings | Boom>} - A promise that resolves to the updated tenantSettings document, or null if not found.
 */
export const updateTenantSettings = async (
  tenantSettingsId: string,
  payload: Partial<ITenantSettingsPayload>,
): Promise<ITenantSettings | Boom> => {
  const { keyName, tenantId, keyValue } = payload;

  const recordExists = await TenantSettingsModel.findOne({
    _id: new Types.ObjectId(tenantSettingsId),
    tenantId,
    status: appStatus.ACTIVE,
    keyName,
  }).exec();

  if (isNil(recordExists) && isEmpty(recordExists)) {
    return notFound(tenantsMessages.TENANT_SETTINGS_NOT_FOUND);
  }

  let newPayload: Partial<ITenantSettingsPayload> = { ...payload };
  if (
    keyName === tenantsMessages.KEYNAMES[0] &&
    (!isEqual(recordExists?.keyValue.code, keyValue.code) ||
      !isEqual(recordExists?.keyValue.clientId, keyValue.clientId) ||
      !isEqual(recordExists?.keyValue.clientSecret, keyValue.clientSecret))
  ) {
    // Generate refreshToken since keyName matches
    const refreshTokenData = await generateRefreshToken(keyValue); // Always generates the token
    if (refreshTokenData.data.error) {
      return badRequest(refreshTokenData.data.error);
    }
    // Create a new payload with refreshToken
    newPayload.keyValue = {
      ...keyValue,
      refreshToken: refreshTokenData.data.refresh_token,
      // Include the generated refreshToken
    };
  }

  const result = await TenantSettingsModel.findByIdAndUpdate(
    { _id: new Types.ObjectId(tenantSettingsId) },
    { $set: newPayload },
    { new: true }, // Return the updated document
  )
    .lean()
    .exec();

  if (isNil(result) && isEmpty(result)) {
    return notFound(tenantsMessages.UPDATE_FAILED);
  }

  return result as ITenantSettings;
};

/**
 * Retrieves a tenant record by its tenantCode.
 *
 * @param {string} tenantSetting - The tenantSetting of the tenantSetting document.
 * @returns {Promise<ITenantSettings | null>} - A promise that resolves to the tenantSetting record or null if not found.
 */
export const getTenantSettingsById = async (
  tenantSettingId: string,
): Promise<ITenantSettings | null> => {
  return TenantSettingsModel.findById({
    _id: new Types.ObjectId(tenantSettingId),
    status: appStatus.ACTIVE,
  }).exec();
};

export const getActiveTenantRecord = async () => {
  const tenants = await TenantModel.find({}).lean();

  return {
    total: tenants.length,
    tenants,
  };
};

export const calculatePercentageChange = (
  currentCount: number,
  previousCount: number,
) => {
  if (previousCount === 0) {
    return {
      percentage: currentCount === 0 ? 0 : 100,
      trend: currentCount === 0 ? "same" : "up",
    };
  }

  const percentage = ((currentCount - previousCount) / previousCount) * 100;

  return {
    percentage: Number(Math.abs(percentage).toFixed(2)),

    trend:
      currentCount > previousCount
        ? "up"
        : currentCount < previousCount
          ? "down"
          : "same",
  };
};

export const getTenantAnalyticsCards = async () => {
  const now = new Date();

  // Current Month

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Previous Month
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  const expiryWindowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const expiryWindowEnd = new Date(expiryWindowStart);
  expiryWindowEnd.setDate(expiryWindowEnd.getDate() + 3);

  // Fetch Analytics Counts

  const [
    currentTotalTenants,
    previousTotalTenants,

    currentActiveTenants,
    previousActiveTenants,

    currentTrialTenants,
    previousTrialTenants,

    currentInactiveTenants,
    previousInactiveTenants,

    currentExpiringTenants,
    previousExpiringTenants,
  ] = await Promise.all([
    // Total Tenants - Current Month

    TenantModel.countDocuments({
      tenantCode: {
        $exists: true,
        $ne: "",
      },
      createdDate: {
        $gte: currentMonthStart,
        $lt: currentMonthEnd,
      },
    }),

    // Total Tenants - Previous Month

    TenantModel.countDocuments({
      tenantCode: {
        $exists: true,
        $ne: "",
      },
      createdDate: {
        $gte: previousMonthStart,
        $lt: previousMonthEnd,
      },
    }),

    // Active Tenants - Current Month

    TenantModel.countDocuments({
      status: "Active",
      createdDate: {
        $gte: currentMonthStart,
        $lt: currentMonthEnd,
      },
    }),

    // Active Tenants - Previous Month

    TenantModel.countDocuments({
      status: "Active",
      createdDate: {
        $gte: previousMonthStart,
        $lt: previousMonthEnd,
      },
    }),

    // Trial Tenants - Current Month

    SubscriptionTrial.countDocuments({
      status: "ACTIVE",
      createdAt: {
        $gte: currentMonthStart,
        $lt: currentMonthEnd,
      },
    }),

    // Trial Tenants - Previous Month

    SubscriptionTrial.countDocuments({
      status: "ACTIVE",
      createdAt: {
        $gte: previousMonthStart,
        $lt: previousMonthEnd,
      },
    }),

    // Inactive Tenants - Current Month

    TenantModel.countDocuments({
      status: "Inactive",
      createdAt: {
        $gte: currentMonthStart,
        $lt: currentMonthEnd,
      },
    }),

    // Inactive Tenants - Previous Month

    TenantModel.countDocuments({
      status: "Inactive",
      createdAt: {
        $gte: previousMonthStart,
        $lt: previousMonthEnd,
      },
    }),

    // Expiring Tenants - Current Month

    SubscriptionTrial.countDocuments({
      status: "ACTIVE",
      isConverted: false,
      trialEndDate: {
        $gte: expiryWindowStart,
        $lt: expiryWindowEnd,
      },
    }),

    // Expiring Tenants - Previous Month

    SubscriptionTrial.countDocuments({
      status: "ACTIVE",
      trialEndDate: {
        $gte: previousMonthStart,
        $lt: previousMonthEnd,
      },
    }),
  ]);

  const totalTenantsChange = calculatePercentageChange(
    currentTotalTenants,
    previousTotalTenants,
  );

  const activeTenantsChange = calculatePercentageChange(
    currentActiveTenants,
    previousActiveTenants,
  );

  const trialTenantsChange = calculatePercentageChange(
    currentTrialTenants,
    previousTrialTenants,
  );

  const inactiveTenantsChange = calculatePercentageChange(
    currentInactiveTenants,
    previousInactiveTenants,
  );

  const expiringTenantsChange = calculatePercentageChange(
    currentExpiringTenants,
    previousExpiringTenants,
  );

  return {
    totalTenants: {
      currentCount: currentTotalTenants,
      previousMonthCount: previousTotalTenants,
      percentage: totalTenantsChange.percentage,
      trend: totalTenantsChange.trend,
    },

    activeTenants: {
      currentCount: currentActiveTenants,
      previousMonthCount: previousActiveTenants,
      percentage: activeTenantsChange.percentage,
      trend: activeTenantsChange.trend,
    },

    trialTenants: {
      currentCount: currentTrialTenants,
      previousMonthCount: previousTrialTenants,
      percentage: trialTenantsChange.percentage,
      trend: trialTenantsChange.trend,
    },

    inactiveTenants: {
      currentCount: currentInactiveTenants,
      previousMonthCount: previousInactiveTenants,
      percentage: inactiveTenantsChange.percentage,
      trend: inactiveTenantsChange.trend,
    },

    expiringTenants: {
      currentCount: currentExpiringTenants,
      previousMonthCount: previousExpiringTenants,
      percentage: expiringTenantsChange.percentage,
      trend: expiringTenantsChange.trend,
    },
  };
};

export const updateTenantPlanService = async (
  tenantId: string,
  payload: {
    planId?: string;
    planName?: string;
    updatedBy?: string;
  },
) => {
  try {
    const { planId, planName, updatedBy } = payload;

    const tenant = await TenantModel.findOne({
      tenantCode: tenantId,
      deletedAt: null,
      status: { $in: [Status.ACTIVE, Status.COMPLETED] },
    });

    if (!tenant) {
      throwError(tenantsMessages.TENANT_NOT_FOUND, 404);
      return;
    }

    const Plan = await plan.findOne({
      _id: planId,
      deletedAt: null,
    });

    if (!Plan) {
      throwError(tenantsMessages.PLAN_NOT_FOUND, 404);
    }

    const existingSub = await TenantSubscription.findOne({
      tenantId,
      deletedAt: null,
    }).sort({ createdAt: -1 });

    if (!existingSub) {
      const year = new Date().getFullYear();
      const count = await TenantSubscription.countDocuments();
      const subscriptionCode = `Sub-${year}-${String(count + 1).padStart(6, "0")}`;

      const newSub = await TenantSubscription.create({
        tenantId,
        planId,
        planName,
        subscriptionCode: subscriptionCode,
        status: SubscriptionStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        autoRenew: false,
        createdBy: updatedBy || "Super-Admin",
      });

      tenant.status = Status.ACTIVE;
      tenant.plan = planName;
      tenant.lastUpdatedBy = "Super-Admin";
      tenant.lastUpdatedDate = new Date();
      await tenant.save();

      return newSub;
    }

    if (existingSub.status === SubscriptionStatus.ACTIVE) {
      throwError(
        `Active plan exists until ${existingSub.endDate?.toISOString()}`,
        400,
      );
    }

    const newSub = await TenantSubscription.findOneAndUpdate(
      { _id: existingSub._id, deletedAt: null },
      {
        $set: {
          planId: planId,
          planName: planName,
          duration: 0,
          autoRenew: false,
          startDate: null,
          endDate: null,
          nextRenewalDate: null,
          status: SubscriptionStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          updatedBy: updatedBy || "Super-Admin",
        },
      },
      { new: true },
    );

    tenant.plan = planName;
    tenant.status= Status.ACTIVE;
    tenant.lastUpdatedBy = "Super-Admin";
    tenant.lastUpdatedDate = new Date();
    
    await tenant.save();

    return {
      data: {
        tenantId: tenantId,
        subscription: {
          planId: planId,
          planName: planName,
          status: newSub?.status,
        },
      },
    };
  } catch (error: any) {
    console.error("Error in updateTenantPlanService:", error);

    throwError(
      error.message || "Internal Server Error",
      error.statusCode || 500,
    );
  }
};

// An item is "Enabled" only when its isEnabled flag is on and its own status is ACTIVE.
const toAccessLabel = (
  isEnabled?: boolean,
  status?: PortalStatus,
): TenantAccessLabel =>
  isEnabled !== false && (status ?? PortalStatus.ACTIVE) === PortalStatus.ACTIVE
    ? tenantsMessages.ACCESS_ENABLED
    : tenantsMessages.ACCESS_DISABLED;

const buildAddress = (tenant: ITenant): string | null => {
  const address = [
    tenant.street,
    tenant.city,
    tenant.state,
    tenant.country,
    tenant.postalCode,
  ]
    .filter((part) => !isNil(part) && String(part).trim() !== "")
    .join(", ");

  return address || null;
};

/**
 * Retrieves everything the Tenant Details screen needs in one call:
 * company information (Tenants), subscription (TenantSubscription) and the
 * portal-wise module / feature access (TenantPortalConfig).
 *
 * TenantSubscription.tenantId and TenantPortalConfig.tenantId both store the tenantCode.
 * A missing tenant is a 404; a missing subscription or config only empties its own section.
 *
 * @param {string} tenantCode - The tenantCode of the tenant document.
 * @returns {Promise<ITenantDetailsResponse>}
 */
export const getTenantFullDetailsByCode = async (
  tenantCode: string,
): Promise<ITenantDetailsResponse> => {
  const tenant = await TenantModel.findOne({ tenantCode }).lean();

  if (!tenant) {
    return throwError(tenantsMessages.TENANT_NOT_FOUND, 404);
  }

  const [subscription, configs, portals] = await Promise.all([
    TenantSubscription.findOne({ tenantId: tenantCode, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean(),
    TenantPortalConfig.find({ tenantId: tenantCode, deletedAt: null }).lean(),
    TenantPortal.find({ tenantId: tenantCode, deletedAt: null })
      .select("portalId portalName")
      .lean(),
  ]);

  const portalNameById = new Map(
    portals.map((portal) => [String(portal.portalId), portal.portalName]),
  );

  const modulesAccess: ITenantDetailsModuleAccess[] = [];
  const featuresAccess: ITenantDetailsFeatureAccess[] = [];

  for (const config of configs) {
    const portalId = String(config.portalId);
    const portalName = portalNameById.get(portalId) ?? null;

    const pushFeatures = (
      features: ITenantPortalFeature[] | undefined,
      moduleName: string,
      childModuleName: string | null,
    ) => {
      for (const feature of features ?? []) {
        if (feature.deletedAt) continue;

        featuresAccess.push({
          portalId,
          portalName,
          moduleName,
          childModuleName,
          featureId: feature.featureId,
          featureName: feature.featureName,
          status: toAccessLabel(feature.isEnabled, feature.featureStatus),
        });
      }
    };

    const modules = [...(config.modules ?? [])]
      .filter((module) => !module.deletedAt)
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0));

    for (const module of modules) {
      const childModules = (module.children ?? []).filter(
        (child) => !child.deletedAt,
      );

      modulesAccess.push({
        portalId,
        portalName,
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        status: toAccessLabel(module.isEnabled, module.moduleStatus),
        childModules: childModules.map((child) => ({
          childModuleId: child.childModuleId,
          childModuleName: child.childModuleName,
          status: toAccessLabel(child.isEnabled, child.childModuleStatus),
        })),
      });

      pushFeatures(module.features, module.moduleName, null);

      for (const child of childModules) {
        pushFeatures(child.features, module.moduleName, child.childModuleName);
      }
    }
  }

  return {
    companyInformation: {
      companyName: tenant.organizationName,
      academyName: tenant.tenantName,
      email: tenant.emailId,
      phone: tenant.phoneNumber || tenant.mobileNumber || null,
      address: buildAddress(tenant as ITenant),
    },
    subscription: subscription
      ? {
          planName: subscription.planName ?? tenant.plan ?? null,
          status: subscription.status ?? null,
          currentPeriod: {
            startDate: subscription.startDate ?? null,
            endDate: subscription.endDate ?? null,
          },
          nextBillingDate: subscription.nextRenewalDate ?? null,
        }
      : null,
    modulesAccess,
    featuresAccess,
  };
};





dayjs.extend(utc);
dayjs.extend(timezone);

export type TenantDashboardChangeType = "UPGRADE" | "DOWNGRADE" | "NO_CHANGE";

export type TenantDashboardView = "monthly" | "yearly";

export interface ITenantDashboardCard {
  current: number;
  previous: number;
  percentageChange: number | null;
  changeType: TenantDashboardChangeType;
  comparison: string;
}

export interface ITenantDashboardPerformance {
  percentage: number;
  label: string;
  message: string;
}

export interface ITenantDashboardSummary {
  cards: {
    totalUsers: ITenantDashboardCard;
    activeUsers: ITenantDashboardCard;
    revenue: ITenantDashboardCard;
    openTickets: ITenantDashboardCard;
  };
  performance: ITenantDashboardPerformance;
}

export interface ITenantDashboardGrowthPoint {
  label: string;
  value: number;
  // Growth vs the previous month/year; null when the previous value is 0.
  percentageChange: number | null;
}

export interface ITenantDashboardGrowthItem {
  // Absent on the "Most Used Modules" summary item.
  moduleId?: string;
  name: string;
  percentage: number;
  // totalFeatures 0 = module has no features; enabledFeatures 0 with total > 0 = all disabled.
  enabledFeatures: number;
  totalFeatures: number;
}

export interface ITenantDashboardGrowth {
  view: TenantDashboardView;
  tenantGrowth: {
    view: TenantDashboardView;
    data: ITenantDashboardGrowthPoint[];
  };
  growth: {
    view: TenantDashboardView;
    items: ITenantDashboardGrowthItem[];
  };
}

export interface ITenantDashboardActivityRow {
  dateTime: Date;
  role: string | null;
  activity: string | null;
  details: string | null;
  action: string | null;
}

export interface ITenantDashboardActivity {
  activities: ITenantDashboardActivityRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const SERVER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const round2 = (value: number): number => Number(value.toFixed(2));

interface IMonthWindow {
  previousStart: Date;
  currentStart: Date;
  nextStart: Date;
}

const getMonthWindow = (now = new Date()): IMonthWindow => ({
  previousStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
  currentStart: new Date(now.getFullYear(), now.getMonth(), 1),
  nextStart: new Date(now.getFullYear(), now.getMonth() + 1, 1),
});


export const buildComparisonCard = (
  current: number,
  previous: number,
  lowerIsBetter = false,
): ITenantDashboardCard => {
  let changeType: TenantDashboardChangeType = tenantDashboardMessages.CHANGE_NO_CHANGE as TenantDashboardChangeType;

  if (current !== previous) {
    const increased = current > previous;
    changeType = (increased !== lowerIsBetter
      ? tenantDashboardMessages.CHANGE_UPGRADE
      : tenantDashboardMessages.CHANGE_DOWNGRADE) as TenantDashboardChangeType;
  }

  let percentageChange: number | null;
  if (previous === 0) {
    percentageChange = current === 0 ? 0 : null;
  } else {
    percentageChange = round2(Math.abs(((current - previous) / previous) * 100));
  }

  return {
    current: round2(current),
    previous: round2(previous),
    percentageChange,
    changeType,
    comparison: tenantDashboardMessages.COMPARISON,
  };
};


export const ensureTenantExists = async (tenantId: string) => {
  const tenant = await TenantModel.findOne({ tenantCode: tenantId })
    .select("tenantCode createdDate timeZone")
    .lean();

  if (!tenant) {
    throwError(tenantsMessages.TENANT_NOT_FOUND, 404);
  }

  return tenant!;
};


const getUserCounts = async (tenantId: string, window: IMonthWindow) => {
  const [result] = await portalModule.aggregate([
    {
      $match: {
        tenantId,
        status: { $ne: Status.DELETED },
        createdDate: { $lt: window.nextStart },
      },
    },
    {
      $group: {
        _id: null,
        totalCurrent: { $sum: 1 },
        totalPrevious: {
          $sum: { $cond: [{ $lt: ["$createdDate", window.currentStart] }, 1, 0] },
        },
        activeCurrent: {
          $sum: { $cond: [{ $eq: ["$status", Status.ACTIVE] }, 1, 0] },
        },
        activePrevious: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", Status.ACTIVE] },
                  { $lt: ["$createdDate", window.currentStart] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return {
    totalCurrent: result?.totalCurrent ?? 0,
    totalPrevious: result?.totalPrevious ?? 0,
    activeCurrent: result?.activeCurrent ?? 0,
    activePrevious: result?.activePrevious ?? 0,
  };
};

// Sums `netAmount` of the given collection into current / previous month buckets.
const sumByMonth = async (
  model: Model<any>,
  match: Record<string, unknown>,
  dateField: string,
  window: IMonthWindow,
) => {
  const [result] = await model.aggregate([
    {
      $match: {
        ...match,
        [dateField]: { $gte: window.previousStart, $lt: window.nextStart },
      },
    },
    {
      $group: {
        _id: null,
        current: {
          $sum: {
            $cond: [{ $gte: [`$${dateField}`, window.currentStart] }, "$netAmount", 0],
          },
        },
        previous: {
          $sum: {
            $cond: [{ $lt: [`$${dateField}`, window.currentStart] }, "$netAmount", 0],
          },
        },
      },
    },
  ]);

  return { current: result?.current ?? 0, previous: result?.previous ?? 0 };
};


const getRevenue = async (tenantId: string, window: IMonthWindow) => {
  const [payments, refunds] = await Promise.all([
    sumByMonth(
      PaymentTransaction,
      { tenantId, paymentStatus: PaymentStatus.SUCCESS, deletedAt: null },
      "paymentDate",
      window,
    ),
    sumByMonth(
      RefundTransaction,
      { tenantId, refundStatus: RefundStatus.SUCCESS, deletedAt: null },
      "refundedAt",
      window,
    ),
  ]);

  return {
    current: payments.current - refunds.current,
    previous: payments.previous - refunds.previous,
  };
};


const getOpenTicketCounts = async (
  _tenantId: string,
  _window: IMonthWindow,
): Promise<{ current: number; previous: number }> => ({ current: 0, previous: 0 });

interface IModuleFeatureStats {
  portalId: string;
  moduleId: string;
  moduleName: string;
  totalFeatures: number;
  enabledFeatures: number;
}


const getTenantModuleFeatureStats = async (
  tenantId: string,
): Promise<IModuleFeatureStats[]> => {
  const validFeature = {
    $and: [
      { $eq: [{ $ifNull: ["$features.deletedAt", null] }, null] },
      { $in: ["$features.featuretype", Object.values(PortalType)] },
    ],
  };

  const pipeline: PipelineStage[] = [
    { $match: { tenantId, deletedAt: null } },
    { $unwind: "$modules" },
    { $match: { "modules.deletedAt": null } },
    {
      $project: {
        portalId: 1,
        moduleId: "$modules.moduleId",
        moduleName: "$modules.moduleName",
        orderNo: "$modules.orderNo",
        features: {
          $concatArrays: [
            { $ifNull: ["$modules.features", []] },
            {
              $reduce: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$modules.children", []] },
                    as: "child",
                    cond: { $eq: [{ $ifNull: ["$$child.deletedAt", null] }, null] },
                  },
                },
                initialValue: [],
                in: { $concatArrays: ["$$value", { $ifNull: ["$$this.features", []] }] },
              },
            },
          ],
        },
      },
    },
    // Keep modules with no features so they are still listed.
    { $unwind: { path: "$features", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          portalId: "$portalId",
          moduleId: "$moduleId",
          featureId: "$features.featureId",
        },
        moduleName: { $first: "$moduleName" },
        orderNo: { $first: "$orderNo" },
        isValid: { $max: { $cond: [validFeature, 1, 0] } },
        isEnabled: {
          $max: {
            $cond: [
              { $and: [validFeature, { $ne: ["$features.isEnabled", false] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: { portalId: "$_id.portalId", moduleId: "$_id.moduleId" },
        moduleName: { $first: "$moduleName" },
        orderNo: { $first: "$orderNo" },
        totalFeatures: { $sum: "$isValid" },
        enabledFeatures: { $sum: "$isEnabled" },
      },
    },
    { $sort: { orderNo: 1, moduleName: 1, "_id.moduleId": 1 } },
  ];

  const rows = await TenantPortalConfig.aggregate(pipeline);

  return rows.map((row) => ({
    portalId: String(row._id.portalId),
    moduleId: row._id.moduleId,
    moduleName: row.moduleName,
    totalFeatures: row.totalFeatures,
    enabledFeatures: row.enabledFeatures,
  }));
};

const toFeaturePercentage = (enabledFeatures: number, totalFeatures: number) =>
  totalFeatures > 0 ? round2((enabledFeatures / totalFeatures) * 100) : 0;

/** Overall feature adoption (enabled / total features) of the tenant. */
export const getTenantFeatureAdoption = async (tenantId: string) => {
  const modules = await getTenantModuleFeatureStats(tenantId);

  const totalFeatures = modules.reduce((sum, module) => sum + module.totalFeatures, 0);
  const enabledFeatures = modules.reduce((sum, module) => sum + module.enabledFeatures, 0);

  return {
    totalFeatures,
    enabledFeatures,
    percentage: toFeaturePercentage(enabledFeatures, totalFeatures),
  };
};

interface IPerformanceInput {
  totalUsers: number;
  activeUsers: number;
  featureAdoption: { totalFeatures: number; percentage: number };
  subscriptionStatus: string | null;
}


export const calculateTenantPerformance = (
  input: IPerformanceInput,
): ITenantDashboardPerformance => {
  const scores: number[] = [];

  if (input.totalUsers > 0) {
    scores.push((input.activeUsers / input.totalUsers) * 100);
  }
  if (input.featureAdoption.totalFeatures > 0) {
    scores.push(input.featureAdoption.percentage);
  }
  if (input.subscriptionStatus) {
    scores.push(input.subscriptionStatus === SubscriptionStatus.ACTIVE ? 100 : 0);
  }

  if (!scores.length) {
    return {
      percentage: 0,
      label: tenantDashboardMessages.PERFORMANCE_NO_DATA,
      message: tenantDashboardMessages.PERFORMANCE_NO_DATA_MESSAGE,
    };
  }

  const percentage = round2(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  if (percentage >= 80) {
    return {
      percentage,
      label: tenantDashboardMessages.PERFORMANCE_EXCELLENT,
      message: tenantDashboardMessages.PERFORMANCE_EXCELLENT_MESSAGE,
    };
  }
  if (percentage >= 60) {
    return {
      percentage,
      label: tenantDashboardMessages.PERFORMANCE_GOOD,
      message: tenantDashboardMessages.PERFORMANCE_GOOD_MESSAGE,
    };
  }
  if (percentage >= 40) {
    return {
      percentage,
      label: tenantDashboardMessages.PERFORMANCE_AVERAGE,
      message: tenantDashboardMessages.PERFORMANCE_AVERAGE_MESSAGE,
    };
  }
  return {
    percentage,
    label: tenantDashboardMessages.PERFORMANCE_POOR,
    message: tenantDashboardMessages.PERFORMANCE_POOR_MESSAGE,
  };
};

export const getTenantDashboardSummary = async (
  tenantId: string,
): Promise<ITenantDashboardSummary> => {
  await ensureTenantExists(tenantId);

  const window = getMonthWindow();

  const [users, revenue, tickets, featureAdoption, subscription] = await Promise.all([
    getUserCounts(tenantId, window),
    getRevenue(tenantId, window),
    getOpenTicketCounts(tenantId, window),
    getTenantFeatureAdoption(tenantId),
    TenantSubscription.findOne({ tenantId, deletedAt: null })
      .sort({ createdAt: -1 })
      .select("status")
      .lean(),
  ]);

  return {
    cards: {
      totalUsers: buildComparisonCard(users.totalCurrent, users.totalPrevious),
      activeUsers: buildComparisonCard(users.activeCurrent, users.activePrevious),
      revenue: buildComparisonCard(revenue.current, revenue.previous),
      openTickets: buildComparisonCard(tickets.current, tickets.previous, true),
    },
    performance: calculateTenantPerformance({
      totalUsers: users.totalCurrent,
      activeUsers: users.activeCurrent,
      featureAdoption,
      subscriptionStatus: subscription?.status ?? null,
    }),
  };
};

// The tenant's own timeZone when it is a valid IANA zone, else the server zone.
export const resolveTenantTimeZone = (timeZone?: string | null): string => {
  if (!timeZone) return SERVER_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return SERVER_TIME_ZONE;
  }
};

// Signed growth: previous 0 -> null (or 0 when both are 0); never NaN/Infinity.
const calculateGrowthPercentage = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return round2(((current - previous) / previous) * 100);
};

const getTenantUserGrowth = async (
  tenantId: string,
  view: TenantDashboardView,
  tenantCreatedDate: Date | undefined,
  timeZone: string,
): Promise<ITenantDashboardGrowthPoint[]> => {
  const now = dayjs().tz(timeZone);
  const currentYear = now.year();

  const firstYear = Math.min(
    tenantCreatedDate ? dayjs(tenantCreatedDate).tz(timeZone).year() : currentYear,
    currentYear,
  );

  // Bucket keys (matching the $dateToString output) for the window plus the one before it.
  const keys: { key: string; label: string }[] = [];
  let start: Date;
  let end: Date;

  if (view === "monthly") {
    const firstMonth = now.startOf("year");
    start = firstMonth.subtract(1, "month").toDate();
    end = now.startOf("month").add(1, "month").toDate();

    for (let month = -1; month <= now.month(); month++) {
      const bucket = firstMonth.add(month, "month");
      keys.push({ key: bucket.format("YYYY-MM"), label: MONTH_LABELS[bucket.month()] });
    }
  } else {
    start = dayjs.tz(`${firstYear - 1}-01-01`, timeZone).toDate();
    end = now.startOf("year").add(1, "year").toDate();

    for (let year = firstYear - 1; year <= currentYear; year++) {
      keys.push({ key: String(year), label: String(year) });
    }
  }

  const rows: { _id: string; value: number }[] = await portalModule.aggregate([
    {
      $match: {
        tenantId,
        status: { $ne: Status.DELETED },
        createdDate: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: view === "monthly" ? "%Y-%m" : "%Y",
            date: "$createdDate",
            timezone: timeZone,
          },
        },
        value: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const valueByKey = new Map(rows.map((row) => [row._id, row.value]));

  return keys.slice(1).map(({ key, label }, index) => {
    const value = valueByKey.get(key) ?? 0;
    const previous = valueByKey.get(keys[index].key) ?? 0;

    return { label, value, percentageChange: calculateGrowthPercentage(value, previous) };
  });
};

const getModuleUsage = async (tenantId: string): Promise<ITenantDashboardGrowthItem[]> => {
  const modules = await getTenantModuleFeatureStats(tenantId);

  const totalFeatures = modules.reduce((sum, module) => sum + module.totalFeatures, 0);
  const enabledFeatures = modules.reduce((sum, module) => sum + module.enabledFeatures, 0);

  return [
    {
      name: tenantDashboardMessages.MODULE_MOST_USED,
      percentage: toFeaturePercentage(enabledFeatures, totalFeatures),
      enabledFeatures,
      totalFeatures,
    },
    ...modules.map((module) => ({
      moduleId: module.moduleId,
      name: module.moduleName,
      percentage: toFeaturePercentage(module.enabledFeatures, module.totalFeatures),
      enabledFeatures: module.enabledFeatures,
      totalFeatures: module.totalFeatures,
    })),
  ];
};

export const getTenantDashboardGrowth = async (
  tenantId: string,
  view: TenantDashboardView,
): Promise<ITenantDashboardGrowth> => {
  const tenant = await ensureTenantExists(tenantId);
  const timeZone = resolveTenantTimeZone(tenant.timeZone);

  const [tenantGrowthData, items] = await Promise.all([
    getTenantUserGrowth(tenantId, view, tenant.createdDate, timeZone),
    getModuleUsage(tenantId),
  ]);

  return {
    view,
    tenantGrowth: { view, data: tenantGrowthData },
    growth: { view, items },
  };
};


const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TECHNICAL_HTTP_METHODS = ["options", "OPTIONS", "head", "HEAD"];
const buildTenantActivityMatch = (tenantId: string) => {
  const id = escapeRegex(tenantId);
  const tenantIdField = new RegExp(`"tenantId":"${id}"`);

  return {
    $or: [
      { tenantId },
      { "meta.tenantId": tenantId },
      { "meta.path": new RegExp(`/${id}(/|$)`) },
      { "meta.query": tenantIdField },
      { "meta.payload": tenantIdField },
    ],
    "meta.method": { $nin: TECHNICAL_HTTP_METHODS },
    route: { $not: /^\/tenant\/dashboard\// },
  };
};

export const getTenantDashboardActivity = async (
  tenantId: string,
  page: number,
  limit: number,
): Promise<ITenantDashboardActivity> => {
  await ensureTenantExists(tenantId);

  const match = buildTenantActivityMatch(tenantId);

  const [activities, total] = await Promise.all([
    AuditLog.aggregate([
      { $match: match },
      { $sort: { createdDate: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: portalModule.collection.name,
          localField: "portalCode",
          foreignField: "portalCode",
          as: "portal",
        },
      },
      {
        $project: {
          _id: 0,
          dateTime: "$createdDate",
          role: { $ifNull: ["$role", null] },
          activity: { $ifNull: ["$route", null] },
          details: { $ifNull: ["$description", null] },
          action: { $ifNull: ["$action", null] },
        },
      },
    ]),
    AuditLog.countDocuments(match),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
