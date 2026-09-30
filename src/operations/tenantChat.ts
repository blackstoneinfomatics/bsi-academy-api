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
  const [allRooms, allCount, groupRooms, groupCount] = await Promise.all([
    tenantChatRoom.find(baseFilter).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    tenantChatRoom.countDocuments(baseFilter),
    tenantChatRoom.find(groupFilter).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    tenantChatRoom.countDocuments(groupFilter),
  ]);
  const roomIds = [...new Set([...allRooms, ...groupRooms].map((room) => room._id))];
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

  return {
    all: { count: allCount, rooms: allRoomsWithRole, pagination: allPagination },
    unread: { count: allCount, rooms: allRoomsWithRole, pagination: allPagination },
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

  if (type === ChatRoomType.SEGMENT && planName) {
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
    segmentKey:type === ChatRoomType.SEGMENT ? segmentKey : null,
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
      .select("userId tenantId userName role")
      .lean<
        { userId: string; tenantId: string; userName: string; role: string[] }[]
      >();

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

