import { throwError } from "../helpers/throwError";
import tenantsubscription from "../models/tenantsubscription";
import tenantPortal from "../models/tenantPortal";
import tenantPortalConfig from "../models/tenantPortalConfig";
import { portalMessages } from "../config/messages";
import { PortalStatus, PortalType, SubscriptionStatus } from "../shared/enum";
import mongoose from "mongoose";
import tenantUsers from "../models/users";
import plan from "../models/plan-model";
import { appStatus } from "../config/messages";

export interface IRoleCount {
  role: string;
  count: number;
}

export interface IUserStatistics {
  totalUsers: number;
  roles: IRoleCount[];
}

export interface IPortalStatusDetail {
  portalName: string;
  isEnabled: boolean;
}

export interface IPortalStatistics {
  totalPortals: number;
  enabledPortals: number;
  disabledPortals: number;
  usedPortals: number;
  remainingPortals: number;
  portals: IPortalStatusDetail[];
}

export interface IMostActivePortal {
  portalName: string;
  activeUsers: number;
  percentage: number;
}

export interface ITenantPortalDashboard {
  userStatistics: IUserStatistics;
  portalStatistics: IPortalStatistics;
  mostActivePortal: IMostActivePortal | null;
}

const normalizeRoleKey = (value: string): string => {
  const cleaned = (value || "").toLowerCase().replace(/[^a-z]/g, "");
  return cleaned.length > 1 && cleaned.endsWith("s") ? cleaned.slice(0, -1) : cleaned;
};
export const syncTenantSubscriptionToTenantPortal = async (
  subscriptionId: string,
) => {
  try {
    const subscription = await tenantsubscription.findOne({
      _id: subscriptionId,
      deletedAt: null,
    });

    if (!subscription) {
      throwError("Subscription not found", 404);
    }
  } catch (errro: any) {}
};
export const createCustomTenantPortalService = async (payload: any) => {
  try {
    if (!payload.tenantId) {
      throwError(portalMessages.TENANT_ID_REQUIRED, 400);
    }

    if (!payload.portalName) {
      throwError(portalMessages.PORTAL_NAME_REQUIRED, 400);
    }

    if (!payload.roleType) {
      throwError(portalMessages.ROLE_TYPE_REQUIRED, 400);
    }

    if (!payload.createdBy) {
      throwError(portalMessages.CREATED_BY_REQUIRED, 400);
    }

    if (payload.portalType && payload.portalType !== PortalType.CUSTOM) {
      throwError(portalMessages.INVALID_PORTAL_TYPE, 400);
    }

    const subscription = await tenantsubscription.findOne({
      tenantId: payload.tenantId,
      status:SubscriptionStatus.ACTIVE,
      deletedAt: null,
    });

    if (!subscription) {
      throwError(portalMessages.SUBSCRIPTION_NOT_FOUND, 404);
      return;
    }


    const existing = await tenantPortal.findOne({
      tenantId: payload.tenantId,
      portalName: payload.portalName,
      deletedAt: null,
    });

    if (existing) {
      throwError(portalMessages.TENANT_PORTAL_ALREADY_EXISTS, 409);
    }

    const count = await tenantPortal.countDocuments({
      tenantId: payload.tenantId,
    });

    const portalCode = `POR-CUST-${String(count + 1).padStart(3, "0")}`;
    const id = new mongoose.Types.ObjectId();
    const newTenantPortal = new tenantPortal({
      tenantId: payload.tenantId,
      subscriptionId: subscription?._id,
      portalId: id.toString(),
      portalCode,
      portalName: payload.portalName,
      portalType: PortalType.CUSTOM,
      roleType: payload.roleType,
      userLimit: payload.userLimit || 0,
      isEnabled: payload.isEnabled ?? true,
      description: payload.description || "",
      status: PortalStatus.ACTIVE,
      createdBy: payload.createdBy,
      updatedBy: null,
    });

    await newTenantPortal.save();

    return newTenantPortal;
  } catch (error: any) {
    throw error;
  }
};

export const updateTenantPortalStatusService = async (
  id: string,
  isEnabled: boolean,
) => {
  try {
    const tenantPortalData = await tenantPortal.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!tenantPortalData) {
      throwError(portalMessages.TENANT_PORTAL_NOT_FOUND, 404);
      return;
    }

    const status = isEnabled
      ? PortalStatus.ACTIVE
      : PortalStatus.INACTIVE;

    tenantPortalData.isEnabled = isEnabled;
    tenantPortalData.status = status;
    tenantPortalData.updatedBy = "SUPERADMIN";
    await tenantPortalData.save();

    return tenantPortalData;
  } catch (error) {
    throw error;
  }
};

export const getTenantPortals = async (query: any, tenantId: string) => {
  try {
    const {
      page,
      limit,
      search,
      status,
      roleType,
      portalType,
      isEnabled,
      sortBy,
      sortOrder,
    } = query;

    const filter: any = {
      tenantId: tenantId.trim(),
      deletedAt: null,
    };

    // 🔍 search
    if (search) {
      filter.$or = [
        { portalName: { $regex: search, $options: "i" } },
        { portalCode: { $regex: search, $options: "i" } },
      ];
    }

    // 🎯 filters
    if (status) filter.status = status;
    if (roleType) filter.roleType = roleType;
    if (portalType) filter.portalType = portalType;
    if (isEnabled !== undefined) filter.isEnabled = isEnabled;

    const sort: any = {
      [sortBy || "createdAt"]: sortOrder === "asc" ? 1 : -1,
    };

    const skip = (page - 1) * limit;

    const [items, totalRecords] = await Promise.all([
      tenantPortal
        .find(filter)
        .select(
          "portalId  portalCode portalName portalType roleType status isEnabled userLimit createdAt",
        )
        .sort(sort)
        .skip(skip)
        .limit(limit),

      tenantPortal.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
};




export const getTenantPortalDashboardService = async (
  tenantId: string,
): Promise<ITenantPortalDashboard> => {
  try {
    const trimmedTenantId = (tenantId || "").trim();

    if (!trimmedTenantId) {
      throwError(portalMessages.TENANT_ID_REQUIRED, 400);
    }

    const [configs, subscription, users] = await Promise.all([
      tenantPortalConfig
        .find({ tenantId: trimmedTenantId, deletedAt: null })
        .select("tenantPortalId")
        .lean(),
      tenantsubscription
        .findOne({ tenantId: trimmedTenantId, deletedAt: null })
        .select("planId")
        .lean(),
      tenantUsers
        .find({ tenantId: trimmedTenantId, status: appStatus.ACTIVE })
        .select("role")
        .lean(),
    ]);

    const tenantPortalIds = configs
      .map((config) => config.tenantPortalId)
      .filter((id): id is mongoose.Types.ObjectId => !!id);

    const [subscribedPlan, portalDetails] = await Promise.all([
      subscription?.planId
        ? plan.findById(subscription.planId).select("allowedRoles").lean()
        : null,
      tenantPortal
        .find({ _id: { $in: tenantPortalIds } })
        .select("portalName isEnabled")
        .lean(),
    ]);

    const portalDetailsById = new Map(
      portalDetails.map((portal) => [portal._id.toString(), portal]),
    );

    // Each tenantPortalConfig document is one portal configured for this
    // tenant - it is the source of truth for the portal set. portalName /
    // isEnabled are display details, resolved from the matching tenantPortal
    // record (falling back gracefully if that record is missing).
    const configuredPortals = configs.map((config) => {
      const details = config.tenantPortalId
        ? portalDetailsById.get(config.tenantPortalId.toString())
        : undefined;

      return {
        portalName: details?.portalName || "Unknown Portal",
        isEnabled: details?.isEnabled ?? false,
      };
    });

    const usedPortals = configuredPortals.length;
    const enabledPortals = configuredPortals.filter((portal) => portal.isEnabled).length;
    const disabledPortals = usedPortals - enabledPortals;

    const totalPortals = usedPortals;
    const planPortalLimit = subscribedPlan?.allowedRoles?.length ?? totalPortals;
    const remainingPortals = Math.max(planPortalLimit - usedPortals, 0);

    const roleCounts = new Map<string, number>();

    for (const user of users) {
      for (const role of user.role || []) {
        const key = normalizeRoleKey(role);
        roleCounts.set(key, (roleCounts.get(key) || 0) + 1);
      }
    }

    const totalUsers = users.length;

    const roles: IRoleCount[] = configuredPortals.map((portal) => ({
      role: portal.portalName,
      count: roleCounts.get(normalizeRoleKey(portal.portalName)) || 0,
    }));

    let mostActivePortal: IMostActivePortal | null = null;

    if (roles.length) {
      const top = roles.reduce((max, curr) => (curr.count > max.count ? curr : max), roles[0]);

      mostActivePortal = {
        portalName: top.role,
        activeUsers: top.count,
        percentage: totalUsers > 0 ? Number(((top.count / totalUsers) * 100).toFixed(2)) : 0,
      };
    }

    return {
      userStatistics: {
        totalUsers,
        roles,
      },
      portalStatistics: {
        totalPortals,
        enabledPortals,
        disabledPortals,
        usedPortals,
        remainingPortals,
        portals: configuredPortals.map((portal) => ({
          portalName: portal.portalName,
          isEnabled: portal.isEnabled,
        })),
      },
      mostActivePortal,
    };
  } catch (error) {
    throw error;
  }
};
