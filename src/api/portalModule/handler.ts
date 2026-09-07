import { Request, ResponseToolkit } from "@hapi/hapi";
import {
  createChildModuleValidation,
  createFeatureValidation,
  createParentModuleValidation,
  updateAccessValidation,
  updateChildModuleValidation,
  updateFeatureValidation,
  updateParentModuleValidation,
} from "../../models/portalModule";
import { portalModuleMessages } from "../../config/messages";
import {
  createChildModule,
  createFeature,
  createParentModule,
  getChildModules,
  getFeatures,
  getParentModules,
  updateChildModule,
  updateChildModuleAccess,
  updateFeature,
  updateFeatureAccess,
  updateParentModule,
  updateParentModuleAccess,
} from "../../operations/portalModule";

export default {

  // Parent module
  

  createParentModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createParentModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const result = await createParentModule(parsed.data);

      return h
        .response({
          success: true,
          message: portalModuleMessages.CREATE_PARENT_MODULE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getParentModules: async (_request: Request, h: ResponseToolkit) => {
    try {
      const result = await getParentModules();

      return h
        .response({
          success: true,
          message: portalModuleMessages.GET_PARENT_MODULES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateParentModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateParentModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId } = request.params;
      const result = await updateParentModule(parentModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: portalModuleMessages.UPDATE_PARENT_MODULE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateParentModuleAccess: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateAccessValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId } = request.params;
      const result = await updateParentModuleAccess(parentModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: portalModuleMessages.UPDATE_PARENT_MODULE_ACCESS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },


  // Child module
  
  createChildModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createChildModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId } = request.params;
      const result = await createChildModule(parentModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: portalModuleMessages.CREATE_CHILD_MODULE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getChildModules: async (request: Request, h: ResponseToolkit) => {
    try {
      const { parentModuleId } = request.params;
      const result = await getChildModules(parentModuleId);

      return h
        .response({
          success: true,
          message: portalModuleMessages.GET_CHILD_MODULES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateChildModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateChildModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId, childModuleId } = request.params;
      const result = await updateChildModule(parentModuleId, childModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: portalModuleMessages.UPDATE_CHILD_MODULE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateChildModuleAccess: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateAccessValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId, childModuleId } = request.params;
      const result = await updateChildModuleAccess(
        parentModuleId,
        childModuleId,
        parsed.data
      );

      return h
        .response({
          success: true,
          message: portalModuleMessages.UPDATE_CHILD_MODULE_ACCESS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  // Feature


  createFeature: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createFeatureValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId, childModuleId } = request.params;
      const result = await createFeature(parentModuleId, childModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: portalModuleMessages.CREATE_FEATURE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getFeatures: async (request: Request, h: ResponseToolkit) => {
    try {
      const { parentModuleId, childModuleId } = request.params;
      const result = await getFeatures(parentModuleId, childModuleId);

      return h
        .response({
          success: true,
          message: portalModuleMessages.GET_FEATURES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateFeature: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateFeatureValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId, childModuleId, featureId } = request.params;
      const result = await updateFeature(
        parentModuleId,
        childModuleId,
        featureId,
        parsed.data
      );

      return h
        .response({
          success: true,
          message: portalModuleMessages.UPDATE_FEATURE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateFeatureAccess: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateAccessValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: parsed.error.issues[0].message,
            errorCode: 400,
          })
          .code(400);
      }

      const { parentModuleId, childModuleId, featureId } = request.params;
      const result = await updateFeatureAccess(
        parentModuleId,
        childModuleId,
        featureId,
        parsed.data
      );

      return h
        .response({
          success: true,
          message: portalModuleMessages.UPDATE_FEATURE_ACCESS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || portalModuleMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },
};
