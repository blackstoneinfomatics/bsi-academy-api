
import { Worker, Job } from "bullmq";

import {
  BULLMQ_JOBS,
  BULLMQ_QUEUES,
} from "../config/bullmq.config";

import { getRedisClient } from "../../shared/redisClient";

import { generateTenantBackupService } from "../../operations/requestTenant";

let backupWorker: Worker | null = null;

export const startBackupWorker = (): Worker => {
  if (backupWorker) {
    console.log("[Backup Worker] Already initialized");
    return backupWorker;
  }

  console.log("[Backup Worker] Initializing...");
  console.log("[Backup Worker] Queue:", BULLMQ_QUEUES.TENANT_BACKUP);

  // Reuse existing Redis singleton.
  const redisConnection = getRedisClient();

  backupWorker = new Worker(
    BULLMQ_QUEUES.TENANT_BACKUP,

    async (job: Job) => {
      const startTime = Date.now();

      console.log("------------------------------------------");
      console.log("[Backup Worker] Job received:", {
        jobId: job.id,
        jobName: job.name,
        queueName: job.queueName,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
        timestamp: new Date().toISOString(),
      });

      try {
        switch (job.name) {
          case BULLMQ_JOBS.GENERATE_TENANT_BACKUP: {
            const { backupId, tenantId } = job.data;

            console.log("[Backup Worker] Processing started:", {
              backupId,
              tenantId,
            });

            await generateTenantBackupService({
              backupId,
              tenantId,
            });

            const duration = Date.now() - startTime;

            console.log("[Backup Worker] Processing completed:", {
              backupId,
              tenantId,
              jobId: job.id,
              duration: `${duration}ms`,
            });

            return {
              success: true,
              backupId,
              duration,
            };
          }

          default:
            throw new Error(`Unsupported job: ${job.name}`);
        }
      } catch (error) {
        console.error("[Backup Worker] Processing error:", {
          jobId: job.id,
          jobName: job.name,
          error:
            error instanceof Error ? error.message : error,
        });

        throw error;
      }
    },

    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  // Worker ready.
  backupWorker.on("ready", () => {
    console.log(
      "[Backup Worker] Worker is ready and listening for jobs"
    );
  });

  // Job active.
  backupWorker.on("active", (job) => {
    console.log("[Backup Worker] Job active:", {
      jobId: job.id,
      jobName: job.name,
    });
  });

  // Job completed.
  backupWorker.on("completed", (job, result) => {
    console.log("[Backup Worker] Job completed successfully:", {
      jobId: job.id,
      result,
      completedAt: new Date().toISOString(),
    });

    console.log("------------------------------------------");
  });

  // Job failed.
  backupWorker.on("failed", (job, error) => {
    console.error("[Backup Worker] Job failed:", {
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      maxAttempts: job?.opts.attempts ?? 1,
      error: error.message,
      failedAt: new Date().toISOString(),
    });

    if (
      job &&
      job.attemptsMade < (job.opts.attempts ?? 1)
    ) {
      console.warn(
        "[Backup Worker] Job will be retried:",
        job.id
      );
    } else {
      console.error(
        "[Backup Worker] All retry attempts exhausted:",
        job?.id
      );
    }

    console.log("------------------------------------------");
  });

  // Worker error.
  backupWorker.on("error", (error) => {
    console.error("[Backup Worker] Worker error:", error);
  });

  console.log("[Backup Worker] Started successfully");
  console.log("[Backup Worker] Concurrency: 2");

  return backupWorker;
};

// Graceful shutdown.
export const stopBackupWorker = async (): Promise<void> => {
  if (backupWorker) {
    console.log("[Backup Worker] Closing worker...");

    await backupWorker.close();

    backupWorker = null;

    console.log("[Backup Worker] Worker closed successfully");
  }
};
