import { Request,ResponseToolkit } from "@hapi/hapi";
import { throwError } from "../../helpers/throwError";
import {
  clearChatService,
  createChatRoom,
  deleteChatRoomService,
  deleteMessageForEveryoneService,
  getChatRoomsOperation,
  getGlobalChatGroupsOperation,
  getGroupDetailsOperation,
  getRoomMessagesOperation,
  getSeenUsersService,
  markMessageSeenService,
  sendMessageService,
  updateChatRoomService,
} from "../../operations/tenantChat";
import { tenantChatMessages } from "../../config/messages";
import { z } from "zod";
import { TenantChatRoomValidation } from "../../models/tenantChatRoom";
import { ChatMessageValidation } from "../../models/tenantChatMessage";

export const createChatRoomValidation = z.object({
  payload: TenantChatRoomValidation.pick({
    type:true,
    tenantId:true,
    tenantIds: true,
    name: true,
    planName: true,
    description: true,
    createdBy:true
  }),
});

export const SendChatMessageValidation = z.object({
    payload : ChatMessageValidation.pick({
          roomId: true,
        
          senderId: true,
          senderName: true,
          senderRole:true,
        
          title: true,
          message:true,
        
          messageType: true,
        
          attachments: true,
        
          replyTo: true
    })
})

export const getGroupDetailsValidation = z.object({
  params: z.object({
    roomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid roomId"),
  }),
});

export const getRoomMessagesValidation = z.object({
  params: z.object({
    roomId: z.string().regex(/^(?:[a-f\d]{24}|ROOM-\d+)$/i, "Invalid roomId or roomCode"),
  }),
  query: z.object({
    userId: z.string().min(1).optional(),
    all: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const getChatRoomsValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    tab: z.enum(["all", "unread", "group"]).default("all"),
    search: z.string().optional(),
  }),
});

export const UpdateChatRoomValidation = z.object({
  payload: z.object({
    addTenantIds: z.array(z.string()).optional(),
    removeTenantIds: z.array(z.string()).optional(),
    sendAccess: z.enum(["ADMIN_ONLY", "EVERYONE"]).optional(),
    updatedBy: z.string(),
  }),
  roomId: z.string(),
});

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const MarkSeenValidation = z.object({
  payload: z.object({
    roomId: objectId,
    messageId: objectId,
    userId: z.string().min(1),
  }),
});


export const DeleteChatRoomValidation = z.object({
  params: z.object({
    roomId: objectId,
  }),
  payload: z.object({
    deletedBy: z.string().min(1),
  }),
});

export const ClearChatValidation = z.object({
  payload: z.object({
    roomId: objectId,
    userId: z.string().min(1),
  }),
});

export const GetSeenUsersValidation = z.object({
  params: z.object({
    messageId: objectId,
    currentUserId: z.string().min(1),
  }),
});

export const GetDeleteMessageValidation = z.object({
  params: z.object({
    messageId: objectId,
    userId: z.string().min(1),
  }),
});

export default{
     createChatRoom: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createChatRoomValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const payload = parsed?.data?.payload as any;

      const result = await createChatRoom(payload);

      return h
        .response({
          success: true,
          message: tenantChatMessages.CREATE_CHAT_ROOM_SUCCESS,
          data: result,
        })
        .code(200);

    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantChatMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  sendMessage: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = SendChatMessageValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }
      
    const payload = parsed?.data?.payload as any;

      const result = await sendMessageService(payload);
      return h
        .response({
          success: true,
          message:
            Array.isArray(result)
              ? tenantChatMessages.SEND_GLOBAL_MESSAGE_SUCCESS
              : tenantChatMessages.SEND_MESSAGE_SUCCESS,
          data: result,
        })
        .code(200);

    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || tenantChatMessages.INTERNAL_SERVER_ERROR,
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

  updateChatRoom: async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = UpdateChatRoomValidation.safeParse({
  payload: request.payload,
  roomId: request.params.roomId,
});

if (!parsed.success) {
  throwError(parsed.error.errors[0].message, 400);
  return;
}

const { payload, roomId } = parsed?.data;

const result = await updateChatRoomService({
  ...payload,
  roomId, 
});

    return h.response({
      success: true,
      message: "Chat room updated successfully",
      data: result,
    }).code(200);

  } catch (err: any) {
    return h.response({
      success: false,
      message: err.message,
      errorCode: err.statusCode || 500,
    }).code(err.statusCode || 500);
  }
},
  markSeen: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = MarkSeenValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const payload = parsed?.data?.payload as any;

      const result = await markMessageSeenService(payload);

      return h
        .response({
          success: true,
          message: tenantChatMessages.MARK_SEEN_SUCCESS,
          data: result,
        })
        .code(200);

    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

getChatRooms : async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = getChatRoomsValidation.safeParse({ query: request.query });

    if (!parsed.success) {
      return h
        .response({
          statusCode: 400,
          message: parsed.error.issues[0]?.message || "Invalid query parameters",
        })
        .code(400);
    }

    const { search, page, limit, tab } = parsed.data.query;

    const data = await getChatRoomsOperation({ search, page, limit });
    const selectedData = data[tab];

    return h
      .response({
        statusCode: 200,
        message: "Chat rooms fetched successfully",
        data: selectedData,
      })
      .code(200);
  } catch (error: any) {
    console.error("getChatRoomsHandler error:", error);
    return h
      .response({
        statusCode: 500,
        message: error?.message || "Internal Server Error",
      })
      .code(500);
  }
},



getGroupDetails: async (request: Request, h: ResponseToolkit) => {
  const parsed = getGroupDetailsValidation.safeParse({
    params: request.params,
  });

  if (!parsed.success) {
    return h
      .response({
        statusCode: 400,
        message: parsed.error.issues[0]?.message || "Invalid roomId",
      })
      .code(400);
  }

  try {
    const data = await getGroupDetailsOperation(parsed.data.params.roomId);

    if (!data) {
      return h
        .response({
          statusCode: 404,
          message: "Group not found",
        })
        .code(404);
    }

    return h
      .response({
        statusCode: 200,
        message: "Group details fetched successfully",
        data,
      })
      .code(200);
  } catch (error: any) {
    console.error("getGroupDetailsHandler error:", error);

    return h
      .response({
        statusCode: 500,
        message: error?.message || "Internal Server Error",
      })
      .code(500);
  }
},

getGlobalChatGroups: async (request: Request, h: ResponseToolkit) => {
 
  try {
    const data = await getGlobalChatGroupsOperation({});

    if (!data) {
      return h
        .response({
          statusCode: 404,
          message: "Group not found",
        })
        .code(404);
    }

    return h
      .response({
        statusCode: 200,
        message: "Group details fetched successfully",
        data,
      })
      .code(200);
  } catch (error: any) {
    console.error("getGroupDetailsHandler error:", error);

    return h
      .response({
        statusCode: 500,
        message: error?.message || "Internal Server Error",
      })
      .code(500);
  }
},

getRoomMessages: async (request: Request, h: ResponseToolkit) => {
  const parsed = getRoomMessagesValidation.safeParse({
    params: request.params,
    query: request.query,
  });

  console.log("RAW REQUEST QUERY:", request.query);
  console.log(
    "PARSED QUERY:",
    parsed.success ? parsed.data.query : parsed.error
  );

  if (!parsed.success) {
    return h
      .response({
        statusCode: 400,
        message:
          parsed.error.issues[0]?.message ||
          "Invalid request parameters",
      })
      .code(400);
  }

  try {
    const roomId = parsed.data.params.roomId;
    const page = parsed.data.query.page;
    const limit = parsed.data.query.limit;

    // Get userId from validated query parameter
    const userId = parsed.data.query.userId;

    console.log("getRoomMessages request", {
      roomId,
      page,
      limit,
      userId,
      hasUserId: Boolean(userId),
    });

    const data = await getRoomMessagesOperation({
      roomId,
      userId,
      all: parsed.data.query.all,
      page,
      limit,
    });

    if ("userNotFound" in data) {
      return h
        .response({
          statusCode: 404,
          message: "Tenant user not found",
        })
        .code(404);
    }

    if ("forbidden" in data) {
      return h
        .response({
          statusCode: 403,
          message: "User is not a member of this room",
        })
        .code(403);
    }

    if ("roomNotFound" in data) {
      return h
        .response({
          statusCode: 404,
          message: "Chat room not found",
        })
        .code(404);
    }

    return h
      .response({
        statusCode: 200,
        message: "Chat messages fetched successfully",
        data,
      })
      .code(200);
  } catch (error: any) {
    console.error("getRoomMessagesHandler error:", error);

    return h
      .response({
        statusCode: 500,
        message: error?.message || "Internal Server Error",
      })
      .code(500);
  }
},

getSeenUsers: async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = GetSeenUsersValidation.safeParse({
      params: request.params,
    });

    if (!parsed.success) {
      throwError(parsed.error.errors[0].message, 400);
    }
      
    const payload = parsed?.data?.params as any;

    const result = await getSeenUsersService(
      payload.messageId,
      payload.currentUserId
    );

    return h
      .response({
        success: true,
        message: tenantChatMessages.GET_SEEN_USERS_SUCCESS,
        data: result,
      })
      .code(200);

  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
},
deleteRoom: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = DeleteChatRoomValidation.safeParse({
        params: request.params,
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }
      
      const payload = parsed?.data as any;

      const { roomId } = payload.params;
      const { deletedBy } = payload.payload;

      const result = await deleteChatRoomService({
        roomId,
        deletedBy,
      });

      return h
        .response({
          success: true,
          message: "Chat room deleted successfully",
          data: result,
        })
        .code(200);

    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },

   clearChat: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = ClearChatValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const payload = parsed?.data?.payload as any;
      const result = await clearChatService(payload);

      return h
        .response({
          success: true,
          message: "Chat cleared successfully",
          data: result,
        })
        .code(200);
    } catch (err: any) {
      return h
        .response({
          success: false,
          message: err.message || "Internal Server Error",
          errorCode: err.statusCode || 500,
        })
        .code(err.statusCode || 500);
    }
  },
  deleteForEveryone: async (request: Request, h: ResponseToolkit) => {
  try {
   
      const parsed = GetDeleteMessageValidation.safeParse({
      params: request.params,
    });

    if (!parsed.success) {
      throwError(parsed.error.errors[0].message, 400);
    }
      
    const payload = parsed?.data?.params as any;

    const result = await deleteMessageForEveryoneService({
      messageId: payload.messageId,
      userId: payload.userId
    });

    return h.response({
      success: true,
      message: "Message deleted for everyone",
      data: result,
    }).code(200);

  } catch (err: any) {
    return h.response({
      success: false,
      message: err.message,
      errorCode: err.statusCode || 500,
    }).code(err.statusCode || 500);
  }
}

}




