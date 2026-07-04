import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { addKnowledgeBaseMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/knowledgebase",  // Make sure this matches exactly
     options: {
      handler: handler.createKnowledgeBase,
      description: addKnowledgeBaseMessages.CREATE,
      tags: ["api", "knowledgeBase"],
      payload: {
        output: "stream",
        parse: true, 
        maxBytes: 20 * 1024 * 1024 ,
         multipart: true,
  allow: "multipart/form-data",
      },
      auth: {
        strategies: ["jwt"],
      }, },
    },
    {
      method: "GET",
      path: "/knowledgebase/list",
      options: {
        handler: handler.getknowledgebaseList,
        tags: ["api", "knowledgeBase"],
        auth: {
          strategies: ["jwt"],
        },},
    }
    

  ];
  server.route(routes);
};

export = {
  name: "api-addKnowledgeBase",
  register,
};
