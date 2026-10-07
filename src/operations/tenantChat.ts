import { TenantRoomMemberModel } from "../models/tenantChatRoomMember";
import { ChatMessageModel as TenantChatMessage } from "../models/tenantChatMessage";
import { ITenantChatRoom } from "../../types/models.types";
import mongoose, { Types } from "mongoose";
import { ChatRoomStatus, ChatRoomType, Status } from "../shared/enum";
import TenantUsers from "../models/users";
import TenantModel from "../models/tenants";
import { appStatus } from "../config/messages";
import tenantChatRoom from "../models/tenantChatRoom";
import { Lookup } from "../models/lookup";
import { throwError } from "../helpers/throwError";
import { ChatMessageType } from "../shared/enum";
import { ChatMessageModel } from "../models/tenantChatMessage";
import { getTenantsByPlan } from "./tenantSubscription.";
import planModel from "../models/plan-model";
import TrialMembers from "../models/trailmember";
import { randomInt } from 'crypto';


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


interface MarkSeenPayload {
  roomId: string;
  messageId: string;
  userId: string;
}

const TENANT_TYPE = /^\s*TENANT\s*$/;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFilter = (search?: string) => {
  const filter: Record<string, any> = {
    status: ChatRoomStatus.ACTIVE,
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

export const getChatRoomsOperation = async (payload: {
  userId: string;
  tenantId: string;
  tab: "ALL" | "UNREAD" | "GROUP";
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const {
    userId,
    tenantId,
    tab,
    search = "",
    page = 1,
    limit = 10,
  } = payload;

  const skip = (page - 1) * limit;

  // --------------------------------------------------
  // 1. Get current user's room memberships
  // --------------------------------------------------
  const members = await TenantRoomMemberModel.find({
    userId,
    tenantId,
    isActive: true,
    deletedAt: null,
  })
    .select(
      "roomId lastSeenAt lastSeenMessageId lastClearedAt role"
    )
    .lean();

  if (!members.length) {
    return {
      counts: {
        all: 0,
        unread: 0,
        group: 0,
      },
      data: [],
      pagination: {
        page,
        limit,
        totalRecords: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    };
  }

  const memberMap = new Map(
    members.map((member) => [
      member.roomId.toString(),
      member,
    ])
  );

  const roomIds = members.map((member) => member.roomId);


  const roomFilter: any = {
    _id: {
      $in: roomIds,
    },
    status: ChatRoomStatus.ACTIVE,
    isEnabled: true,
    deletedAt: null,
  };

  if (search.trim()) {
    roomFilter.$or = [
      {
        name: {
          $regex: search.trim(),
          $options: "i",
        },
      },
      {
        planName: {
          $regex: search.trim(),
          $options: "i",
        },
      },
    ];
  }

  const rooms = await tenantChatRoom
    .find(roomFilter)
    .sort({
      lastMessageAt: -1,
      createdAt: -1,
    })
    .lean();


  const roomData = await Promise.all(
    rooms.map(async (room) => {
      const member = memberMap.get(
        room._id.toString()
      );

      if (!member) return null;

      let effectiveSeenAt: Date | null = null;

      if (
        member.lastSeenAt &&
        member.lastClearedAt
      ) {
        effectiveSeenAt =
          new Date(member.lastSeenAt) >
          new Date(member.lastClearedAt)
            ? member.lastSeenAt
            : member.lastClearedAt;
      } else {
        effectiveSeenAt =
          member.lastSeenAt ||
          member.lastClearedAt ||
          null;
      }

      const unreadFilter: any = {
        roomId: room._id,
        senderId: {
          $ne: userId,
        },
        deletedAt: null,
      };

      if (effectiveSeenAt) {
        unreadFilter.createdAt = {
          $gt: effectiveSeenAt,
        };
      }

      const unreadCount =
        await TenantChatMessage.countDocuments(
          unreadFilter
        );

      const lastMessage =
        room.lastMessage?.messageId
          ? await TenantChatMessage.findById(
              room.lastMessage.messageId
            )
              .select(
                "message senderId senderName senderRole messageType attachments createdAt deletedForEveryone"
              )
              .lean()
          : null;

      return {
        roomId: room._id.toString(),

        roomCode: room.roomCode,

        type: room.type,

        name: room.name,

        description:
          room.description ?? "",

        planName: room.planName,

        sendAccess: room.sendAccess,

        lastMessage: lastMessage
          ? {
              messageId:
                lastMessage._id.toString(),

              message:
                lastMessage.deletedForEveryone
                  ? lastMessage.senderId ===
                    userId
                    ? "You deleted this message"
                    : `${lastMessage.senderName} deleted this message`
                  : lastMessage.message,

              senderId:
                lastMessage.senderId,

              senderName:
                lastMessage.senderName,

              senderRole:
                lastMessage.senderRole,

              messageType:
                lastMessage.messageType,

              createdAt:
                lastMessage.createdAt,

              isDeleted:
                lastMessage.deletedForEveryone ??
                false,
            }
          : null,

        lastMessageAt:
          room.lastMessageAt ?? null,

        unreadCount,

        isUnread:
          unreadCount > 0,
      };
    })
  );

  const validRooms = roomData.filter(
    Boolean
  ) as any[];

  
  const counts = {
    // Unread TENANT rooms
    all: validRooms.filter(
      (room) =>
        room.type === ChatRoomType.TENANT &&
        room.unreadCount > 0
    ).length,

    // Unread TENANT + SEGMENT rooms
    unread: validRooms.filter(
      (room) =>
        room.unreadCount > 0
    ).length,

    // Unread SEGMENT rooms
    group: validRooms.filter(
      (room) =>
        room.type === ChatRoomType.SEGMENT &&
        room.unreadCount > 0
    ).length,
  };


  let filteredRooms = validRooms;

  if (tab === "ALL") {
    filteredRooms = validRooms.filter(
      (room) =>
        room.type === ChatRoomType.TENANT
    );
  }

  if (tab === "UNREAD") {
    filteredRooms = validRooms.filter(
      (room) =>
        room.unreadCount > 0
    );
  }

  if (tab === "GROUP") {
    filteredRooms = validRooms.filter(
      (room) =>
        room.type === ChatRoomType.SEGMENT
    );
  }

  filteredRooms.sort((a, b) => {
    if (
      a.unreadCount > 0 &&
      b.unreadCount === 0
    ) {
      return -1;
    }

    if (
      a.unreadCount === 0 &&
      b.unreadCount > 0
    ) {
      return 1;
    }

    const aTime = a.lastMessageAt
      ? new Date(
          a.lastMessageAt
        ).getTime()
      : 0;

    const bTime = b.lastMessageAt
      ? new Date(
          b.lastMessageAt
        ).getTime()
      : 0;

    return bTime - aTime;
  });

  const totalRecords =
    filteredRooms.length;

  const totalPages =
    Math.ceil(
      totalRecords / limit
    );

  const paginatedRooms =
    filteredRooms.slice(
      skip,
      skip + limit
    );


  return {
    counts,

    data: paginatedRooms,

    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
      hasNext:
        page < totalPages,
      hasPrevious:
        page > 1,
    },
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


const buildReplyChain = async (
  messageId: Types.ObjectId | string | undefined,
  visited = new Set<string>()
): Promise<any | null> => {
  if (!messageId) {
    return null;
  }

  const id = messageId.toString();

  // Prevent infinite loop
  if (visited.has(id)) {
    return null;
  }

  visited.add(id);

  const message = await TenantChatMessage.findById(messageId).lean();

  if (!message) {
    return null;
  }

  const result: any = {
    messageId: message._id,
    message: message.message,
    senderId: message.senderId,
    senderName: message.senderName,
  };

  if (message.replyTo?.messageId) {
    result.replyTo = await buildReplyChain(
      message.replyTo.messageId,
      visited
    );
  }

  return result;
};

const getMessageDateLabel = (timestamp: Date): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const toDayNumber = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  const daysAgo = toDayNumber(now) - toDayNumber(messageDate);

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo > 1 && daysAgo < 7) {
    return messageDate.toLocaleDateString("en-US", { weekday: "long" });
  }

  return messageDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

    const roomCode = await generateRoomCode();

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

export const createChatRoomForTrial = async (
  payload: CreateChatRoomInput,
): Promise<ITenantChatRoom> => {
  const { tenantId, name,planName, description, createdBy } = payload;


  if (!tenantId) {
    throwError("tenantId required", 400);
  }

  const existingRoom = await tenantChatRoom.findOne({
    type: ChatRoomType.TENANT,
    tenantId,
    deletedAt: null,
  });

  if (existingRoom) return existingRoom;

  const roomCode = await generateRoomCode();

  const room = await tenantChatRoom.create({
    roomCode,
    type: ChatRoomType.TENANT,
    tenantId,
    tenantIds: [], 
    segmentKey: null,
    planName: payload.planName.toLocaleUpperCase(),
    name,
    description,
    createdBy,
  });

  const tenantUsers = await TrialMembers.find({
    tenantId,
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

  if (!room || room.type !== ChatRoomType.SEGMENT) {
    return null;
  }
  
  const plan = await planModel.findOne({
    planName: room.planName,
    status: Status.ACTIVE,
  }).lean();

  const planTenants = await getTenantsByPlan(plan?._id.toString() || "");
  
  const roomMember = await TenantRoomMemberModel.findOne({
    roomId: room._id,
    isActive: true,
    deletedAt: null,
  })
    .select("role")
    .lean();

const roomTenantIds = new Set(room.tenantIds ?? []);

const planTenantIds = (planTenants || []).map((t: any) => t.tenantId);

const tenantRecords = planTenantIds.length
  ? await TenantModel.find({
      tenantCode: { $in: planTenantIds },
      status: Status.ACTIVE,
    })
      .select("tenantCode tenantName")
      .lean()
  : [];

const tenantNamesById = new Map<string, string>();
for (const tenant of tenantRecords) {
  tenantNamesById.set(tenant.tenantCode, tenant.tenantName);
}

const members = planTenantIds.map((tenantId: string) => ({
  tenantId,
  tenantName: tenantNamesById.get(tenantId) || "",
  isSelected: roomTenantIds.has(tenantId), 
}));  


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


export const getRoomMessagesOperation = async ({
  roomId,
  userId,
  all = false,
  page = 1,
  limit = 20,
}: {
  roomId: string;
  userId?: string;
  all?: boolean;
  page?: number;
  limit?: number;
}) => {
  const skip = (page - 1) * limit;

  const isObjectId = Types.ObjectId.isValid(roomId);


  const room = isObjectId
    ? await tenantChatRoom
        .findById(new Types.ObjectId(roomId))
        .lean()
    : await tenantChatRoom
        .findOne({ roomCode: roomId })
        .lean();

  console.log("ROOM DEBUG", {
    requestedRoomId: roomId,
    isObjectId,
    database: tenantChatRoom.db.name,
    collection: tenantChatRoom.collection.name,
    roomFound: Boolean(room),
    resolvedRoomId: room?._id?.toString(),
  });

  if (!room) {
    return {
      roomNotFound: true as const,
    };
  }

  const resolvedRoomId = room._id;
  let member: { userId: string; lastClearedAt?: Date | null } | null = null;
  let tenantUser: { userId: string } | null = null;

  if (userId) {
    tenantUser = await TenantUsers.findOne({ userId })
      .select("userId")
      .lean();

    if (!tenantUser) {
      return {
        userNotFound: true as const,
      };
    }

     member = await TenantRoomMemberModel.findOne({
      roomId: resolvedRoomId,
      userId: tenantUser.userId,
      isActive: true,
      deletedAt: null,
    })
      .select("userId lastClearedAt")
      .lean();

    if (!member) {
      return {
        forbidden: true as const,
      };
    }
  }

  let lastMessageDetails = null;

  if (room.lastMessage?.messageId) {
    lastMessageDetails = await TenantChatMessage.findById(
      room.lastMessage.messageId,
    ).lean();
  }

  const filter : any = {
    roomId: resolvedRoomId,
  };
  
  if (member?.lastClearedAt) {
  filter.createdAt = { $gt: member?.lastClearedAt };
} 

  const total = await TenantChatMessage.countDocuments(filter);

  let messageQuery = TenantChatMessage.find(filter).sort({
    createdAt: 1,
    _id: 1,
  });

  if (!all) {
    messageQuery = messageQuery.skip(skip).limit(limit);
  }

  const messages = await messageQuery.lean();

  console.log("MESSAGE DEBUG", {
    database: TenantChatMessage.db.name,
    collection: TenantChatMessage.collection.name,
    roomId: resolvedRoomId.toString(),
    total,
    returned: messages.length,
  });

  console.log(
    "MESSAGE REPLY_TO DB CHECK",
    messages.map((message) => ({
      messageId: message._id.toString(),
      hasReplyTo: Boolean(message.replyTo),
      replyToMessageId:
        message.replyTo?.messageId?.toString() ?? null,
    })),
  );


 const formattedMessages = await Promise.all(
  messages.map(async (message) => {
    const isMine =
      tenantUser && message.senderId === tenantUser.userId;

    const isDeleted = message.deletedForEveryone === true;

    // 🔥 message display logic
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
          ? await buildReplyChain(message.replyTo.messageId)
          : null,
    };
  })
);

  return {
    room: {
      ...room,

      // Keep the existing room lastMessage data
      lastMessage: room.lastMessage
        ? {
            ...room.lastMessage,

            // Complete chat message
            messageDetails: lastMessageDetails,
          }
        : null,
    },

    messages: formattedMessages,

    pagination: {
      page: all ? 1 : page,
      limit: all ? total : limit,
      total,
      totalPages: all
        ? total
          ? 1
          : 0
        : Math.ceil(total / limit),
    },
  };
};

export const markMessageSeenService = async (
  payload: MarkSeenPayload
) => {
  try {
    const { roomId, messageId, userId } = payload;

    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    if (!Types.ObjectId.isValid(messageId)) {
      throwError("Invalid messageId", 400);
    }

    const room = await tenantChatRoom.findOne({
      _id: roomId,
      deletedAt: null,
      isEnabled: true,
    });

    if (!room) {
      throwError("Chat room not found", 404);
    }

    const member = await TenantRoomMemberModel.findOne({
      roomId,
      userId,
      isActive: true,
      deletedAt: null,
    });

    if (!member) {
      throwError("User not part of this room", 403);
    }

    const message = await ChatMessageModel.findOne({
      _id: messageId,
      roomId,
    });

    if (!message) {
      throwError("Message not found in this room", 404);
    }


    if (
      member?.lastSeenMessageId &&
      new Types.ObjectId(member?.lastSeenMessageId).toString() ===
        messageId
    ) {
      return {
        roomId,
        userId,
        messageId,
        alreadySeen: true,
      };
    }

    await TenantRoomMemberModel.updateOne(
      { roomId, userId },
      {
        $set: {
          lastSeenMessageId: messageId,
          lastSeenAt: new Date(),
        },
      }
    );

    // // 🔹 7. Socket emit (non-blocking)
    // try {
    //   io.to(roomId.toString()).emit("chat:seen", {
    //     roomId,
    //     userId,
    //     messageId,
    //   });
    // } catch (socketErr) {
    //   console.error("Socket emit failed:", socketErr);
    // }

    return {
      roomId,
      userId,
      messageId,
      seenAt: new Date(),
    };
  } catch (err: any) {
    console.error("markMessageSeenService Error:", err);

    throwError(
      err.message || "Failed to update seen status",
      err.statusCode || 500
    );
  }
};

export const deleteChatRoomForTrialByTenantId = async (tenantId: string) => {
   const Room = await tenantChatRoom.findOne({
    type: ChatRoomType.TENANT,
    tenantId,
    planName: "TRIAL",
    deletedAt: null,
  }).lean();
  if (Room) {
    await deleteChatRoomService({ roomId: Room._id.toString(), deletedBy: "SYSTEM" });
  }
}

export const deleteChatRoomService = async (payload: {
  roomId: string;
  deletedBy: string;
}) => {
  try {
    const { roomId, deletedBy } = payload;

    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    const room = await tenantChatRoom.findOne({
      _id: roomId,
      deletedAt: null,
    });

    if (!room) {
      throwError("Chat room not found", 404);
    }

    // 🔹 (optional auth check)
    // if (room.createdBy !== deletedBy) throwError("Not allowed", 403);

    await tenantChatRoom.updateOne(
      { _id: roomId },
      {
        $set: {
          deletedAt: new Date(),
          status: ChatRoomStatus.DELETED,
          isEnabled: false,
          updatedBy: deletedBy,
        },
      }
    );

    await TenantRoomMemberModel.updateMany(
      { roomId },
      {
        $set: {
          deletedAt: new Date(),
          isActive: false,
          updatedBy: deletedBy,
        },
      }
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
      err.statusCode || 500
    );
  }
};


export const clearChatService = async (payload: {
  roomId: string;
  userId: string;
}) => {
  try {
    const { roomId, userId } = payload;

    if (!Types.ObjectId.isValid(roomId)) {
      throwError("Invalid roomId", 400);
    }

    const room = await tenantChatRoom.findOne({
      _id: roomId,
      deletedAt: null,
      isEnabled: true,
    });
    if (!room) throwError("Chat room not found", 404);

    const member = await TenantRoomMemberModel.findOne({
      roomId,
      userId,
      isActive: true,
      deletedAt: null,
    });
    if (!member) throwError("User not part of room", 403);

    const lastMessage = await ChatMessageModel.findOne({ roomId })
      .sort({ createdAt: -1 })
      .select("_id createdAt")
      .lean();

    const now = new Date();

    if (
      member?.lastClearedAt &&
      lastMessage &&
      member?.lastClearedAt >= lastMessage.createdAt
    ) {
      return {
        roomId,
        userId,
        clearedAt: member.lastClearedAt,
        alreadyCleared: true,
      };
    }

    await TenantRoomMemberModel.updateOne(
      { roomId, userId },
      {
        $set: {
          lastClearedMessageId: lastMessage?._id || null,
          lastClearedAt: now,
          updatedBy: userId,
        },
      }
    );

    // try {
    //   io.to(roomId.toString()).emit("chat:cleared", {
    //     roomId,
    //     userId,
    //     clearedAt: now,
    //   });
    // } catch (e) {
    //   console.error("Socket emit failed:", e);
    // }

    return {
      roomId,
      userId,
      clearedAt: now,
    };
  } catch (err: any) {
    console.error("clearChatService Error:", err);
    throwError(
      err.message || "Failed to clear chat",
      err.statusCode || 500
    );
  }
};

export const getSeenUsersService = async (
  messageId: string,
  currentUserId: string 
) => {
  try {
    if (!Types.ObjectId.isValid(messageId)) {
      throwError("Invalid messageId", 400);
    }

    const message = await ChatMessageModel.findById(messageId)
      .select("_id roomId createdAt senderId")
      .lean();

    if (!message){
       throwError("Message not found", 404);
       return;
    }

    const members = await TenantRoomMemberModel.find({
      roomId: message.roomId,
      isActive: true,
      deletedAt: null,
    })
      .select("userId name lastSeenAt lastSeenMessageId")
      .lean();

      console.log("Members fetched for seen users:", members);

    const seenUsers = members
      .filter((member) => {
        if (member.userId === currentUserId) return false;

        if (member.lastSeenAt) {
          return member.lastSeenAt >= message.createdAt;
        }

        if (member.lastSeenMessageId) {
          return (
            member.lastSeenMessageId.toString() >=
            message._id.toString()
          );
        }

        return false;
      })
      .map((m) => ({
        userId: m.userId,
        name: m.name,
        seenAt: m.lastSeenAt || null,
      }));

    return {
      messageId,
      roomId: message.roomId,
      totalSeen: seenUsers.length,
      seenUsers,
    };

  } catch (err: any) {
    throwError(
      err.message || "Failed to fetch seen users",
      err.statusCode || 500
    );
  }
};

export const deleteMessageForEveryoneService = async (payload: {
  messageId: string;
  userId: string;
}) => {
  try {
    const { messageId, userId } = payload;

    if (!Types.ObjectId.isValid(messageId)) {
      throwError("Invalid messageId", 400);
    }

    const message = await ChatMessageModel.findById(messageId);

    if (!message){
       throwError("Message not found", 404)
       return;
      };

    if (message.senderId !== userId) {
      throwError("Only sender can delete this message", 403);
    }

    // // ⏱ optional time limit (recommended)
    // const diff = Date.now() - new Date(message.createdAt).getTime();
    // if (diff > 15 * 60 * 1000) {
    //   throwError("Delete time expired", 400);
    // }

    const deletedAt = new Date();

    await ChatMessageModel.updateOne(
      { _id: messageId },
      {
        $set: {
          deletedForEveryone: true,
          deletedForEveryoneAt: deletedAt,
          deletedForEveryoneBy: userId,
          message: "deleted this message",
          attachments: [],
        },
      }
    );

    // // 🔥 socket
    // io.to(message.roomId.toString()).emit("chat:message-deleted", {
    //   messageId,
    //   roomId: message.roomId,
    // });

    return {
      messageId,
      roomId: message.roomId,
    };
  } catch (err: any) {
    throwError(err.message || "Delete failed", err.statusCode || 500);
  }
};