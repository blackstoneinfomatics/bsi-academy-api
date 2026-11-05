import IORedis from "ioredis";

let bullmqConnection: IORedis | null = null;

export const getBullMQConnection = (): IORedis => {
  if (!bullmqConnection) {
    bullmqConnection = new IORedis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    bullmqConnection.on("connect", () => {
      console.log("[BullMQ] Redis connected");
    });

    bullmqConnection.on("error", (error) => {
      console.error("[BullMQ] Redis connection error", error);
    });
  }

  return bullmqConnection;
};

export const closeBullMQConnection = async (): Promise<void> => {
  if (bullmqConnection) {
    await bullmqConnection.quit();
    bullmqConnection = null;
  }
};