// ==============================
// plan-service.ts
// ==============================

import PlanModel, {
  createPlanValidation,
  AddBillingPeriodPayload,
  UpdateBillingPeriodPayload,
} from "../models/plan-model";
import TenantModel from "../models/tenants";
import TenantSubscriptionModel from "../models/tenantsubscription";
import SubscriptionInvoiceModel from "../models/subscriptionInvoice";
import { SubscriptionInvoiceStatus } from "../shared/enum";
import Boom from "@hapi/boom";
import { z } from "zod";
import { planMessages } from "../config/messages";

export type PlanAnalyticsPeriod = "monthly" | "quarterly" | "yearly";

export interface PlanAnalyticsPlan {
  planId: string;
  planName: string;
  revenue: number;
  percentage: number;
}

export interface PlanAnalyticsResponse {
  period: PlanAnalyticsPeriod;
  plans: PlanAnalyticsPlan[];
  popularPlan: PlanAnalyticsPlan | null;
}

export interface GetPlansQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  planStatus?: "Growing" | "Low_Adoption" | "Most_Popular";
  sortBy?:
    | "createdDate"
    | "updatedDate"
    | "planName"
    | "monthlyPrice"
    | "yearlyPrice"
    | "studentLimit";
  sortOrder?: "asc" | "desc";
}

export type CreatePlanPayload = z.infer<
  typeof createPlanValidation
>;

export type UpdatePlanPayload = Partial<
  z.infer<typeof createPlanValidation>
>;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    throw Boom.forbidden(planMessages.CUSTOM_DOMAIN_NOT_AVAILABLE);
  }

  return true;
};

export const validateBackupFeatureAccess = async (
  tenantId: string
): Promise<boolean> => {
  const plan = await getPlanForTenant(tenantId);

  if (!plan?.backup) {
    throw Boom.forbidden(planMessages.BACKUP_NOT_AVAILABLE);
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
export const getAllPlans = async (query: GetPlansQuery = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    planStatus,
    sortBy = "createdDate",
    sortOrder = "desc",
  } = query;

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);
  const searchTerm = search?.trim();

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (planStatus) {
    filter.planStatus = planStatus;
  }


  if (searchTerm) {
    const escapedSearch = escapeRegex(searchTerm);

    filter.$or = [
      {
        planId: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        planName: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        planDescription: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  const [items, totalRecords] = await Promise.all([
    PlanModel.find(filter)
      .sort({
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean()
      .exec(),
    PlanModel.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / normalizedLimit),
      hasNextPage: normalizedPage * normalizedLimit < totalRecords,
      hasPreviousPage: normalizedPage > 1,
    },
  };
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
      throw new Error(planMessages.CUSTOM_DOMAIN_REQUIRED);
    }
  }

  if (payload.customDomain === false) {
    // Frontend must send default running domain
    if (!payload.domain) {
      throw new Error(planMessages.DEFAULT_DOMAIN_REQUIRED);
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


const generateBillingPeriodId = (
  existingBillingPeriods: { billingPeriodId: string }[]
) => {
  let lastNumber = 0;

  for (const billingPeriod of existingBillingPeriods) {
    const match = billingPeriod.billingPeriodId.match(/^BP-(\d+)$/);
    const number = match ? parseInt(match[1], 10) : NaN;

    if (!Number.isNaN(number) && number > lastNumber) {
      lastNumber = number;
    }
  }

  return `BP-${String(lastNumber + 1).padStart(3, "0")}`;
};

// ADD BILLING PERIOD
export const addPlanBillingPeriod = async (
  planId: string,
  payload: AddBillingPeriodPayload
) => {
  const plan = await PlanModel.findOne({ planId }).lean();

  if (!plan) {
    return null;
  }

  const billingPeriodId = generateBillingPeriodId(plan.billingPeriods);

  const billingPeriodAlreadyExists = plan.billingPeriods.some(
    (billingPeriod) => billingPeriod.billingPeriodId === billingPeriodId
  );

  if (billingPeriodAlreadyExists) {
    return "DUPLICATE" as const;
  }

  return await PlanModel.findOneAndUpdate(
    { planId },
    { $push: { billingPeriods: { ...payload, billingPeriodId } } },
    { new: true, runValidators: true }
  ).lean();
};


// UPDATE BILLING PERIOD
export const updatePlanBillingPeriod = async (
  planId: string,
  billingPeriodId: string,
  payload: UpdateBillingPeriodPayload
) => {
  const plan = await PlanModel.findOne({ planId }).lean();

  if (!plan) {
    return null;
  }

  return await PlanModel.findOneAndUpdate(
    {
      planId,
      "billingPeriods.billingPeriodId": billingPeriodId,
    },
    {
      $set: {
        "billingPeriods.$.price": payload.price,
        "billingPeriods.$.discount": payload.discount,
        "billingPeriods.$.gstRate": payload.gstRate,
        "billingPeriods.$.taxAmount": payload.taxAmount,
        "billingPeriods.$.totalAmount": payload.totalAmount,
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
          deletedAt: null,
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
          from: "plan",
          localField: "_id",
          foreignField: "_id",
          as: "plan",
        },
      },
      {
        $unwind: {
          path: "$plan",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          planId: "$plan.planId",
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
      topPerformingPlan[0]
        ? {
            ...topPerformingPlan[0],
            percentage: totalSubscriptions
              ? Math.round(
                  (topPerformingPlan[0].subscribedTenants /
                    totalSubscriptions) *
                    100
                )
              : 0,
          }
        : {
            planId: "",
            planName: "",
            subscribedTenants: 0,
            revenue: 0,
            percentage: 0,
          },
  };
};

const getAnalyticsPeriodRange = (period: PlanAnalyticsPeriod) => {
  const now = new Date();
  const year = now.getFullYear();

  if (period === "monthly") {
    return {
      start: new Date(year, now.getMonth(), 1),
      end: new Date(year, now.getMonth() + 1, 1),
    };
  }

  if (period === "quarterly") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;

    return {
      start: new Date(year, quarterStartMonth, 1),
      end: new Date(year, quarterStartMonth + 3, 1),
    };
  }

  return {
    start: new Date(year, 0, 1),
    end: new Date(year + 1, 0, 1),
  };
};

// GET PLAN ANALYTICS (revenue by plan for the selected period)
export const getPlanAnalytics = async (
  period: PlanAnalyticsPeriod = "yearly"
): Promise<PlanAnalyticsResponse> => {
  const { start, end } = getAnalyticsPeriodRange(period);

  const [activePlans, revenueByPlan] = await Promise.all([
    PlanModel.find({ status: "Active" }).lean(),

    SubscriptionInvoiceModel.aggregate([
      {
        $match: {
          status: SubscriptionInvoiceStatus.PAID,
          deletedAt: null,
          invoiceDate: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: "$planId",
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]),
  ]);

  const revenueByPlanId = new Map<string, number>(
    revenueByPlan.map((entry) => [entry._id.toString(), entry.revenue])
  );

  const plansWithRevenue = activePlans.map((plan) => ({
    planId: plan.planId,
    planName: plan.planName,
    revenue: revenueByPlanId.get(plan._id.toString()) || 0,
  }));

  const totalRevenue = plansWithRevenue.reduce(
    (sum, plan) => sum + plan.revenue,
    0
  );

  const plans: PlanAnalyticsPlan[] = plansWithRevenue.map((plan) => ({
    ...plan,
    percentage:
      totalRevenue > 0
        ? Math.round((plan.revenue / totalRevenue) * 100)
        : 0,
  }));

  const popularPlan = plans.reduce<PlanAnalyticsPlan | null>(
    (top, plan) => (!top || plan.revenue > top.revenue ? plan : top),
    null
  );

  return {
    period,
    plans,
    popularPlan,
  };
};