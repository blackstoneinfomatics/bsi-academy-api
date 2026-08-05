// ==============================
// plan-service.ts
// ==============================

import PlanModel, { createPlanValidation } from "../models/plan-model";
import TenantModel from "../models/tenants";
import TenantSubscriptionModel from "../models/tenantsubscription";
import Boom from "@hapi/boom";
import { z } from "zod";

export type CreatePlanPayload = z.infer<
  typeof createPlanValidation
>;

export type UpdatePlanPayload = Partial<
  z.infer<typeof createPlanValidation>
>;

const getPlanForTenant = async (tenantId: string) => {
  const tenant = await TenantModel.findOne({
    tenantCode: tenantId,
  }).lean();

  if (!tenant?.plan) {
    return null;
  }

  return PlanModel.findOne({
    planId: tenant.plan,
  }).lean();
};

export const validateCustomDomainFeatureAccess = async (
  tenantId: string
): Promise<boolean> => {
  const plan = await getPlanForTenant(tenantId);

  if (!plan?.customDomain) {
    throw Boom.forbidden(
      "Custom Domain feature is not available for your current subscription."
    );
  }

  return true;
};

export const validateBackupFeatureAccess = async (
  tenantId: string
): Promise<boolean> => {
  const plan = await getPlanForTenant(tenantId);

  if (!plan?.backup) {
    throw Boom.forbidden(
      "Backup feature is not available for your current subscription."
    );
  }

  return true;
};

// CREATE PLAN
export const createPlan = async (
  payload: CreatePlanPayload
) => {

  const newPlan =
    new PlanModel(payload);

  return await newPlan.save();
};


// GET ALL PLANS
export const getAllPlans =
  async () => {

    return await PlanModel.find()
      .lean()
      .exec();
  };


// GET PLAN BY ID
export const getPlanById =
  async (
    id: string
  ) => {

    return await PlanModel.findOne({
      planId: id,
    }).lean();
  };


// UPDATE PLAN

export const updatePlan = async (
  id: string,
  payload: UpdatePlanPayload
) => {
    // Domain validation
  if (payload.customDomain === true) {
    // Frontend must send tenant custom domain
    if (!payload.domain) {
      throw new Error("Please provide the tenant custom domain.");
    }
  }

  if (payload.customDomain === false) {
    // Frontend must send default running domain
    if (!payload.domain) {
      throw new Error("Please provide the default running domain.");
    }
  }

  return await PlanModel.findOneAndUpdate(
    {
      planId: id,
    },
    {
      $set: {
        ...payload,
        updatedDate: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();
};


// DELETE PLAN
export const deletePlan =
  async (
    id: string
  ) => {

    return await PlanModel.deleteOne({
      planId: id,
    }).exec();
  };

  
export const getPlanDashboard = async () => {
  const [
    totalPlans,
    activePlans,
    inactivePlans,
    totalTenants,
    monthlyRevenue,
    activeSubscriptions,
    trialSubscriptions,
    expiredSubscriptions,
    topPerformingPlan,
  ] = await Promise.all([
    // Total Plans
    PlanModel.countDocuments(),

    // Active Plans
    PlanModel.countDocuments({
      status: "Active",
    }),

    // Inactive Plans
    PlanModel.countDocuments({
      status: "Inactive",
    }),

    // Total Tenants
    TenantModel.countDocuments(),

    // Monthly Revenue
    PlanModel.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amountPaid",
          },
        },
      },
    ]),

    // Active Subscriptions
    TenantSubscriptionModel.countDocuments({
      status: "ACTIVE",
    }),

    // Trial Subscriptions
    TenantSubscriptionModel.countDocuments({
      status: "TRIAL",
    }),

    // Expired Subscriptions
    TenantSubscriptionModel.countDocuments({
      status: "EXPIRED",
    }),

    // Top Performing Plan
    TenantSubscriptionModel.aggregate([
      {
        $match: {
          status: "ACTIVE",
        },
      },
      {
        $group: {
          _id: "$planId",
          subscribedTenants: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          subscribedTenants: -1,
        },
      },
      {
        $limit: 1,
      },
      {
        $lookup: {
          from: "plans", // Collection name
          localField: "_id",
          foreignField: "_id",
          as: "plan",
        },
      },
      {
        $unwind: "$plan",
      },
      {
        $project: {
          _id: "$plan.planId",
          planName: "$plan.planName",
          subscribedTenants: 1,
          revenue: {
            $multiply: [
              "$subscribedTenants",
              "$plan.monthlyPrice",
            ],
          },
        },
      },
    ]),
  ]);

  const totalSubscriptions =
    activeSubscriptions +
    trialSubscriptions +
    expiredSubscriptions;

  return {
    totalPlans,
    activePlans,
    inactivePlans,

    totalTenants,

    monthlyRevenue: monthlyRevenue[0]?.total ?? 0,

    planSummary: {
      active: {
        count: activeSubscriptions,
        percentage: totalSubscriptions
          ? Math.round(
              (activeSubscriptions / totalSubscriptions) * 100
            )
          : 0,
      },
      trial: {
        count: trialSubscriptions,
        percentage: totalSubscriptions
          ? Math.round(
              (trialSubscriptions / totalSubscriptions) * 100
            )
          : 0,
      },
      expired: {
        count: expiredSubscriptions,
        percentage: totalSubscriptions
          ? Math.round(
              (expiredSubscriptions / totalSubscriptions) * 100
            )
          : 0,
      },
    },

    topPerformingPlan:
      topPerformingPlan[0] ?? {
        planName: "",
        subscribedTenants: 0,
        revenue: 0,
      },
  };
};  