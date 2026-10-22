import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { tenantChatMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  // Register all routes for this unit
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/user/chat-room",
      options: {
        handler: handler.createChatRoom,
        description: tenantChatMessages.CREATE_CHAT_ROOM,
        tags: ["api", "userChat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },


    {
      method: "POST",
      path: "/user/chat/{source}/message",
      options: {
        handler: handler.sendMessage,
        description: tenantChatMessages.SEND_MESSAGE,
        tags: ["api", "userChat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
     {
      method: "GET",
      path: "/user/chat-room/{userId}",
      handler: handler.getChatRooms,
      options: {
        description: tenantChatMessages.GET_CHAT_ROOMS,
        tags: ["api", "userChat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

     {
      method: "GET",
      path: "/user/chat/{source}/groupuser/{roomId}",
      handler: handler.getTenantUsersByGroup,
      options: {
        description: tenantChatMessages.GET_CHAT_ROOMS,
        tags: ["api", "userChat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
       method: "PUT",
       path: "/user/chat-room/{source}/{roomId}",
      options: {
        handler: handler.updateChatRoom,
        description: tenantChatMessages.ADD_ROOM_MEMBER,
        tags: ["api", "userChat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

    {
      method: "POST",
      path: "/user/chat/{source}/seen",
      options: {
        handler: handler.markSeen,
        description: tenantChatMessages.MARK_SEEN,
        tags: ["api", "userChat"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },

     {
    method: "PUT",
    path: "/user/chat/{source}/clear",
    handler: handler.clearChat,
    options: {
      description: "Clear chat for current user in a room",
      tags: ["api", "userChat"],
    },
  },

//     {
//       method: "GET",
//       path: "/chat-room",
//       handler: handler.getChatRooms,
//       options: {
//         description: tenantChatMessages.GET_CHAT_ROOMS,
//         tags: ["api", "Chat"],
//         // auth: {
//         //   strategies: ["jwt"],
//         // },
//       },
//     },
    {
      method: "GET",
      path: "/user/chat/{source}/groups/{roomId}",
      options: {
        handler: handler.getGroupDetails,
        description: "Get chat group details and user members",
        tags: ["api", "userChat"],
      },
    },
    {
      method: "GET",
      path: "/user/chat/{source}/{roomId}/messages",
      options: {
        handler: handler.getRoomMessages,
        description: "Get paginated messages for a chat room",
        tags: ["api", "userChat"],
      },
    },

    {
  method: "GET",
  path: "/user/chat/{source}/message/{messageId}/seen/{currentUserId}",
  options: {
      handler: handler.getSeenUsers,
      description: "Get users who have seen a specific message",
     tags: ["api", "userChat"],
  },
},
    {
    method: "DELETE",
    path: "/user/chat-room/{roomId}",
    handler: handler.deleteRoom,
    options: {
      description: "Soft delete chat room",
      tags: ["api", "userChat"],
    },
  },

  {
  method: "DELETE",
  path: "/user/chat/{source}/message/{messageId}/everyone/{userId}",
  handler: handler.deleteForEveryone,
  options: {
      description: "Soft delete message for everyone",
    tags: ["api", "userChat"],
  },
}
  ];
  server.route(routes);
};
export = {
  name: "api-userchat",
  register,
};
