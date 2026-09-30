import tenantChatRoom from "../models/tenantChatRoom";
import { TenantRoomMemberModel } from "../models/tenantChatRoomMember";
import { ITenantChatRoom } from "../../types/models.types";
import { Types } from "mongoose";
import { ChatRoomStatus, ChatRoomType, Status } from "../shared/enum";
import TenantUsers from "../models/users";
import TenantModel from "../models/tenants";
import { appStatus } from "../config/messages";

interface CreateChatRoomInput {
  type: ChatRoomType;
  tenantIds: string[];
  name: string;
  planName: string;
  description?: string;
  createdBy: string;
}

interface AddRoomMemberInput {
  roomId: Types.ObjectId;
  userId: string;
  tenantId: string;
  name: string;
  createdBy: string;
}


interface IGetChatRoomsOperation {
  userId: string;
  tenantId: string;
  page: number;
  limit: number;
  tab: "all" | "read" | "unread" | "group";
  search?: string;
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
  planName: string;
  sendAccess: string;
  members: GroupDetailsMember[];
  memberCount: number;
}

export const createChatRoom = async (
  payload: CreateChatRoomInput,
): Promise<ITenantChatRoom> => {
  const {
    type,
    tenantIds = [],
    name,
    planName,
    description,
    createdBy,
  } = payload;

  let existingRoom = null;
const normalize = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "_");

const segmentKey = `SEGMENT:${normalize(name)}:${normalize(planName)}`;

  if (type === ChatRoomType.TENANT && tenantIds.length === 1) {
    existingRoom = await tenantChatRoom.findOne({
      type,
      tenantIds: tenantIds[0],
      deletedAt: null,
    });
  }

  if (type === ChatRoomType.SEGMENT && tenantIds.length) {
    existingRoom = await tenantChatRoom.findOne({
      type,
      segmentKey,
      deletedAt: null,
    });
  }

  if (type === ChatRoomType.GLOBAL) {
    existingRoom = await tenantChatRoom.findOne({
      type: "GLOBAL",
      deletedAt: null,
    });
  }

  if (existingRoom) return existingRoom;

  const count = await tenantChatRoom.countDocuments();
  const roomCode = `ROOM-${String(count + 1).padStart(4, "0")}`;

  const room = await tenantChatRoom.create({
    roomCode,
    type,
    tenantIds,
    segmentKey: segmentKey || null,
    planName: planName || null,
    name,
    description,
    createdBy,
  });

  if (tenantIds?.length) {
    const tenantUsers = await TenantUsers.find({
      tenantId: { $in: tenantIds },
      role: "ADMIN",
      status: appStatus.ACTIVE,
    })
      .select("userId tenantId userName")
      .lean<{ userId: string; tenantId: string; userName: string }[]>();

    await addBulkRoomMembers(
      room._id as Types.ObjectId,
      tenantUsers.map((u) => ({
        userId: u.userId,
        tenantId: u.tenantId,
        name: u.userName,
      })),
      createdBy,
    );
  }

  return room;
};

export const ensureRoomMember = async (payload: AddRoomMemberInput) => {
  const { roomId, userId, tenantId, name, createdBy } = payload;

  const member = await TenantRoomMemberModel.findOneAndUpdate(
    {
      roomId,
      userId,
    },
    {
      $setOnInsert: {
        tenantId,
        name,
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
  users: { userId: string; tenantId: string; name: string }[],
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
      tenantIds: [],
      name: "Global Announcements",
      planName: "GLOBAL",
      description: "All tenants broadcast",
      createdBy: "SYSTEM",
    });

    // 🔥 SEGMENT ROOM - PREMIUM PLAN
    await createChatRoom({
      type: ChatRoomType.SEGMENT,
      tenantIds: ["TEN000010", "T2"], 
      name: "Finance",
      planName: "Premium",
      description: "Premium finance group",
      createdBy: "SYSTEM",
    });

    // 🔥 TENANT ROOM
    await createChatRoom({
      type: ChatRoomType.TENANT,
      tenantIds: ["TEN000010"],
      name: "Tenant T1 Admin Chat",
      planName: "TENANT",
      description: "Internal tenant chat",
      createdBy: "SYSTEM",
    });

    console.log("✅ Chat Rooms Seeded Successfully");
  } catch (error) {
    console.error("❌ Chat Room Seeding Failed", error);
  }
};




export const getChatRoomsOperation = async ({
  userId,
  tenantId,
  page,
  limit,
  tab,
  search
}: IGetChatRoomsOperation) => {

  const skip = (page - 1) * limit;
  const tenantRecord = await TenantModel.findOne({
    tenantCode: tenantId,
  })
    .select("tenantCode tenantName")
    .lean();
  const tenant = tenantRecord
    ? {
        tenantId: tenantRecord.tenantCode,
        tenantName: tenantRecord.tenantName,
      }
    : null;


  const baseFilter: Record<string, any> = {
    tenantIds: tenantId,

    status: "ACTIVE",

    isEnabled: true,

    deletedAt: null
  };



  if (search?.trim()) {

    const searchRegex = {
      $regex: search.trim(),
      $options: "i"
    };

    baseFilter.$or = [
      {
        name: searchRegex
      },
      {
        description: searchRegex
      },
      {
        segmentKey: searchRegex
      },
      {
        planName: searchRegex
      }
    ];
  }

  const tenantType = /^\s*TENANT\s*$/;

  if (tab === "all") {
    baseFilter.type = {
      $in: ["SEGMENT", tenantType],
    };
  } else if (tab === "group") {
    baseFilter.type = tenantType;
  } else {
    baseFilter.type = {
      $in: [
        "SEGMENT",
        tenantType,
      ]
    };
  }


  if (
    tab === "all" ||
    tab === "group"
  ) {

    const [rooms, total] =
      await Promise.all([

        tenantChatRoom
          .find(baseFilter)
          .sort({
            lastMessageAt: -1,
            updatedAt: -1
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        tenantChatRoom
          .countDocuments(baseFilter)

      ]);

    const totalPages =
      Math.ceil(total / limit);

    /**
     * Get counts for all tabs
     */

    const tabCounts =
      await getTabCounts({
        userId,
        tenantId,
        search
      });

    return {

      rooms: rooms.map((room) => ({
        ...room,
        tenant,
      })),

      tabs: tabCounts,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1
      }
    };
  }


  const result =
    await getReadUnreadRooms({
      userId,
      tenantId,
      tab,
      search,
      skip,
      limit
    });

  const tabCounts =
    await getTabCounts({
      userId,
      tenantId,
      search
    });

  const total =
    tab === "read"
      ? tabCounts.read
      : tabCounts.unread;

  const totalPages =
    Math.ceil(total / limit);

  return {

    rooms: result.map((room) => ({
      ...room,
      tenant,
    })),

    tabs: tabCounts,

    pagination: {
      page,
      limit,
      total,
      totalPages,

      hasNextPage:
        page < totalPages,

      hasPreviousPage:
        page > 1
    }
  };
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

  const tenantIds = [...new Set(room.tenantIds ?? [])];
  const tenants = tenantIds.length
    ? await TenantModel.find({
        tenantCode: { $in: tenantIds },
        status: Status.ACTIVE,
      })
        .select("tenantCode tenantName")
        .lean()
    : [];

  const tenantNamesById = new Map<string, string>();
  for (const tenant of tenants) {
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