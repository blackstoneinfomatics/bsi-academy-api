import { Request, ResponseToolkit } from "@hapi/hapi";
import {
  createParentModuleValidation,
  updateParentModuleValidation,
  updateAccessValidation,
} from "../../models/portalModule";
import { portalModuleMessages, tenantPortalConfigMessages } from "../../config/messages";
import {
  addTenantChildFeature,
  addTenantChildModule,
  addTenantModule,
  addTenantModuleFeature,
  createChildModule,
  createFeature,
  createParentFeature,
  createParentModule,
  getChildModules,
  getFeatureCard,
  getFeatures,
  getParentFeatures,
  getParentModules,
  getTenantChildFeatures,
  getTenantChildModules,
  getTenantConfig,
  getTenantModuleFeatures,
  getTenantModules,
  updateChildModule,
  updateChildModuleAccess,
  updateFeature,
  updateFeatureAccess,
  updateParentFeature,
  updateParentFeatureAccess,
  updateParentModule,
  updateParentModuleAccess,
  updateTenantChildFeature,
  updateTenantChildFeatureAccess,
  updateTenantChildModule,
  updateTenantChildModuleAccess,
  updateTenantModule,
  updateTenantModuleAccess,
  updateTenantModuleFeature,
  updateTenantModuleFeatureAccess,
} from "../../operations/portalModule";
import { createChildModuleValidation, updateChildModuleValidation } from "../../models/childportal";
import { createFeatureValidation, updateFeatureValidation } from "../../models/featuremodule";
import {
  addTenantChildModuleValidation,
  addTenantFeatureValidation,
  addTenantModuleValidation,
  tenantPortalConfigAccessValidation,
  updateTenantChildModuleValidation,
  updateTenantFeatureValidation,
  updateTenantModuleValidation,
} from "../../models/tenantPortalConfig";

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

  // Feature directly under the Parent Module (no Child Module in between)

  createParentFeature: async (request: Request, h: ResponseToolkit) => {
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

      const { parentModuleId } = request.params;
      const result = await createParentFeature(parentModuleId, parsed.data);

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

  getParentFeatures: async (request: Request, h: ResponseToolkit) => {
    try {
      const { parentModuleId } = request.params;
      const result = await getParentFeatures(parentModuleId);

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

  updateParentFeature: async (request: Request, h: ResponseToolkit) => {
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

      const { parentModuleId, featureId } = request.params;
      const result = await updateParentFeature(parentModuleId, featureId, parsed.data);

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

  updateParentFeatureAccess: async (request: Request, h: ResponseToolkit) => {
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

      const { parentModuleId, featureId } = request.params;
      const result = await updateParentFeatureAccess(parentModuleId, featureId, parsed.data);

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

  getFeatureCard: async (_request: Request, h: ResponseToolkit) => {
    try {
      const result = await getFeatureCard();

      return h
        .response({
          success: true,
          message: portalModuleMessages.GET_FEATURE_CARD_SUCCESS,
          data: result,
        }).code(200);
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

  // Tenant module (Custom) - the tenant_portal_config document already exists
  // (seeded with a Default snapshot of Global when the tenant subscribes), so
  // these only ADD a Custom entry into it and enable it - they never create
  // the root document.

  getTenantConfig: async (request: Request, h: ResponseToolkit) => {
    try {
      const { tenantId, portalId } = request.query as { tenantId: string; portalId: string };
      const result = await getTenantConfig(tenantId, portalId);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.GET_CONFIG_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  addTenantModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = addTenantModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const result = await addTenantModule(parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.ADD_MODULE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getTenantModules: async (request: Request, h: ResponseToolkit) => {
    try {
      const { tenantId, portalId } = request.query as { tenantId: string; portalId: string };
      const result = await getTenantModules(tenantId, portalId);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.GET_MODULES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantModuleAccess: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = tenantPortalConfigAccessValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId } = request.params;
      const result = await updateTenantModuleAccess(moduleId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_MODULE_ACCESS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateTenantModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId } = request.params;
      const result = await updateTenantModule(moduleId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_MODULE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  addTenantChildModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = addTenantChildModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId } = request.params;
      const result = await addTenantChildModule(moduleId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.ADD_CHILD_MODULE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getTenantChildModules: async (request: Request, h: ResponseToolkit) => {
    try {
      const { moduleId } = request.params;
      const { tenantId, portalId } = request.query as { tenantId: string; portalId: string };
      const result = await getTenantChildModules(moduleId, tenantId, portalId);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.GET_CHILD_MODULES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantChildModuleAccess: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = tenantPortalConfigAccessValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId, childModuleId } = request.params;
      const result = await updateTenantChildModuleAccess(moduleId, childModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_CHILD_MODULE_ACCESS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantChildModule: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateTenantChildModuleValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId, childModuleId } = request.params;
      const result = await updateTenantChildModule(moduleId, childModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_CHILD_MODULE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  addTenantModuleFeature: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = addTenantFeatureValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId } = request.params;
      const result = await addTenantModuleFeature(moduleId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.ADD_FEATURE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getTenantModuleFeatures: async (request: Request, h: ResponseToolkit) => {
    try {
      const { moduleId } = request.params;
      const { tenantId, portalId } = request.query as { tenantId: string; portalId: string };
      const result = await getTenantModuleFeatures(moduleId, tenantId, portalId);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.GET_FEATURES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantModuleFeatureAccess: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = tenantPortalConfigAccessValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId, featureId } = request.params;
      const result = await updateTenantModuleFeatureAccess(moduleId, featureId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_FEATURE_ACCESS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantModuleFeature: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateTenantFeatureValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId, featureId } = request.params;
      const result = await updateTenantModuleFeature(moduleId, featureId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_FEATURE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  addTenantChildFeature: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = addTenantFeatureValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId, childModuleId } = request.params;
      const result = await addTenantChildFeature(moduleId, childModuleId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.ADD_FEATURE_SUCCESS,
          data: result,
        })
        .code(201);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  getTenantChildFeatures: async (request: Request, h: ResponseToolkit) => {
    try {
      const { moduleId, childModuleId } = request.params;
      const { tenantId, portalId } = request.query as { tenantId: string; portalId: string };
      const result = await getTenantChildFeatures(moduleId, childModuleId, tenantId, portalId);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.GET_FEATURES_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantChildFeatureAccess: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = tenantPortalConfigAccessValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId, childModuleId, featureId } = request.params;
      const result = await updateTenantChildFeatureAccess(moduleId, childModuleId, featureId, parsed.data);

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_FEATURE_ACCESS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateTenantChildFeature: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = updateTenantFeatureValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({ success: false, message: parsed.error.issues[0].message, errorCode: 400 })
          .code(400);
      }

      const { moduleId, childModuleId, featureId } = request.params;
      const result = await updateTenantChildFeature(
        moduleId,
        childModuleId,
        featureId,
        parsed.data
      );

      return h
        .response({
          success: true,
          message: tenantPortalConfigMessages.UPDATE_FEATURE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantPortalConfigMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

};