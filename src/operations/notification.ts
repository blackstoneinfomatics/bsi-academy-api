import { Types } from "mongoose";
import { z } from "zod";
import AppLogger from "../helpers/logging";
import notification, { zodnotificationSchema } from "../models/notification";
import { getIO } from "../shared/socket";
import { INotification } from "../../types/models.types";
import { appStatus, notificationStatus } from "../config/messages";
import TrialMemberModel from "../models/trailmember";
import users from "../models/users";
import roleAccess from "../models/roleacces";
import TenantModel from "../models/tenants";

export interface NotificationIdentity {
  databaseId: string;
  tenantId: string;
  userId: string;
  userName: string;
  email: string;
  role: string[];
}

export class NotificationAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationAuthorizationError";
  }
}

export const resolveNotificationIdentity = async (
  credentials: unknown
): Promise<NotificationIdentity | null> => {
  if (!credentials || typeof credentials !== "object") {
    return null;
  }

  const claims = credentials as Record<string, unknown>;
  const { sub } = claims;

  if (typeof sub !== "string" || !sub.trim()) {
    return null;
  }

  const [tenantUser, trialMember] = await Promise.all([
    users.findOne({
      userId: sub,
      status: appStatus.ACTIVE,
    })
      .select("tenantId userId userName email role")
      .lean(),

    TrialMemberModel.findOne({
      userId: sub,
      status: appStatus.ACTIVE,
    })
      .select("tenantId userId userName email role")
      .lean(),
  ]);

  if (tenantUser && trialMember) {
    throw new NotificationAuthorizationError(
      "User identity matches multiple account records"
    );
  }

  const account = tenantUser || trialMember;

  if (
    !account ||
    typeof account.userId !== "string" ||
    typeof account.tenantId !== "string" ||
    typeof account.userName !== "string" ||
    typeof account.email !== "string" ||
    !Array.isArray(account.role)
  ) {
    return null;
  }

  return {
    databaseId: account.userId,
    tenantId: account.tenantId,
    userId: account.userId,
    userName: account.userName,
    email: account.email,
    role: account.role,
  };
};

// const hasMessagesWritePermission = (roleAccess: unknown): boolean => {
//   if (!roleAccess || typeof roleAccess !== "object") {
//     return false;
//   }

//   return Object.values(
//     roleAccess as Record<string, unknown>
//   ).some((moduleGroup) => {
//     if (!moduleGroup || typeof moduleGroup !== "object") {
//       return false;
//     }

//     const messages = (
//       moduleGroup as Record<string, unknown>
//     ).messages;

//     return (
//       !!messages &&
//       typeof messages === "object" &&
//       (messages as Record<string, unknown>).write === true
//     );
//   });
// };


export const assertCanNotifyRecipients = async (
  sender: NotificationIdentity,
  receiverIds: string[]
): Promise<void> => {
  const isSuperAdmin = sender.role.some(
    (role) => role.toUpperCase() === "SUPERADMIN"
  );

  // Non-Super Admin must pass the existing RBAC permission check.
  // if (!isSuperAdmin) {
  //   const access = await roleAccess
  //     .findOne({
  //       employeeId: sender.databaseId,
  //       tenantId: sender.tenantId,
  //     })
  //     .select("designation roleAccess")
  //     .lean();

  //   if (
  //     !access ||
  //     !Array.isArray(access.designation) ||
  //     !sender.role.some((role) =>
  //       access.designation.includes(role)
  //     ) ||
  //     !hasMessagesWritePermission(access.roleAccess)
  //   ) {
  //     throw new NotificationAuthorizationError(
  //       "Sender does not have permission to send notifications"
  //     );
  //   }
  // }

  // Verify recipients by their actual application userIds.
  // Super Admin can notify across tenants.
  const recipientFilter = {
    status: appStatus.ACTIVE,
    userId: { $in: receiverIds },
  };

  const [tenantUsers, trialMembers] = await Promise.all([
    users
      .find(recipientFilter)
      .select("userId tenantId")
      .lean(),

    TrialMemberModel
      .find(recipientFilter)
      .select("userId tenantId")
      .lean(),
  ]);

  const allRecipients = [...tenantUsers, ...trialMembers];

  // Reject ambiguous userIds found in both collections.
const matchingAccounts = allRecipients.filter(
  (user) =>
    typeof user.userId === "string" &&
    receiverIds.includes(user.userId)
);
const accountCounts = new Map<string, number>();

for (const user of matchingAccounts) {
  const userId = user.userId;

  if (typeof userId !== "string" || !userId) {
    continue;
  }

  accountCounts.set(
    userId,
    (accountCounts.get(userId) ?? 0) + 1
  );
}

  const invalidIds = receiverIds.filter(
    (receiverId) => accountCounts.get(receiverId) !== 1
  );

  if (invalidIds.length > 0) {
    throw new NotificationAuthorizationError(
      `Recipients are missing, inactive, or ambiguous: ${invalidIds.join(", ")}`
    );
  }

  // Non-Super Admin can notify only users in their own tenant.
  if (!isSuperAdmin) {
    const invalidTenantIds = matchingAccounts
      .filter((user) => user.tenantId !== sender.tenantId)
      .map((user) => user.userId);

    if (invalidTenantIds.length > 0) {
      throw new NotificationAuthorizationError(
        `Recipients are not authorized in the sender's tenant: ${invalidTenantIds.join(", ")}`
      );
    }
  }
};



export type NotificationDispatchContext =
  | {
      kind: "authenticated";
      credentials: unknown;
    }
  | {
      kind: "system";
    };

const sendNotificationInputSchema = z
  .object({
    receiverId: z.union([
      z.string().min(1),
      z.array(z.string().min(1)).min(1),
    ]),
    notificationType: z.string().min(1),
    messages: z.string().min(1),
    title: z.string().optional(),
    requestId: z.string().min(1).optional(),
    actionUrl: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const sendNotification = async (
  rawData: unknown,
  context: NotificationDispatchContext = { kind: "system" }
) => {
  try {
    const input = sendNotificationInputSchema.parse(rawData);
    const effectiveContext: NotificationDispatchContext =
      context.kind === "system"
        ? {
            kind: "system",
          }
        : context;

    const systemSender =
      effectiveContext.kind === "system"
        ? {
            senderId: typeof input.senderId === "string" ? input.senderId : "system",
            senderTenantId:
              typeof input.senderTenantId === "string" && input.senderTenantId.trim()
                ? input.senderTenantId
                : "system",
            senderName:
              typeof input.senderName === "string" && input.senderName.trim()
                ? input.senderName
                : "System",
            senderEmail:
              typeof input.senderEmail === "string" && input.senderEmail.trim()
                ? input.senderEmail
                : "system@local",
          }
        : null;

    const sender =
      effectiveContext.kind === "authenticated"
        ? await resolveNotificationIdentity(effectiveContext.credentials)
        : null;

    if (effectiveContext.kind === "authenticated" && !sender) {
      throw new NotificationAuthorizationError(
        "Could not resolve authenticated sender"
      );
    }

    if (
      systemSender &&
      (
        typeof systemSender.senderId !== "string" ||
        typeof systemSender.senderTenantId !== "string" ||
        typeof systemSender.senderName !== "string" ||
        typeof systemSender.senderEmail !== "string"
      )
    ) {
      throw new Error(
        "System notifications require senderId, senderTenantId, senderName and senderEmail"
      );
    }

    const receiverIds = [
      ...new Set(
        Array.isArray(input.receiverId)
          ? input.receiverId
          : [input.receiverId]
      ),
    ];

    // Find recipients by their actual userId.
    const recipientFilter = {
      status: appStatus.ACTIVE,
      userId: { $in: receiverIds },
    };

    const [tenantUsers, trialMembers] = await Promise.all([
      users.find(recipientFilter)
        .select("_id userId tenantId userName email")
        .lean(),
      TrialMemberModel.find(recipientFilter)
        .select("_id userId tenantId userName email")
        .lean(),
    ]);

    const recipientMap = new Map<
      string,
      {
        userId: string;
        tenantId: string;
        userName: string;
        email: string;
      }
    >();

    for (const recipient of [...tenantUsers, ...trialMembers]) {
      if (
        typeof recipient.userId !== "string" ||
        typeof recipient.tenantId !== "string" ||
        typeof recipient.userName !== "string" ||
        typeof recipient.email !== "string"
      ) {
        continue;
      }

      if (recipientMap.has(recipient.userId)) {
        throw new NotificationAuthorizationError(
          `Ambiguous recipient identity: ${recipient.userId}`
        );
      }

      recipientMap.set(recipient.userId, {
        userId: recipient.userId,
        tenantId: recipient.tenantId,
        userName: recipient.userName,
        email: recipient.email,
      });
    }

    const missingRecipients = receiverIds.filter(
      (id) => !recipientMap.has(id)
    );

    if (missingRecipients.length > 0) {
      throw new NotificationAuthorizationError(
        `Active recipients not found: ${missingRecipients.join(", ")}`
      );
    }

    // Authenticated senders must pass the existing permission check.
    if (sender) {
      await assertCanNotifyRecipients(sender, receiverIds);
    }

    const savedNotifications: INotification[] = [];
    const errors: string[] = [];
    let duplicateCount = 0;

    for (const receiverId of receiverIds) {
      const recipient = recipientMap.get(receiverId);

      if (!recipient) {
        errors.push(`Recipient not found: ${receiverId}`);
        continue;
      }

      // Authenticated users can only send within the scope allowed
      // by the existing authorization function.
      const senderDetails = sender
        ? {
            senderId: sender.userId,
            senderTenantId: sender.tenantId,
            senderName: sender.userName,
            senderEmail: sender.email,
          }
        : systemSender!;

      const individualData = {
        tenantId: recipient.tenantId,

        ...senderDetails,

        receiverId: recipient.userId,
        receiverTenantId: recipient.tenantId,
        receiverName: recipient.userName,
        receiverEmail: recipient.email,

        title:
          typeof input.title === "string"
            ? input.title
            : undefined,

        ...(input.requestId
          ? { requestId: input.requestId }
          : {}),

        messages: input.messages,
        notificationType: input.notificationType,
        notificationStatus: notificationStatus.UN_SEEN,
        isRead: false,

        ...(input.actionUrl
          ? { actionUrl: input.actionUrl }
          : {}),

        ...(input.metadata
          ? { metadata: input.metadata }
          : {}),

        createdDate: new Date(),
      };

      try {
        const payload = zodnotificationSchema.parse(individualData);
        const saved = await new notification(payload).save();

        savedNotifications.push(saved);

        try {
          getIO()
            .to(recipient.userId)
            .emit("notification", saved);
        } catch (error) {
          const message = (error as Error).message;

          errors.push(
            `Notification saved, but delivery failed for ${receiverId}: ${message}`
          );

          AppLogger.error(
            `Socket.IO delivery failed for ${receiverId}: ${message}`
          );
        }
      } catch (error) {
        if ((error as { code?: number }).code === 11000) {
          duplicateCount++;
          continue;
        }

        const message = (error as Error).message;

        errors.push(
          `Notification failed for ${receiverId}: ${message}`
        );

        AppLogger.error(
          `Notification failed for ${receiverId}: ${message}`
        );
      }
    }

    return {
      success:
        savedNotifications.length > 0 ||
        (errors.length === 0 && duplicateCount > 0),
      data: savedNotifications,
      duplicateCount,
      ...(errors.length > 0 ? { errors } : {}),
    };
  } catch (error) {
    if (error instanceof NotificationAuthorizationError) {
      throw error;
    }

    const message = (error as Error).message;

    AppLogger.error(`Notification error: ${message}`);

    return {
      success: false,
      data: [],
      error: message,
    };
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
const buildRecipientFilter = (
  receiverIds: string[],
  tenantId: string
) => ({
  receiverId: { $in: receiverIds },
  receiverTenantId: tenantId,
});

export default async function getAllNotification(
  receiverIds: string[],
  tenantId: string
) {
  try {
    const filter = buildRecipientFilter(receiverIds, tenantId);

    console.info("[notifications:get-all] Query started", {
      tenantId,
      receiverCount: receiverIds.length,
    });

    const [notifications, totalCount, unreadCount] = await Promise.all([
      notification.find(filter).sort({ createdDate: -1 }),
      notification.countDocuments(filter),
      notification.countDocuments({ ...filter, isRead: false }),
    ]);

    console.info("[notifications:get-all] Query completed", {
      tenantId,
      returnedCount: notifications.length,
      totalCount,
      unreadCount,
    });

    return { notifications, totalCount, unreadCount };
  } catch (error) {
    console.error("[notifications:get-all] Query failed", {
      tenantId,
      receiverCount: receiverIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to fetch notifications: ${(error as Error).message}`);
  }
  
}

export async function getNotificationCardDetails(
  receiverIds: string[],
  tenantId: string
) {
  try {
    const filter = buildRecipientFilter(receiverIds, tenantId);
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );

    const [
      totalNotifications,
      seenNotifications,
      unseenNotifications,
      receivedThisMonth,
    ] = await Promise.all([
      notification.countDocuments(filter),
      notification.countDocuments({ ...filter, isRead: true }),
      notification.countDocuments({ ...filter, isRead: false }),
      notification.countDocuments({
        ...filter,
        createdDate: { $gte: monthStart, $lt: nextMonthStart },
      }),
    ]);

    return {
      totalNotifications,
      seenNotifications,
      unseenNotifications,
      receivedThisMonth,
    };
  } catch (error) {
    console.error("[notifications:get-card-details] Query failed", {
      tenantId,
      receiverCount: receiverIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to fetch notification card details: ${(error as Error).message}`
    );
  }
}

export async function getNotificationRequestList(
  receiverIds: string[],
  tenantId: string
) {
  try {
    const filter = buildRecipientFilter(receiverIds, tenantId);
    const [notifications, totalCount, unreadCount] = await Promise.all([
      notification.find(filter).sort({ createdDate: -1 }).lean(),
      notification.countDocuments(filter),
      notification.countDocuments({ ...filter, isRead: false }),
    ]);

    const senderTenantCodes = [
      ...new Set(notifications.map((item) => item.senderTenantId)),
    ];
    const tenants = senderTenantCodes.length
      ? await TenantModel.find({
          tenantCode: { $in: senderTenantCodes },
        })
          .select("tenantCode tenantName")
          .lean()
      : [];
    const tenantNames = new Map(
      tenants.map((tenant) => [tenant.tenantCode, tenant.tenantName])
    );

    const requestList = notifications.map((item) => {
      const metadataRequestId = item.metadata?.requestId;
      return {
        requestId:
          item.requestId ??
          (typeof metadataRequestId === "string" ? metadataRequestId : null),
        tenantName: tenantNames.get(item.senderTenantId) ?? null,
        notificationCategory: item.title || item.notificationType,
        description: item.messages,
        receivedDate: item.createdDate ?? null,
        seenDate: item.readAt ?? null,
      };
    });

    return { notifications: requestList, totalCount, unreadCount };
  } catch (error) {
    console.error("[notifications:get-request-list] Query failed", {
      tenantId,
      receiverCount: receiverIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to fetch notification requests: ${(error as Error).message}`
    );
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












  