import crypto from "crypto";
import PortalModule, {
  CreateChildModuleInput,
  CreateFeatureInput,
  CreateParentModuleInput,
  IChildModule,
  IFeature,
  IPortalModule,
  UpdateAccessInput,
  UpdateChildModuleInput,
  UpdateFeatureInput,
  UpdateParentModuleInput,
} from "../models/portalModule";
import { throwError } from "../utils/error";
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
    throwError("Parent module not found", 404);
  }

  return parent as IPortalModule;
};

const findChildOrThrow = (parent: IPortalModule, childModuleId: string): IChildModule => {
  const child = parent.children.find((item) => item.childModuleId === childModuleId);

  if (!child) {
    throwError("Child module not found", 404);
  }

  return child as IChildModule;
};

const findFeatureOrThrow = (child: IChildModule, featureId: string): IFeature => {
  const feature = child.features.find((item) => item.featureId === featureId);

  if (!feature) {
    throwError("Feature not found", 404);
  }

  return feature as IFeature;
};

// ---------------------------------------------------------------------------
// Parent module
// ---------------------------------------------------------------------------

export const createParentModule = async (
  payload: CreateParentModuleInput
): Promise<IPortalModule> => {
  const duplicate = await PortalModule.findOne({
    portal: payload.portal,
    parentModuleName: payload.parentModuleName,
    deletedAt: null,
  });

  if (duplicate) {
    throwError("Parent module already exists", 409);
  }

  const parentModule = await PortalModule.create({
    portal: payload.portal,
    parentModuleId: generateId("PM"),
    parentModuleName: payload.parentModuleName,
    description: payload.description ?? null,
    status: payload.status,
    isEnabled: payload.isEnabled,
    children: [],
    createdBy: payload.createdBy,
    updatedBy: null,
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

// ---------------------------------------------------------------------------
// Child module
// ---------------------------------------------------------------------------

export const createChildModule = async (
  parentModuleId: string,
  payload: CreateChildModuleInput
): Promise<IPortalModule> => {
  const parent = await findActiveParent(parentModuleId);

  const duplicate = parent.children.find(
    (child) => child.childModuleName === payload.childModuleName
  );

  if (duplicate) {
    throwError("Child module already exists", 409);
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

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------

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
    throwError("Feature already exists", 409);
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
