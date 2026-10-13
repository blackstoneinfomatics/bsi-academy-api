// services/chat.service.ts

import { randomUUID } from "crypto";
import UserChatRoomModel from "../models/userChatRoom";
import {UserRoomMemberModel} from "../models/userChatRoomMember";
import {
  ChatRoomType,
  ChatRoomStatus,
  ChatSendAccess,
  ChatGroupRole,
} from "../shared/enum";
import { throwError } from "../helpers/throwError";



interface IChatUser {
  userId: string;
  name: string;
  role: string;
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
          roomCode: `CHAT-${randomUUID().slice(0, 8)}`,
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
      roomCode: `CHAT-${randomUUID().slice(0, 8)}`,
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