// services/notification.service.ts
import { Types } from "mongoose";
import AppLogger from "../helpers/logging";
import notification, { zodnotificationSchema } from "../models/notification";
import {getIO } from "../shared/socket";
import { INotification } from "../../types/models.types";


//Create Notification //


export const sendNotification = async (rawData: any) => {
  try {
    // Extract receivers if array, else treat as one
    const receiverIds = Array.isArray(rawData.receiverId) ? rawData.receiverId : [rawData.receiverId];
    const receiverNames = Array.isArray(rawData.receiverName) ? rawData.receiverName : [rawData.receiverName];
    const receiverEmails = Array.isArray(rawData.receiverEmail) ? rawData.receiverEmail : [rawData.receiverEmail];

    const savedNotifications = [];

    for (let i = 0; i < receiverIds.length; i++) {
      const individualData = {
        ...rawData,
        receiverId: receiverIds[i],
        receiverName: receiverNames[i],
        receiverEmail: receiverEmails[i],
      };

      const payload = zodnotificationSchema.parse(individualData); // ✅ Validate individual
      const notificationData = new notification(payload);
      const saved = await notificationData.save();
      savedNotifications.push(saved);

      // Emit via WebSocket
      const io = getIO();
      io.to(payload.receiverId).emit("notification", saved);
    }

    AppLogger.info(`Notification(s) sent: ${JSON.stringify(savedNotifications)}`);
    return { success: true, data: savedNotifications };
  } catch (err: any) {
    AppLogger.error(`Notification error: ${JSON.stringify(err.errors ?? err.message)}`);
    return { success: false, error: err.message };
  }
};



export const getNotificationsByNotificationId = async (notificationId: string) => {
  try {
    const [notifications, totalCount] = await Promise.all([
      notification.findOne({ _id: new Types.ObjectId(notificationId) }).lean(),
      notification.countDocuments({ _id: new Types.ObjectId(notificationId) }),
    ]);
    return { notifications, totalCount };
  } catch (error) {
    throw new Error(`Failed to fetch notifications: ${(error as Error).message}`);
  }
};

/**
 * Retrieves all meeting records with optional filters.
 */
export default async function getAllNotification(receiverId?: string) {
  try {
    const filter = receiverId ? { receiverId } : {};

    const [notifications, totalCount] = await Promise.all([
      notification.find(filter).sort({ createdDate: -1 }),
      notification.countDocuments(filter),
    ]);

    return { notifications, totalCount };
  } catch (error) {
    throw new Error(`Failed to fetch notifications: ${(error as Error).message}`);
  }
  
}

/**
 * Updates a notification by its ID.
 * @param {string} id - The unique ID of the notification to update.
 * @param {Partial<INotification>} payload - The fields to update.
 * @returns {Promise<INotification | null>} - The updated notification or null if not found.
 */

export const updateNotification = async (
  id: string,
  payload: Partial<INotification>
): Promise<INotification | null> => {

  return notification.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    { $set: payload },
    { new: true }
  ).lean() as unknown as INotification | null;
};












  