import { Request,ResponseToolkit } from "@hapi/hapi";
import { throwError } from "../../helpers/throwError";
import { createChatRoom } from "../../operations/tenantChat";
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
}