import { Request, ResponseToolkit } from "@hapi/hapi";
import { zodrealtimemessageSchema } from "../../models/realtimemessage";
import {getMessagesGroupedByDateTimeOperation, sendMessageOperation } from "../../operations/realtimemessage";
import { z } from "zod";



// 🛡️ Payload validation using Zod
const updateInputValidation = z.object({
    payload: zodrealtimemessageSchema.pick({
      messages: true,
      isRead: true,
      senderId: true,
      senderName: true,
      senderEmail: true,
      receiverId: true,
      receiverName: true,
      receiverEmail: true,
      notificationStatus: true,
         status:true,
        createdDate: true,
        createdBy: true,
        updatedDate:true,
        updatedBy: true,
    }),
  });
  
  export default {
    async sendMessageHandler (request: Request, h: ResponseToolkit){
    try {
      // Validate the payload with Zod
      const { payload } = updateInputValidation.parse({ payload: request.payload });
  
      // Map the incoming payload to match the model format if needed
      const messageData = await sendMessageOperation({
        messages: payload.messages,
        isRead: payload.isRead,
        senderId: payload.senderId,
        senderName: payload.senderName,
        senderEmail: payload.senderEmail ?? '', // Ensure a default value for optional fields
        receiverId: payload.receiverId,
        receiverName: payload.receiverName,
        receiverEmail: payload.receiverEmail ?? '', // Ensure a default value for optional fields
        notificationStatus: payload.notificationStatus,
        status: payload.status ?? '', // Default value if optional
        createdDate: new Date(payload.createdDate ?? Date.now()),
        createdBy: payload.createdBy ?? '', // Default value if optional
        updatedDate: new Date(payload.updatedDate ?? Date.now()),
        updatedBy: payload.updatedBy ?? '', // Default value if optional
      });
  
      // Call sendMessageOperation to save the mapped message
     
  
      // Return the response
      return h.response({
        status: "success",
        message: "Message sent successfully",
        data: messageData,
      }).code(201); // Created status code
    } catch (error: any) {
      // Handle errors (validation or database-related)
      console.error("Error during message sending:", error);
  
      return h.response({
        status: "error",
        message: error.message ?? "An unexpected error occurred",
      }).code(400); // Bad request if there's any error
    }
  },

  async getMessagesByUserHandler(request: Request, h: ResponseToolkit) {
    try {
       const { senderId, receiverId } = request.params as { senderId: string; receiverId: string };
      const messages = await getMessagesGroupedByDateTimeOperation(senderId, receiverId);
      return h.response({
        status: "success",
        message: "Fetched all messages",
        data: messages,
      }).code(200);
    } catch (error: any) {
      return h.response({
        status: "error",
        message: error.message,
      }).code(500);
    }
  }
  
};