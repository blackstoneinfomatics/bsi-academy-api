import { Queue } from "bullmq";
import { getBullMQConnection } from "../config/bullmq.connection";
import {
  BULLMQ_JOBS,
  BULLMQ_QUEUES,
} from "../config/bullmq.config";

export interface TenantBackupJobPayload {
  backupId: string;
  tenantId: string;
}

let backupQueue: Queue<TenantBackupJobPayload> | null = null;

export const getBackupQueue = (): Queue<TenantBackupJobPayload> => {
  if (!backupQueue) {
    backupQueue = new Queue<TenantBackupJobPayload>(
      BULLMQ_QUEUES.TENANT_BACKUP,
      {
        connection: getBullMQConnection(),

        defaultJobOptions: {
          attempts: 3,

          backoff: {
            type: "exponential",
            delay: 5000,
          },

          removeOnComplete: {
            age: 86400,
            count: 1000,
          },

          removeOnFail: false,
        },
      }
    );
  }

  return backupQueue;
};

export const addTenantBackupJob = async (
  payload: TenantBackupJobPayload
) => {
  const queue = getBackupQueue();

  return queue.add(
    BULLMQ_JOBS.GENERATE_TENANT_BACKUP,
    payload,
    {
      jobId: `backup-${payload.backupId}`,
    }
  );
};

export const closeBackupQueue = async (): Promise<void> => {
  if (backupQueue) {
    await backupQueue.close();
    backupQueue = null;
  }
};