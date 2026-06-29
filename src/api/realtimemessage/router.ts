import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/realtimemessage",
      options: {
        handler: handler.sendMessageHandler,
        tags: ["api", "realtimemessage"],
        auth: {
          strategies: ["jwt"],
        },
      },
    },
    {
      method: "GET",
      path: "/realtimemessage/{senderId}/{receiverId}",
      options: {
        handler: handler.getMessagesByUserHandler,
        tags: ["api", "realtimemessage"],
        auth: {
          strategies: ["jwt"],
        },
        cors: {
          origin: ["*"], // use specific frontend origin if credentials needed
          additionalHeaders: ["Authorization"], // very important!
        },
      },
    },
  ];
  server.route(routes);
};

export = {
  name: "api-realtimemessage",
  register,
};
