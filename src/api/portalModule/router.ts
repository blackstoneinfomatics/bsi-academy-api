import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

// ---------------------------------------------------------------------------
// Route map
// ---------------------------------------------------------------------------
// Default (Global Feature Control) - portalmodules collection
//   POST   /modules                                                          create a parent module (optionally with its direct features)
//   GET    /modules                                                          list parent modules
//   PUT    /modules/{parentModuleId}                                        update a parent module
//   PATCH  /modules/{parentModuleId}/enable                                 enable/disable a parent module
//   POST   /modules/{parentModuleId}/children                               create a child module
//   GET    /modules/{parentModuleId}/children                               list child modules
//   PUT    /modules/{parentModuleId}/children/{childModuleId}               update a child module
//   PATCH  /modules/{parentModuleId}/children/{childModuleId}/enable        enable/disable a child module
//   POST   /modules/{parentModuleId}/children/{childModuleId}/features      create a feature under a child module
//   GET    /modules/{parentModuleId}/children/{childModuleId}/features      list features under a child module
//   PUT    /modules/{parentModuleId}/children/{childModuleId}/features/{featureId}       update a feature under a child module
//   PATCH  /modules/{parentModuleId}/children/{childModuleId}/features/{featureId}/enable enable/disable a feature under a child module
//   POST   /modules/{parentModuleId}/features                               create a feature directly under a parent module (no child module)
//   GET    /modules/{parentModuleId}/features                               list features directly under a parent module
//   PUT    /modules/{parentModuleId}/features/{featureId}                   update a feature directly under a parent module
//   PATCH  /modules/{parentModuleId}/features/{featureId}/enable            enable/disable a feature directly under a parent module
//   GET    /features/card                                                   feature dashboard card counts/trends
//
// Tenant (Custom) - tenantPortalConfig collection. The config document must
// already exist (seeded with a Default snapshot at subscription time); these
// routes only add/update a Custom entry inside that existing document, or
// enable/disable an existing Default or Custom entry - they never create a
// second config document.
//   GET    /modules/tenant/config                                           get the full tenant config (Portal -> Modules -> Children/Features)
//   POST   /modules/tenant                                                  add a custom tenant module (and enable it)
//   GET    /modules/tenant                                                  list tenant modules
//   PUT    /modules/tenant/{moduleId}                                       update a custom tenant module
//   PATCH  /modules/tenant/{moduleId}/enable                                enable/disable a tenant module
//   POST   /modules/tenant/{moduleId}/children                              add a custom tenant child module (and enable it)
//   GET    /modules/tenant/{moduleId}/children                              list tenant child modules
//   PUT    /modules/tenant/{moduleId}/children/{childModuleId}              update a custom tenant child module
//   PATCH  /modules/tenant/{moduleId}/children/{childModuleId}/enable       enable/disable a tenant child module
//   POST   /modules/tenant/{moduleId}/features                              add a custom feature directly under a tenant module (and enable it)
//   GET    /modules/tenant/{moduleId}/features                              list features directly under a tenant module
//   PUT    /modules/tenant/{moduleId}/features/{featureId}                  update a custom feature directly under a tenant module
//   PATCH  /modules/tenant/{moduleId}/features/{featureId}/enable           enable/disable a feature directly under a tenant module
//   POST   /modules/tenant/{moduleId}/children/{childModuleId}/features     add a custom feature under a tenant child module (and enable it)
//   GET    /modules/tenant/{moduleId}/children/{childModuleId}/features     list features under a tenant child module
//   PUT    /modules/tenant/{moduleId}/children/{childModuleId}/features/{featureId}       update a custom feature under a tenant child module
//   PATCH  /modules/tenant/{moduleId}/children/{childModuleId}/features/{featureId}/enable enable/disable a feature under a tenant child module

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [

    // Parent module
    {
      method: "POST",
      path: "/modules",
      options: {
        handler: handler.createParentModule,
        description: "Create parent module",
        tags: ["api", "module"],
      },
    },
    {
      method: "GET",
      path: "/modules",
      options: {
        handler: handler.getParentModules,
        description: "Get parent modules",
        tags: ["api", "module"],
      },
    },
    {
      method: "PUT",
      path: "/modules/{parentModuleId}",
      options: {
        handler: handler.updateParentModule,
        description: "Update parent module",
        tags: ["api", "module"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/{parentModuleId}/enable",
      options: {
        handler: handler.updateParentModuleAccess,
        description: "Enable/disable parent module",
        tags: ["api", "module"],
      },
    },

    // Child module
    {
      method: "POST",
      path: "/modules/{parentModuleId}/children",
      options: {
        handler: handler.createChildModule,
        description: "Create child module",
        tags: ["api", "module"],
      },
    },
    {
      method: "GET",
      path: "/modules/{parentModuleId}/children",
      options: {
        handler: handler.getChildModules,
        description: "Get child modules",
        tags: ["api", "module"],
      },
    },
    {
      method: "PUT",
      path: "/modules/{parentModuleId}/children/{childModuleId}",
      options: {
        handler: handler.updateChildModule,
        description: "Update child module",
        tags: ["api", "module"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/{parentModuleId}/children/{childModuleId}/enable",
      options: {
        handler: handler.updateChildModuleAccess,
        description: "Enable/disable child module",
        tags: ["api", "module"],
      },
    },

    // Feature (nested under a Child Module)
    {
      method: "POST",
      path: "/modules/{parentModuleId}/children/{childModuleId}/features",
      options: {
        handler: handler.createFeature,
        description: "Create feature",
        tags: ["api", "module"],
      },
    },
    {
      method: "GET",
      path: "/modules/{parentModuleId}/children/{childModuleId}/features",
      options: {
        handler: handler.getFeatures,
        description: "Get features",
        tags: ["api", "module"],
      },
    },
    {
      method: "PUT",
      path: "/modules/{parentModuleId}/children/{childModuleId}/features/{featureId}",
      options: {
        handler: handler.updateFeature,
        description: "Update feature",
        tags: ["api", "module"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/{parentModuleId}/children/{childModuleId}/features/{featureId}/enable",
      options: {
        handler: handler.updateFeatureAccess,
        description: "Enable/disable feature",
        tags: ["api", "module"],
      },
    },

    {
      method: "GET",
      path: "/features/card",
      options: {
        handler: handler.getFeatureCard,
        description: "Get feature card",
        tags: ["api", "feature"],
      },
    },

    // Feature directly under the Parent Module (no Child Module in between)
    {
      method: "POST",
      path: "/modules/{parentModuleId}/features",
      options: {
        handler: handler.createParentFeature,
        description: "Create feature directly under the parent module",
        tags: ["api", "module"],
      },
    },
    {
      method: "GET",
      path: "/modules/{parentModuleId}/features",
      options: {
        handler: handler.getParentFeatures,
        description: "Get features created directly under the parent module",
        tags: ["api", "module"],
      },
    },
    {
      method: "PUT",
      path: "/modules/{parentModuleId}/features/{featureId}",
      options: {
        handler: handler.updateParentFeature,
        description: "Update a feature created directly under the parent module",
        tags: ["api", "module"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/{parentModuleId}/features/{featureId}/enable",
      options: {
        handler: handler.updateParentFeatureAccess,
        description: "Enable/disable a feature created directly under the parent module",
        tags: ["api", "module"],
      },
    },

    // Tenant module (Custom) - the tenant_portal_config document already exists
    // (seeded with a Default snapshot of Global when the tenant subscribes), so
    // these only ADD/UPDATE a Custom entry into it and enable it - they never
    // create or replace the root document.
    {
      method: "GET",
      path: "/modules/tenant/config",
      options: {
        handler: handler.getTenantConfig,
        description: "Get the full tenant portal configuration (Portal -> Modules -> Children/Features)",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "POST",
      path: "/modules/tenant",
      options: {
        handler: handler.addTenantModule,
        description: "Add a custom tenant module and enable it",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "GET",
      path: "/modules/tenant",
      options: {
        handler: handler.getTenantModules,
        description: "Get tenant modules",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PUT",
      path: "/modules/tenant/{moduleId}",
      options: {
        handler: handler.updateTenantModule,
        description: "Update a custom tenant module",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/tenant/{moduleId}/enable",
      options: {
        handler: handler.updateTenantModuleAccess,
        description: "Enable/disable tenant module",
        tags: ["api", "module", "tenant"],
      },
    },

    // Tenant child module
    {
      method: "POST",
      path: "/modules/tenant/{moduleId}/children",
      options: {
        handler: handler.addTenantChildModule,
        description: "Add a custom tenant child module and enable it",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "GET",
      path: "/modules/tenant/{moduleId}/children",
      options: {
        handler: handler.getTenantChildModules,
        description: "Get tenant child modules",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PUT",
      path: "/modules/tenant/{moduleId}/children/{childModuleId}",
      options: {
        handler: handler.updateTenantChildModule,
        description: "Update a custom tenant child module",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/tenant/{moduleId}/children/{childModuleId}/enable",
      options: {
        handler: handler.updateTenantChildModuleAccess,
        description: "Enable/disable tenant child module",
        tags: ["api", "module", "tenant"],
      },
    },

    // Tenant feature directly under a module (no child module in between)
    {
      method: "POST",
      path: "/modules/tenant/{moduleId}/features",
      options: {
        handler: handler.addTenantModuleFeature,
        description: "Add a custom feature directly under a tenant module and enable it",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "GET",
      path: "/modules/tenant/{moduleId}/features",
      options: {
        handler: handler.getTenantModuleFeatures,
        description: "Get features created directly under a tenant module",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PUT",
      path: "/modules/tenant/{moduleId}/features/{featureId}",
      options: {
        handler: handler.updateTenantModuleFeature,
        description: "Update a custom feature created directly under a tenant module",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/tenant/{moduleId}/features/{featureId}/enable",
      options: {
        handler: handler.updateTenantModuleFeatureAccess,
        description: "Enable/disable a feature created directly under a tenant module",
        tags: ["api", "module", "tenant"],
      },
    },

    // Tenant feature nested under a child module
    {
      method: "POST",
      path: "/modules/tenant/{moduleId}/children/{childModuleId}/features",
      options: {
        handler: handler.addTenantChildFeature,
        description: "Add a custom feature under a tenant child module and enable it",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "GET",
      path: "/modules/tenant/{moduleId}/children/{childModuleId}/features",
      options: {
        handler: handler.getTenantChildFeatures,
        description: "Get features under a tenant child module",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PUT",
      path: "/modules/tenant/{moduleId}/children/{childModuleId}/features/{featureId}",
      options: {
        handler: handler.updateTenantChildFeature,
        description: "Update a custom feature under a tenant child module",
        tags: ["api", "module", "tenant"],
      },
    },
    {
      method: "PATCH",
      path: "/modules/tenant/{moduleId}/children/{childModuleId}/features/{featureId}/enable",
      options: {
        handler: handler.updateTenantChildFeatureAccess,
        description: "Enable/disable a feature under a tenant child module",
        tags: ["api", "module", "tenant"],
      },
    },
  ];

  server.route(routes);
};

export = {
  name: "api-portal-module",
  register,
};
