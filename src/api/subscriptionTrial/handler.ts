import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { SubscriptionTrialStatus } from "../../shared/enum";
import {
  getSubscriptionTrialById,
  getSubscriptionTrialDashboardCount,
  getSubscriptionTrials,
  updateSubscriptionTrial,
} from "../../operations/subscriptiontrial";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const getSubscriptionTrialByIdValidation = z.object({
  params: z.object({
    trialId: objectId,
  }),
});

export const updateTrialValidation = z.object({
  status: z.string().optional(),
  trialEndDate: z.coerce.date().optional(),
  updatedBy: z.string().optional(),
});

export const getSubscriptionTrialsValidation = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),

    search: z.string().optional(),

    status: z
      .enum([
        SubscriptionTrialStatus.ACTIVE,
        SubscriptionTrialStatus.CANCELLED,
        SubscriptionTrialStatus.CONVERTED,
        SubscriptionTrialStatus.EXPIRED,
        SubscriptionTrialStatus.INACTIVE,
        SubscriptionTrialStatus.COMPLETED,
      ])
      .optional(),

    tenantName: z.string().optional(),

    trialStartDate: z.coerce.date().optional(),

    trialEndDate: z.coerce.date().optional(),

    sortBy: z
      .enum([
        "trialStartDate",
        "trialEndDate",
        "tenantName",
        "status",
        "createdAt",
      ])
      .default("createdAt"),

    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export default {
  getSubscriptionTrials: async (request: Request, h: ResponseToolkit) => {
    try {
      const { query } = getSubscriptionTrialsValidation.parse({
        query: request.query,
      });
      const result = await getSubscriptionTrials(query);
      return h
        .response({
          message: "Subscription trials fetched successfully",
          success: true,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.message,
        })
        .code(500);
    }
  },

  getSubscriptionTrialById: async (request: Request, h: ResponseToolkit) => {
    try {
      const { params } = getSubscriptionTrialByIdValidation.parse({
        params: request.params,
      });
      const result = await getSubscriptionTrialById(params.trialId);
      return h
        .response({
          message: "Subscription trial fetched successfully",
          success: true,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.message,
        })
        .code(500);
    }
  },
  getSubscriptionTrialDashboardCount: async (
    request: Request,
    h: ResponseToolkit,
  ) => {
    try {
      const result = await getSubscriptionTrialDashboardCount();
      return h
        .response({
          message: "Subscription trial dashboard count fetched successfully",
          success: true,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.message,
        })
        .code(500);
    }
  },

  updateSubscriptionTrial: async (request: Request, h: ResponseToolkit) => {
    try {
      const { trialId } = request.params as { trialId: string };

      const parsed = updateTrialValidation.safeParse(request.payload);

      if (!parsed.success) {
        return h
          .response({
            success: false,
            message: "Validation Failed",
          })
          .code(400);
      }

      const result = await updateSubscriptionTrial(trialId, {
        status: parsed.data.status,
        trialEndDate: parsed.data.trialEndDate
          ? new Date(parsed.data.trialEndDate)
          : undefined,
        updatedBy: parsed.data.updatedBy || "system",
      });

      return h
        .response({
          success: true,
          message: "Trial updated successfully.",
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.message,
        })
        .code(500);
    }
  },
};
