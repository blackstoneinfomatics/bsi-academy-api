import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { tenantChatMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/chat-room",
      options: {
        handler: handler.createChatRoom,
        description: tenantChatMessages.CREATE_CHAT_ROOM,
        tags: ["api", "Chat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "POST",
      path: "/chat/message",
      options: {
        handler: handler.sendMessage,
        description: tenantChatMessages.SEND_MESSAGE,
        tags: ["api", "Chat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
       method: "PUT",
       path: "/chat-room/{roomId}",
      options: {
        handler: handler.updateChatRoom,
        description: tenantChatMessages.ADD_ROOM_MEMBER,
        tags: ["api", "Chat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "GET",
      path: "/chat-room",
      handler: handler.getChatRooms,
      options: {
        description: tenantChatMessages.GET_CHAT_ROOMS,
        tags: ["api", "Chat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
    {
      method: "GET",
      path: "/chat/groups/{roomId}",
      options: {
        handler: handler.getGroupDetails,
        description: "Get chat group details and tenant members",
        tags: ["api", "Chat"],
      },
    },
    {
      method: "GET",
      path: "/chat/global",
      options: {
        handler: handler.getGlobalChatGroups,
        description: "Get global chat group details and tenant members",
        tags: ["api", "Chat"],
      },
    },
    {
      method: "GET",
      path: "/chat/{roomId}/messages",
      options: {
        handler: handler.getRoomMessages,
        description: "Get paginated messages for a chat room",
        tags: ["api", "Chat"],
        auth: false,
      },
    },
  ];
  server.route(routes);
};
export = {
  name: "api-tenantchat",
  register,
};
