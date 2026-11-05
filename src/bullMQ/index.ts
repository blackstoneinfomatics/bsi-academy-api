import { getBackupQueue } from "./queues/backup.queue";
import {
  startBackupWorker,
  stopBackupWorker,
} from "./workers/backup.worker";

export const initializeBullMQ = async () => {
  console.log("[BullMQ] Initializing...");

  const backupQueue = getBackupQueue();

  await backupQueue.waitUntilReady();

  console.log("[BullMQ] Queue initialized successfully");

  const worker = startBackupWorker();

  await worker.waitUntilReady();

  console.log("[BullMQ] Backup worker initialized successfully");
};

export const closeBullMQ = async () => {
  console.log("[BullMQ] Closing...");

  await stopBackupWorker();

  const { closeBackupQueue } = await import("./queues/backup.queue");
  const { closeBullMQConnection } = await import(
    "./config/bullmq.connection"
  );

  await closeBackupQueue();
  await closeBullMQConnection();

  console.log("[BullMQ] Connections closed successfully");
};