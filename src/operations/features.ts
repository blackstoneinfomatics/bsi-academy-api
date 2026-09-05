import Feature from "../models/features";
import { featureMessages } from "../config/messages";
import { throwError } from "../helpers/throwError";

export const createFeatureService = async (payload: any) => {
  return Feature.create(payload);
};

export const getAllFeaturesService = async () => {
  return Feature.find();
};

export const getFeatureByIdService = async (id: string) => {
  const feature = await Feature.findById(id);

  if (!feature) {
    throwError(featureMessages.FEATURE_NOT_FOUND, 404);
  }

  return feature;
};
