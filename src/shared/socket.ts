import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import AppLogger from "../helpers/logging";
import { ChatSource } from "./enum";
import {
  academicAvailableTeachersList,
  academicTeacherWeeklySlots,
  academicTrailClassTeacher,
} from "../kafka/producers/academicProducer";
import { UserRoomMemberModel } from "../models/userChatRoomMember";
import { TenantRoomMemberModel } from "../models/tenantChatRoomMember";
import mongoose from "mongoose";
import { throwError } from "../helpers/throwError";

export const CHAT_EVENTS = {
  ROOM_CREATED: "chat:roomCreated",
  NEW_MESSAGE: "chat:newMessage",
  UNREAD_COUNT_UPDATED: "chat:unreadCountUpdated",
  MESSAGE_SEEN: "chat:messageSeen",
  MESSAGE_DELETED: "chat:messageDeleted",
  ROOM_UPDATED: "chat:roomUpdated",
  MEMBER_ADDED: "chat:memberAdded",
  MEMBER_REMOVED: "chat:memberRemoved",
  CLEARED: "chat:cleared",
} as const;

// Tracks connected sockets per user.
const userSocketsMap = new Map<string, Set<string>>();

let ioConnection: SocketIOServer | null = null;

// Remove a socket from its previously subscribed user.
const removeSocketFromUser = (socket: Socket): void => {
  const userId = socket.data.subscribedUserId as string | undefined;

  if (!userId) return;

  const socketSet = userSocketsMap.get(userId);

  if (socketSet) {
    socketSet.delete(socket.id);

    if (socketSet.size === 0) {
      userSocketsMap.delete(userId);
    }
  }

  socket.data.subscribedUserId = undefined;
};

export const initializeSocket = (httpServer: HttpServer): void => {
  ioConnection = new SocketIOServer(httpServer, {
    cors: {
      // Replace with your actual frontend origins.
      origin: process.env.SOCKET_CORS_ORIGIN?.split(",") ?? [],
      credentials: true,
    },
  });

  ioConnection.on("connection", (socket: Socket) => {
    AppLogger.info(`User connected: ${socket.id}`);

    // Keep the existing frontend event for compatibility.
    // IMPORTANT: Replace client-supplied identity with authenticated
    // socket.data.userId before using this in production.
    socket.on("subscribe", async (userId: string) => {
      try {
        if (typeof userId !== "string" || !userId.trim()) {
          socket.emit("socket:error", {
            message: "Valid userId is required",
          });
          return;
        }

        // Prevent one socket from being associated with multiple users.
        const existingUserId = socket.data.subscribedUserId as
          | string
          | undefined;

        if (existingUserId && existingUserId !== userId) {
          await socket.leave(existingUserId);
          removeSocketFromUser(socket);
        }

        await socket.join(userId);

        if (!userSocketsMap.has(userId)) {
          userSocketsMap.set(userId, new Set<string>());
        }

        userSocketsMap.get(userId)!.add(socket.id);
        socket.data.subscribedUserId = userId;

        AppLogger.info(`Socket ${socket.id} subscribed to userId: ${userId}`);
      } catch (error) {
        AppLogger.error("Socket subscription failed", error);
      }
    });
    // Join a specific chat room
   socket.on(
  "chat:join",
  async (data: { source: ChatSource; roomId: string }) => {
    try {
     

     const parsedData =
  typeof data === "string" ? JSON.parse(data) : data;

const { source, roomId } = parsedData ?? {};

      const userId = socket.data.subscribedUserId as
        | string
        | undefined;

      if (!userId) {
        socket.emit("socket:error", {
          message: "Subscribe to a user first",
        });
        return;
      }
      
      if (
        !Object.values(ChatSource).includes(source) ||
        !roomId ||
        !mongoose.isValidObjectId(roomId)
      ) {
        socket.emit("socket:error", {
          message: "Invalid source or MongoDB roomId",
          received: { source, roomId },
        });
        return;
      }

      AppLogger.info(
        `Checking membership: source=${source}, userId=${userId}, roomId=${roomId}`
      );

    let membership: unknown;

if (source === ChatSource.TENANT) {
  membership = await UserRoomMemberModel.findOne({
    roomId,
    userId,
    isActive: true,
    deletedAt: null,
  }).lean();
} else if (source === ChatSource.SUPER_ADMIN) {
  membership = await TenantRoomMemberModel.findOne({
    roomId,
    userId,
    isActive: true,
    deletedAt: null,
  }).lean();
}

if (!membership) {
  AppLogger.warn(
    `Membership not found: source=${source}, userId=${userId}, roomId=${roomId}`
  );

  socket.emit("socket:error", {
    message: "You are not an active member of this chat room",
  });

  return;
}

      const chatRoom = getChatSocketRoom(source, roomId);

      await socket.join(chatRoom);

      AppLogger.info(
        `Successfully joined Socket.IO room: ${chatRoom}`
      );

      socket.emit("chat:joined", {
        success: true,
        source,
        roomId,
        socketRoom: chatRoom,
        message: "Joined chat room successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      AppLogger.error(
        `chat:join failed: ${errorMessage}`
      );

      socket.emit("socket:error", {
        message: "Failed to join chat room",
        details: errorMessage,
      });
    }
  }
);

    // Leave a specific chat room
    socket.on(
      "chat:leave",
      async (data: { source: ChatSource; roomId: string }) => {
        try {
          const { source, roomId } = data ?? {};

          if (
            !Object.values(ChatSource).includes(source) ||
            !roomId ||
            !mongoose.isValidObjectId(roomId)
          ) {
            socket.emit("socket:error", {
              message: "Invalid chat source or roomId",
            });
            return;
          }

          const chatRoom = getChatSocketRoom(source, roomId);

          await socket.leave(chatRoom);

          socket.emit("chat:left", {
            success: true,
            source,
            roomId,
            message: "Left chat room successfully",
          });

          AppLogger.info(`Socket ${socket.id} left chat room ${chatRoom}`);
        } catch (error) {
          AppLogger.error("Failed to leave chat room", error);

          socket.emit("socket:error", {
            message: "Failed to leave chat room",
          });
        }
      },
    );

    // Existing academic events — preserved.
    socket.on("availableTeachersListRequest", async (data) => {
      try {
        if (
          !data?.startDate ||
          !data?.WeeklySlots ||
          !data?.requestId ||
          !data?.position
        ) {
          AppLogger.error("Invalid request for available teachers list", data);
          return;
        }

        await academicAvailableTeachersList(data);
      } catch (error) {
        AppLogger.error("Error fetching available teachers list", error);
      }
    });

    socket.on("academicTrailClassTeacherListRequest", async (data) => {
      try {
        if (!data?.startDate || !data?.from || !data?.to || !data?.position) {
          AppLogger.error("Invalid request for trail class teacher list", data);
          return;
        }

        await academicTrailClassTeacher(data);
      } catch (error) {
        AppLogger.error("Error fetching trail class teacher list", error);
      }
    });

    socket.on("academicTeacherWeeklySlotsListRequest", async (data) => {
      try {
        if (!data?.startDate || !data?.teacherId) {
          AppLogger.error("Invalid request for teacher weekly slots", data);
          return;
        }

        await academicTeacherWeeklySlots(data);
      } catch (error) {
        AppLogger.error("Error fetching teacher weekly slots", error);
      }
    });

    // Existing active-status event.
    socket.on("userActiveStatusCheck", (data) => {
      try {
        const { userId } = data ?? {};

        if (!userId) {
          socket.emit("userActiveStatusResponse", {
            success: "inactive",
            message: "User ID is required",
          });
          return;
        }

        const isActive = (userSocketsMap.get(userId)?.size ?? 0) > 0;

        socket.emit("userActiveStatusResponse", {
          success: isActive ? "active" : "inactive",
          message: isActive ? "User is active" : "User is inactive",
        });
      } catch (error) {
        AppLogger.error("Error checking user active status", error);
      }
    });

    socket.on("disconnect", () => {
      removeSocketFromUser(socket);
      AppLogger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

export const getIO = (): SocketIOServer => {
  if (!ioConnection) {
    throw new Error("Socket.IO not initialized");
  }

  return ioConnection;
};

// Emit to every active connection subscribed to the user room.
export const emitEventToClient = (
  event: string,
  data: any,
  userId?: string,
): void => {
  try {
    const io = getIO();

    if (userId) {
      if ((userSocketsMap.get(userId)?.size ?? 0) === 0) {
        AppLogger.warn(
          `No active sockets for userId: ${userId}; event: ${event}`,
        );
        return;
      }

      io.to(userId).emit(event, data);

      AppLogger.info(`Event '${event}' sent to userId: ${userId}`);
      return;
    }

    io.emit(event, data);
    AppLogger.info(`Global event emitted: ${event}`);
  } catch (error) {
    AppLogger.error(`Failed to emit event: ${(error as Error).message}`);
  }
};

export const getChatSocketRoom = (source: ChatSource, roomId: string): string =>
  `chat:${source}:${roomId}`;

export const emitChatEventToRoom = (
  source: ChatSource,
  roomId: string,
  event: string,
  data: unknown,
): void => {
  try {
    getIO().to(getChatSocketRoom(source, roomId)).emit(event, data);

    AppLogger.info(`Chat event '${event}' emitted for ${source}:${roomId}`);
  } catch (error) {
    AppLogger.error(`Failed to emit chat event: ${(error as Error).message}`);
  }
};
