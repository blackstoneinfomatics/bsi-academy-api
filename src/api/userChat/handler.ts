import { Request, ResponseToolkit } from "@hapi/hapi";
import { tenantChatMessages } from "../../config/messages";
import { throwError } from "../../helpers/throwError";
import { z } from "zod";
import { ChatRoomType } from "../../shared/enum";
import { createChatRoomService } from "../../operations/userChat";

const chatUserSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
  name: z.string().trim().min(1, "User name is required"),
  role: z.string().trim().min(1, "User role is required"),
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
};
