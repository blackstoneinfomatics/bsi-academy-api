import crypto from "crypto";
import mongoose from "mongoose";
import { throwError } from "../helpers/throwError";
import { portalModuleMessages, tenantPortalConfigMessages } from "../config/messages";
import { PortalStatus, PortalType, Status } from "../shared/enum";
import PortalModule, {
  CreateParentModuleInput,
  UpdateAccessInput,
  UpdateParentModuleInput,
} from "../models/portalModule";
import { CreateChildModuleInput, UpdateChildModuleInput } from "../models/childportal";
import { CreateFeatureInput, UpdateFeatureInput } from "../models/featuremodule";
import Tenants from "../models/tenants";
import TenantSubscription from "../models/tenantsubscription";
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

// ---------------------------------------------------------------------------
// Tenant module (Custom) - everything created through these functions is
// tenant-specific and always type=Custom, stored in tenant_portal_config.
// ---------------------------------------------------------------------------
// tenantId here follows the project-wide convention of matching Tenants.tenantCode
// (see createinvoice.ts / operations/tenants.ts).

const validateTenantExists = async (tenantId: string): Promise<void> => {
  const tenant = await Tenants.findOne({ tenantCode: tenantId });

  if (!tenant) {
    throwError(tenantPortalConfigMessages.TENANT_NOT_FOUND, 404);
  }
};

// The config document is seeded (as a Default snapshot of Global) when the tenant
// subscribes to the portal - it is never created here, only looked up.
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

// The Global catalog (portalmodules collection) uses Status ("Active" /
// "Inactive" / "Archived" / ...) while tenant-scoped module/child/feature
// status uses the differently-cased PortalStatus ("ACTIVE" / "INACTIVE" /
// "ARCHIVED") - passing a Status value straight into a PortalStatus field
// would fail the tenantPortalConfig schema's enum validation on save.
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

// Snapshots the Global (Default) parent modules registered under this portal's
// name, mapped into the tenant-scoped shape - used to seed a brand new
// tenantPortalConfig document. A portal name with no Global modules yet simply
// starts with an empty snapshot.
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

// Used by addTenantModule only: unlike findActiveConfig (every other tenant-
// scoped read/update, which requires the config to already exist), this one
// self-heals and never 404s on a missing config - whatever tenantId/portalId
// is sent in the payload is accepted as-is, and a tenantPortalConfig doc is
// created for it on the fly if one isn't there yet. If a matching tenantPortal
// record happens to exist, its Global default modules are used to seed the
// snapshot; otherwise it just starts empty and the module from the payload is
// added as the first (Custom) entry.
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

// Returns the full existing TenantConfig document (Portal -> Parent Module ->
// Features / Child Modules -> Features) for the tenant, along with the
// tenant's own details (name, organization, contact info, plan, etc.) and its
// current subscription details (plan, start/end/renewal dates, status, etc.).
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

// Lists TenantConfig documents across tenants/portals (paginated), each
// enriched with its tenant and subscription details - used for an admin-facing
// overview rather than a single tenant+portal lookup.
export const getTenantConfigs = async (
  page = 1,
  limit = 10,
  filters: { tenantId?: string; portalId?: string } = {}
): Promise<{
  data: TenantConfigWithDetails[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> => {
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

  const tenantByCode = new Map(tenants.map((tenant) => [tenant.tenantCode, tenant]));
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

// Updates an existing Custom module's own fields (name / order / status) -
// Default modules are owned by Global Feature Control / Subscription Plan and
// cannot be edited through this tenant-scoped API.
export const updateTenantModule = async (
  moduleId: string,
  payload: UpdateTenantModuleInput
): Promise<ITenantPortalConfig> => {
  await validateTenantExists(payload.tenantId);

  const config = await findActiveConfig(payload.tenantId, payload.portalId);
  const module = findTenantModuleOrThrow(config, moduleId);

  if (module.moduleType !== PortalType.CUSTOM) {
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
  if (payload.orderNo !== undefined) {
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
