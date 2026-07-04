import { ResponseToolkit , Request} from "@hapi/hapi";
import getAllNotification, { getNotificationsByNotificationId, updateNotification} from "../../operations/notification";
import { Types } from "mongoose";
import { zodnotificationSchema } from "../../models/notification";
import { z } from "zod";
import { isNil } from "lodash";
import { notificationsMessages } from "../../config/messages";
import { notFound } from "@hapi/boom";


// Validation schema for the payload
const updateInputValidation = z.object({
  payload: zodnotificationSchema.pick({
    notificationStatus: true,
    isRead: true,
  }),
});

export default {
 async getNotificationsHandler(req: Request, h: ResponseToolkit){
    try {
      const notificationId = req.params.notificationId;
  
      if (!notificationId) {
        return h.response({ success: false, message: "Receiver ID is required" }).code(400);
      }
  
      const { notifications, totalCount } = await getNotificationsByNotificationId(notificationId);
  
      return h.response({
        success: true,
        data: {
          notifications,
          totalCount,
        },
      }).code(200);
    } catch (error: any) {
      return h.response({
        success: false,
        message: error.message ?? "Failed to fetch notifications",
      }).code(500);
    }
  },
    
// Retrieve all the students list
async getnotificationList(req: Request, h: ResponseToolkit) {
  const receiverId = req.query.receiverId as string | undefined;

  try {
    const notifications = await getAllNotification(receiverId); // pass undefined if not present
    return h
      .response({
        message: 'Notification(s) retrieved successfully',
        data: notifications,
      })
      .code(200);
  } catch (error) {
    return h
      .response({
        error: (error as Error).message || 'Internal Server Error',
      })
      .code(500);
  }
},




async updateNotificationById(req: Request, h: ResponseToolkit) {
  
  const notificationId = String(req.params.notificationId);

  // Check if notificationId is a valid ObjectId
  if (!Types.ObjectId.isValid(notificationId)) {
    return h.response({ message: "Invalid notification ID format" }).code(400);
  }

  // Validate payload
  const { payload } = updateInputValidation.parse({
    payload: req.payload,
  });

  const result = await updateNotification(notificationId, payload);

  if (isNil(result)) {
    return notFound(notificationsMessages.USER_NOT_FOUND);
  }

  return result;
}


}





