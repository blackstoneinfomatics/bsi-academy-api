import { Request,ResponseToolkit } from "@hapi/hapi";
import { throwError } from "../../helpers/throwError";
import {
  createChatRoom,
  getChatRoomsOperation,
  getGroupDetailsOperation,
} from "../../operations/tenantChat";
import { tenantChatMessages } from "../../config/messages";
import { z } from "zod";
import { ChatRoomType } from "../../shared/enum";
import { TenantChatRoomValidation } from "../../models/tenantChatRoom";

export const createChatRoomValidation = z.object({
  payload: TenantChatRoomValidation.pick({
    type:true,
    tenantIds: true,
    name: true,
    planName: true,
    description: true,
    createdBy:true
  }),
});

export const getGroupDetailsValidation = z.object({
  params: z.object({
    roomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid roomId"),
  }),
});

export const getChatRoomsValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    tab: z.enum(["all", "read", "unread", "group"]).default("all"),
    search: z.string().optional(),
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

getChatRooms : async (
  request: Request,
  h: ResponseToolkit
) => {
  try {
    const parsedQuery = getChatRoomsValidation.safeParse({
      query: request.query,
    });

    if (!parsedQuery.success) {
      return h
        .response({
          statusCode: 400,
          message: parsedQuery.error.issues[0]?.message || "Invalid query parameters",
        })
        .code(400);
    }

    const { page, limit, tab, search } = parsedQuery.data.query;

    const credentials = request.auth.credentials as {
      userId?: string;
      sub: string;
      tenantId: string;
    };
    const userId = credentials?.userId ?? credentials?.sub;
    const tenantId = credentials?.tenantId;

    const result = await getChatRoomsOperation({
      userId,
      tenantId,
      page,
      limit,
      tab,
      search
    });

    return h
      .response({
        statusCode: 200,
        message: "Chat rooms fetched successfully",
        data: result
      })
      .code(200);

  } catch (error: any) {
    console.error(
      "getChatRoomsHandler error:",
      error
    );

    return h
      .response({
        statusCode: 500,
        message: error?.message || "Internal Server Error"
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

}




