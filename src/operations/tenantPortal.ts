import { throwError } from "../helpers/throwError";
import tenantsubscription from "../models/tenantsubscription";
import tenantPortal from "../models/tenantPortal";
import tenantPortalConfig from "../models/tenantPortalConfig";
import { appStatus, portalMessages } from "../config/messages";
import {
  PaymentStatus,
  PortalStatus,
  PortalType,
  SubscriptionStatus,
} from "../shared/enum";
import mongoose from "mongoose";
import planModel from "../models/plan-model";
import portal from "../models/portal";
import TenantPortalConfig from "../models/tenantPortalConfig";
import PortalModuleModel from "../models/portalModule";
import { Types } from "mongoose";
import tenantUsers from "../models/users";
import plan from "../models/plan-model";

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


type ITenantPortalDoc = {
  _id: Types.ObjectId;
};

type IMasterModule = {
  parentModuleId: string;
  parentModuleName: string;
  type: "DEFAULT" | "CUSTOM";
  status: string;
  order: number;
  features?: any[];
  isEnabled:boolean;
  children?: any[];
};

type ITenantModule = {
  moduleId: string;
  moduleName: string;
  moduleType: "DEFAULT" | "CUSTOM";
  moduleStatus: string;
  orderNo: number;

  isEnabled: boolean;

  features?: any[];
  children?: any[];

  createdAt?: Date;
  updatedAt?: Date;
};

type IPlanModule = {
  moduleId: string;
  features?: { featureId: string }[];
  children?: {
    childModuleId: string;
    features?: { featureId: string }[];
  }[];
};

export const syncTenantSubscriptionToTenantPortal = async (
  subscriptionId: string,
) => {
  try {
    const subscription = await tenantsubscription.findOne({
      _id: subscriptionId,
      status: SubscriptionStatus.ACTIVE,
      paymentStatus: PaymentStatus.PAID,
      deletedAt: null,
    });

    if (!subscription) {
      throwError("Subscription not found", 404);
      return;
    }

    const plan = await planModel.findById({
      _id: subscription.planId,
    });

    if (!plan) {
      throwError("Plan not found", 404);
      return;
    }

    for (const role of plan?.allowedRoles) {
      const tenantPortal = (await createTenantPortal(
        subscription.tenantId,
        subscriptionId,
        role.portalId,
      )) as ITenantPortalDoc;

      if (!tenantPortal) {
        throwError("Not Found", 404);
        return;
      }

      const planModulesForPortal = getModulesByPortal(
        plan.modules || [],
        role.portalId,
      );


      await syncModulesToTenantPortalConfig({
        tenantId: subscription.tenantId,
        portalId: role.portalId,
        tenantPortalId: tenantPortal._id.toString(),
        subscriptionId: subscriptionId,
        planModules: planModulesForPortal,
      });
    }
  } catch (error: any) {
    throw error;
  }
};

export const createTenantPortal = async (
  tenantId: string,
  subscriptionId: string,
  portalId: string,
) => {
  try {
    if (!tenantId || !subscriptionId || !portalId) {
      throwError("Not Found", 404);
    }
    const tenantPortalExist = await tenantPortal.findOne({
      tenantId: tenantId,
      subscriptionId: subscriptionId,
      portalId: portalId,
      status: PortalStatus.ACTIVE,
      deletedAt: null,
    });

    if (tenantPortalExist) {
      return tenantPortalExist;
    }

    const portalData = await portal.findById({
      _id: portalId,
      status: PortalStatus.ACTIVE,
      deletedAt: null,
    });

    if (!portalData) {
      throwError("Not Found", 404);
      return;
    }

    const newTenantPortal = await tenantPortal.create({
      tenantId,
      subscriptionId,
      portalId,

      portalCode: portalData.portalCode,
      portalName: portalData.portalName,
      portalType: portalData.portalType,
      roleType: portalData.roleType,
      description: portalData.description,

      userLimit: 0,
      status: PortalStatus.ACTIVE,
      isEnabled: true,

      createdBy: "SYSTEM",
      updatedBy: null,
      deletedAt: null,
    });

    return newTenantPortal;
  } catch (error: any) {
    throw error;
  }
};

const getModulesByPortal = (
  modules: IPlanModule[] = [],
  portalId: string,
): IPlanModule[] => {
  return (
    modules
      .filter((m: any) => m.portalId === portalId)
      .map((m: any) => ({
        moduleId: m.moduleId,
        moduleName: m.moduleName,
        order: m.order,

        features: (m.features || []).map((f: any) => ({
          featureId: f.featureId,
          featureName: f.featureName,
        })),

        children: (m.children || []).map((c: any) => ({
          childModuleId: c.childModuleId,
          childModuleName: c.childModuleName,
          order: c.order,

          features: (c.features || []).map((f: any) => ({
            featureId: f.featureId,
            featureName: f.featureName,
          })),
        })),
      })) || []
  );
};

export const syncModulesToTenantPortalConfig = async ({
  tenantId,
  portalId,
  tenantPortalId,
  subscriptionId,
  planModules = [],
}: {
  tenantId: string;
  portalId: string;
  tenantPortalId: string;
  subscriptionId: string;
  planModules: any[];
}) => {
  try {
    const rawModules = await PortalModuleModel.find({
      portalId,
      status: "Active",
      deletedAt: null,
    }).lean();

    const masterModules: IMasterModule[] = rawModules.map((m: any) => ({
      parentModuleId: m.parentModuleId,
      parentModuleName: m.parentModuleName,
      type: m.type ?? "DEFAULT",
      status: m.status,
      isEnabled:m.isEnabled,
      order: m.order,
      features: m.features || [],
      children: m.children || [],
    }));

    const existingConfig = await TenantPortalConfig.findOne({
      tenantId,
      portalId,
      tenantPortalId,
      deletedAt: null,
    }).lean();

    const tenantModules = existingConfig?.modules || [];

    const mergedModules = mergeModules(
      masterModules || [],
      tenantModules,
      planModules || [],
    );

    const finalModules = Array.isArray(mergedModules) ? mergedModules : [];

    const updatedConfig = await TenantPortalConfig.findOneAndUpdate(
      { tenantId, portalId },
      {
        $set: {
          tenantPortalId,
          modules: finalModules || [],
          updatedBy: "SYSTEM",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          tenantId,
          portalId,
          createdBy: "SYSTEM",
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    return updatedConfig;
  } catch (error: any) {
    throw error;
  }
};

const mergeModules = (
  masterModules: IMasterModule[] = [],
  tenantModules: ITenantModule[] = [],
  planModules: IPlanModule[] = [],
): ITenantModule[] => {

  const masterMap = new Map<string, IMasterModule>(
    masterModules.map(m => [m.parentModuleId, m])
  );

  const tenantMap = new Map<string, ITenantModule>(
    tenantModules.map(m => [m.moduleId, m])
  );

  const result: ITenantModule[] = [];

  for (const plan of planModules) {

    const master = masterMap.get(plan.moduleId);

    if (!master) continue;

    const tenant = tenantMap.get(plan.moduleId);

    const module: ITenantModule = {
      moduleId: master.parentModuleId,
      moduleName: master.parentModuleName,
      moduleType: master.type,
      moduleStatus: master.status,
      orderNo: master.order,

      isEnabled: master.isEnabled ?? true,

      features: mergeFeatures(
        master.features,
        tenant?.features || [],
        plan
      ),

      children: mergeChildren(
        master.children,
        tenant?.children || [],
        plan
      ),

      createdAt: tenant?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    result.push(module);
  }

  const customModules = tenantModules.filter(
    m => m.moduleType === "CUSTOM"
  );

  return [...result, ...customModules];
};

const mergeFeatures = (
  masterFeatures: any[] = [],
  tenantFeatures: any[] = [],
  plan?: any,
) => {
  const masterMap = new Map(
    masterFeatures.map((f: any) => [f.featureId, f])
  );

  const tenantMap = new Map(
    tenantFeatures.map((f: any) => [f.featureId, f])
  );

  const result: any[] = [];

  for (const planFeature of plan?.features || []) {
    const master = masterMap.get(planFeature.featureId);
    if (!master) continue;

    const tenant = tenantMap.get(planFeature.featureId);

    result.push({
      featureId: master.featureId,
      featureName: master.featureName,
      featuretype: master.type,
      featureStatus: master.status,

      isEnabled: master.isEnabled ?? true,

      createdAt: tenant?.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }

  return result;
};

const mergeChildren = (
  masterChildren: any[] = [],
  tenantChildren: any[] = [],
  plan?: any,
) => {
  const masterMap = new Map(
    masterChildren.map((c: any) => [c.childModuleId, c])
  );

  const tenantMap = new Map(
    tenantChildren.map((c: any) => [c.childModuleId, c])
  );

  const result: any[] = [];

  for (const planChild of plan?.children || []) {
    const master = masterMap.get(planChild.childModuleId);
    if (!master) continue;

    const tenant = tenantMap.get(planChild.childModuleId);

    result.push({
      childModuleId: master.childModuleId,
      childModuleName: master.childModuleName,
      childModuleType: master.type,
      childModuleStatus: master.status,

      isEnabled: master.isEnabled ?? true,

      features: mergeFeatures(
        master.features,
        tenant?.features || [],
        planChild
      ),

      createdAt: tenant?.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }

  return result;
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
      status: SubscriptionStatus.ACTIVE,
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

    const status = isEnabled ? PortalStatus.ACTIVE : PortalStatus.INACTIVE;

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
