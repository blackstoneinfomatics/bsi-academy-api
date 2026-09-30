import { TenantRoomMemberModel } from "../models/tenantChatRoomMember";
import { ChatMessageModel as TenantChatMessage } from "../models/tenantChatMessage";
import { ITenantChatRoom } from "../../types/models.types";
import { Types } from "mongoose";
import { ChatRoomStatus, ChatRoomType, Status } from "../shared/enum";
import TenantUsers from "../models/users";
import TenantModel from "../models/tenants";
import { appStatus } from "../config/messages";
import tenantChatRoom from "../models/tenantChatRoom";
import { Lookup } from "../models/lookup";
import { throwError } from "../helpers/throwError";
import { ChatMessageType } from "../shared/enum";
import { ChatMessageModel } from "../models/tenantChatMessage";


type CreateChatRoomInput = {
  type: ChatRoomType;
  tenantId?: string | null;
  tenantIds?: string[];
  segmentKey?: string | null;
  name: string;
  planName: string;
  description?: string;
  createdBy: string;
};

interface AddRoomMemberInput {
  roomId: Types.ObjectId;
  userId: string;
  tenantId: string;
  name: string;
  role: string;
  createdBy: string;
}



export interface GroupDetailsMember {
  tenantId: string;
  tenantName: string;
  isSelected: boolean;
}

export interface GroupDetailsResponse {
  roomId: string;
  roomCode: string;
  groupName: string;
  description: string;
  role: string;
  planName: string;
  sendAccess: string;
  members: GroupDetailsMember[];
  memberCount: number;
}

interface SendMessagePayload {
  roomId: string;
  title?:string;
  message?: string;
  messageType?: ChatMessageType;
  attachments?: string[];
  replyTo?: any;
  senderId: string;
  senderName: string;
  senderRole?: string;
}

export const getUnreadRoomCodes = async (
  userId: string,
  roomFilter: Record<string, any>,
  roomModel: any
): Promise<string[]> => {
  const roomCodes: string[] = await roomModel.distinct("roomCode", roomFilter);
  if (!roomCodes.length) return [];

  return TenantChatMessage.distinct("roomCode", {
    roomCode: { $in: roomCodes },
    senderId: { $ne: userId },
    readBy: { $ne: userId },
  });
};


const TENANT_TYPE = /^\s*TENANT\s*$/;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFilter = (search?: string) => {
  const filter: Record<string, any> = {
    status: "ACTIVE",
    isEnabled: true,
    deletedAt: null,
    type: { $in: ["SEGMENT", TENANT_TYPE] },
  };

  if (search?.trim()) {
    const rx = { $regex: escapeRegex(search.trim()), $options: "i" };
    filter.$or = [{ name: rx }, { description: rx }, { segmentKey: rx }, { planName: rx }];
  }

  return filter;
};

export const getChatRoomsOperation = async ({
  search,
  page = 1,
  limit = 10,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const baseFilter = buildFilter(search);
  const groupFilter = { ...baseFilter, type: TENANT_TYPE };
  const offset = (page - 1) * limit;
  const [allRooms, allCount, groupRooms, groupCount, roomsWithMessages] = await Promise.all([
    tenantChatRoom.find(baseFilter).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    tenantChatRoom.countDocuments(baseFilter),
    tenantChatRoom.find(groupFilter).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    tenantChatRoom.countDocuments(groupFilter),
    TenantChatMessage.distinct("roomId", { deletedAt: null }),
  ]);
  const unreadFilter = { ...baseFilter, _id: { $in: roomsWithMessages } };
  const [unreadRooms, unreadCount] = await Promise.all([
    tenantChatRoom.find(unreadFilter).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    tenantChatRoom.countDocuments(unreadFilter),
  ]);
  const roomIds = [...new Set([...allRooms, ...groupRooms, ...unreadRooms].map((room) => room._id))];
  const roomMembers = roomIds.length
    ? await TenantRoomMemberModel.find({
        roomId: { $in: roomIds },
        isActive: true,
        deletedAt: null,
      })
        .select("roomId role")
        .sort({ createdAt: 1 })
        .lean()
    : [];
  const roleByRoomId = new Map<string, string>();
  for (const roomMember of roomMembers) {
    const roomId = roomMember.roomId.toString();
    if (roomMember.role && !roleByRoomId.has(roomId)) {
      roleByRoomId.set(roomId, roomMember.role);
    }
  }
  const addRoomRole = (rooms: typeof allRooms) =>
    rooms.map((room) => ({
      ...room,
      role: roleByRoomId.get(room._id.toString()) ?? "",
    }));
  const allRoomsWithRole = addRoomRole(allRooms);
  const groupRoomsWithRole = addRoomRole(groupRooms);
  const unreadRoomsWithRole = addRoomRole(unreadRooms);
  const latestMessages = roomIds.length
    ? await TenantChatMessage.aggregate<{
        _id: Types.ObjectId;
        lastMessage: {
          messageId: Types.ObjectId;
          message?: string;
          senderId: string;
          senderName: string;
          createdAt: Date;
        };
      }>([
        { $match: { roomId: { $in: roomIds }, deletedAt: null } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$roomId",
            lastMessage: {
              $first: {
                messageId: "$_id",
                message: "$message",
                senderId: "$senderId",
                senderName: "$senderName",
                createdAt: "$createdAt",
              },
            },
          },
        },
      ])
    : [];
  const lastMessageByRoomId = new Map(
    latestMessages.map(({ _id, lastMessage }) => [_id.toString(), lastMessage]),
  );
  const unreadRoomsWithLastMessage = unreadRoomsWithRole.map((room) => ({
    ...room,
    lastMessage: lastMessageByRoomId.get(room._id.toString()) ?? null,
  }));
  const allPagination = {
    page,
    limit,
    total: allCount,
    totalPages: Math.ceil(allCount / limit),
  };
  const groupPagination = {
    page,
    limit,
    total: groupCount,
    totalPages: Math.ceil(groupCount / limit),
  };
  const unreadPagination = {
    page,
    limit,
    total: unreadCount,
    totalPages: Math.ceil(unreadCount / limit),
  };

  return {
    all: { count: allCount, rooms: allRoomsWithRole, pagination: allPagination },
    unread: {
      count: unreadCount,
      rooms: unreadRoomsWithLastMessage,
      pagination: unreadPagination,
    },
    group: { count: groupCount, rooms: groupRoomsWithRole, pagination: groupPagination },
  };
};



export const getGlobalChatGroupsOperation = async ({}) => {
const result = await tenantChatRoom.find({
    type: ChatRoomType.GLOBAL,
    status: ChatRoomStatus.ACTIVE,
    isEnabled: true,
    deletedAt: null,
  }).lean();

  return {
         result
  };
};


export const createChatRoom = async (
  payload: CreateChatRoomInput,
): Promise<ITenantChatRoom> => {
    let {
      type,
      tenantId,
      tenantIds = [],
      name,
      planName,
      description,
      createdBy,
    } = payload;

    const normalize = (value: string) =>
      value.trim().toUpperCase().replace(/\s+/g, "_");

    let segmentKey: string | null = null;

    if (type === ChatRoomType.TENANT) {
      if (!tenantId) {
    throwError("tenantId required", 400);
  }

      tenantIds = [];
      segmentKey = null;
    }

    if (type === ChatRoomType.SEGMENT) {
      if (!tenantIds?.length) {
        throwError("tenantIds required", 400);
      }

      if (!planName) {
        throwError("planName required for segment", 400);
      }

      segmentKey = `SEGMENT:${normalize(name)}:${normalize(planName)}`;
      tenantId = null;
    }

    if (type === ChatRoomType.GLOBAL) {
      tenantId = null;
      tenantIds = [];
      segmentKey = null;
    }

    let existingRoom = null;

    if (type === ChatRoomType.TENANT) {
      existingRoom = await tenantChatRoom.findOne({
        type,
        tenantId,
        deletedAt: null,
      });
    }

    if (type === ChatRoomType.SEGMENT) {
      existingRoom = await tenantChatRoom.findOne({
        type,
        segmentKey,
        deletedAt: null,
      });
    }

    if (type === ChatRoomType.GLOBAL) {
      existingRoom = await tenantChatRoom.findOne({
        type: ChatRoomType.GLOBAL,
        deletedAt: null,
      });
    }

    if (existingRoom) return existingRoom;

    const count = await tenantChatRoom.countDocuments();
    const roomCode = `ROOM-${String(count + 1).padStart(4, "0")}`;

    const room = await tenantChatRoom.create({
      roomCode,
      type,
      tenantId,
      tenantIds,
      segmentKey,
      planName: planName || null,
      name,
      description,
      createdBy,
    });

    if (type !== ChatRoomType.GLOBAL) {
      if (tenantIds?.length || tenantId) {
        const ids = tenantId ? [tenantId] : tenantIds;

        const tenantUsers = await TenantUsers.find({
          tenantId: { $in: ids },
          role: "ADMIN",
          status: appStatus.ACTIVE,
        })
          .select("userId tenantId userName role")
          .lean<{
            userId: string;
            tenantId: string;
            userName: string;
            role: string[];
          }[]>();

        const superAdminTenant = await Lookup.findOne({
          lookupKey: "SUPER_ADMIN",
          status: "Active",
        }).lean();

        if (!superAdminTenant) {
          throwError("Super admin tenant not found", 404);
        }

        const superAdminUser = await TenantUsers.findOne({
          tenantId: superAdminTenant?.tenantId,
          role: "SUPERADMIN",
          status: appStatus.ACTIVE,
        })
          .select("userId tenantId userName role")
          .lean<{
            userId: string;
            tenantId: string;
            userName: string;
            role: string[];
          }>();

        if (superAdminUser) {
          await ensureRoomMember({
            roomId: room._id as Types.ObjectId,
            userId: superAdminUser.userId,
            tenantId: superAdminUser.tenantId,
            name: superAdminUser.userName,
            role: superAdminUser.role?.[0] || "SUPERADMIN",
            createdBy,
          });
        }

        if (tenantUsers.length) {
          await addBulkRoomMembers(
            room._id as Types.ObjectId,
            tenantUsers.map((u) => ({
              userId: u.userId,
              tenantId: u.tenantId,
              name: u.userName,
              role: u.role?.[0] || "ADMIN",
            })),
            createdBy,
          );
        }
      }
    }

    return room;
};

export const ensureRoomMember = async (payload: AddRoomMemberInput) => {
  const { roomId, userId, tenantId, name, role, createdBy } = payload;

  const member = await TenantRoomMemberModel.findOneAndUpdate(
    {
      roomId,
      userId,
    },
    {
      $setOnInsert: {
        tenantId,
        name,
        role: role,
        createdBy,
      },
      $set: {
        isActive: true,
        deletedAt: null,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  return member;
};

export const addBulkRoomMembers = async (
  roomId: Types.ObjectId,
  users: { userId: string; tenantId: string; name: string; role: string }[],
  createdBy: string,
) => {
  const bulkOps = users.map((user) => ({
    updateOne: {
      filter: {
        roomId,
        userId: user.userId,
      },
      update: {
        $setOnInsert: {
          tenantId: user.tenantId,
          name: user.name,
          role: user.role || "ADMIN",
          createdBy,
        },
        $set: {
          isActive: true,
          deletedAt: null,
        },
      },
      upsert: true,
    },
  }));

  await TenantRoomMemberModel.bulkWrite(bulkOps);
};

export const seedChatRooms = async () => {
  try {
    console.log("🚀 Seeding Chat Rooms...");

    // 🔥 GLOBAL ROOM
    await createChatRoom({
      type: ChatRoomType.GLOBAL,
      tenantId:null,
      tenantIds: [],
      name: "Global Announcements",
      planName: "GLOBAL",
      description: "All tenants broadcast",
      createdBy: "SYSTEM",
    });

    console.log("✅ Chat Rooms Seeded Successfully");
  } catch (error) {
    console.error("❌ Chat Room Seeding Failed", error);
  }
};


export const getGroupDetailsOperation = async (
  roomId: string,
): Promise<GroupDetailsResponse | null> => {
  const room = await tenantChatRoom
    .findOne({
      _id: roomId,
      status: ChatRoomStatus.ACTIVE,
      isEnabled: true,
      deletedAt: null,
    })
    .lean();

  if (!room) {
    return null;
  }

  const roomMember = await TenantRoomMemberModel.findOne({
    roomId: room._id,
    isActive: true,
    deletedAt: null,
  })
    .select("role")
    .lean();

  const tenantIds = [...new Set(room.tenantIds ?? [])];
  const tenantRecords = tenantIds.length
    ? await TenantModel.find({
        tenantCode: { $in: tenantIds },
        status: Status.ACTIVE,
      })
        .select("tenantCode tenantName")
        .lean()
    : [];

  const tenantNamesById = new Map<string, string>();
  for (const tenant of tenantRecords) {
    tenantNamesById.set(tenant.tenantCode, tenant.tenantName);
  }

  const members = tenantIds.flatMap((tenantId) => {
    const tenantName = tenantNamesById.get(tenantId);
    return tenantName
      ? [{ tenantId, tenantName, isSelected: true }]
      : [];
  });

  return {
    roomId: room._id.toString(),
    roomCode: room.roomCode,
    groupName: room.name,
    role: roomMember?.role ?? "",
    description: String(room.description ?? ""),
    planName: room.planName,
    sendAccess: room.sendAccess,
    members,
    memberCount: members.length,
  };
};


const getTabCounts = async ({
  userId,
  tenantId,
  search,
}: {
  userId: string;
  tenantId: string;
  search?: string;
}) => {
  const searchFilter: Record<string, any> = {};

  if (search?.trim()) {
    const regex = {
      $regex: search.trim(),
      $options: "i",
    };

    searchFilter.$or = [
      { name: regex },
      { description: regex },
      { segmentKey: regex },
      { planName: regex },
    ];
  }

  const tenantType = /^\s*TENANT\s*$/;

  // ALL = SEGMENT + TENANT
  const all = await tenantChatRoom.countDocuments({
    tenantIds: tenantId,
    type: {
      $in: ["SEGMENT", tenantType],
    },
    status: "ACTIVE",
    isEnabled: true,
    deletedAt: null,
    ...searchFilter,
  });

  // GROUP = TENANT only
  const group = await tenantChatRoom.countDocuments({
    tenantIds: tenantId,
    type: tenantType,
    status: "ACTIVE",
    isEnabled: true,
    deletedAt: null,
    ...searchFilter,
  });

  // READ + UNREAD = SEGMENT + TENANT
  const readUnread = await tenantChatRoom.aggregate([
    {
      $match: {
        tenantIds: tenantId,
        type: {
          $in: ["SEGMENT", tenantType],
        },
        status: "ACTIVE",
        isEnabled: true,
        deletedAt: null,
        ...searchFilter,
      },
    },

    // Get current user's membership
    {
      $lookup: {
        from: "tenantroommembers",
        let: {
          roomId: "$_id",
        },
        pipeline: [
          {
            $match: {
              userId,
              tenantId,
              isActive: true,
              deletedAt: null,
              $expr: {
                $eq: ["$roomId", "$$roomId"],
              },
            },
          },
          {
            $limit: 1,
          },
        ],
        as: "member",
      },
    },

    {
      $unwind: {
        path: "$member",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Calculate unread
    {
      $addFields: {
        isUnread: {
          $cond: [
            {
              $eq: ["$lastMessageAt", null],
            },
            false,
            {
              $or: [
                {
                  $eq: ["$member.lastSeenAt", null],
                },
                {
                  $lt: [
                    "$member.lastSeenAt",
                    "$lastMessageAt",
                  ],
                },
              ],
            },
          ],
        },
      },
    },

    // Count
    {
      $group: {
        _id: null,

        read: {
          $sum: {
            $cond: [
              "$isUnread",
              0,
              1,
            ],
          },
        },

        unread: {
          $sum: {
            $cond: [
              "$isUnread",
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return {
    all,
    read: readUnread[0]?.read ?? 0,
    unread: readUnread[0]?.unread ?? 0,
    group,
  };
};

const getReadUnreadRooms = async ({
  userId,
  tenantId,
  tab,
  search,
  skip,
  limit,
}: {
  userId: string;
  tenantId: string;
  tab: "read" | "unread";
  search?: string;
  skip: number;
  limit: number;
}) => {
  const roomMatch: Record<string, any> = {
    tenantIds: tenantId,
    type: {
      $in: ["SEGMENT", /^\s*TENANT\s*$/],
    },
    status: "ACTIVE",
    isEnabled: true,
    deletedAt: null,
  };

  if (search?.trim()) {
    const regex = {
      $regex: search.trim(),
      $options: "i",
    };

    roomMatch.$or = [
      { name: regex },
      { description: regex },
      { segmentKey: regex },
      { planName: regex },
    ];
  }

  const pipeline: any[] = [
    {
      $match: roomMatch,
    },

    // Get current user's membership for each room
    {
      $lookup: {
        from: "tenantroommembers",
        let: {
          roomId: "$_id",
        },
        pipeline: [
          {
            $match: {
              userId,
              tenantId,
              isActive: true,
              deletedAt: null,
              $expr: {
                $eq: ["$roomId", "$$roomId"],
              },
            },
          },
          {
            $limit: 1,
          },
        ],
        as: "member",
      },
    },

    {
      $unwind: {
        path: "$member",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Calculate unread status
    {
      $addFields: {
        isUnread: {
          $cond: [
            {
              $eq: ["$lastMessageAt", null],
            },
            false,
            {
              $or: [
                {
                  $eq: ["$member.lastSeenAt", null],
                },
                {
                  $lt: [
                    "$member.lastSeenAt",
                    "$lastMessageAt",
                  ],
                },
              ],
            },
          ],
        },
      },
    },

    // Read / unread filter
    {
      $match:
        tab === "unread"
          ? { isUnread: true }
          : { isUnread: false },
    },

    {
      $sort: {
        lastMessageAt: -1,
        updatedAt: -1,
      },
    },

    {
      $skip: skip,
    },

    {
      $limit: limit,
    },

    {
      $project: {
        _id: 1,
        roomCode: 1,
        type: 1,
        tenantIds: 1,
        segmentKey: 1,
        name: 1,
        description: 1,
        planName: 1,
        lastMessage: 1,
        lastMessageAt: 1,
        sendAccess: 1,
        status: 1,
        isEnabled: 1,
        createdAt: 1,
        updatedAt: 1,
        isUnread: 1,
      },
    },
  ];

  return tenantChatRoom.aggregate(pipeline);
};

export const sendMessageService = async (
  payload: SendMessagePayload
) => {
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
  

    console.log("Incoming roomId:", roomId);
console.log("Is valid:", Types.ObjectId.isValid(roomId));
    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
      return;
    }

    const room = await tenantChatRoom.findOne({
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

    // =========================================================
    // 🔥 GLOBAL LOGIC (FAN-OUT)
    // =========================================================
    if (room?.type === "GLOBAL") {
      if (senderRole !== "SUPERADMIN") {
        throwError("Only super admin can send global messages", 403);
        return;
      }

      const tenantRooms = await tenantChatRoom.find({
        type: "TENANT",
        isEnabled: true,
        deletedAt: null,
      }).select("_id");

      if (!tenantRooms.length) {
        throwError("No tenant rooms found", 404);
      }

      const messages = tenantRooms.map((r) => ({
        roomId: r._id,
        senderId,
        senderName,
        senderRole,
        title,
        message,
        messageType,
        attachments,
        replyTo,
      }));

      const insertedMessages = await ChatMessageModel.insertMany(messages);

      const bulkUpdates = insertedMessages.map((msg) => ({
        updateOne: {
          filter: { _id: msg.roomId },
          update: {
            $set: {
              lastMessage: {
                messageId: msg._id,
                message: msg.message,
                senderId: msg.senderId,
                senderName: msg.senderName,
                createdAt: msg.createdAt,
              },
              lastMessageAt: msg.createdAt,
            },
          },
        },
      }));

      await tenantChatRoom.bulkWrite(bulkUpdates);

      // // 🔹 socket emit per room
      // tenantRooms.forEach((r, index) => {
      //   io.to(r._id.toString()).emit("chat:new-message", {
      //     roomId: r._id,
      //     message: insertedMessages[index],
      //   });
      // });

      return insertedMessages;
    }

    // =========================================================
    // 🔹 NORMAL FLOW (TENANT / SEGMENT / USER)
    // =========================================================

    const member = await TenantRoomMemberModel.findOne({
      roomId,
      userId: senderId,
      isActive: true,
      deletedAt: null,
    });

    if (!member) throwError("User not part of this room", 403);

    const newMessage = await ChatMessageModel.create({
      roomId,
      senderId,
      senderName,
      senderRole,
      message,
      messageType,
      attachments,
      replyTo,
    });

    await tenantChatRoom.updateOne(
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
      }
    );

    // // 🔹 socket emit
    // try {
    //   io.to(roomId.toString()).emit("chat:new-message", {
    //     roomId,
    //     message: newMessage,
    //   });
    // } catch (socketErr) {
    //   console.error("Socket emit failed:", socketErr);
    // }

    return newMessage;

  } catch (err: any) {
    console.error("SendMessageService Error:", err);

    throwError(
      err.message || "Failed to send message",
      err.statusCode || 500
    );
  }
};

export const updateChatRoomService = async (payload: {
  roomId: string;
  addTenantIds?: string[];
  removeTenantIds?: string[];
  sendAccess?: string;
  updatedBy: string;
}) => {
  try {
    const { roomId, addTenantIds = [], removeTenantIds = [], sendAccess, updatedBy } = payload;

    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    const room = await tenantChatRoom.findOne({
      _id: roomId,
      deletedAt: null,
    });

    if (!room){ 
      throwError("Room not found", 404)
    return;
    };

    if (room.type === "SEGMENT") {
   let updatedTenantIds = [...(room.tenantIds || [])];

      if (addTenantIds.length) {
        updatedTenantIds = Array.from(new Set([...updatedTenantIds, ...addTenantIds]));

        const tenantUsers = await TenantUsers.find({
          tenantId: { $in: addTenantIds },
          role: "ADMIN",
          status: appStatus.ACTIVE,
        })
          .select("userId tenantId userName role")
          .lean();

        await addBulkRoomMembers(
          room._id as Types.ObjectId,
          tenantUsers.map((u: any) => ({
            userId: u.userId,
            tenantId: u.tenantId,
            name: u.userName,
            role: u.role?.[0] || "ADMIN",
          })),
          updatedBy
        );
      }

      if (removeTenantIds.length) {
        updatedTenantIds = updatedTenantIds.filter(
          (id) => !removeTenantIds.includes(id)
        );

        await TenantRoomMemberModel.updateMany(
          {
            roomId: room._id,
            tenantId: { $in: removeTenantIds },
          },
          {
            $set: {
              isActive: false,
              deletedAt: new Date(),
              updatedBy,
            },
          }
        );
      }

      room.tenantIds = updatedTenantIds;
    }

    if (sendAccess) {
      room.sendAccess = sendAccess as any;
    }

    room.updatedBy = updatedBy;

    await room.save();

    return room;

  } catch (err: any) {
    throwError(err.message || "Failed to update chat room", err.statusCode || 500);
  }
};