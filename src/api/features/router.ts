import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { featureMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/features",
      options: {
        handler: handler.createFeature,
        description: featureMessages.CREATE_FEATURE,
        tags: ["api", "features"],
      },
    },
    {
      method: "GET",
      path: "/features",
      options: {
        handler: handler.getFeatures,
        description: featureMessages.GET_FEATURES,
        tags: ["api", "features"],
      },
    },
    {
      method: "GET",
      path: "/features/{id}",
      options: {
        handler: handler.getFeatureById,
        description: featureMessages.GET_FEATURE_BY_ID,
        tags: ["api", "features"],
      },
    },
  ];
  server.route(routes);
};

export = {
  name: "api-features",
  register,
};
