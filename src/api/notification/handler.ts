import { ResponseToolkit , Request} from "@hapi/hapi";
import getAllNotification, { getNotificationsByNotificationId, updateNotification} from "../../operations/notification";
import { Types } from "mongoose";
import { zodnotificationSchema } from "../../models/notification";
import { z } from "zod";
import { isNil } from "lodash";
import { notificationsMessages } from "../../config/messages";
import { notFound } from "@hapi/boom";
import UserModel from "../../models/users";
import TrialMemberModel from "../../models/trailmember";
import { appStatus } from "../../config/messages";
import AppLogger from "../../helpers/logging";


const getAuthenticatedRecipientScope = async (req: Request) => {
  const credentials = req.auth?.credentials as
    | {
        sub?: string;
        tenantId?: string;
      }
    | null
    | undefined;

  if (!credentials) {
    AppLogger.info(
      "[notification] Authenticated credential claim keys: none"
    );
    return null;
  }

  const credentialClaims = credentials as Record<string, unknown>;
  const claimKeys = Object.keys(credentialClaims);
  AppLogger.info(
    `[notification] Authenticated credential claim keys: ${claimKeys.join(",")}`
  );

  const { sub, tenantId } = credentialClaims;
  if (typeof sub !== "string" || typeof tenantId !== "string") {
    return null;
  }

  const receiverIds = new Set<string>([sub]);

  if (Types.ObjectId.isValid(sub)) {
    const [user, trialMember] = await Promise.all([
      UserModel.findOne({
        _id: sub,
        tenantId,
        status: appStatus.ACTIVE,
      })
        .select("userId")
        .lean(),

      TrialMemberModel.findOne({
        _id: sub,
        tenantId,
        status: appStatus.ACTIVE,
      })
        .select("userId")
        .lean(),
    ]);

    if (user?.userId) {
      receiverIds.add(user.userId);
    }

    if (trialMember?.userId) {
      receiverIds.add(trialMember.userId);
    }
  }

  return {
    tenantId,
    receiverIds: [...receiverIds],
  };
};


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
      const scope = await getAuthenticatedRecipientScope(req);
  
      if (!notificationId) {
        return h.response({ success: false, message: "Receiver ID is required" }).code(400);
      }
      if (!scope || !Types.ObjectId.isValid(notificationId)) {
        return h.response({ success: false, message: "Notification not found" }).code(404);
      }
  
      const { notifications, totalCount } =
        await getNotificationsByNotificationId(
          notificationId,
          scope.receiverIds,
          scope.tenantId
        );
      if (!notifications) {
        return h.response({ success: false, message: "Notification not found" }).code(404);
      }

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
  try {
    const scope = await getAuthenticatedRecipientScope(req);
    if (!scope) {
      return h.response({ success: false, message: "Invalid authentication credentials" }).code(401);
    }
    const notifications = await getAllNotification(
      scope.receiverIds,
      scope.tenantId
    );
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
  const scope = await getAuthenticatedRecipientScope(req);

  // Check if notificationId is a valid ObjectId
  if (!Types.ObjectId.isValid(notificationId) || !scope) {
    return h.response({ message: "Invalid notification ID format" }).code(400);
  }

  // Validate payload
  const { payload } = updateInputValidation.parse({
    payload: req.payload,
  });

  const result = await updateNotification(
    notificationId,
    payload,
    scope.receiverIds,
    scope.tenantId
  );

  if (isNil(result)) {
    return notFound(notificationsMessages.USER_NOT_FOUND);
  }

  return result;
}


}


