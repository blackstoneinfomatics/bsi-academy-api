import { Request, ResponseToolkit } from "@hapi/hapi";
import { tenantChatMessages } from "../../config/messages";
import { throwError } from "../../helpers/throwError";
import { z } from "zod";
import { ChatRoomType,ChatSource } from "../../shared/enum";
import { clearUserChatService, createChatRoomService,deleteUserChatRoomService,getChatRoomsService,getGroupDetailsOperation,getTenantUsersService,getUSerRoomMessagesOperation,getUserSeenUsersService,markUserMessageSeenService,sendUserMessageService, updateUserChatRoomService } from "../../operations/userChat";
import {UserChatMessageValidation} from  "../../models/userChatMessage";
import {sendMessageService} from "../../operations/tenantChat";
import { Query } from "mongoose";
import { sourcerepo } from "googleapis/build/src/apis/sourcerepo";


const chatUserSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
  name: z.string().trim().min(1, "User name is required"),
  role: z.string().trim().min(1, "User role is required"),
  course:z.string().trim().min(1,"User course is required").optional(),
});

const directChatSchema = z.object({
  type: z.literal(ChatRoomType.DIRECT),
  sender: chatUserSchema,
  receivers: z
    .array(chatUserSchema)
    .length(1, "Direct chat must have exactly one receiver"),
});

const groupChatSchema = z.object({
  type: z.literal(ChatRoomType.GROUP),
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(100, "Group name cannot exceed 100 characters"),
  description: z.string().trim().max(500).optional().default(""),
  sender: chatUserSchema,
  receivers: z
    .array(chatUserSchema)
    .min(1, "At least one group member is required")
    .max(100, "A group cannot exceed 100 receivers"),
});

export const createChatRoomValidation = z.object({
  payload: z.discriminatedUnion("type", [directChatSchema, groupChatSchema]),
});

export const getChatRoomsValidation = z.object({
  param:z.object({
     userId : z.string().min(1)
  }),
  query: z.object({
    filter: z.string().trim().min(1).default("ALL"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
  }),
});

export const getTenantUsersValidation = z.object({
   param:z.object({
     source : z.enum([ChatSource.TENANT,ChatSource.SUPER_ADMIN]).default(ChatSource.TENANT),
     roomId: z.string().trim().optional(),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
    role: z.string().trim().min(1, "Role is required"),

    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),

    search: z.string().trim().optional(),
  }),
});
export const SendChatMessageValidation = z.object({
    param:z.object({
     source : z.enum([ChatSource.TENANT,ChatSource.SUPER_ADMIN]).default(ChatSource.TENANT)
  }),
    payload : UserChatMessageValidation.pick({
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
});
export const getGroupDetailsValidation = z.object({
  params: z.object({
    roomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid roomId"),
    source : z.enum([ChatSource.TENANT,ChatSource.SUPER_ADMIN]).default(ChatSource.TENANT)
  }),
  query :z.object({
         userId : z.string().min(1)
  })
});
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const DeleteChatRoomValidation = z.object({
  params: z.object({
    roomId: objectId,
  }),
  payload: z.object({
    deletedBy: z.string().min(1),
  }),
});


export const MarkSeenValidation = z.object({
  param:z.object({
        source : z.enum([ChatSource.TENANT,ChatSource.SUPER_ADMIN]).default(ChatSource.TENANT)
  }),
  payload: z.object({
    roomId: objectId,
    messageId: objectId,
    userId: z.string().min(1),
  }),
});


export const getUserRoomMessagesValidation = z.object({
  params: z.object({
    source: z.nativeEnum(ChatSource),
    roomId:  objectId,
  }),
  query: z.object({
    userId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    all: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default("false"),
  }),
});

export const UpdateUserChatRoomValidation = z.object({
  param: z.object({
    source: z.nativeEnum(ChatSource),
    roomId: objectId,
  }),

  payload: z.object({
    addUsers: z
      .array(
        z.object({
          userId: z.string().min(1, "User ID is required"),
          name: z.string().min(1, "Name is required"),
          role: z.string().min(1, "Role is required"),
          course: z.string().nullable().optional(),
        })
      )
      .optional(),

    removeUsers: z
      .array(
        z.object({
          userId: z.string().min(1, "User ID is required"),
        })
      )
      .optional(),

    sendAccess: z.enum(["ADMIN_ONLY", "EVERYONE"]).optional(),

    updatedBy: z.string().min(1, "Updated by is required"),
  }),
});

export const ClearUserChatValidation = z.object({
 param: z.object({
    source: z.nativeEnum(ChatSource),
  }),
  payload: z.object({
    roomId: objectId,
    userId: z.string().min(1),
  }),
});

export const GetSeenUsersValidation = z.object({
  params: z.object({
    source : z.enum([ChatSource.TENANT,ChatSource.SUPER_ADMIN]).default(ChatSource.TENANT),
    messageId: objectId,
    currentUserId: z.string().min(1),
  }),
});

export default {
  createChatRoom: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = createChatRoomValidation.safeParse({
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const payload = parsed.data?.payload as any;

      const tenantId = request.headers["tenantid"];

      if (typeof tenantId !== "string" || !tenantId.trim()) {
        throwError("Tenant ID is required in headers", 400);
      }

      const result = await createChatRoomService({...payload,tenantId:tenantId});

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
  getChatRooms : async (
  request: Request,
  h: ResponseToolkit,
) => {
  try {
    const parsed = getChatRoomsValidation.safeParse({
      param:request.params,
      query: request.query,
    });

    if (!parsed.success) {
      throwError(parsed.error.issues[0].message, 400);
    }

    const userId = parsed.data?.param?.userId as string;
    const tenantId = request.headers.tenantid as string;

    if (!userId) {
      throwError("Unauthorized", 401);
    }

    if (!tenantId?.trim()) {
      throwError("Tenant ID is required", 400);
    }

    const result = await getChatRoomsService({
      userId,
      tenantId,
      ...parsed?.data?.query as any,
    });

    return h
      .response({
        success: true,
        message: tenantChatMessages.GET_CHAT_ROOMS_SUCCESS,
        data: result,
      })
      .code(200);
  } catch (error: any) {
    if (error?.statusCode) {
      throw error;
    }

    request.log(
      ["error", "chat", "getChatRooms"],
      error,
    );

    return h
      .response({
        success: false,
        message: "Failed to fetch chat rooms",
      })
      .code(500);
  }
},
sendMessage: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = SendChatMessageValidation.safeParse({
        param:request.params,
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }
      
    const payload = parsed?.data?.payload as any;
    const source = parsed?.data?.param.source as any;

    let result : any ;

     if (source === ChatSource.SUPER_ADMIN) {
      result = await sendMessageService(payload);
    } else {
      result = await sendUserMessageService(payload);
    }

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
   markSeen: async (request: Request, h: ResponseToolkit) => {
      try {
        const parsed = MarkSeenValidation.safeParse({
          param:request.params,
          payload: request.payload,
        });
  
        if (!parsed.success) {
          throwError(parsed.error.errors[0].message, 400);
        }
  
        const payload = parsed?.data?.payload as any;
        const source = parsed?.data?.param?.source as any;
  
        const result = await markUserMessageSeenService({source,...payload});
  
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

 updateChatRoom: async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = UpdateUserChatRoomValidation.safeParse({
  payload: request.payload,
  param:request.params,
});

if (!parsed.success) {
  throwError(parsed.error.errors[0].message, 400);
  return;
}

  const param = parsed?.data?.param as any;

const { payload } = parsed?.data as any;

const result = await updateUserChatRoomService({
  ...payload,
  ...param, 
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

  getGroupDetails: async (request: Request, h: ResponseToolkit) => {
    const parsed = getGroupDetailsValidation.safeParse({
      params: request.params,
   query:request.query
    });
  
    if (!parsed.success) {
         throwError(parsed.error.errors[0].message, 400);
    }

    const payload = parsed?.data?.params as any;
    const query = parsed?.data?.query as any;
  
    try {
      const data = await getGroupDetailsOperation(payload.roomId , payload.source , query.userId);
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
  const parsed = getUserRoomMessagesValidation.safeParse({
    params: request.params,
    query: request.query,
  });

   if (!parsed.success) {
          throwError(parsed.error.errors[0].message, 400);
        }

  try {
    const { source, roomId } = parsed?.data?.params as any;
    const { page, limit, userId, all } = parsed?.data?.query as any;

    const data = await getUSerRoomMessagesOperation({
      source,
      roomId,
      userId,
      all,
      page,
      limit,
    });

    return h
      .response({
        statusCode: 200,
        message: tenantChatMessages.GET_MESSAGES_SUCCESS,
        data,
      })
      .code(200);
  } catch (error: any) {
    console.error("getRoomMessagesHandler error:", error);

    return h
      .response({
        statusCode: 500,
        message: "Internal Server Error",
      })
      .code(500);
  }
},

  getTenantUsersByGroup : async (
  request: Request,
  h: ResponseToolkit,
) => {
  try {
    const parsed = getTenantUsersValidation.safeParse({
      param : request.params,
      query: request.query,
    });

    if (!parsed.success) {
      throwError(parsed.error.issues[0].message, 400);
    }

    const query = parsed?.data?.query as any;
    const param = parsed?.data?.param as any;

    const result = await getTenantUsersService({...param,...query});

    return h
      .response({
        success: true,
        message: result?.message ?? "Tenant users fetched successfully",
        data: result?.data,
      })
      .code(result?.statusCode ?? 200);
  } catch (error: any) {
    if (error?.statusCode) {
      throw error;
    }

    request.log(["error", "getTenantUsers"], error);

    return h
      .response({
        success: false,
        message: "Internal Server Error",
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

    const result = await getUserSeenUsersService(
      payload.messageId,
      payload.currentUserId,
      payload.source
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

 clearChat: async (request: Request, h: ResponseToolkit) => {
    try {
      const parsed = ClearUserChatValidation.safeParse({
        param:request.params,
        payload: request.payload,
      });

      if (!parsed.success) {
        throwError(parsed.error.errors[0].message, 400);
      }

      const payload = parsed?.data?.payload as any;
      const source = parsed?.data?.param?.source as any;
      const result = await clearUserChatService({source ,...payload});

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

      const result = await deleteUserChatRoomService({
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


};
