import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import {updateMessage } from '../../config/messages'

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [

{
  method: "POST",

  path: "/api/updates",

  handler: handler.createUpdateHandler,

  options: {
    description: updateMessage.CREATE_UPDATE,

    tags: ["api", "updates"],

    payload: {
      parse: true,
      multipart: true,
    },

    // auth: {
    //   strategies: ["jwt"],
    // },
  },
}


  ];
  server.route(routes);
};

export = {
  name: 'api-update',
  register,
};