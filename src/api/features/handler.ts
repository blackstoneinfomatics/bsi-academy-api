import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { zodFeatureSchema } from "../../models/features";
import { featureMessages } from "../../config/messages";
import {
  createFeatureService,
  getAllFeaturesService,
  getFeatureByIdService,
} from "../../operations/features";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const getFeatureByIdValidation = z.object({
  params: z.object({
    id: objectId,
  }),
});

export default {
  createFeature: async (request: Request, h: ResponseToolkit) => {
    try {
      const payload = zodFeatureSchema.parse(request.payload);

      const result = await createFeatureService(payload);

      return h
        .response({
          success: true,
          message: featureMessages.CREATE_FEATURE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.errors?.[0]?.message || error.message || featureMessages.INTERNAL_SERVER_ERROR,
          errorCode: error.statusCode || 400,
        })
        .code(error.statusCode || 400);
    }
  },

  getFeatures: async (_request: Request, h: ResponseToolkit) => {
    try {
      const result = await getAllFeaturesService();

      return h
        .response({
          success: true,
          message: featureMessages.GET_FEATURES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.message || featureMessages.INTERNAL_SERVER_ERROR,
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  },

  getFeatureById: async (request: Request, h: ResponseToolkit) => {
    try {
      const { params } = getFeatureByIdValidation.parse({
        params: request.params,
      });

      const result = await getFeatureByIdService(params.id);

      return h
        .response({
          success: true,
          message: featureMessages.GET_FEATURE_BY_ID_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.errors?.[0]?.message || error.message || featureMessages.INTERNAL_SERVER_ERROR,
          errorCode: error.statusCode || 400,
        })
        .code(error.statusCode || 400);
    }
  },
};
