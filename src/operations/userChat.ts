// services/chat.service.ts

import { randomInt } from "crypto";
import UserChatRoomModel from "../models/userChatRoom";
import {UserRoomMemberModel} from "../models/userChatRoomMember";
import {
  ChatRoomType,
  ChatRoomStatus,
  ChatSendAccess,
  ChatGroupRole,
} from "../shared/enum";
import { throwError } from "../helpers/throwError";
import mongoose from "mongoose";
import TenantChatRoomModel from "../models/tenantChatRoom";
import { TenantRoomMemberModel } from "../models/tenantChatRoomMember";
import {UserChatMessageModel} from "../models/userChatMessage";
import {ChatMessageModel} from "../models/tenantChatMessage";
import course from "../models/course";

interface GetChatRoomsInput {
  userId: string;
  tenantId: string;
  filter: string;
  page: number;
  limit: number;
  search?: string;
}

type ChatSource = "TENANT" | "SUPER_ADMIN";

interface ChatListItem {
  roomId: string;
  roomCode: string;
  type: string;
  source: ChatSource;
  name: string;
  role:string | null;
  course:string | null;
  lastMessage: {
    message: string | null;
    senderName: string | null;
    messageType: string | null;
    createdAt: Date | null;
    isDeleted: boolean;
  };
  lastMessageAt: Date | null;
  unreadCount: number;
  isUnread: boolean;
}

const ACTIVE_MEMBER = {
  isActive: true,
  deletedAt: null,
};

const ACTIVE_ROOM = {
  status: "ACTIVE",
  isEnabled: true,
  deletedAt: null,
};


interface IChatUser {
  userId: string;
  name: string;
  role: string;
  course?:string;
}

interface ICreateChatRoomPayload {
  type: "DIRECT" | "GROUP";
  userId?: string;
  tenantId: string;
  sender: IChatUser;
  receivers: IChatUser[];
  name?: string;
  description?: string;
}
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

async function randomCode(length = 6): Promise<string> {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomInt(CHARSET.length)];
  }
  return result;
}

export const generateRoomCode = async (prefix = 'ROOM'): Promise<string> => {
  return `${prefix}-${await randomCode(6)}`;
};

export const createChatRoomService = async (
  payload: ICreateChatRoomPayload,
) => {
  const {
    type,
    tenantId,
    sender,
    receivers,
  } = payload;

  // 1. Validate required fields
  if (!tenantId) {
    throwError("User ID and tenant ID are required", 400);
  }

  if (!sender?.userId || !sender?.name || !sender?.role) {
    throwError("Valid sender details are required", 400);
  }

  // 2. Validate sender consistency
//   if (sender.userId !== userId) {
//     throwError("Sender user ID does not match payload user ID", 400);
//   }

  if (!Array.isArray(receivers) || receivers.length === 0) {
    throwError("At least one receiver is required", 400);
  }

  // 3. Validate receiver details
  for (const receiver of receivers) {
    if (!receiver.userId || !receiver.name || !receiver.role) {
      throwError("Valid receiver details are required", 400);
    }
  }

  if (receivers.some((receiver) => receiver.userId === sender.userId)) {
    throwError("You cannot add yourself as a receiver", 400);
  }

  const uniqueReceiverIds = new Set(
    receivers.map((receiver) => receiver.userId),
  );

  if (uniqueReceiverIds.size !== receivers.length) {
    throwError("Duplicate receivers are not allowed", 400);
  }

  // 4. Dispatch by chat type
  switch (type) {
    case "DIRECT": {
      if (receivers.length !== 1) {
        throwError(
          "Direct chat must have exactly one receiver",
          400,
        );
      }

      return createDirectChat(payload);
    }

    case "GROUP": {
      if (!payload.name?.trim()) {
        throwError("Group name is required", 400);
      }

      return createGroupChat(payload);
    }

    default:
      throwError("Invalid chat type", 400);
  }
};

// --------------------------------------------------
// DIRECT CHAT SERVICE
// --------------------------------------------------

const createDirectChat = async (
  payload: ICreateChatRoomPayload,
) => {
  const {tenantId, sender, receivers } = payload;
  const receiver = receivers[0];

  // Stable key ensures both users resolve to the same room.
  const directChatKey = [sender.userId, receiver.userId]
    .sort()
    .join(":");

  let room: any;

  try {
    room = await UserChatRoomModel.findOneAndUpdate(
      {
        tenantId,
        type: ChatRoomType.DIRECT,
        directChatKey,
        deletedAt: null,
      },
      {
        $setOnInsert: {
          roomCode: await generateRoomCode(),
          tenantId,
          type: ChatRoomType.DIRECT,
          directChatKey,
          name: "Direct chat",
          description: "",
          planName: null,
          sendAccess: ChatSendAccess.EVERYONE,
          status: ChatRoomStatus.ACTIVE,
          isEnabled: true,
          createdBy: sender.userId,
          lastMessageAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (error: any) {
    // Another request may have created the room concurrently.
    if (error.code !== 11000) {
      throw error;
    }

    room = await UserChatRoomModel.findOne({
      tenantId,
      type: ChatRoomType.DIRECT,
      directChatKey,
      deletedAt: null,
    });
  }

  if (!room) {
    throwError("Unable to create or retrieve direct chat", 500);
  }

  if (
    room.status !== ChatRoomStatus.ACTIVE ||
    !room.isEnabled
  ) {
    throwError("This chat room is inactive", 409);
  }

  // Ensure both participants have memberships.
  const participants = [sender, receiver];

  for (const participant of participants) {
    await UserRoomMemberModel.updateOne(
      {
        roomId: room._id,
        userId: participant.userId,
      },
      {
        $set: {
          tenantId,
          name: participant.name,
          role: participant.role,
          groupRole: ChatGroupRole.MEMBER,
          course:participant.course ?? null,
          isActive: true,
          deletedAt: null,
          updatedBy: sender.userId,
        },
        $setOnInsert: {
          createdBy: sender.userId,
        },
      },
      { upsert: true },
    );
  }

  return {
    roomId: room._id,
    roomCode: room.roomCode,
    type: room.type,
    tenantId: room.tenantId,
    directChatKey: room.directChatKey,
    name: room.name,
    receiver: {
      userId: receiver.userId,
      name: receiver.name,
      role: receiver.role,
      course:receiver.course || "",
    },
    lastMessage: room.lastMessage ?? null,
    lastMessageAt: room.lastMessageAt ?? null,
    createdAt: room.createdAt,
  };
};

// --------------------------------------------------
// GROUP CHAT SERVICE
// --------------------------------------------------

const createGroupChat = async (
  payload: ICreateChatRoomPayload,
) => {
  const {
    tenantId,
    sender,
    receivers,
    name,
    description,
  } = payload;

  let room: any;

  try {
    // Create a new group room.
    room = await UserChatRoomModel.create({
      roomCode: await generateRoomCode(),
      type: ChatRoomType.GROUP,
      tenantId,
      segmentKey: null,
      directChatKey: null,
      name: name!.trim(),
      description: description?.trim() ?? "",
      planName: null,
      sendAccess: ChatSendAccess.EVERYONE,
      status: ChatRoomStatus.ACTIVE,
      isEnabled: true,
      createdBy: sender.userId,
      lastMessageAt: null,
    });

    const participants = [
      {
        ...sender,
        groupRole: ChatGroupRole.ADMIN,
      },
      ...receivers.map((receiver) => ({
        ...receiver,
        groupRole: ChatGroupRole.MEMBER,
      })),
    ];

    // Insert or reactivate existing memberships.
    for (const participant of participants) {
      await UserRoomMemberModel.updateOne(
        {
          roomId: room._id,
          userId: participant.userId,
        },
        {
          $set: {
            tenantId,
            name: participant.name,
            role: participant.role,
            course:participant.course || null,
            groupRole: participant.groupRole,
            isActive: true,
            deletedAt: null,
            updatedBy: sender.userId,
          },
          $setOnInsert: {
            createdBy: sender.userId,
          },
        },
        { upsert: true },
      );
    }

    return {
      roomId: room._id,
      roomCode: room.roomCode,
      type: room.type,
      tenantId: room.tenantId,
      name: room.name,
      description: room.description,
      sendAccess: room.sendAccess,
      status: room.status,
      members: participants.map((participant) => ({
        userId: participant.userId,
        name: participant.name,
        role: participant.role,
        groupRole: participant.groupRole,
        course:participant.course || "",
      })),
      createdBy: room.createdBy,
      createdAt: room.createdAt,
    };
  } catch (error) {
    // If member creation fails, remove the newly created room
    // to avoid leaving an incomplete group.
    if (room?._id) {
      await UserChatRoomModel.deleteOne({ _id: room._id });
    }

    throw error;
  }
};


/**
 * Calculate unread messages for the current user.
 *
 * Assumes ChatMessageModel contains:
 * roomId, senderId, createdAt, isDeleted.
 */
const getUnreadCount = async ({
  roomId,
  userId,
  lastSeenAt,
  lastClearedAt,
  source,
}: {
  roomId: mongoose.Types.ObjectId;
  userId: string;
  lastSeenAt?: Date | null;
  lastClearedAt?: Date | null;
  source: "TENANT" | "SUPER_ADMIN";
}): Promise<number> => {
  const MessageModel =
    source === "SUPER_ADMIN"
      ? ChatMessageModel
      : UserChatMessageModel;

  const boundaries = [lastSeenAt, lastClearedAt].filter(
    (date): date is Date => date instanceof Date,
  );

  const lastReadAt =
    boundaries.length > 0
      ? new Date(
          Math.max(...boundaries.map((date) => date.getTime())),
        )
      : null;

  const query: Record<string, any> = {
    roomId,
    senderId: { $ne: userId },
    isDeleted: { $ne: true },
  };

  if (lastReadAt) {
    query.createdAt = { $gt: lastReadAt };
  }

  return MessageModel.countDocuments(query);
};

/**
 * Build one chat-list item.
 * Only the fields requested by the frontend are returned.
 */
const buildChatItem = async ({
  room,
  source,
  currentMember,
  userId,
}: {
  room: any;
  source: ChatSource;
  currentMember: any;
  userId: string;
}): Promise<ChatListItem> => {
  const roomId = room._id as mongoose.Types.ObjectId;

  let roomname = room.name;
  let course: string | null = null;
  let role: string | null = null;

  // Get the opposite participant only for DIRECT chats.
  if (room.type === ChatRoomType.DIRECT) {
    const oppositeMember = await UserRoomMemberModel.findOne({
      roomId,
      userId: { $ne: userId },
      tenantId: room.tenantId,
      isActive: true,
      deletedAt: null,
    })
      .select("userId name role course")
      .lean();

    if (oppositeMember) {
      roomname = oppositeMember.name;
      course = oppositeMember.course ?? null;
      role = oppositeMember.role ?? null;
    }
  }

  const embeddedMessage = room.lastMessage ?? {};

  let messageDetails: any = null;

  // Select the message collection based on the chat source.
  const MessageModel =
    source === "SUPER_ADMIN"
      ? ChatMessageModel
      : UserChatMessageModel;

  if (embeddedMessage.messageId) {
    messageDetails = await MessageModel.findById(
      embeddedMessage.messageId,
    )
      .select("message senderName messageType createdAt isDeleted")
      .lean();
  }

  const unreadCount = await getUnreadCount({
    roomId,
    userId,
    lastSeenAt: currentMember?.lastSeenAt,
    lastClearedAt: currentMember?.lastClearedAt,
    source,
  });

  return {
    roomId: roomId.toString(),
    roomCode: room.roomCode,
    type: room.type,
    source,

    // DIRECT: opposite participant's name.
    // Other room types: keep the room's existing name.
    name: roomname,
    course,
    role,

    lastMessage: {
      message:
        messageDetails?.message ??
        embeddedMessage.message ??
        null,

      senderName:
        messageDetails?.senderName ??
        embeddedMessage.senderName ??
        null,

      messageType:
        messageDetails?.messageType ?? null,

      createdAt:
        messageDetails?.createdAt ??
        embeddedMessage.createdAt ??
        null,

      isDeleted:
        messageDetails?.isDeleted ?? false,
    },

    lastMessageAt:
      room.lastMessageAt ??
      messageDetails?.createdAt ??
      embeddedMessage.createdAt ??
      null,

    unreadCount,
    isUnread: unreadCount > 0,
  };
};

export const getChatRoomsService = async ({
  userId,
  tenantId,
  filter,
  page,
  limit,
  search,
}: GetChatRoomsInput) => {
  if (!userId) {
    throwError("User ID is required", 400);
  }

  if (!tenantId?.trim()) {
    throwError("Tenant ID is required", 400);
  }

  const normalizedFilter = filter.trim().toUpperCase();

  // 1. Get the current user's memberships from both systems.
  const [userMemberships, superAdminMemberships] = await Promise.all([
    UserRoomMemberModel.find({
      userId,
      tenantId,
      ...ACTIVE_MEMBER,
    })
      .select("roomId lastSeenAt lastClearedAt")
      .lean(),

    TenantRoomMemberModel.find({
      userId,
      ...ACTIVE_MEMBER,
      $or: [{ tenantId }, { tenantId: null }],
    })
      .select("roomId lastSeenAt lastClearedAt")
      .lean(),
  ]);


  const userRoomIds = userMemberships.map(
    (member: any) => member.roomId,
  );

  const superAdminRoomIds = superAdminMemberships.map(
    (member: any) => member.roomId,
  );

  // 2. Fetch rooms from the correct collections.
  const [userRooms, superAdminRooms] = await Promise.all([
    userRoomIds.length
      ? UserChatRoomModel.find({
          _id: { $in: userRoomIds },
          tenantId,
          ...ACTIVE_ROOM,
        }).lean()
      : [],

    superAdminRoomIds.length
      ? TenantChatRoomModel.find({
          _id: { $in: superAdminRoomIds },
          ...ACTIVE_ROOM,
        }).lean()
      : [],
  ]);


  // 3. Find the current user's membership for each room.
  const userMembershipMap = new Map<string, any>();
  const superAdminMembershipMap = new Map<string, any>();

  for (const member of userMemberships as any[]) {
    userMembershipMap.set(member.roomId.toString(), member);
  }

  for (const member of superAdminMemberships as any[]) {
    superAdminMembershipMap.set(member.roomId.toString(), member);
  }

  // 4. Map rooms into the response format.
  const [userItems, superAdminItems] = await Promise.all([
    Promise.all(
      (userRooms as any[]).map((room) =>
        buildChatItem({
          room,
          source: "TENANT",
          currentMember: userMembershipMap.get(
            room._id.toString(),
          ),
          userId,
        }),
      ),
    ),

    Promise.all(
      (superAdminRooms as any[]).map((room) =>
        buildChatItem({
          room,
          source: "SUPER_ADMIN",
          currentMember: superAdminMembershipMap.get(
            room._id.toString(),
          ),
          userId,
        }),
      ),
    ),
  ]);

  // 5. Separate the categories according to your requirements.
  const directItems = userItems.filter(
    (item) => item.type === "DIRECT",
  );

  const userGroupItems = userItems.filter(
    (item) => item.type === "GROUP",
  );

  const superAdminTenantItems = superAdminItems.filter(
    (item) => item.type === "TENANT",
  );

  const superAdminSegmentItems = superAdminItems.filter(
    (item) => item.type === "SEGMENT",
  );

  // 6. Apply the requested filter.
  let filteredItems: ChatListItem[];

  if (normalizedFilter === "ALL") {
    filteredItems = [
      ...directItems,
    ];
  } else if (normalizedFilter === "GROUP") {
    filteredItems = [
      ...userGroupItems,
      ...superAdminSegmentItems,
    ];
  } else if (normalizedFilter === "SUPERADMIN") {
    filteredItems = [...superAdminItems,...superAdminSegmentItems];
  } else {
    // ADMIN, TEACHER, STUDENT, etc.
    // Role filters require the other participant's role.
    // Resolve participant roles from your membership records here.
    const directRoomIds = directItems.map(
      (item) => new mongoose.Types.ObjectId(item.roomId),
    );

    const otherMembers = directRoomIds.length
      ? await UserRoomMemberModel.find({
          roomId: { $in: directRoomIds },
          tenantId,
          userId: { $ne: userId },
          ...ACTIVE_MEMBER,
        })
          .select("roomId userId name role")
          .lean()
      : [];

    const roleByRoomId = new Map<string, string>();

    for (const member of otherMembers as any[]) {
      roleByRoomId.set(
        member.roomId.toString(),
        member.role?.toUpperCase() ?? "",
      );
    }

    filteredItems = directItems.filter(
      (item) =>
        roleByRoomId.get(item.roomId) === normalizedFilter,
    );
  }

  // 7. Apply optional search.
  if (search?.trim()) {
    const searchText = search.trim().toLowerCase();

    filteredItems = filteredItems.filter((item) =>
      [
        item.name,
        item.roomCode,
        item.lastMessage.message ?? "",
        item.lastMessage.senderName ?? "",
      ].some((value) => value.toLowerCase().includes(searchText)),
    );
  }

  // 8. Counts are unread-message totals, calculated before pagination.
  const sumUnread = (items: ChatListItem[]) =>
    items.reduce((total, item) => total + item.unreadCount, 0);

  const roleCounts: Record<string, number> = {};

  const directRoomIds = directItems.map(
    (item) => new mongoose.Types.ObjectId(item.roomId),
  );

  const roleMembers = directRoomIds.length
    ? await UserRoomMemberModel.find({
        roomId: { $in: directRoomIds },
        tenantId,
        userId: { $ne: userId },
        ...ACTIVE_MEMBER,
      })
        .select("roomId role")
        .lean()
    : [];

  const roleByRoomId = new Map<string, string>();

  for (const member of roleMembers as any[]) {
    roleByRoomId.set(
      member.roomId.toString(),
      member.role?.toUpperCase() ?? "",
    );
  }

  for (const item of directItems) {
    const role = roleByRoomId.get(item.roomId);

    if (role) {
      roleCounts[role] =
        (roleCounts[role] ?? 0) + item.unreadCount;
    }
  }

  const counts = {
    all: sumUnread([
      ...directItems
    ]),
    group: sumUnread([
      ...userGroupItems,
      ...superAdminSegmentItems,
    ]),
    superAdmin: sumUnread(superAdminItems),
    ...roleCounts,
  };

  // 9. Sort by latest message first.
  filteredItems.sort((a, b) => {
    const aTime = a.lastMessageAt
      ? new Date(a.lastMessageAt).getTime()
      : 0;

    const bTime = b.lastMessageAt
      ? new Date(b.lastMessageAt).getTime()
      : 0;

    return bTime - aTime;
  });

  // 10. Paginate after combining and sorting both collections.
  const total = filteredItems.length;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  return {
    chatrooms: filteredItems.slice(skip, skip + limit),
    counts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};