import crypto from "crypto";
import mongoose from "mongoose";
import { throwError } from "../helpers/throwError";
import { portalModuleMessages, tenantPortalConfigMessages } from "../config/messages";
import {
  PaymentStatus,
  PortalStatus,
  PortalType,
  Status,
  SubscriptionInvoiceStatus,
} from "../shared/enum";
import PortalModule, {
  CreateParentModuleInput,
  UpdateAccessInput,
  UpdateParentModuleInput,
} from "../models/portalModule";
import { CreateChildModuleInput, UpdateChildModuleInput } from "../models/childportal";
import { CreateFeatureInput, UpdateFeatureInput } from "../models/featuremodule";
import Tenants from "../models/tenants";
import TenantSubscription from "../models/tenantsubscription";
import Plan from "../models/plan-model";
import SubscriptionInvoice from "../models/subscriptionInvoice";
import PaymentTransaction from "../models/paymenttransaction";
import TenantPortal from "../models/tenantPortal";
import TenantPortalConfig, {
  AddTenantChildModuleInput,
  AddTenantFeatureInput,
  AddTenantModuleInput,
  TenantPortalConfigAccessInput,
  UpdateTenantChildModuleInput,
  UpdateTenantFeatureInput,
  UpdateTenantModuleInput,
} from "../models/tenantPortalConfig";
import {
  IChildModule,
  IFeature,
  IParentModule,
  IPortalModule,
  ITenant,
  ITenantPortalChildModule,
  ITenantPortalConfig,
  ITenantPortalFeature,
  ITenantPortalModule,
  ITenantSubscription,
} from "../../types/models.types";
// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------
// Date.now() based ids can collide under concurrent requests, so the unique
// suffix is derived from crypto.randomBytes instead.

const generateId = (prefix: string): string => {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
};

// Regenerates on the rare chance the random suffix collides with an id already
// present in the same scope, so ids stay unique within that TenantConfig scope.
const generateUniqueId = (prefix: string, existingIds: string[]): string => {
  let id = generateId(prefix);

  while (existingIds.includes(id)) {
    id = generateId(prefix);
  }

  return id;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const findActiveParent = async (parentModuleId: string): Promise<IPortalModule> => {
  const parent = await PortalModule.findOne({ parentModuleId, deletedAt: null });

  if (!parent) {
    return throwError(portalModuleMessages.PARENT_MODULE_NOT_FOUND, 404);
  }

  return parent as IPortalModule;
};

const findChildOrThrow = (parent: IPortalModule, childModuleId: string): IChildModule => {
  const child = parent.children.find((item) => item.childModuleId === childModuleId);

  if (!child) {
    return throwError(portalModuleMessages.CHILD_MODULE_NOT_FOUND, 404);
  }

  return child as IChildModule;
};

const findFeatureOrThrow = (child: IChildModule, featureId: string): IFeature => {
  const feature = child.features.find((item) => item.featureId === featureId);

  if (!feature) {
    return throwError(portalModuleMessages.FEATURE_NOT_FOUND, 404);
  }

  return feature as IFeature;
};

const findParentFeatureOrThrow = (parent: IPortalModule, featureId: string): IFeature => {
  const feature = parent.features.find((item) => item.featureId === featureId);

  if (!feature) {
    return throwError(portalModuleMessages.FEATURE_NOT_FOUND, 404);
  }

  return feature as IFeature;
};

// Parent module


export const createParentModule = async (
  payload: CreateParentModuleInput
): Promise<IPortalModule> => {
  const duplicate = await PortalModule.findOne({
    portal: payload.portal,
    parentModuleName: payload.parentModuleName,
    deletedAt: null,
  });

  if (duplicate) {
    return throwError(portalModuleMessages.PARENT_MODULE_ALREADY_EXISTS, 409);
  }

  const order = payload.order ?? (await getNextParentOrder());

  const now = new Date();
  const features: IFeature[] = [];
  const seenFeatureIds = new Set<string>();
  const seenFeatureNames = new Set<string>();

  for (const feature of payload.features ?? []) {
    if (seenFeatureIds.has(feature.featureId) || seenFeatureNames.has(feature.featureName)) {
      return throwError(portalModuleMessages.FEATURE_ALREADY_EXISTS, 409);
    }
    seenFeatureIds.add(feature.featureId);
    seenFeatureNames.add(feature.featureName);

    features.push({
      featureId: feature.featureId,
      featureName: feature.featureName,
      type: payload.type,
      description: feature.description ?? null,
      status: feature.status,
      isEnabled: feature.isEnabled,
      createdAt: now,
      updatedAt: now,
    } as IFeature);
  }

  const parentModulePayload: IParentModule = {
    portal: payload.portal,
    portalId :payload.portalId,
    parentModuleId: generateId("PM"),
    parentModuleName: payload.parentModuleName,
    order,
    type: payload.type,
    description: payload.description ?? null,
    status: payload.status,
    isEnabled: payload.isEnabled,
    createdBy: payload.createdBy,
    updatedBy: null,
  };

  const parentModule = await PortalModule.create({
    ...parentModulePayload,
    children: [],
    features,
    deletedAt: null,
  });

  return parentModule;
};

const getNextParentOrder = async (): Promise<number> => {
  const lastParent = await PortalModule.findOne({ deletedAt: null })
    .sort({ order: -1, createdAt: -1 })
    .lean();

  return lastParent && typeof lastParent.order === "number" ? lastParent.order + 1 : 1;
};

export const getParentModules = async (page = 1, limit = 10) => {
  const filter = { deletedAt: null };
  const [data, totalRecords] = await Promise.all([
    PortalModule.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PortalModule.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    },
  };
};

export const updateParentModule = async (
  parentModuleId: string,
  payload: UpdateParentModuleInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);

  if (payload.parentModuleName !== undefined) {
    parent.parentModuleName = payload.parentModuleName;
  }
  if (payload.order !== undefined) {
    parent.order = payload.order;
  }
  if (payload.type !== undefined) {
    parent.type = payload.type;
  }
  if (payload.description !== undefined) {
    parent.description = payload.description;
  }
  if (payload.status !== undefined) {
    parent.status = payload.status;
  }
  if (payload.isEnabled !== undefined) {
    parent.isEnabled = payload.isEnabled;
  }
  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

export const updateParentModuleAccess = async (
  parentModuleId: string,
  payload: UpdateAccessInput
): Promise<IPortalModule> => {
  console.log("[updateParentModuleAccess] payload", { parentModuleId, ...payload });

  const parent = await findActiveParent(parentModuleId);

  parent.isEnabled = payload.isEnabled;
  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

// Child module

export const createChildModule = async (
  parentModuleId: string,
  payload: CreateChildModuleInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);

  const duplicate = parent.children.find(
    (child) => child.childModuleName === payload.childModuleName
  );

  if (duplicate) {
    return throwError(portalModuleMessages.CHILD_MODULE_ALREADY_EXISTS, 409);
  }

  const now = new Date();

  parent.children.push({
    childModuleId: generateId("CM"),
    childModuleName: payload.childModuleName,
    type: payload.type,
    description: payload.description ?? null,
    status: payload.status,
    isEnabled: payload.isEnabled,
    features: [],
    createdAt: now,
    updatedAt: now,
  } as IChildModule);

  parent.updatedBy = payload.createdBy;

  await parent.save();

  return parent;
};

export const getChildModules = async (parentModuleId: string): Promise<IChildModule[]> => {
  const parent = await findActiveParent(parentModuleId);

  return parent.children;
};

export const updateChildModule = async (
  parentModuleId: string,
  childModuleId: string,
  payload: UpdateChildModuleInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);
  const child = findChildOrThrow(parent, childModuleId);

  if (payload.childModuleName !== undefined) {
    child.childModuleName = payload.childModuleName;
  }
  if (payload.type !== undefined) {
    child.type = payload.type;
  }
  if (payload.description !== undefined) {
    child.description = payload.description;
  }
  if (payload.status !== undefined) {
    child.status = payload.status;
  }
  if (payload.isEnabled !== undefined) {
    child.isEnabled = payload.isEnabled;
  }
  child.updatedAt = new Date();

  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

export const updateChildModuleAccess = async (
  parentModuleId: string,
  childModuleId: string,
  payload: UpdateAccessInput
): Promise<IPortalModule> => {
  console.log("[updateChildModuleAccess] payload", { parentModuleId, childModuleId, ...payload });

  const parent = await findActiveParent(parentModuleId);
  const child = findChildOrThrow(parent, childModuleId);

  child.isEnabled = payload.isEnabled;
  child.updatedAt = new Date();

  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

// Feature

export const createFeature = async (
  parentModuleId: string,
  childModuleId: string,
  payload: CreateFeatureInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);
  const child = findChildOrThrow(parent, childModuleId);

  const duplicate = child.features.find(
    (feature) => feature.featureName === payload.featureName
  );

  if (duplicate) {
    return throwError(portalModuleMessages.FEATURE_ALREADY_EXISTS, 409);
  }

  const now = new Date();

  child.features.push({
    featureId: generateId("FT"),
    featureName: payload.featureName,
    type: payload.type,
    description: payload.description ?? null,
    status: payload.status,
    isEnabled: payload.isEnabled,
    createdAt: now,
    updatedAt: now,
  } as IFeature);

  child.updatedAt = now;
  parent.updatedBy = payload.createdBy;

  await parent.save();

  return parent;
};

export const getFeatures = async (
  parentModuleId: string,
  childModuleId: string
): Promise<IFeature[]> => {
  const parent = await findActiveParent(parentModuleId);
  const child = findChildOrThrow(parent, childModuleId);

  return child.features;
};

export const updateFeature = async (
  parentModuleId: string,
  childModuleId: string,
  featureId: string,
  payload: UpdateFeatureInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);
  const child = findChildOrThrow(parent, childModuleId);
  const feature = findFeatureOrThrow(child, featureId);

  if (payload.featureName !== undefined) {
    feature.featureName = payload.featureName;
  }
  if (payload.type !== undefined) {
    feature.type = payload.type;
  }
  if (payload.description !== undefined) {
    feature.description = payload.description;
  }
  if (payload.status !== undefined) {
    feature.status = payload.status;
  }
  if (payload.isEnabled !== undefined) {
    feature.isEnabled = payload.isEnabled;
  }
  feature.updatedAt = new Date();

  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

export const updateFeatureAccess = async (
  parentModuleId: string,
  childModuleId: string,
  featureId: string,
  payload: UpdateAccessInput
): Promise<IPortalModule> => {
  console.log("[updateFeatureAccess] payload", {
    parentModuleId,
    childModuleId,
    featureId,
    ...payload,
  });

  const parent = await findActiveParent(parentModuleId);
  const child = findChildOrThrow(parent, childModuleId);
  const feature = findFeatureOrThrow(child, featureId);

  feature.isEnabled = payload.isEnabled;
  feature.updatedAt = new Date();

  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

// Feature directly under the Parent Module (no Child Module in between)

export const createParentFeature = async (
  parentModuleId: string,
  payload: CreateFeatureInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);

  const duplicate = parent.features.find(
    (feature) => feature.featureName === payload.featureName
  );

  if (duplicate) {
    return throwError(portalModuleMessages.FEATURE_ALREADY_EXISTS, 409);
  }

  const now = new Date();

  parent.features.push({
    featureId: generateId("FT"),
    featureName: payload.featureName,
    type: payload.type,
    description: payload.description ?? null,
    status: payload.status,
    isEnabled: payload.isEnabled,
    createdAt: now,
    updatedAt: now,
  } as IFeature);

  parent.updatedBy = payload.createdBy;

  await parent.save();

  return parent;
};

export const getParentFeatures = async (parentModuleId: string): Promise<IFeature[]> => {
  const parent = await findActiveParent(parentModuleId);

  return parent.features;
};

export const updateParentFeature = async (
  parentModuleId: string,
  featureId: string,
  payload: UpdateFeatureInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);
  const feature = findParentFeatureOrThrow(parent, featureId);

  if (payload.featureName !== undefined) {
    feature.featureName = payload.featureName;
  }
  if (payload.type !== undefined) {
    feature.type = payload.type;
  }
  if (payload.description !== undefined) {
    feature.description = payload.description;
  }
  if (payload.status !== undefined) {
    feature.status = payload.status;
  }
  if (payload.isEnabled !== undefined) {
    feature.isEnabled = payload.isEnabled;
  }
  feature.updatedAt = new Date();

  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

export const updateParentFeatureAccess = async (
  parentModuleId: string,
  featureId: string,
  payload: UpdateAccessInput
): Promise<IPortalModule> => {
  console.log("[updateParentFeatureAccess] payload", { parentModuleId, featureId, ...payload });

  const parent = await findActiveParent(parentModuleId);
  const feature = findParentFeatureOrThrow(parent, featureId);

  feature.isEnabled = payload.isEnabled;
  feature.updatedAt = new Date();

  parent.updatedBy = payload.updatedBy;

  await parent.save();

  return parent;
};

const getFeatureTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return {
      percentageChange: current > 0 ? 100.0 : 0.0,
      trend: current > 0 ? "UP" : "NO_CHANGE",
    };
  }

  const percentage = ((current - previous) / previous) * 100;

  return {
    percentageChange: Number(percentage.toFixed(2)),
    trend: percentage > 0 ? "UP" : percentage < 0 ? "DOWN" : "NO_CHANGE",
  };
};

const countFeatures = async (match: Record<string, unknown>): Promise<number> => {
  const result = await PortalModule.aggregate([
    { $match: { deletedAt: null } },
    { $unwind: "$children" },
    { $unwind: "$children.features" },
    { $match: match },
    { $count: "count" },
  ]);

  return result[0]?.count ?? 0;
};

export const getFeatureCard = async () => {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    currentTotal,
    previousTotal,
    currentAdded,
    previousAdded,
    currentActive,
    previousActive,
    currentInactive,
    previousInactive,
  ] = await Promise.all([
    countFeatures({ "children.features.createdAt": { $lt: startOfNextMonth } }),
    countFeatures({ "children.features.createdAt": { $lt: startOfCurrentMonth } }),
    countFeatures({
      "children.features.createdAt": { $gte: startOfCurrentMonth, $lt: startOfNextMonth },
    }),
    countFeatures({
      "children.features.createdAt": { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
    }),
    countFeatures({
      "children.features.isEnabled": true,
      "children.features.createdAt": { $lt: startOfNextMonth },
    }),
    countFeatures({
      "children.features.isEnabled": true,
      "children.features.createdAt": { $lt: startOfCurrentMonth },
    }),
    countFeatures({
      "children.features.isEnabled": false,
      "children.features.createdAt": { $lt: startOfNextMonth },
    }),
    countFeatures({
      "children.features.isEnabled": false,
      "children.features.createdAt": { $lt: startOfCurrentMonth },
    }),
  ]);

  return {
    totalFeatures: {
      count: currentTotal,
      previousMonthCount: previousTotal,
      ...getFeatureTrend(currentTotal, previousTotal),
    },
    addedFeatures: {
      count: currentAdded,
      previousMonthCount: previousAdded,
      ...getFeatureTrend(currentAdded, previousAdded),
    },
    activeFeatures: {
      count: currentActive,
      previousMonthCount: previousActive,
      ...getFeatureTrend(currentActive, previousActive),
    },
    inactiveFeatures: {
      count: currentInactive,
      previousMonthCount: previousInactive,
      ...getFeatureTrend(currentInactive, previousInactive),
    },
  };
};

// Tenant-scoped feature card - counts every feature (direct-under-module and
// nested-under-child-module) across all of a tenant's tenantPortalConfig
// documents, split by Custom vs Default and enabled vs disabled.
export const getTenantFeatureCard = async (tenantId: string) => {
  const trimmedTenantId = (tenantId || "").trim();

  if (!trimmedTenantId) {
    return throwError(tenantPortalConfigMessages.TENANT_NOT_FOUND, 400);
  }

  await validateTenantExists(trimmedTenantId);

  const configs = await TenantPortalConfig.find({
    tenantId: trimmedTenantId,
    deletedAt: null,
  }).lean();

  let totalFeatures = 0;
  let customFeatures = 0;
  let defaultFeatures = 0;
  let enabledFeatures = 0;
  let disabledFeatures = 0;

  const countFeature = (feature: ITenantPortalFeature) => {
    if (feature.deletedAt) return;

    totalFeatures += 1;

    if (feature.featuretype === PortalType.CUSTOM) {
      customFeatures += 1;
    } else {
      defaultFeatures += 1;
    }

    if (feature.isEnabled) {
      enabledFeatures += 1;
    } else {
      disabledFeatures += 1;
    }
  };

  for (const config of configs) {
    for (const module of config.modules || []) {
      if (module.deletedAt) continue;

      for (const feature of module.features || []) {
        countFeature(feature);
      }

      for (const child of module.children || []) {
        if (child.deletedAt) continue;

        for (const feature of child.features || []) {
          countFeature(feature);
        }
      }
    }
  }

  return {
    totalFeatures,
    customFeatures,
    defaultFeatures,
    enabledFeatures,
    disabledFeatures,
  };
};



const validateTenantExists = async (tenantId: string): Promise<void> => {
  const tenant = await Tenants.findOne({ tenantCode: tenantId });

  if (!tenant) {
    throwError(tenantPortalConfigMessages.TENANT_NOT_FOUND, 404);
  }
};

const findActiveConfig = async (
  tenantId: string,
  portalId: string
): Promise<ITenantPortalConfig> => {
  const config = await TenantPortalConfig.findOne({ tenantId, portalId, deletedAt: null });

  if (!config) {
    return throwError(tenantPortalConfigMessages.TENANT_CONFIG_NOT_FOUND, 404);
  }

  return config;
};


const toPortalStatus = (status: Status): PortalStatus => {
  switch (status) {
    case Status.ACTIVE:
      return PortalStatus.ACTIVE;
    case Status.ARCHIVED:
      return PortalStatus.ARCHIVED;
    default:
      return PortalStatus.INACTIVE;
  }
};


const buildDefaultModulesSnapshot = (parents: IPortalModule[]): ITenantPortalModule[] => {
  const now = new Date();

  const mapFeature = (feature: IFeature): ITenantPortalFeature => ({
    featureId: feature.featureId,
    featureName: feature.featureName,
    featureStatus: toPortalStatus(feature.status),
    featuretype: PortalType.DEFAULT,
    isEnabled: feature.isEnabled,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const mapChild = (child: IChildModule): ITenantPortalChildModule => ({
    childModuleId: child.childModuleId,
    childModuleName: child.childModuleName,
    childModuleStatus: toPortalStatus(child.status),
    childModuleType: PortalType.DEFAULT,
    isEnabled: child.isEnabled,
    features: (child.features ?? []).map(mapFeature),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return parents.map((parent) => ({
    moduleId: parent.parentModuleId,
    moduleName: parent.parentModuleName,
    orderNo: parent.order ?? 0,
    moduleStatus: toPortalStatus(parent.status),
    moduleType: PortalType.DEFAULT,
    isEnabled: parent.isEnabled,
    features: (parent.features ?? []).map(mapFeature),
    children: (parent.children ?? []).map(mapChild),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
};


const findOrCreateActiveConfig = async (
  tenantId: string,
  portalId: string,
  createdBy: string
): Promise<ITenantPortalConfig> => {
  console.log("[findOrCreateActiveConfig] lookup", { tenantId, portalId });

  const existing = await TenantPortalConfig.findOne({ tenantId, portalId, deletedAt: null });

  if (existing) {
    console.log("[findOrCreateActiveConfig] existing config found", { configId: existing._id });
    return existing;
  }

  console.log("[findOrCreateActiveConfig] no existing config, checking tenantPortal", {
    tenantId,
    portalId,
  });

  const portal = await TenantPortal.findOne({ tenantId, portalId, deletedAt: null });

  console.log("[findOrCreateActiveConfig] tenantPortal lookup result", {
    found: !!portal,
    portalName: portal?.portalName ?? null,
  });

  const defaultParents = portal
    ? await PortalModule.find({ portal: portal.portalName, deletedAt: null })
    : [];

  console.log("[findOrCreateActiveConfig] default parents snapshot", {
    count: defaultParents.length,
  });

  const created = await TenantPortalConfig.create({
    tenantId,
    portalId,
    tenantPortalId: portal?._id ?? new mongoose.Types.ObjectId(),
    modules: buildDefaultModulesSnapshot(defaultParents),
    createdBy,
    updatedBy: null,
    deletedAt: null,
  });

  console.log("[findOrCreateActiveConfig] created new config", { configId: created._id });

  return created;
};

const findTenantModuleOrThrow = (
  config: ITenantPortalConfig,
  moduleId: string
): ITenantPortalModule => {
  const module = config.modules.find(
    (item) => item.moduleId === moduleId && !item.deletedAt
  );

  if (!module) {
    return throwError(tenantPortalConfigMessages.MODULE_NOT_FOUND, 404);
  }

  return module;
};

const findTenantChildOrThrow = (
  module: ITenantPortalModule,
  childModuleId: string
): ITenantPortalChildModule => {
  const child = module.children.find(
    (item) => item.childModuleId === childModuleId && !item.deletedAt
  );

  if (!child) {
    return throwError(tenantPortalConfigMessages.CHILD_MODULE_NOT_FOUND, 404);
  }

  return child;
};

const findTenantFeatureOrThrow = (
  container: ITenantPortalModule | ITenantPortalChildModule,
  featureId: string
): ITenantPortalFeature => {
  const feature = container.features.find(
    (item) => item.featureId === featureId && !item.deletedAt
  );

  if (!feature) {
    return throwError(tenantPortalConfigMessages.FEATURE_NOT_FOUND, 404);
  }

  return feature;
};

const buildTenantDetails = (tenant: ITenant): Partial<ITenant> => ({
  tenantCode: tenant.tenantCode,
  tenantName: tenant.tenantName,
  tenantLogo: tenant.tenantLogo,
  domainName: tenant.domainName,
  organizationName: tenant.organizationName,
  emailId: tenant.emailId,
  phoneNumber: tenant.phoneNumber,
  mobileNumber: tenant.mobileNumber,
  plan: tenant.plan,
  status: tenant.status,
});

const buildSubscriptionDetails = (
  subscription: ITenantSubscription | null
): Partial<ITenantSubscription> | null =>
  subscription
    ? {
        planId: subscription.planId,
        planName: subscription.planName,
        subscriptionCode: subscription.subscriptionCode,
        duration: subscription.duration,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        nextRenewalDate: subscription.nextRenewalDate,
        autoRenew: subscription.autoRenew,
        remarks: subscription.remarks,
      }
    : null;

type TenantConfigWithDetails = Partial<ITenantPortalConfig> & {
  tenantDetails: Partial<ITenant>;
  subscriptionDetails: Partial<ITenantSubscription> | null;
};

type TenantConfigsPage = {
  data: TenantConfigWithDetails[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export const getTenantConfigs = async (
  page = 1,
  limit = 10,
  filters: { tenantId?: string; portalId?: string } = {}
): Promise<TenantConfigsPage> => {
  const match: Record<string, unknown> = { deletedAt: null };

  if (filters.tenantId) match.tenantId = filters.tenantId;
  if (filters.portalId) match.portalId = filters.portalId;

  const [configs, totalRecords] = await Promise.all([
    TenantPortalConfig.find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    TenantPortalConfig.countDocuments(match),
  ]);

  const tenantIds = [...new Set(configs.map((config) => config.tenantId))];

  const [tenants, subscriptions] = await Promise.all([
    Tenants.find({ tenantCode: { $in: tenantIds } }),
    TenantSubscription.find({ tenantId: { $in: tenantIds }, deletedAt: null }),
  ]);

  const tenantByCode = new Map(
    tenants.map((tenant) => [tenant.tenantCode, tenant])
  );
  const subscriptionByTenantId = new Map(
    subscriptions.map((subscription) => [subscription.tenantId, subscription])
  );

  const data = configs.map((config) => {
    const tenant = tenantByCode.get(config.tenantId);

    return {
      ...config.toObject(),
      tenantDetails: tenant ? buildTenantDetails(tenant) : null,
      subscriptionDetails: buildSubscriptionDetails(
        subscriptionByTenantId.get(config.tenantId) ?? null
      ),
    } as TenantConfigWithDetails;
  });

  return {
    data,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      hasNextPage: page * limit < totalRecords,
      hasPreviousPage: page > 1,
    },
  };
};

// Gets a single tenant + portal configuration with tenant and subscription details.
export const getTenantConfig = async (
  tenantId: string,
  portalId: string
): Promise<TenantConfigWithDetails> => {
  const [tenant, subscription] = await Promise.all([
    Tenants.findOne({ tenantCode: tenantId }),
    TenantSubscription.findOne({ tenantId, deletedAt: null }),
  ]);

  if (!tenant) {
    return throwError(tenantPortalConfigMessages.TENANT_NOT_FOUND, 404);
  }

  const config = await findActiveConfig(tenantId, portalId);

  return {
    ...config.toObject(),
    tenantDetails: buildTenantDetails(tenant),
    subscriptionDetails: buildSubscriptionDetails(subscription),
  };
};

const round2 = (value: number): number => Number(value.toFixed(2));

// Invoice statuses that still have an amount for the tenant to pay.
const PAYABLE_INVOICE_STATUSES = [
  SubscriptionInvoiceStatus.PENDING,
  SubscriptionInvoiceStatus.OVERDUE,
  SubscriptionInvoiceStatus.PARTIALLY_PAID,
];

const toTenantFeatureDetails = (
  features: ITenantPortalFeature[] | undefined,
  portalId: string,
  portalName: string | null,
) =>
  (features ?? [])
    .filter((feature) => !feature.deletedAt)
    .map((feature) => ({
      featureId: feature.featureId,
      featureName: feature.featureName,
      featureType: feature.featuretype,
      status: feature.featureStatus,
      isEnabled: feature.isEnabled,
      portalId,
      portalName,
    }));

// The tenant's portals and every non-deleted module (with child modules and
// features) across all its TenantPortalConfig documents, ordered per portal by orderNo.
const getTenantConfigPortalsAndModules = async (tenantId: string) => {
  const [configs, portals] = await Promise.all([
    TenantPortalConfig.find({ tenantId, deletedAt: null }).sort({ createdAt: 1 }).lean(),
    TenantPortal.find({ tenantId, deletedAt: null }).select("portalId portalName").lean(),
  ]);

  const portalNameById = new Map(
    portals.map((portal) => [String(portal.portalId), portal.portalName]),
  );

  const activeModulesOf = (config: (typeof configs)[number]) =>
    (config.modules ?? []).filter((module) => !module.deletedAt);

  const tenantPortals = configs.map((config) => ({
    portalId: String(config.portalId),
    portalName: portalNameById.get(String(config.portalId)) ?? null,
    tenantPortalId: String(config.tenantPortalId),
    totalModules: activeModulesOf(config).length,
  }));

  const modules = configs.flatMap((config) => {
    const portalId = String(config.portalId);
    const portalName = portalNameById.get(portalId) ?? null;

    return [...activeModulesOf(config)]
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
      .map((module) => ({
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        order: module.orderNo,
        moduleType: module.moduleType,
        status: module.moduleStatus,
        isEnabled: module.isEnabled,
        portalId,
        portalName,
        features: toTenantFeatureDetails(module.features, portalId, portalName),
        children: (module.children ?? [])
          .filter((child) => !child.deletedAt)
          .map((child) => ({
            childModuleId: child.childModuleId,
            childModuleName: child.childModuleName,
            childModuleType: child.childModuleType,
            status: child.childModuleStatus,
            isEnabled: child.isEnabled,
            portalId,
            portalName,
            features: toTenantFeatureDetails(child.features, portalId, portalName),
          })),
      }));
  });

  return { portals: tenantPortals, modules };
};



// Module (Parent)

// Adds a Custom module into the tenant's existing config and enables it -
// the config document itself must already exist (seeded at subscription time).
export const addTenantModule = async (
  payload: AddTenantModuleInput
): Promise<ITenantPortalConfig> => {
  console.log("[addTenantModule] payload", payload);

  await validateTenantExists(payload.tenantId);

  const config = await findOrCreateActiveConfig(
    payload.tenantId,
    payload.portalId,
    payload.createdBy
  );

  const duplicate = config.modules.find(
    (module) => !module.deletedAt && module.moduleName === payload.moduleName
  );

  if (duplicate) {
    return throwError(tenantPortalConfigMessages.MODULE_ALREADY_EXISTS, 409);
  }

  const now = new Date();

  config.modules.push({
    moduleId: generateUniqueId("MOD", config.modules.map((module) => module.moduleId)),
    moduleName: payload.moduleName,
    description: payload.description,
    orderNo: payload.orderNo ?? config.modules.length + 1,
    moduleStatus: payload.moduleStatus,
    moduleType: PortalType.CUSTOM,
    isEnabled: true,
    features: [],
    children: [],
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  } as ITenantPortalModule);

  config.updatedBy = payload.createdBy;

  await config.save();

  return config;
};

export const getTenantModules = async (
  tenantId: string,
  portalId: string
): Promise<ITenantPortalModule[]> => {
  await validateTenantExists(tenantId);

  const config = await findActiveConfig(tenantId, portalId);

  return config.modules.filter((module) => !module.deletedAt);
};

export const updateTenantModuleAccess = async (
  moduleId: string,
  payload: TenantPortalConfigAccessInput
): Promise<ITenantPortalConfig> => {
  console.log("[updateTenantModuleAccess] payload", { moduleId, ...payload });

  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);

  module.isEnabled = payload.isEnabled;
  module.updatedAt = new Date();

  config.updatedBy = payload.updatedBy;

  await config.save();

  return config;
};

// Updates an existing tenant module. Custom modules can change name / order /
// status; Default modules are owned by Global Feature Control / Subscription
// Plan, so through this tenant-scoped API they can only change their order.
export const updateTenantModule = async (
  moduleId: string,
  payload: UpdateTenantModuleInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);

  // Order is a per-tenant display setting, so both Default and Custom modules
  // can change it. Every other field is still Custom-only.
  const editsOtherFields =
    payload.moduleName !== undefined ||
    payload.description !== undefined ||
    payload.moduleStatus !== undefined;

  if (module.moduleType !== PortalType.CUSTOM && editsOtherFields) {
    return throwError(tenantPortalConfigMessages.MODULE_NOT_CUSTOM, 400);
  }

  if (payload.moduleName !== undefined) {
    const duplicate = config.modules.find(
      (item) =>
        !item.deletedAt && item.moduleId !== moduleId && item.moduleName === payload.moduleName
    );

    if (duplicate) {
      return throwError(tenantPortalConfigMessages.MODULE_ALREADY_EXISTS, 409);
    }

    module.moduleName = payload.moduleName;
  }
  if (payload.description !== undefined) {
    module.description = payload.description;
  }
  if (payload.orderNo !== undefined) {
    const duplicateOrder = config.modules.find(
      (item) =>
        !item.deletedAt && item.moduleId !== moduleId && item.orderNo === payload.orderNo
    );

    if (duplicateOrder) {
      return throwError(tenantPortalConfigMessages.MODULE_ORDER_ALREADY_EXISTS, 409);
    }

    module.orderNo = payload.orderNo;
  }
  if (payload.moduleStatus !== undefined) {
    module.moduleStatus = payload.moduleStatus;
  }
  module.updatedAt = new Date();

  config.updatedBy = payload.updatedBy;

  await config.save();

  return config;
};

// Child Module

// Adds a Custom child module under an existing tenant module and enables it.
export const addTenantChildModule = async (
  moduleId: string,
  payload: AddTenantChildModuleInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findOrCreateActiveConfig(
    payload.tenantId,
    payload.portalId,
    payload.createdBy
  );
  const module = findTenantModuleOrThrow(config, moduleId);

  const duplicate = module.children.find(
    (child) => !child.deletedAt && child.childModuleName === payload.childModuleName
  );

  if (duplicate) {
    return throwError(tenantPortalConfigMessages.CHILD_MODULE_ALREADY_EXISTS, 409);
  }

  const now = new Date();

  module.children.push({
    childModuleId: generateUniqueId("CM", module.children.map((child) => child.childModuleId)),
    childModuleName: payload.childModuleName,
    description: payload.description,
    childModuleStatus: payload.childModuleStatus,
    childModuleType: PortalType.CUSTOM,
    isEnabled: true,
    features: [],
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  } as ITenantPortalChildModule);

  module.updatedAt = now;
  config.updatedBy = payload.createdBy;

  await config.save();

  return config;
};

export const getTenantChildModules = async (
  moduleId: string,
  tenantId: string,
  portalId: string
): Promise<ITenantPortalChildModule[]> => {
  await validateTenantExists(tenantId);

  const config = await findActiveConfig(tenantId, portalId);
  const module = findTenantModuleOrThrow(config, moduleId);

  return module.children.filter((child) => !child.deletedAt);
};

export const updateTenantChildModuleAccess = async (
  moduleId: string,
  childModuleId: string,
  payload: TenantPortalConfigAccessInput
): Promise<ITenantPortalConfig> => {
  console.log("[updateTenantChildModuleAccess] payload", { moduleId, childModuleId, ...payload });

  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);
  const child = findTenantChildOrThrow(module, childModuleId);

  child.isEnabled = payload.isEnabled;
  child.updatedAt = new Date();

  config.updatedBy = payload.updatedBy;

  await config.save();

  return config;
};

// Updates an existing Custom child module's own fields (name / status) -
// Default child modules are owned by Global Feature Control / Subscription
// Plan and cannot be edited through this tenant-scoped API.
export const updateTenantChildModule = async (
  moduleId: string,
  childModuleId: string,
  payload: UpdateTenantChildModuleInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);
  const child = findTenantChildOrThrow(module, childModuleId);

  if (child.childModuleType !== PortalType.CUSTOM) {
    return throwError(tenantPortalConfigMessages.CHILD_MODULE_NOT_CUSTOM, 400);
  }

  if (payload.childModuleName !== undefined) {
    const duplicate = module.children.find(
      (item) =>
        !item.deletedAt &&
        item.childModuleId !== childModuleId &&
        item.childModuleName === payload.childModuleName
    );

    if (duplicate) {
      return throwError(tenantPortalConfigMessages.CHILD_MODULE_ALREADY_EXISTS, 409);
    }

    child.childModuleName = payload.childModuleName;
  }
  if (payload.description !== undefined) {
    child.description = payload.description;
  }
  if (payload.childModuleStatus !== undefined) {
    child.childModuleStatus = payload.childModuleStatus;
  }
  child.updatedAt = new Date();

  module.updatedAt = new Date();
  config.updatedBy = payload.updatedBy;

  await config.save();

  return config;
};

// Feature - directly under a Module, or nested under a Child Module

// Adds a Custom feature directly under an existing tenant module and enables it.
export const addTenantModuleFeature = async (
  moduleId: string,
  payload: AddTenantFeatureInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findOrCreateActiveConfig(
    payload.tenantId,
    payload.portalId,
    payload.createdBy
  );
  const module = findTenantModuleOrThrow(config, moduleId);

  return pushTenantFeature(config, module, payload);
};

// Adds a Custom feature under an existing tenant child module and enables it.
export const addTenantChildFeature = async (
  moduleId: string,
  childModuleId: string,
  payload: AddTenantFeatureInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findOrCreateActiveConfig(
    payload.tenantId,
    payload.portalId,
    payload.createdBy
  );
  const module = findTenantModuleOrThrow(config, moduleId);
  const child = findTenantChildOrThrow(module, childModuleId);

  return pushTenantFeature(config, child, payload, module);
};

const pushTenantFeature = async (
  config: ITenantPortalConfig,
  container: ITenantPortalModule | ITenantPortalChildModule,
  payload: AddTenantFeatureInput,
  module?: ITenantPortalModule
): Promise<ITenantPortalConfig> => {
  const duplicate = container.features.find(
    (feature) => !feature.deletedAt && feature.featureName === payload.featureName
  );

  if (duplicate) {
    return throwError(tenantPortalConfigMessages.FEATURE_ALREADY_EXISTS, 409);
  }

  const now = new Date();

  container.features.push({
    featureId: generateUniqueId("FT", container.features.map((feature) => feature.featureId)),
    featureName: payload.featureName,
    description: payload.description,
    featureStatus: payload.featureStatus,
    featuretype: PortalType.CUSTOM,
    isEnabled: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  } as ITenantPortalFeature);

  container.updatedAt = now;
  if (module) module.updatedAt = now;
  config.updatedBy = payload.createdBy;

  await config.save();

  return config;
};

// Updates an existing Custom feature's own fields (name / status), whether it
// lives directly under a Module or nested under a Child Module - Default
// features are owned by Global Feature Control / Subscription Plan and cannot
// be edited through this tenant-scoped API.
const updateContainerFeature = async (
  config: ITenantPortalConfig,
  container: ITenantPortalModule | ITenantPortalChildModule,
  featureId: string,
  payload: UpdateTenantFeatureInput,
  module?: ITenantPortalModule
): Promise<ITenantPortalConfig> => {
  const feature = findTenantFeatureOrThrow(container, featureId);

  if (feature.featuretype !== PortalType.CUSTOM) {
    return throwError(tenantPortalConfigMessages.FEATURE_NOT_CUSTOM, 400);
  }

  if (payload.featureName !== undefined) {
    const duplicate = container.features.find(
      (item) =>
        !item.deletedAt && item.featureId !== featureId && item.featureName === payload.featureName
    );

    if (duplicate) {
      return throwError(tenantPortalConfigMessages.FEATURE_ALREADY_EXISTS, 409);
    }

    feature.featureName = payload.featureName;
  }
  if (payload.description !== undefined) {
    feature.description = payload.description;
  }
  if (payload.featureStatus !== undefined) {
    feature.featureStatus = payload.featureStatus;
  }
  feature.updatedAt = new Date();

  container.updatedAt = new Date();
  if (module) module.updatedAt = new Date();
  config.updatedBy = payload.updatedBy;

  await config.save();

  return config;
};

export const updateTenantModuleFeature = async (
  moduleId: string,
  featureId: string,
  payload: UpdateTenantFeatureInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);

  return updateContainerFeature(config, module, featureId, payload);
};

export const updateTenantChildFeature = async (
  moduleId: string,
  childModuleId: string,
  featureId: string,
  payload: UpdateTenantFeatureInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);
  const child = findTenantChildOrThrow(module, childModuleId);

  return updateContainerFeature(config, child, featureId, payload, module);
};

export const getTenantModuleFeatures = async (
  moduleId: string,
  tenantId: string,
  portalId: string
): Promise<ITenantPortalFeature[]> => {
  await validateTenantExists(tenantId);

  const config = await findActiveConfig(tenantId, portalId);
  const module = findTenantModuleOrThrow(config, moduleId);

  return module.features.filter((feature) => !feature.deletedAt);
};

export const getTenantChildFeatures = async (
  moduleId: string,
  childModuleId: string,
  tenantId: string,
  portalId: string
): Promise<ITenantPortalFeature[]> => {
  await validateTenantExists(tenantId);

  const config = await findActiveConfig(tenantId, portalId);
  const module = findTenantModuleOrThrow(config, moduleId);
  const child = findTenantChildOrThrow(module, childModuleId);

  return child.features.filter((feature) => !feature.deletedAt);
};

export const updateTenantModuleFeatureAccess = async (
  moduleId: string,
  featureId: string,
  payload: TenantPortalConfigAccessInput
): Promise<ITenantPortalConfig> => {
  console.log("[updateTenantModuleFeatureAccess] payload", { moduleId, featureId, ...payload });

  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);
  const feature = findTenantFeatureOrThrow(module, featureId);

  feature.isEnabled = payload.isEnabled;
  feature.updatedAt = new Date();
  config.updatedBy = payload.updatedBy;

  await config.save();

  return config;
};

export const updateTenantChildFeatureAccess = async (
  moduleId: string,
  childModuleId: string,
  featureId: string,
  payload: TenantPortalConfigAccessInput
): Promise<ITenantPortalConfig> => {
  console.log("[updateTenantChildFeatureAccess] payload", {
    moduleId,
    childModuleId,
    featureId,
    ...payload,
  });

  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);
  const child = findTenantChildOrThrow(module, childModuleId);
  const feature = findTenantFeatureOrThrow(child, featureId);

  feature.isEnabled = payload.isEnabled;
  feature.updatedAt = new Date();
  config.updatedBy = payload.updatedBy;

  await config.save();

  return config;
};



interface GetAllFeaturesQuery {
  page?: number;
  limit?: number;
  search?: string;
  portal?: string;
  status?: string;
}

interface FeatureRow {
  portal: string;

  parentModuleId: string;
  parentModuleName: string;

  childModuleId: string | null;
  childModuleName: string | null;

  featureId: string | null;
  featureName: string | null;

  description: string;

  status: string;
  isEnabled: boolean;

  createdAt: Date;
}

// Shared by getAllFeatures and getAllTenantFeatures - applies the search /
// portal / status filters and pagination to an already-flattened row list.
const paginateFeatureRows = (
  rows: FeatureRow[],
  query: GetAllFeaturesQuery = {}
) => {
  const {
    page = 1,
    limit = 10,
    search,
    portal,
    status,
  } = query;

  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedLimit = Math.max(1, Number(limit) || 10);

  let filteredRows = rows;

  if (search?.trim()) {
    const searchTerm = search.trim().toLowerCase();

    filteredRows = filteredRows.filter((row) =>
      [
        row.portal,
        row.parentModuleName,
        row.childModuleName,
        row.featureName,
        row.description,
      ].some((value) =>
        value?.toLowerCase().includes(searchTerm)
      )
    );
  }

  if (portal) {
    filteredRows = filteredRows.filter(
      (row) =>
        row.portal.toLowerCase() === portal.toLowerCase()
    );
  }

  if (status) {
    filteredRows = filteredRows.filter(
      (row) =>
        row.status.toLowerCase() === status.toLowerCase()
    );
  }

  const totalRecords = filteredRows.length;

  const totalPages = Math.ceil(
    totalRecords / normalizedLimit
  );

  const startIndex = (normalizedPage - 1) * normalizedLimit;

  const data = filteredRows.slice(
    startIndex,
    startIndex + normalizedLimit
  );

  return {
    data,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      totalRecords,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPreviousPage: normalizedPage > 1,
    },
  };
};

export const getAllFeatures = async (
  query: GetAllFeaturesQuery = {}
) => {
  // 1. Fetch all parent modules
  const parentModules = await PortalModule.find({
    deletedAt: null,
  })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const rows: FeatureRow[] = [];

  // 2. Flatten parent, child and feature records
  for (const parent of parentModules) {
    const parentId = parent.parentModuleId;
    const parentName = parent.parentModuleName;

    // Parent module row
    rows.push({
      portal: parent.portal,

      parentModuleId: parentId,
      parentModuleName: parentName,

      childModuleId: null,
      childModuleName: null,

      featureId: null,
      featureName: null,

      description: parent.description || "",

      status: parent.status,
      isEnabled: parent.isEnabled,

      createdAt: parent.createdAt,
    });

    // Parent-level feature rows
    for (const feature of parent.features || []) {
      rows.push({
        portal: parent.portal,

        parentModuleId: parentId,
        parentModuleName: parentName,

        childModuleId: null,
        childModuleName: null,

        featureId: feature.featureId,
        featureName: feature.featureName,

        description: feature.description || "",

        status: feature.status,
        isEnabled: feature.isEnabled,

        createdAt: feature.createdAt,
      });
    }

    // Child module rows
    for (const child of parent.children || []) {
      rows.push({
        portal: parent.portal,

        parentModuleId: parentId,
        parentModuleName: parentName,

        childModuleId: child.childModuleId,
        childModuleName: child.childModuleName,

        featureId: null,
        featureName: null,

        description: child.description || "",

        status: child.status,
        isEnabled: child.isEnabled,

        createdAt: child.createdAt,
      });

      // Child-level feature rows
      for (const feature of child.features || []) {
        rows.push({
          portal: parent.portal,

          parentModuleId: parentId,
          parentModuleName: parentName,

          childModuleId: child.childModuleId,
          childModuleName: child.childModuleName,

          featureId: feature.featureId,
          featureName: feature.featureName,

          description: feature.description || "",

          status: feature.status,
          isEnabled: feature.isEnabled,

          createdAt: feature.createdAt,
        });
      }
    }
  }

  return paginateFeatureRows(rows, query);
};

// Tenant-scoped equivalent of getAllFeatures - flattens every module, child
// module and feature across all of a tenant's tenantPortalConfig documents
// (portal name resolved via the linked tenantPortal record), instead of the
// Global (portalmodules) catalog.
export const getAllTenantFeatures = async (
  tenantId: string,
  query: GetAllFeaturesQuery = {}
) => {
  const trimmedTenantId = (tenantId || "").trim();

  if (!trimmedTenantId) {
    return throwError(tenantPortalConfigMessages.TENANT_NOT_FOUND, 400);
  }

  await validateTenantExists(trimmedTenantId);

  const configs = await TenantPortalConfig.find({
    tenantId: trimmedTenantId,
    deletedAt: null,
  }).lean();

  const tenantPortalIds = configs
    .map((config) => config.tenantPortalId)
    .filter((id): id is mongoose.Types.ObjectId => !!id);

  const portalDocs = await TenantPortal.find({ _id: { $in: tenantPortalIds } })
    .select("portalName")
    .lean();

  const portalNameById = new Map(
    portalDocs.map((portalDoc) => [portalDoc._id.toString(), portalDoc.portalName])
  );

  const rows: FeatureRow[] = [];

  for (const config of configs) {
    const portalName = config.tenantPortalId
      ? portalNameById.get(config.tenantPortalId.toString()) || "Unknown Portal"
      : "Unknown Portal";

    for (const module of config.modules || []) {
      if (module.deletedAt) continue;

      rows.push({
        portal: portalName,

        parentModuleId: module.moduleId,
        parentModuleName: module.moduleName,

        childModuleId: null,
        childModuleName: null,

        featureId: null,
        featureName: null,

        description: module.description || "",

        status: module.moduleStatus,
        isEnabled: module.isEnabled,

        createdAt: module.createdAt as Date,
      });

      for (const feature of module.features || []) {
        if (feature.deletedAt) continue;

        rows.push({
          portal: portalName,

          parentModuleId: module.moduleId,
          parentModuleName: module.moduleName,

          childModuleId: null,
          childModuleName: null,

          featureId: feature.featureId,
          featureName: feature.featureName,

          description: feature.description || "",

          status: feature.featureStatus,
          isEnabled: feature.isEnabled,

          createdAt: feature.createdAt as Date,
        });
      }

      for (const child of module.children || []) {
        if (child.deletedAt) continue;

        rows.push({
          portal: portalName,

          parentModuleId: module.moduleId,
          parentModuleName: module.moduleName,

          childModuleId: child.childModuleId,
          childModuleName: child.childModuleName,

          featureId: null,
          featureName: null,

          description: child.description || "",

          status: child.childModuleStatus,
          isEnabled: child.isEnabled,

          createdAt: child.createdAt as Date,
        });

        for (const feature of child.features || []) {
          if (feature.deletedAt) continue;

          rows.push({
            portal: portalName,

            parentModuleId: module.moduleId,
            parentModuleName: module.moduleName,

            childModuleId: child.childModuleId,
            childModuleName: child.childModuleName,

            featureId: feature.featureId,
            featureName: feature.featureName,

            description: feature.description || "",

            status: feature.featureStatus,
            isEnabled: feature.isEnabled,

            createdAt: feature.createdAt as Date,
          });
        }
      }
    }
  }

  return paginateFeatureRows(rows, query);
};