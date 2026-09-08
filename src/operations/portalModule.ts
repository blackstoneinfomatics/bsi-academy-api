import crypto from "crypto";
import PortalModule, {
  CreateParentModuleInput,
  UpdateAccessInput,
  UpdateParentModuleInput,
} from "../models/portalModule";
import { CreateChildModuleInput, UpdateChildModuleInput } from "../models/childportal";
import { CreateFeatureInput, UpdateFeatureInput } from "../models/featuremodule";
import { IChildModule, IFeature, IParentModule, IPortalModule } from "../../types/models.types";
// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------
// Date.now() based ids can collide under concurrent requests, so the unique
// suffix is derived from crypto.randomBytes instead.

const generateId = (prefix: string): string => {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const findActiveParent = async (parentModuleId: string): Promise<IPortalModule> => {
  const parent = await PortalModule.findOne({ parentModuleId, deletedAt: null });

  if (!parent) {
    throw new Error("Parent module not found");
  }

  return parent as IPortalModule;
};

const findChildOrThrow = (parent: IPortalModule, childModuleId: string): IChildModule => {
  const child = parent.children.find((item) => item.childModuleId === childModuleId);

  if (!child) {
    throw new Error("Child module not found");
  }

  return child as IChildModule;
};

const findFeatureOrThrow = (child: IChildModule, featureId: string): IFeature => {
  const feature = child.features.find((item) => item.featureId === featureId);

  if (!feature) {
    throw new Error("Feature not found");
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
    throw new Error("Parent module already exists");
  }

  const parentModulePayload: IParentModule = {
    portal: payload.portal,
    parentModuleId: generateId("PM"),
    parentModuleName: payload.parentModuleName,
    description: payload.description ?? null,
    status: payload.status,
    isEnabled: payload.isEnabled,
    createdBy: payload.createdBy,
    updatedBy: null,
  };

  const parentModule = await PortalModule.create({
    ...parentModulePayload,
    children: [],
    deletedAt: null,
  });

  return parentModule;
};

export const getParentModules = async (): Promise<IPortalModule[]> => {
  return PortalModule.find({ deletedAt: null }).sort({ createdAt: -1 });
};

export const updateParentModule = async (
  parentModuleId: string,
  payload: UpdateParentModuleInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);

  if (payload.parentModuleName !== undefined) {
    parent.parentModuleName = payload.parentModuleName;
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
    throw new Error("Child module already exists");
  }

  const now = new Date();

  parent.children.push({
    childModuleId: generateId("CM"),
    childModuleName: payload.childModuleName,
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
    throw new Error("Feature already exists");
  }

  const now = new Date();

  child.features.push({
    featureId: generateId("FT"),
    featureName: payload.featureName,
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
  const parent = await findActiveParent(parentModuleId);
  const child = findChildOrThrow(parent, childModuleId);
  const feature = findFeatureOrThrow(child, featureId);

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
