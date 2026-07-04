import {getIO } from "../shared/socket";
import { RealTimeMessage } from "../../types/models.types";
import realtimemessage from "../models/realtimemessage";
import { PipelineStage } from "mongoose";
import AppLogger from "../helpers/logging";

// Send + Save message
export const sendMessageOperation = async (
  payload: Partial <RealTimeMessage>
): Promise<{ realtimemessage: RealTimeMessage } | { error: any }> => {
    try {
      // Create a new message instance with the provided payload
      const newMessage = new realtimemessage({
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
        createdDate: payload.createdDate ?? new Date(),
        createdBy: payload.createdBy ?? '', // Default value if optional
        updatedDate: payload.updatedDate ?? new Date(),
        updatedBy: payload.updatedBy ?? '', // Default value if optional
      });
  
      // Save the message to the database
      const savedMessage = await newMessage.save();
  
       const io = getIO();
    io.to(newMessage.receiverId).emit("newmessage", savedMessage);
    AppLogger.info(`Notification(s) sent: ${JSON.stringify(savedMessage)}`);
      // Return the saved message
      return {realtimemessage : savedMessage };
    } catch (error) {
      // Log and throw an error if something goes wrong
      console.error("Error saving message:", error);
      throw new Error("Failed to send message: " + error);
    }
  };


  export const getMessagesGroupedByDateTimeOperation = async (
  senderId: string,
  receiverId: string
) => {
  try {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { senderId: senderId, receiverId: receiverId },
            { senderId: receiverId, receiverId: senderId }
          ]
        }
      },
      {
        $sort: { createdDate: -1 }
      },
      {
        $addFields: {
          dateOnly: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdDate" }
          },
          timeOnly: {
            $dateToString: { format: "%H:%M", date: "$createdDate" }
          }
        }
      },
      {
        $group: {
          _id: "$dateOnly",
          messages: {
            $push: {
              _id: "$_id",
              messages: "$messages",
              senderId: "$senderId",
              senderName: "$senderName",
              receiverId: "$receiverId",
              receiverName: "$receiverName",
              createdDate: "$createdDate",
              time: "$timeOnly",
              notificationStatus: "$notificationStatus",
              isRead: "$isRead",
              status: "$status"
            }
          }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ];

    const result = await realtimemessage.aggregate(pipeline);
    return result;
  } catch (error) {
    console.error("[ERROR] Failed to fetch grouped messages:", error);
    throw error;
  }
};