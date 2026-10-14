import { Request, ResponseToolkit } from "@hapi/hapi";
import { tenantChatMessages } from "../../config/messages";
import { throwError } from "../../helpers/throwError";
import { z } from "zod";
import { ChatRoomType,ChatSource } from "../../shared/enum";
import { createChatRoomService,getChatRoomsService,getGroupDetailsOperation,sendUserMessageService } from "../../operations/userChat";
import {UserChatMessageValidation} from  "../../models/userChatMessage";
import {sendMessageService} from "../../operations/tenantChat";


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
  getGroupDetails: async (request: Request, h: ResponseToolkit) => {
    const parsed = getGroupDetailsValidation.safeParse({
      params: request.params,
    });
  
    if (!parsed.success) {
         throwError(parsed.error.errors[0].message, 400);
    }

    const payload = parsed?.data?.params as any;
  
    try {
      const data = await getGroupDetailsOperation(payload.roomId , payload.source);
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
};
