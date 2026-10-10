import { Types } from "mongoose";
import { z } from "zod";
import AppLogger from "../helpers/logging";
import notification, { zodnotificationSchema } from "../models/notification";
import { getIO } from "../shared/socket";
import { INotification } from "../../types/models.types";

const sendNotificationInputSchema = z
  .object({
    receiverId: z.union([
      z.string().min(1),
      z.array(z.string().min(1)).min(1),
    ]),
    receiverName: z
      .union([z.string(), z.array(z.string())])
      .optional(),
    receiverEmail: z
      .union([z.string(), z.array(z.string())])
      .optional(),
  })
  .passthrough();

export const sendNotification = async (rawData: unknown) => {
  try {
    const input = sendNotificationInputSchema.parse(rawData);
    const receiverIds = Array.isArray(input.receiverId)
      ? input.receiverId
      : [input.receiverId];
    const receiverNames = Array.isArray(input.receiverName)
      ? input.receiverName
      : [input.receiverName];
    const receiverEmails = Array.isArray(input.receiverEmail)
      ? input.receiverEmail
      : [input.receiverEmail];
    const seenReceiverIds = new Set<string>();
    const savedNotifications: INotification[] = [];
    const errors: string[] = [];
    let duplicateCount = 0;

    for (const [index, receiverId] of receiverIds.entries()) {
      if (seenReceiverIds.has(receiverId)) {
        continue;
      }
      seenReceiverIds.add(receiverId);

      const individualData = {
        ...input,
        receiverId,
        receiverName: receiverNames[index],
        receiverEmail: receiverEmails[index],
      };

      try {
        const payload = zodnotificationSchema.parse(individualData);
        const saved = await new notification(payload).save();
        savedNotifications.push(saved);

        try {
          getIO().to(payload.receiverId).emit("notification", saved);
        } catch (error) {
          const message = (error as Error).message;
          errors.push(`Delivery failed for recipient ${receiverId}: ${message}`);
          AppLogger.error(
            `Notification saved but Socket.IO delivery failed for recipient ${receiverId}: ${message}`
          );
        }
      } catch (error) {
        if ((error as { code?: number }).code === 11000) {
          duplicateCount += 1;
          AppLogger.info(
            `Duplicate notification ignored for recipient ${receiverId}`
          );
          continue;
        }

        const message = (error as Error).message;
        errors.push(`Notification failed for recipient ${receiverId}: ${message}`);
        AppLogger.error(
          `Notification failed for recipient ${receiverId}: ${message}`
        );
      }
    }

    return {
      success: savedNotifications.length > 0 || errors.length === 0,
      data: savedNotifications,
      duplicateCount,
      ...(errors.length > 0 ? { errors } : {}),
    };
  } catch (error) {
    const message = (error as Error).message;
    AppLogger.error(`Invalid notification payload: ${message}`);
    return { success: false, data: [], error: message };
  }
};

export const getNotificationsByNotificationId = async (
  notificationId: string,
  receiverIds: string[],
  tenantId: string
) => {
  try {
    const filter = {
      _id: new Types.ObjectId(notificationId),
      ...buildRecipientFilter(receiverIds, tenantId),
    };
    const notifications = await notification.findOne(filter).lean();
    return { notifications, totalCount: notifications ? 1 : 0 };
  } catch (error) {
    throw new Error(`Failed to fetch notifications: ${(error as Error).message}`);
  }
};

/**
 * Retrieves all meeting records with optional filters.
 */
const buildRecipientFilter = (receiverIds: string[], tenantId: string) => ({
  receiverId: { $in: receiverIds },
  $or: [
    { tenantId },
    { tenantId: { $exists: false } },
    { tenantId: null },
  ],
});

export default async function getAllNotification(
  receiverIds: string[],
  tenantId: string
) {
  try {
    const filter = buildRecipientFilter(receiverIds, tenantId);

    const [notifications, totalCount, unreadCount] = await Promise.all([
      notification.find(filter).sort({ createdDate: -1 }),
      notification.countDocuments(filter),
      notification.countDocuments({ ...filter, isRead: false }),
    ]);

    return { notifications, totalCount, unreadCount };
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
  payload: Partial<INotification>,
  receiverIds: string[],
  tenantId: string
): Promise<INotification | null> => {
  return notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(id),
      ...buildRecipientFilter(receiverIds, tenantId),
    },
    { $set: payload },
    { new: true }
  ).lean();
};












  