// services/chat.service.ts

import { randomInt } from "crypto";
import UserChatRoomModel from "../models/userChatRoom";
import { UserRoomMemberModel } from "../models/userChatRoomMember";
import {
  ChatRoomType,
  ChatRoomStatus,
  ChatSendAccess,
  ChatGroupRole,
} from "../shared/enum";
import { throwError } from "../helpers/throwError";
import mongoose, { Types } from "mongoose";
import TenantChatRoomModel from "../models/tenantChatRoom";
import { TenantRoomMemberModel } from "../models/tenantChatRoomMember";
import { UserChatMessageModel } from "../models/userChatMessage";
import { ChatMessageModel } from "../models/tenantChatMessage";
import { ChatMessageType, ChatSource as ChatSourceEnum } from "../shared/enum";
import { tenantChatMessages, tenantsMessages } from "../config/messages";
import StudentModel from "../models/student";
import RecruitmentModel from "../models/recruitment";
import UserModel from "../models/users";
import { Lookup } from "../models/lookup";
import { CHAT_EVENTS, emitChatEventToRoom } from "../shared/socket";

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
  role: string | null;
  course: string | null;
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
  course?: string;
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

interface SendMessagePayload {
  roomId: string;
  title?: string;
  message?: string;
  messageType?: ChatMessageType;
  attachments?: string[];
  replyTo?: any;
  senderId: string;
  senderName: string;
  senderRole?: string;
}

export interface GroupDetailsResponse {
  roomId: string;
  roomCode: string;
  type: string;
  source: ChatSourceEnum;
  groupName: string;
  description: string;
  sendAccess: string;
  canUpdate: boolean;
}

export interface GroupDetailsMember {
  userId: string;
  userName: string;
  isSelected: boolean;
  role: string;
  course: string | null;
}

export interface GetTenantUsersInput {
  tenantId: string;
  role: string;
  roomId?: string;
  source?: ChatSourceEnum;
  page?: number;
  limit?: number;
  search?: string;
}
export interface MarkSeenPayload {
  source: ChatSourceEnum;
  roomId: string;
  messageId: string;
  userId: string;
}

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

async function randomCode(length = 6): Promise<string> {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomInt(CHARSET.length)];
  }
  return result;
}

export const generateRoomCode = async (prefix = "ROOM"): Promise<string> => {
  return `${prefix}-${await randomCode(6)}`;
};

export const createChatRoomService = async (
  payload: ICreateChatRoomPayload,
) => {
  const { type, tenantId, sender, receivers } = payload;

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
        throwError("Direct chat must have exactly one receiver", 400);
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

const createDirectChat = async (payload: ICreateChatRoomPayload) => {
  const { tenantId, sender, receivers } = payload;
  const receiver = receivers[0];

  // Stable key ensures both users resolve to the same room.
  const directChatKey = [sender.userId, receiver.userId].sort().join(":");

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

  if (room.status !== ChatRoomStatus.ACTIVE || !room.isEnabled) {
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
          course: participant.course ?? null,
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
      course: receiver.course || "",
    },
    lastMessage: room.lastMessage ?? null,
    lastMessageAt: room.lastMessageAt ?? null,
    createdAt: room.createdAt,
  };
};

// --------------------------------------------------
// GROUP CHAT SERVICE
// --------------------------------------------------

const createGroupChat = async (payload: ICreateChatRoomPayload) => {
  const { tenantId, sender, receivers, name, description } = payload;

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
            course: participant.course || null,
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
        course: participant.course || "",
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
    source === "SUPER_ADMIN" ? ChatMessageModel : UserChatMessageModel;

  const boundaries = [lastSeenAt, lastClearedAt].filter(
    (date): date is Date => date instanceof Date,
  );

  const lastReadAt =
    boundaries.length > 0
      ? new Date(Math.max(...boundaries.map((date) => date.getTime())))
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
    source === "SUPER_ADMIN" ? ChatMessageModel : UserChatMessageModel;

  if (embeddedMessage.messageId) {
    messageDetails = await MessageModel.findById(embeddedMessage.messageId)
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
      message: messageDetails?.message ?? embeddedMessage.message ?? null,

      senderName:
        messageDetails?.senderName ?? embeddedMessage.senderName ?? null,

      messageType: messageDetails?.messageType ?? null,

      createdAt: messageDetails?.createdAt ?? embeddedMessage.createdAt ?? null,

      isDeleted: messageDetails?.isDeleted ?? false,
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

  const userRoomIds = userMemberships.map((member: any) => member.roomId);

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
          currentMember: userMembershipMap.get(room._id.toString()),
          userId,
        }),
      ),
    ),

    Promise.all(
      (superAdminRooms as any[]).map((room) =>
        buildChatItem({
          room,
          source: "SUPER_ADMIN",
          currentMember: superAdminMembershipMap.get(room._id.toString()),
          userId,
        }),
      ),
    ),
  ]);

  // 5. Separate the categories according to your requirements.
  const directItems = userItems.filter((item) => item.type === "DIRECT");

  const userGroupItems = userItems.filter((item) => item.type === "GROUP");

  const superAdminTenantItems = superAdminItems.filter(
    (item) => item.type === "TENANT",
  );

  const superAdminSegmentItems = superAdminItems.filter(
    (item) => item.type === "SEGMENT",
  );

  // 6. Apply the requested filter.
  let filteredItems: ChatListItem[];

  if (normalizedFilter === "ALL") {
    filteredItems = [...directItems];
  } else if (normalizedFilter === "GROUP") {
    filteredItems = [...userGroupItems, ...superAdminSegmentItems];
  } else if (normalizedFilter === "SUPERADMIN") {
    filteredItems = [...superAdminItems, ...superAdminSegmentItems];
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
      (item) => roleByRoomId.get(item.roomId) === normalizedFilter,
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
      roleCounts[role] = (roleCounts[role] ?? 0) + item.unreadCount;
    }
  }

  const counts = {
    all: sumUnread([...directItems]),
    group: sumUnread([...userGroupItems, ...superAdminSegmentItems]),
    superAdmin: sumUnread(superAdminItems),
    ...roleCounts,
  };

  // 9. Sort by latest message first.
  filteredItems.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;

    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

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

export const sendUserMessageService = async (payload: SendMessagePayload) => {
  try {
    const {
      roomId,
      title,
      message,
      messageType = ChatMessageType.TEXT,
      attachments,
      replyTo,
      senderId,
      senderName,
      senderRole,
    } = payload;

    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
      return;
    }

    const room = await UserChatRoomModel.findOne({
      _id: roomId,
      deletedAt: null,
      isEnabled: true,
    });

    if (!room) {
      throwError("Chat room not found", 404);
      return;
    }

    if (!message && (!attachments || attachments.length === 0)) {
      throwError("Message or attachment required", 400);
    }

    const member = await UserRoomMemberModel.findOne({
      roomId,
      userId: senderId,
      isActive: true,
      deletedAt: null,
    });

    if (!member) throwError("User not part of this room", 403);

    const newMessage = await UserChatMessageModel.create({
      roomId,
      senderId,
      senderName,
      senderRole,
      message,
      messageType,
      attachments,
      replyTo,
    });

    await UserChatRoomModel.updateOne(
      { _id: roomId },
      {
        $set: {
          lastMessage: {
            messageId: newMessage._id,
            message: newMessage.message,
            senderId,
            senderName,
            createdAt: newMessage.createdAt,
          },
          lastMessageAt: newMessage.createdAt,
        },
      },
    );

   const messageData = newMessage.toObject();

const formattedMessage = {
  ...messageData,
  _id: String(messageData._id),
  roomId: String(messageData.roomId),
  createdAt: new Date(messageData.createdAt).toISOString(),
  updatedAt: new Date().toISOString(),
  timestamp: new Date(messageData.createdAt).toISOString(),
  dateLabel: "Today",
  attachments: messageData.attachments ?? [],
  deletedForEveryone: messageData.deletedForEveryone ?? false,
  deletedForEveryoneAt: messageData.deletedForEveryoneAt ?? null,
  deletedForEveryoneBy: messageData.deletedForEveryoneBy ?? null,
  deletedAt: messageData.deletedAt ?? null,
  isDeleted:  false,
  replyTo: messageData.replyTo ?? null,
   side : "left"
};

    try {
      const source = ChatSourceEnum.TENANT;
      emitChatEventToRoom(source, roomId, CHAT_EVENTS.NEW_MESSAGE, {
        source,
        roomId,
        message: formattedMessage,
      });
    } catch (socketError) {
      console.error("Socket emit failed:", socketError);
    }
    return newMessage;
  } catch (err: any) {
    console.error("SendMessageService Error:", err);

    throwError(err.message || "Failed to send message", err.statusCode || 500);
  }
};

export const getGroupDetailsOperation = async (
  roomId: string,
  source: ChatSourceEnum,
  userId: string,
): Promise<GroupDetailsResponse | null> => {
  if (!roomId || !mongoose.isValidObjectId(roomId)) {
    throwError(tenantChatMessages.INVALID_ROOM_ID, 400);
  }

  let room: any = null;

  if (source === ChatSourceEnum.TENANT) {
    room = await UserChatRoomModel.findOne({
      _id: roomId,
      ...ACTIVE_ROOM,
    }).lean();
  } else if (source === ChatSourceEnum.SUPER_ADMIN) {
    room = await TenantChatRoomModel.findOne({
      _id: roomId,
      ...ACTIVE_ROOM,
    }).lean();
  } else {
    throwError("Invalid chat source", 400);
  }

  let canUpdate = false;

  if (source === ChatSourceEnum.TENANT) {
    const isAdmin = await UserRoomMemberModel.exists({
      roomId,
      userId,
      groupRole: ChatGroupRole.ADMIN,
      ...ACTIVE_MEMBER,
    });

    canUpdate = !!isAdmin;
  }

  if (!room) {
    return null;
  }

  return {
    roomId: room._id.toString(),
    roomCode: room.roomCode,
    type: room.type,
    source,
    groupName: room.name,
    description: String(room.description ?? ""),
    sendAccess: room.sendAccess,
    canUpdate: canUpdate,
  };
};

export const markUserMessageSeenService = async (payload: MarkSeenPayload) => {
  try {
    const { source, roomId, messageId, userId } = payload;

    if (!Object.values(ChatSourceEnum).includes(source)) {
      throwError("Invalid chat source", 400);
    }

    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    if (!Types.ObjectId.isValid(messageId)) {
      throwError("Invalid messageId", 400);
    }

    const roomObjectId = new Types.ObjectId(roomId);
    const messageObjectId = new Types.ObjectId(messageId);

    // ------------------------------------
    // 1. Validate room, member and message
    // ------------------------------------
    let room: any = null;
    let member: any = null;
    let message: any = null;

    if (source === ChatSourceEnum.TENANT) {
      // Tenant/user-side chat
      room = await UserChatRoomModel.findOne({
        _id: roomObjectId,
        deletedAt: null,
        isEnabled: true,
      }).lean();

      if (!room) {
        throwError("Chat room not found", 404);
      }

      member = await UserRoomMemberModel.findOne({
        roomId: roomObjectId,
        userId,
        isActive: true,
        deletedAt: null,
      }).lean();

      if (!member) {
        throwError("User not part of this room", 403);
      }

      message = await UserChatMessageModel.findOne({
        _id: messageObjectId,
        roomId: roomObjectId,
      }).lean();
    } else if (source === ChatSourceEnum.SUPER_ADMIN) {
      // Super Admin-side chat
      room = await TenantChatRoomModel.findOne({
        _id: roomObjectId,
        deletedAt: null,
        isEnabled: true,
      }).lean();

      if (!room) {
        throwError("Chat room not found", 404);
      }

      member = await TenantRoomMemberModel.findOne({
        roomId: roomObjectId,
        userId,
        isActive: true,
        deletedAt: null,
      }).lean();

      if (!member) {
        throwError("User not part of this room", 403);
      }

      message = await ChatMessageModel.findOne({
        _id: messageObjectId,
        roomId: roomObjectId,
      }).lean();
    }

    if (!message) {
      throwError("Message not found in this room", 404);
    }

    // ------------------------------------
    // 2. Check whether message is already seen
    // ------------------------------------
    if (
      member.lastSeenMessageId &&
      String(member.lastSeenMessageId) === String(messageObjectId)
    ) {
      return {
        source,
        roomId,
        userId,
        messageId,
        alreadySeen: true,
        lastSeenAt: member.lastSeenAt ?? null,
      };
    }

    // ------------------------------------
    // 3. Update last-seen information
    // ------------------------------------
    const seenAt = new Date();

    if (source === ChatSourceEnum.TENANT) {
      await UserRoomMemberModel.updateOne(
        {
          roomId: roomObjectId,
          userId,
          isActive: true,
          deletedAt: null,
        },
        {
          $set: {
            lastSeenMessageId: messageObjectId,
            lastSeenAt: seenAt,
          },
        },
      );
    } else {
      await TenantRoomMemberModel.updateOne(
        {
          roomId: roomObjectId,
          userId,
          isActive: true,
          deletedAt: null,
        },
        {
          $set: {
            lastSeenMessageId: messageObjectId,
            lastSeenAt: seenAt,
          },
        },
      );
    }

    // ------------------------------------
    // 4. Return response
    // ------------------------------------
    return {
      source,
      roomId,
      userId,
      messageId,
      alreadySeen: false,
      seenAt,
    };
  } catch (err: any) {
    console.error("markMessageSeenService Error:", err);

    throwError(
      err.message || "Failed to update seen status",
      err.statusCode || 500,
    );
  }
};

export const updateUserChatRoomService = async (payload: {
  source: ChatSourceEnum;
  roomId: string;
  addUsers?: {
    userId: string;
    name: string;
    role: string;
    course?: string | null;
  }[];
  removeUsers?: {
    userId: string;
  }[];
  sendAccess?: string;
  updatedBy: string;
}) => {
  try {
    const {
      source,
      roomId,
      addUsers = [],
      removeUsers = [],
      sendAccess,
      updatedBy,
    } = payload;

    // 1. Validate source
    if (!Object.values(ChatSourceEnum).includes(source)) {
      throwError("Invalid chat source", 400);
    }

    // 2. Block Super Admin-side updates
    if (source === ChatSourceEnum.SUPER_ADMIN) {
      throwError("Super Admin is not authorized to update this chat room", 403);
    }

    // 3. Validate room ID
    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    // 4. Validate duplicate users
    const addUserIds = addUsers.map((user) => user.userId);
    const removeUserIds = removeUsers.map((user) => user.userId);

    if (new Set(addUserIds).size !== addUserIds.length) {
      throwError("Duplicate userId found in addUsers", 400);
    }

    if (new Set(removeUserIds).size !== removeUserIds.length) {
      throwError("Duplicate userId found in removeUsers", 400);
    }

    if (addUserIds.some((id) => removeUserIds.includes(id))) {
      throwError(
        "The same user cannot be added and removed in one request",
        400,
      );
    }

    // 5. Find tenant-side room
    const room = await UserChatRoomModel.findOne({
      _id: new Types.ObjectId(roomId),
      deletedAt: null,
      isEnabled: true,
    }).lean();

    if (!room) {
      throwError("Chat room not found", 404);
      return;
    }

    // 6. Allow membership changes only for GROUP rooms
    if (
      room.type !== ChatRoomType.GROUP &&
      (addUsers.length > 0 || removeUsers.length > 0)
    ) {
      throwError("Users can only be added or removed from GROUP rooms", 400);
    }

    if (addUsers.length > 0) {
      for (const participant of addUsers) {
        await UserRoomMemberModel.updateOne(
          {
            roomId: room._id,
            userId: participant.userId,
          },
          {
            $set: {
              name: participant.name,
              role: participant.role,
              course: participant.course ?? null,
              groupRole: ChatGroupRole.MEMBER,
              isActive: true,
              deletedAt: null,
              updatedBy,
            },
            $setOnInsert: {
              createdBy: updatedBy,
            },
          },
          {
            upsert: true,
          },
        );
      }
    }

    // 8. Remove users
    if (removeUsers.length > 0) {
      const result = await UserRoomMemberModel.updateMany(
        {
          roomId: room._id,
          userId: {
            $in: removeUsers.map((user) => user.userId),
          },
          isActive: true,
          deletedAt: null,
        },
        {
          $set: {
            isActive: false,
            deletedAt: new Date(),
            updatedBy,
          },
        },
      );
    }

    const roomUpdate: Record<string, any> = {
      updatedBy,
    };

    if (sendAccess !== undefined) {
      roomUpdate.sendAccess = sendAccess;
    }

    const updatedRoom = await UserChatRoomModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(roomId),
        deletedAt: null,
        isEnabled: true,
      },
      {
        $set: roomUpdate,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updatedRoom) {
      throwError("Chat room not found", 404);
      return;
    }

    // 11. Return response
    return {
      source,
      roomId: updatedRoom._id.toString(),
      roomCode: updatedRoom.roomCode,
      type: updatedRoom.type,
      name: updatedRoom.name,
      description: updatedRoom.description,
      sendAccess: updatedRoom.sendAccess,
      updatedBy: updatedRoom.updatedBy,
    };
  } catch (err: any) {
    console.error("updateChatRoomService error:", err);

    throwError(
      err.message || "Failed to update chat room",
      err.statusCode || 500,
    );
  }
};

export const clearUserChatService = async (payload: {
  source: ChatSourceEnum;
  roomId: string;
  userId: string;
}) => {
  try {
    const { source, roomId, userId } = payload;

    // 1. Validate source
    if (!Object.values(ChatSourceEnum).includes(source)) {
      throwError("Invalid chat source", 400);
    }

    // 2. Validate room ID
    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    const roomObjectId = new Types.ObjectId(roomId);

    let room: any = null;
    let member: any = null;
    let lastMessage: any = null;

    // 3. Fetch room, membership and last message by source
    if (source === ChatSourceEnum.TENANT) {
      room = await UserChatRoomModel.findOne({
        _id: roomObjectId,
        deletedAt: null,
        isEnabled: true,
      }).lean();

      if (!room) {
        throwError("Chat room not found", 404);
      }

      member = await UserRoomMemberModel.findOne({
        roomId: roomObjectId,
        userId,
        isActive: true,
        deletedAt: null,
      }).lean();

      if (!member) {
        throwError("User not part of room", 403);
      }

      lastMessage = await UserChatMessageModel.findOne({
        roomId: roomObjectId,
      })
        .sort({ createdAt: -1, _id: -1 })
        .select("_id createdAt")
        .lean();
    } else if (source === ChatSourceEnum.SUPER_ADMIN) {
      room = await TenantChatRoomModel.findOne({
        _id: roomObjectId,
        deletedAt: null,
        isEnabled: true,
      }).lean();

      if (!room) {
        throwError("Chat room not found", 404);
      }

      member = await TenantRoomMemberModel.findOne({
        roomId: roomObjectId,
        userId,
        isActive: true,
        deletedAt: null,
      }).lean();

      if (!member) {
        throwError("User not part of room", 403);
      }

      lastMessage = await ChatMessageModel.findOne({
        roomId: roomObjectId,
      })
        .sort({ createdAt: -1, _id: -1 })
        .select("_id createdAt")
        .lean();
    }

    // 4. Check whether the chat is already cleared
    if (
      member.lastClearedAt &&
      (!lastMessage ||
        new Date(member.lastClearedAt).getTime() >=
          new Date(lastMessage.createdAt).getTime())
    ) {
      return {
        source,
        roomId,
        userId,
        clearedAt: member.lastClearedAt,
        alreadyCleared: true,
      };
    }

    // 5. Update the correct membership collection
    const now = new Date();

    const clearUpdate = {
      $set: {
        lastClearedMessageId: lastMessage?._id ?? null,
        lastClearedAt: now,
        updatedBy: userId,
      },
    };

    if (source === ChatSourceEnum.TENANT) {
      await UserRoomMemberModel.updateOne(
        {
          roomId: roomObjectId,
          userId,
          isActive: true,
          deletedAt: null,
        },
        clearUpdate,
      );
    } else {
      await TenantRoomMemberModel.updateOne(
        {
          roomId: roomObjectId,
          userId,
          isActive: true,
          deletedAt: null,
        },
        clearUpdate,
      );
    }

    // 6. Return result
    return {
      source,
      roomId,
      userId,
      lastClearedMessageId: lastMessage?._id?.toString() ?? null,
      clearedAt: now,
      alreadyCleared: false,
    };
  } catch (err: any) {
    console.error("clearChatService Error:", err);

    throwError(err.message || "Failed to clear chat", err.statusCode || 500);
  }
};

export const getTenantUsersService = async ({
  tenantId,
  role,
  roomId,
  source = ChatSourceEnum.TENANT,
  page = 1,
  limit = 10,
  search,
}: GetTenantUsersInput) => {
  try {
    if (!tenantId?.trim()) {
      throwError("Tenant ID is required", 400);
    }

    if (
      !role?.trim() ||
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      throwError("Invalid role or pagination parameters", 400);
    }

    if (roomId && !mongoose.isValidObjectId(roomId)) {
      throwError("Invalid room ID", 400);
    }

    if (roomId && !Object.values(ChatSourceEnum).includes(source)) {
      throwError("Invalid chat source", 400);
    }

    const normalizedRole = role.trim().toUpperCase();
    const normalizedTenantId = tenantId.trim();
    const skip = (page - 1) * limit;

    const searchText = search?.trim();

    const searchFilter = searchText
      ? {
          $or: [
            {
              userName: {
                $regex: searchText,
                $options: "i",
              },
            },
            {
              email: {
                $regex: searchText,
                $options: "i",
              },
            },
          ],
        }
      : {};

    // --------------------------------------------------
    // 1. Fetch existing room members
    // --------------------------------------------------

    let selectedUserIds = new Set<string>();

    if (roomId) {
      let room: any = null;

      const roomFilter = {
        _id: roomId,
        // type: { $ne: ChatRoomType.SEGMENT },
        status: ChatRoomStatus.ACTIVE,
        isEnabled: true,
        deletedAt: null,
      };

      if (source === ChatSourceEnum.SUPER_ADMIN) {
        room = await TenantChatRoomModel.findOne(roomFilter)
          .select("_id type")
          .lean();
      } else {
        room = await UserChatRoomModel.findOne(roomFilter)
          .select("_id type")
          .lean();
      }

      if (!room) {
        throwError("Chat room not found", 404);
      }

      if (room.type === ChatRoomType.SEGMENT) {
        return {
          statusCode: 200,
          message:
            "This group belongs to Super Admin, so you cannot view its member list",
          data: {
            members: [],
            memberCount: 0,
          },
        };
      }

      const memberFilter: Record<string, any> = {
        roomId: room._id,
        isActive: true,
        deletedAt: null,
      };

      // Tenant-side membership must belong to this tenant.
      if (source === ChatSourceEnum.TENANT) {
        memberFilter.tenantId = normalizedTenantId;
      }

      let existingMembers: Array<{ userId: string }> = [];

      if (source === ChatSourceEnum.SUPER_ADMIN) {
        existingMembers = await TenantRoomMemberModel.find(memberFilter)
          .select("userId")
          .lean();
      } else {
        existingMembers = await UserRoomMemberModel.find(memberFilter)
          .select("userId")
          .lean();
      }

      selectedUserIds = new Set(
        existingMembers.map((member: any) => String(member.userId)),
      );
    }

    // --------------------------------------------------
    // 2. Fetch users based on role
    // --------------------------------------------------

    let users: Array<{
      userId: string;
      userName: string;
      role: string;
      course: string | null;
    }> = [];

    let totalRecords = 0;

    if (normalizedRole === "STUDENT") {
      const studentFilter: Record<string, any> = {
        tenantId: normalizedTenantId,
        status: "Active",
      };

      if (searchText) {
        studentFilter.$or = [
          {
            firstName: {
              $regex: searchText,
              $options: "i",
            },
          },
          {
            lastName: {
              $regex: searchText,
              $options: "i",
            },
          },
        ];
      }

      const [students, total] = await Promise.all([
        StudentModel.find(studentFilter)
          .select("studentId firstName lastName learningInterest status")
          .sort({ createdDate: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        StudentModel.countDocuments(studentFilter),
      ]);

      totalRecords = total;

      users = students.map((student: any) => ({
        userId: String(student.studentId),
        userName: `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
        role: "STUDENT",
        course: student.learningInterest ?? null,
      }));
    } else {
      // Resolve the tenant ID for Super Admin users.
      const superAdminTenant =
        normalizedRole === "SUPERADMIN"
          ? await Lookup.findOne({
              lookupKey: "SUPER_ADMIN",
              status: "Active",
            }).lean()
          : null;

      if (normalizedRole === "SUPERADMIN" && !superAdminTenant?.tenantId) {
        throwError("Super Admin tenant not found", 404);
      }

      const userFilter: Record<string, any> = {
        tenantId:
          normalizedRole === "SUPERADMIN"
            ? superAdminTenant!.tenantId
            : normalizedTenantId,
        role: normalizedRole,
        status: "Active",
        ...searchFilter,
      };

      const [userRecords, total] = await Promise.all([
        UserModel.find(userFilter)
          .select("userId userName role email status")
          .sort({ createdDate: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        UserModel.countDocuments(userFilter),
      ]);

      totalRecords = total;

      const teacherUserIds =
        normalizedRole === "TEACHER"
          ? userRecords.map((user: any) => user.userId)
          : [];

      const teachers = teacherUserIds.length
        ? await RecruitmentModel.find({
            candidateId: { $in: teacherUserIds },
            status: "Active",
          })
            .select("candidateId positionApplied")
            .lean()
        : [];

      const positionByUserId = new Map<string, string | null>(
        teachers.map((teacher: any) => [
          String(teacher.candidateId),
          teacher.positionApplied ?? null,
        ]),
      );

      users = userRecords.map((user: any) => ({
        userId: String(user.userId),
        userName: user.userName,
        role: Array.isArray(user.role)
          ? (user.role[0] ?? normalizedRole)
          : (user.role ?? normalizedRole),
        course:
          normalizedRole === "TEACHER"
            ? (positionByUserId.get(String(user.userId)) ?? null)
            : null,
      }));
    }

    // --------------------------------------------------
    // 3. Add isSelected to each user
    // --------------------------------------------------

    const members: GroupDetailsMember[] = users.map((user) => ({
      userId: user.userId,
      userName: user.userName,
      isSelected: selectedUserIds.has(user.userId),
      role: user.role,
      course: user.course,
    }));

    // --------------------------------------------------
    // 4. Return response
    // --------------------------------------------------

    return {
      statusCode: 200,
      message: "Tenant users fetched successfully",
      data: {
        members,
        memberCount: selectedUserIds.size,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          hasNextPage: page * limit < totalRecords,
          hasPreviousPage: page > 1,
        },
      },
    };
  } catch (error: any) {
    // Preserve known HTTP errors rather than converting every error to 500.
    if (error?.statusCode && error.statusCode < 500) {
      throw error;
    }

    console.error("Error fetching tenant users:", error);

    throwError("Internal Server Error", 500);
  }
};

export const getUserSeenUsersService = async (
  messageId: string,
  currentUserId: string,
  source: ChatSourceEnum,
) => {
  try {
    // 1. Validate source
    if (!Object.values(ChatSourceEnum).includes(source)) {
      throwError("Invalid chat source", 400);
    }

    // 2. Validate message ID
    if (!Types.ObjectId.isValid(messageId)) {
      throwError("Invalid messageId", 400);
    }

    const messageObjectId = new Types.ObjectId(messageId);

    let message: any = null;
    let members: any[] = [];

    // 3. Fetch message and room members by source
    if (source === ChatSourceEnum.TENANT) {
      message = await UserChatMessageModel.findById(messageObjectId)
        .select("_id roomId createdAt senderId")
        .lean();

      if (!message) {
        throwError("Message not found", 404);
      }

      members = await UserRoomMemberModel.find({
        roomId: message.roomId,
        isActive: true,
        deletedAt: null,
      })
        .select("userId name lastSeenAt lastSeenMessageId")
        .lean();
    } else if (source === ChatSourceEnum.SUPER_ADMIN) {
      message = await ChatMessageModel.findById(messageObjectId)
        .select("_id roomId createdAt senderId")
        .lean();

      if (!message) {
        throwError("Message not found", 404);
      }

      members = await TenantRoomMemberModel.find({
        roomId: message.roomId,
        isActive: true,
        deletedAt: null,
      })
        .select("userId name lastSeenAt lastSeenMessageId")
        .lean();
    }

    // 4. Determine which members have seen the message
    const seenUsers = members
      .filter((member) => {
        // Exclude the current user
        if (String(member.userId) === String(currentUserId)) {
          return false;
        }

        // Prefer timestamp comparison
        if (member.lastSeenAt) {
          return (
            new Date(member.lastSeenAt).getTime() >=
            new Date(message.createdAt).getTime()
          );
        }

        // Fallback only when timestamps are unavailable
        if (member.lastSeenMessageId) {
          return String(member.lastSeenMessageId) === String(message._id);
        }

        return false;
      })
      .map((member) => ({
        userId: member.userId,
        name: member.name,
        seenAt: member.lastSeenAt ?? null,
      }));

    // 5. Return response
    return {
      source,
      messageId: message._id.toString(),
      roomId: message.roomId.toString(),
      totalSeen: seenUsers.length,
      seenUsers,
    };
  } catch (err: any) {
    console.error("getSeenUsersService error:", err);

    throwError(
      err.message || "Failed to fetch seen users",
      err.statusCode || 500,
    );
  }
};

export const deleteUserChatRoomService = async (payload: {
  roomId: string;
  deletedBy: string;
}) => {
  try {
    const { roomId, deletedBy } = payload;

    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    const room = await UserChatRoomModel.findOne({
      _id: roomId,
      deletedAt: null,
    });

    if (!room) {
      throwError("Chat room not found", 404);
    }

    // 🔹 (optional auth check)
    // if (room.createdBy !== deletedBy) throwError("Not allowed", 403);

    await UserChatRoomModel.updateOne(
      { _id: roomId },
      {
        $set: {
          deletedAt: new Date(),
          status: ChatRoomStatus.DELETED,
          isEnabled: false,
          updatedBy: deletedBy,
        },
      },
    );

    await UserRoomMemberModel.updateMany(
      { roomId },
      {
        $set: {
          deletedAt: new Date(),
          isActive: false,
          updatedBy: deletedBy,
        },
      },
    );

    // // 🔹 socket emit
    // try {
    //   io.to(roomId.toString()).emit("chat:room-deleted", {
    //     roomId,
    //   });
    // } catch (e) {
    //   console.error("Socket emit failed:", e);
    // }

    return {
      roomId,
      deletedAt: new Date(),
    };
  } catch (err: any) {
    console.error("deleteChatRoomService Error:", err);

    throwError(
      err.message || "Failed to delete chat room",
      err.statusCode || 500,
    );
  }
};

export const getMessageDateLabel = (date: Date | string): string => {
  const messageDate = new Date(date);
  const now = new Date();

  const messageDay = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate(),
  );

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDay.getTime() === today.getTime()) {
    return "Today";
  }

  if (messageDay.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  return messageDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const buildReplyChain = async (
  messageId: string,
  source: ChatSourceEnum,
  depth = 0,
  maxDepth = 5,
): Promise<Record<string, any> | null> => {
  if (!messageId || depth >= maxDepth) {
    return null;
  }

  if (!Types.ObjectId.isValid(messageId)) {
    return null;
  }

  let message: any = null;

  if (source === ChatSourceEnum.TENANT) {
    message = await UserChatMessageModel.findById(
      new Types.ObjectId(messageId),
    ).lean();
  } else if (source === ChatSourceEnum.SUPER_ADMIN) {
    message = await ChatMessageModel.findById(
      new Types.ObjectId(messageId),
    ).lean();
  } else {
    return null;
  }

  if (!message) {
    return null;
  }

  const isDeleted = message.deletedForEveryone === true;

  let nestedReply = null;

  if (!isDeleted && message.replyTo?.messageId) {
    nestedReply = await buildReplyChain(
      String(message.replyTo.messageId),
      source,
      depth + 1,
      maxDepth,
    );
  }

  return {
    messageId: message._id.toString(),
    senderId: message.senderId,
    senderName: message.senderName,
    message: isDeleted ? "This message was deleted" : message.message,
    messageType: message.messageType,
    createdAt: message.createdAt,
    isDeleted,
    replyTo: nestedReply,
  };
};

export const getUSerRoomMessagesOperation = async ({
  roomId,
  userId,
  source,
  all = false,
  page = 1,
  limit = 20,
}: {
  roomId: string;
  userId: string;
  source: ChatSourceEnum;
  all?: boolean;
  page?: number;
  limit?: number;
}) => {
  // ---------------------------------------------
  // 1. Validate request
  // ---------------------------------------------

  if (!roomId?.trim()) {
    throwError("Room ID is required", 400);
  }

  if (!userId?.trim()) {
    throwError("User ID is required", 401);
  }

  if (
    !Object.values(ChatSourceEnum).includes(source) ||
    ![ChatSourceEnum.TENANT, ChatSourceEnum.SUPER_ADMIN].includes(source)
  ) {
    throwError("Invalid chat source", 400);
  }

  if (
    !all &&
    (!Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100)
  ) {
    throwError("Invalid pagination parameters", 400);
  }

  const skip = (page - 1) * limit;
  const isObjectId = Types.ObjectId.isValid(roomId);

  // ---------------------------------------------
  // 2. Resolve room from correct collection
  // ---------------------------------------------

  let room: any = null;

  const roomFilter: Record<string, any> = {
    status: ChatRoomStatus.ACTIVE,
    isEnabled: true,
    deletedAt: null,
  };

  if (isObjectId) {
    roomFilter._id = new Types.ObjectId(roomId);
  } else {
    roomFilter.roomCode = roomId;
  }

  if (source === ChatSourceEnum.TENANT) {
    room = await UserChatRoomModel.findOne(roomFilter).lean();
  } else {
    room = await TenantChatRoomModel.findOne(roomFilter).lean();
  }

  if (!room) {
    throwError(tenantChatMessages.CHAT_ROOM_NOT_FOUND, 404);
    return;
  }

  const resolvedRoomId = room._id as Types.ObjectId;

  // ---------------------------------------------
  // 3. Verify active room membership
  // ---------------------------------------------

  let member: any = null;

  if (source === ChatSourceEnum.TENANT) {
    member = await UserRoomMemberModel.findOne({
      roomId: resolvedRoomId,
      userId,
      tenantId: room.tenantId,
      isActive: true,
      deletedAt: null,
    })
      .select("userId lastSeenAt lastClearedAt")
      .lean();
  } else {
    member = await TenantRoomMemberModel.findOne({
      roomId: resolvedRoomId,
      userId,
      isActive: true,
      deletedAt: null,
    })
      .select("userId lastSeenAt lastClearedAt")
      .lean();
  }

  if (!member) {
    throwError(tenantChatMessages.FORBIDDEN, 403);
    return;
  }

  // ---------------------------------------------
  // 4. Fetch room's last message details
  // ---------------------------------------------

  let lastMessageDetails: any = null;

  if (room.lastMessage?.messageId) {
    if (source === ChatSourceEnum.TENANT) {
      lastMessageDetails = await UserChatMessageModel.findById(
        room.lastMessage.messageId,
      ).lean();
    } else {
      lastMessageDetails = await ChatMessageModel.findById(
        room.lastMessage.messageId,
      ).lean();
    }
  }

  // ---------------------------------------------
  // 5. Fetch messages from correct collection
  // ---------------------------------------------

  const messageFilter: Record<string, any> = {
    roomId: resolvedRoomId,
  };

  if (member.lastClearedAt) {
    messageFilter.createdAt = {
      $gt: member.lastClearedAt,
    };
  }

  let total = 0;
  let messages: any[] = [];

  if (source === ChatSourceEnum.TENANT) {
    total = await UserChatMessageModel.countDocuments(messageFilter);

    let query = UserChatMessageModel.find(messageFilter).sort({
      createdAt: 1,
      _id: 1,
    });

    if (!all) {
      query = query.skip(skip).limit(limit);
    }

    messages = await query.lean();
  } else {
    total = await ChatMessageModel.countDocuments(messageFilter);

    let query = ChatMessageModel.find(messageFilter).sort({
      createdAt: 1,
      _id: 1,
    });

    if (!all) {
      query = query.skip(skip).limit(limit);
    }

    messages = await query.lean();
  }

  // ---------------------------------------------
  // 6. Format messages and reply chains
  // ---------------------------------------------

  const formattedMessages = await Promise.all(
    messages.map(async (message: any) => {
      const isMine = message.senderId === userId;
      const isDeleted = message.deletedForEveryone === true;

      const displayMessage = isDeleted
        ? isMine
          ? "You deleted this message"
          : `${message.senderName} deleted this message`
        : message.message;

      return {
        ...message,
        message: displayMessage,
        isDeleted,
        timestamp: message.createdAt,
        dateLabel: getMessageDateLabel(message.createdAt),
        side: isMine ? "right" : "left",

        replyTo:
          !isDeleted && message.replyTo?.messageId
            ? await buildReplyChain(message.replyTo.messageId, source)
            : null,
      };
    }),
  );

  type MessageGroup = {
    date: Date;
    dateLabel: string;
    messages: typeof formattedMessages;
  };

  const groupedMessages = formattedMessages.reduce<
    Record<string, MessageGroup>
  >((groups, message) => {
    const date = new Date(message.createdAt);

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        dateLabel: getMessageDateLabel(message.createdAt),
        messages: [],
      };
    }

    groups[dateKey].messages.push(message);

    return groups;
  }, {});

  const messagesByDate = Object.entries(groupedMessages)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([dateKey, group]) => ({
      date: dateKey,
      dateLabel: group.dateLabel,
      messages: group.messages,
    }));

  // ---------------------------------------------
  // 7. Return room profile and message list
  // ---------------------------------------------

  return {
    source,

    room: {
      roomId: room._id.toString(),
      roomCode: room.roomCode,
      type: room.type,
      source,
      name: room.name,
      description: room.description ?? "",
      planName: room.planName ?? null,
      sendAccess: room.sendAccess,
      status: room.status,
      lastMessage: room.lastMessage
        ? {
            ...room.lastMessage,
            // messageDetails: lastMessageDetails,
          }
        : null,
      lastMessageAt: room.lastMessageAt ?? null,
    },

    messagesByDate,

    pagination: {
      page: all ? 1 : page,
      limit: all ? total : limit,
      total,
      totalPages: all ? (total > 0 ? 1 : 0) : Math.ceil(total / limit),
      hasNextPage: all ? false : page * limit < total,
      hasPreviousPage: all ? false : page > 1,
    },
  };
};

export const deleteUserMessageForEveryoneService = async (payload: {
  source: ChatSourceEnum;
  messageId: string;
  userId: string;
}) => {
  try {
    const { source, messageId, userId } = payload;

    // 1. Validate source
    if (!Object.values(ChatSourceEnum).includes(source)) {
      throwError("Invalid chat source", 400);
    }

    // 2. Validate message ID
    if (!Types.ObjectId.isValid(messageId)) {
      throwError("Invalid messageId", 400);
    }

    const messageObjectId = new Types.ObjectId(messageId);

    // 3. Fetch message from the correct collection
    let message: any = null;

    if (source === ChatSourceEnum.TENANT) {
      message = await UserChatMessageModel.findById(messageObjectId);
    } else if (source === ChatSourceEnum.SUPER_ADMIN) {
      message = await ChatMessageModel.findById(messageObjectId);
    }

    if (!message) {
      throwError("Message not found", 404);
    }

    // 4. Only the original sender can delete the message
    if (String(message.senderId) !== String(userId)) {
      throwError("Only sender can delete this message", 403);
    }

    // 5. Prevent repeated deletion
    if (message.deletedForEveryone === true) {
      return {
        source,
        messageId: message._id.toString(),
        roomId: message.roomId.toString(),
        alreadyDeleted: true,
      };
    }

    const deletedAt = new Date();

    // 6. Soft-delete in the correct collection
    const update = {
      $set: {
        deletedForEveryone: true,
        deletedForEveryoneAt: deletedAt,
        deletedForEveryoneBy: userId,
        message: "This message was deleted",
        attachments: [],
      },
    };

    if (source === ChatSourceEnum.TENANT) {
      await UserChatMessageModel.updateOne(
        {
          _id: messageObjectId,
          senderId: message.senderId,
          deletedForEveryone: { $ne: true },
        },
        update,
      );
    } else {
      await ChatMessageModel.updateOne(
        {
          _id: messageObjectId,
          senderId: message.senderId,
          deletedForEveryone: { $ne: true },
        },
        update,
      );
    }

    // 7. Return result
    return {
      source,
      messageId: message._id.toString(),
      roomId: message.roomId.toString(),
      deletedForEveryone: true,
      deletedAt,
      alreadyDeleted: false,
    };
  } catch (err: any) {
    console.error("deleteMessageForEveryoneService error:", err);

    throwError(
      err.message || "Failed to delete message",
      err.statusCode || 500,
    );
  }
};
