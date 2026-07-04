import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import AppLogger from "../helpers/logging";
import { academicAvailableTeachersList, academicTeacherWeeklySlots, academicTrailClassTeacher } from "../kafka/producers/academicProducer";
import message from "../models/message";

// Map to track sockets connected per userId
const userSocketsMap = new Map<string, Set<string>>();

let ioConnection: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HttpServer): void => {
  ioConnection = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  ioConnection.on("connection", (socket: Socket) => {
    AppLogger.info(`🔌 User connected - Socket ID: ${socket.id}`);

    socket.on("subscribe", (userId: string) => {
      // Add socket to room and map
      socket.join(userId);

      if (!userSocketsMap.has(userId)) {
        userSocketsMap.set(userId, new Set());
      }
      userSocketsMap.get(userId)!.add(socket.id);

      AppLogger.info(`👤 Socket ${socket.id} subscribed to userId: ${userId}`);
    });
    socket.on("availableTeachersListRequest", async(data)=>{
       try{
            if(!data.startDate || !data.WeeklySlots || !data.requestId ||!data.position) {
            AppLogger.error("Invalid request for available teachers list", data);
           return;
        }
            await academicAvailableTeachersList(data);
       }catch(error){ 
        AppLogger.error(`Error fetching available teachers list`, error);
       }
    });
    socket.on('academicTrailClassTeacherListRequest',async(data)=>{
      try{
            if(!data.startDate || !data.from || !data.to || !data.position) {
            AppLogger.error("Invalid request for available teachers list", data);
           return;
         }
             await academicTrailClassTeacher(data);
        }catch(error){
         AppLogger.error(`Error fetching available teachers list`, error);
      }
    });
    socket.on('academicTeacherWeeklySlotsListRequest',async(data)=>{
      try{
            if(!data.startDate || !data.teacherId) {
            AppLogger.error("Invalid request for available teachers list", data);
           return;
         }
             await academicTeacherWeeklySlots(data);
        }catch(error){
         AppLogger.error(`Error fetching available teachers list`, error);
      }
    });

   socket.on('userActiveStatusCheck', async(data) => {
  try {
    const { userId , senderId } = data;
    if (!userId) {
      return emitEventToClient('userActiveStatusResponse', {
        success: "inactive",
        message: 'User ID is required',
      }, senderId);
    }
  console.log("userId",userId);
    // Check if user is active
    const isActive = userSocketsMap.has(userId) && userSocketsMap.get(userId)!.size > 0;
     console.log("isActive",isActive);
    // Send back result to the requester
    emitEventToClient('userActiveStatusResponse', {
      success: isActive ? "active" : "inactive",
       message: isActive ? 'User is active' : 'User is inactive',
    },senderId);
  } catch (error) {
    AppLogger.error('Error checking user active status', error);
  }
});
    socket.on("disconnect", () => {
      // Remove socket from all user mappings
      for (const [userId, socketSet] of userSocketsMap.entries()) {
        if (socketSet.has(socket.id)) {
          socketSet.delete(socket.id);
          AppLogger.info(`❌ Socket ${socket.id} disconnected and removed from userId: ${userId}`);

          if (socketSet.size === 0) {
            userSocketsMap.delete(userId);
            AppLogger.info(`🗑️ No more sockets for userId: ${userId}, cleaned up`);
          }
          break; // Exit after found to optimize
        }
      }
    });
  });
};

export const getIO = (): SocketIOServer => {
  if (!ioConnection) {
    throw new Error("Socket.IO not initialized");
  }
  return ioConnection;
};

// Emit event to all sockets for a given userId
export const emitEventToClient = (event: string, data: any, userId?: string): void => {
  try {
    const io = getIO();

    if (userId) {
      const socketSet = userSocketsMap.get(userId);
      if (socketSet && socketSet.size > 0) {
        socketSet.forEach((socketId) => {
          io.to(socketId).emit(event, data);
        });
        AppLogger.info(`📡 Event '${event}' sent to userId: ${userId} - Sockets: ${[...socketSet]}`);
      } else {
        AppLogger.warn(`⚠️ No active sockets found for userId: ${userId}. Event '${event}' not sent.`);
      }
    } else {
      io.emit(event, data);
      AppLogger.info(`📡 Global emit for event '${event}'`);
    }
  } catch (err) {
    AppLogger.error(`🚨 Failed to emit event: ${(err as Error).message}`);
  }
};
