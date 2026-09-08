import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

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

    // Feature
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
      path:"/features/card",
      options: {
        handler: handler.getFeatureCard,
        description: "Get feature card",
        tags: ["api", "feature"],
      }
    }
  ];

  server.route(routes);
};

export = {
  name: "api-portal-module",
  register,
};
