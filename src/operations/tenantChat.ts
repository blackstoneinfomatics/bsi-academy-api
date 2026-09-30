import tenantChatRoom from "../models/tenantChatRoom";
import { TenantRoomMemberModel } from "../models/tenantChatRoomMember";
import { ITenantChatRoom } from "../../types/models.types";
import { Types } from "mongoose";
import { ChatRoomType } from "../shared/enum";
import TenantUsers from "../models/users";
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