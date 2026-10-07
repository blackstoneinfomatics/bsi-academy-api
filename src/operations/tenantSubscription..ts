import mongoose from "mongoose";
import tenantsubscription from "../models/tenantsubscription";
import SubscriptionTrial from "../models/subcriptionTrial";
import SubscriptionInvoice from "../models/subscriptionInvoice";
import { SubscriptionInvoiceStatus } from "../shared/enum";

export interface GetTenantSubscriptionRecordsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  billingCycle?: string;
  sortBy?:
    | "createdAt"
    | "startDate"
    | "endDate"
    | "nextRenewalDate"
    | "subscriptionCode";
  sortOrder?: "asc" | "desc";
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getActiveTenantSubscriptionRecord = async (
  query: GetTenantSubscriptionRecordsQuery = {}
) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    paymentStatus,
    billingCycle,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);
  const searchTerm = search?.trim();

  const match: Record<string, unknown> = {
    deletedAt: null,
  };

  if (status) {
    match.status = status;
  }

  if (paymentStatus) {
    match.paymentStatus = paymentStatus;
  }

  if (billingCycle) {
    match.billingCycle = billingCycle;
  }

  const pipeline = [
    {
      $match: match,
    },
    {
      $lookup: {
        from: "tenants",
        localField: "tenantId",
        foreignField: "tenantCode",
        as: "tenant",
      },
    },
    {
      $unwind: {
        path: "$tenant",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        tenantName: "$tenant.tenantName",
      },
    },
    {
      $lookup: {
        from: "plan",
        localField: "planId",
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
  ] as mongoose.PipelineStage[];

  if (searchTerm) {
    const escapedSearch = escapeRegex(searchTerm);

    pipeline.push({
      $match: {
        $or: [
          {
            subscriptionCode: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            "tenant.tenantName": {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            "plan.planName": {
              $regex: escapedSearch,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    },
  });

  pipeline.push({
    $facet: {
      items: [
        {
          $skip: (normalizedPage - 1) * normalizedLimit,
        },
        {
          $limit: normalizedLimit,
        },
        {
          $lookup: {
            from: "subscriptioninvoice",
            let: { subscriptionId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$subscriptionId", "$$subscriptionId"],
                  },
                },
              },
              {
                $match: {
                  deletedAt: null,
                },
              },
              {
                $sort: {
                  createdAt: -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  billingPeriodId: 1,
                  totalAmount: 1,
                },
              },
            ],
            as: "subscriptionInvoice",
          },
        },
        {
          $unwind: {
            path: "$subscriptionInvoice",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            selectedBillingPeriod: {
              $first: {
                $filter: {
                  input: { $ifNull: ["$plan.billingPeriods", []] },
                  as: "period",
                  cond: {
                    $eq: [
                      "$$period.billingPeriodId",
                      "$subscriptionInvoice.billingPeriodId",
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            billingPeriodId: {
              $ifNull: ["$subscriptionInvoice.billingPeriodId", null],
            },
            billingPeriod: {
              $ifNull: [
                "$selectedBillingPeriod.billingPeriod",
                "$subscriptionInvoice.billingPeriodId",
              ],
            },
            totalAmount: {
              $ifNull: ["$subscriptionInvoice.totalAmount", null],
            },
          },
        },
        {
          $project: {
            selectedBillingPeriod: 0,
            subscriptionInvoice: 0,
          },
        },
      ],
      totalCount: [
        {
          $count: "count",
        },
      ],
    },
  });

  const result = await tenantsubscription.aggregate(
    pipeline as mongoose.PipelineStage[]
  );
  const tenants = (result[0]?.items || []).map((subscription: any) => {
    const selectedBillingPeriod = subscription.plan?.billingPeriods?.find(
      (period: any) => period.duration === subscription.duration
    );

    return {
      ...subscription,
      billingPeriod: selectedBillingPeriod?.billingPeriod ?? null,
      totalAmount: selectedBillingPeriod?.totalAmount ?? null,
    };
  });
  const totalRecords = result[0]?.totalCount?.[0]?.count || 0;
 
  return {
    total: totalRecords,
    tenants,
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

export const getTenantSubscriptionanalyticsCard = async () => {
  const now = new Date();

  // Current month
  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const nextMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  // Previous month
  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  const calculatePercentage = (
    current: number,
    previous: number
  ) => {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    return Math.round(
      ((current - previous) / previous) * 100
    );
  };

  const getChangeType = (current: number, previous: number) => {
    if (current > previous) return "UPGRADE";
    if (current < previous) return "DOWNGRADE";
    return "NO_CHANGE";
  };

  const [
    overallTotalSubscriptions,
    currentTotalSubscriptions,
    currentActiveSubscriptions,
    currentMonthlyRevenue,
    currentConvertedSubscriptions,

    previousTotalSubscriptions,
    previousActiveSubscriptions,
    previousMonthlyRevenue,
    previousConvertedSubscriptions,
  ] = await Promise.all([
    tenantsubscription.countDocuments({
      deletedAt: null,
    }),

    // CURRENT MONTH - TOTAL SUBSCRIPTIONS

    tenantsubscription.countDocuments({
      deletedAt: null,
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // CURRENT MONTH - ACTIVE SUBSCRIPTIONS

    tenantsubscription.countDocuments({
      deletedAt: null,
      status: "ACTIVE",
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // CURRENT MONTH - MONTHLY REVENUE

    SubscriptionInvoice.aggregate([
  {
    $match: {
      deletedAt: null,
      status: SubscriptionInvoiceStatus.PAID,
      invoiceDate: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    },
  },
  {
    $group: {
      _id: null,
      total: {
        $sum: {
          $ifNull: ["$totalAmount", 0],
        },
      },
    },
  },
]),

    // CURRENT MONTH - CONVERTED SUBSCRIPTIONS

    SubscriptionTrial.countDocuments({
      deletedAt: null,

      status: "CONVERTED",

      convertedAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // Previous Total Subscriptions

    tenantsubscription.countDocuments({
      deletedAt: null,
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // Previous Active Subscriptions

    tenantsubscription.countDocuments({
      deletedAt: null,
      status: "ACTIVE",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // PREVIOUS MONTH - MONTHLY REVENUE

    SubscriptionInvoice.aggregate([
      {
        $match: {
          deletedAt: null,
          status: SubscriptionInvoiceStatus.PAID,
          invoiceDate: {
            $gte: previousMonthStart,
            $lt: currentMonthStart,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },
        },
      },
    ]),

    // PREVIOUS MONTH - CONVERTED SUBSCRIPTIONS

    SubscriptionTrial.countDocuments({
      deletedAt: null,

      status: "CONVERTED",

      convertedAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),
  ]);


  const monthlyRevenue =
    currentMonthlyRevenue[0]?.total ?? 0;

  const convertedSubscriptions =
    currentConvertedSubscriptions ?? 0;

  const previousMonthlyRevenueTotal =
    previousMonthlyRevenue[0]?.total ?? 0;

  const previousConvertedTotal =
    previousConvertedSubscriptions ?? 0;


  const totalSubscriptionsPercentage =
    calculatePercentage(
      currentTotalSubscriptions,
      previousTotalSubscriptions
    );

  const activeSubscriptionsPercentage =
    calculatePercentage(
      currentActiveSubscriptions,
      previousActiveSubscriptions
    );

  const monthlyRevenuePercentage =
    calculatePercentage(
      monthlyRevenue,
      previousMonthlyRevenueTotal
    );

  const convertedSubscriptionsPercentage =
    calculatePercentage(
      convertedSubscriptions,
      previousConvertedTotal
    );

  return {
    totalSubscriptions: {
      count: currentTotalSubscriptions,
      overallCount: overallTotalSubscriptions,
      currentMonthCount: currentTotalSubscriptions,
      previousMonthCount: previousTotalSubscriptions,
      percentage: totalSubscriptionsPercentage,
      changeType: getChangeType(
        currentTotalSubscriptions,
        previousTotalSubscriptions,
      ),
    },

    activeSubscriptions: {
      count: currentActiveSubscriptions,
      currentMonthCount: currentActiveSubscriptions,
      previousMonthCount: previousActiveSubscriptions,
      percentage: activeSubscriptionsPercentage,
      changeType: getChangeType(
        currentActiveSubscriptions,
        previousActiveSubscriptions,
      ),
    },

    monthlyRevenue: {
      amount: monthlyRevenue,
      previousMonthAmount: previousMonthlyRevenueTotal,
      percentage: monthlyRevenuePercentage,
      changeType: getChangeType(
        monthlyRevenue,
        previousMonthlyRevenueTotal,
      ),
    },

    convertedSubscriptions: {
      amount: convertedSubscriptions,
      currentMonthCount: convertedSubscriptions,
      previousMonthCount: previousConvertedTotal,
      percentage: convertedSubscriptionsPercentage,
      changeType: getChangeType(
        convertedSubscriptions,
        previousConvertedTotal,
      ),
    },
  };
};

export const getTenantSubscriptionActivities = async () => {
  try {
    const now = new Date();

    // Start of today
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Start of tomorrow
    const tomorrowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const activities = await SubscriptionInvoice.aggregate([

      {
        $match: {
          deletedAt: null,
          createdAt: {
            $gte: todayStart,
            $lt: tomorrowStart,
          },
        },
      },

      // Tenant
      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "tenantCode",
          as: "tenant",
        },
      },

      {
        $unwind: {
          path: "$tenant",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Plan
      {
        $lookup: {
          from: "plan",
          localField: "planId",
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

    date: "$createdAt",

    type: "Subscription Invoice",

    activity: "$status",

    tenantName: "$tenant.tenantName",

    planName: "$plan.planName",
  },
},

      // PAYMENT TRANSACTIONS

      {
        $unionWith: {
          coll: "paymenttransaction",

          pipeline: [
            {
              $match: {
                deletedAt: null,
                createdAt: {
                  $gte: todayStart,
                  $lt: tomorrowStart,
                },
              },
            },

            // Tenant
            {
              $lookup: {
                from: "tenants",
                localField: "tenantId",
                foreignField: "tenantCode",
                as: "tenant",
              },
            },

            {
              $unwind: {
                path: "$tenant",
                preserveNullAndEmptyArrays: true,
              },
            },

            // Plan
            {
              $lookup: {
                from: "plan",
                localField: "planId",
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

    date: "$createdAt",

    type: "Payment Transaction",

    activity: "$paymentStatus",

    tenantName: "$tenant.tenantName",

    planName: "$plan.planName",
  },
},
          ],
        },
      },

      // SUBSCRIPTION TRIALS

      {
        $unionWith: {
          coll: "subscriptiontrials",

          pipeline: [
            {
              $match: {
                deletedAt: null,
                createdAt: {
                  $gte: todayStart,
                  $lt: tomorrowStart,
                },
              },
            },

            // Tenant
            {
              $lookup: {
                from: "tenants",
                localField: "tenantId",
                foreignField: "tenantCode",
                as: "tenant",
              },
            },

            {
              $unwind: {
                path: "$tenant",
                preserveNullAndEmptyArrays: true,
              },
            },

            // Plan
            {
              $lookup: {
                from: "plan",
                localField: "planId",
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

    date: "$createdAt",

    type: "Subscription Trial",

    activity: {
      $cond: [
        {
          $eq: ["$status", "CONVERTED"],
        },
        "Trial Converted",
        "$status",
      ],
    },

    tenantName: "$tenant.tenantName",

    planName: "$plan.planName",
  },
},
          ],
        },
      },

      {
        $sort: {
          date: -1,
        },
      },

      {
        $limit: 5,
      },
    ]);

    return {
      total: activities.length,
      activities,
    };
  } catch (error) {
    throw error;
  }
};

export const getTenantSubscriptionDashboard = async () => {
  const now = new Date();

  // =========================
  // Current Month
  // =========================
  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const nextMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  );

  // =========================
  // Previous Month
  // =========================
  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );

  const [
    // ============================================
    // OVERALL COUNTS
    // ============================================

    totalSubscriptions,

    activeSubscriptions,

    inactiveSubscriptions,

    // Total ACTIVE trials
    totalTrials,

    // ============================================
    // CURRENT MONTH
    // ============================================

    currentTotalSubscriptions,

    currentActiveSubscriptions,

    currentInactiveSubscriptions,

    currentTrials,

    currentExpiringThisMonth,

    // ============================================
    // PREVIOUS MONTH
    // ============================================

    previousTotalSubscriptions,

    previousActiveSubscriptions,

    previousInactiveSubscriptions,

    previousTrials,

    previousExpiringSubscriptions,
  ] = await Promise.all([
    // ============================================
    // OVERALL
    // ============================================

    // Total subscriptions
    tenantsubscription.countDocuments(),

    // Total active subscriptions
    tenantsubscription.countDocuments({
      status: "ACTIVE",
      paymentStatus: "PAID",
    }),

    // Total inactive subscriptions
    tenantsubscription.countDocuments({
      status: "INACTIVE",
    }),

    // Total active trials
    SubscriptionTrial.countDocuments({
      status: "ACTIVE",
      isConverted: false,
    }),

    // ============================================
    // CURRENT MONTH
    // ============================================

    // Subscriptions created this month
    tenantsubscription.countDocuments({
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // Active subscriptions created this month
    tenantsubscription.countDocuments({
      status: "ACTIVE",
      paymentStatus: "PAID",
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // Inactive subscriptions created this month
    tenantsubscription.countDocuments({
      status: "INACTIVE",
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // Active trials created this month
    SubscriptionTrial.countDocuments({
      status: "ACTIVE",
      isConverted: false,
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // Subscriptions expiring this month
    tenantsubscription.countDocuments({
      status: "ACTIVE",
      endDate: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    // ============================================
    // PREVIOUS MONTH
    // ============================================

    // Subscriptions created previous month
    tenantsubscription.countDocuments({
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // Active subscriptions created previous month
    tenantsubscription.countDocuments({
      status: "ACTIVE",
      paymentStatus: "PAID",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // Inactive subscriptions created previous month
    tenantsubscription.countDocuments({
      status: "INACTIVE",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // Active trials created previous month
    SubscriptionTrial.countDocuments({
      status: "ACTIVE",
      isConverted: false,
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // Subscriptions expiring previous month
    tenantsubscription.countDocuments({
      status: "ACTIVE",
      endDate: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),
  ]);

  // =========================
  // Percentage Calculation
  // =========================

  const calculatePercentage = (
    current: number,
    previous: number,
  ) => {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    return Math.round(
      ((current - previous) / previous) * 100,
    );
  };

  const totalPercentage = calculatePercentage(
    currentTotalSubscriptions,
    previousTotalSubscriptions,
  );

  const activePercentage = calculatePercentage(
    currentActiveSubscriptions,
    previousActiveSubscriptions,
  );

  const inactivePercentage = calculatePercentage(
    currentInactiveSubscriptions,
    previousInactiveSubscriptions,
  );

  const trialPercentage = calculatePercentage(
    currentTrials,
    previousTrials,
  );

  const expiringPercentage = calculatePercentage(
    currentExpiringThisMonth,
    previousExpiringSubscriptions,
  );

  // =========================
  // RESPONSE
  // =========================

  return {
    totalSubscriptions: {
      totalCount: totalSubscriptions,
      currentMonthCount: currentTotalSubscriptions,
      previousMonthCount: previousTotalSubscriptions,
      percentage: totalPercentage,
    },

    activeSubscriptions: {
      totalCount: activeSubscriptions,
      currentMonthCount: currentActiveSubscriptions,
      previousMonthCount: previousActiveSubscriptions,
      percentage: activePercentage,
    },

    inactiveSubscriptions: {
      totalCount: inactiveSubscriptions,
      currentMonthCount: currentInactiveSubscriptions,
      previousMonthCount: previousInactiveSubscriptions,
      percentage: inactivePercentage,
    },

    trials: {
      totalCount: totalTrials,
      currentMonthCount: currentTrials,
      previousMonthCount: previousTrials,
      percentage: trialPercentage,
    },

    expiringThisMonth: {
      currentMonthCount: currentExpiringThisMonth,
      previousMonthCount: previousExpiringSubscriptions,
      percentage: expiringPercentage,
    },
  };
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const getTenantSubscriptionGrowthAnalytics = async (
  view: "yearly" | "monthly" = "yearly",
  year?: number
) => {
  const match: Record<string, unknown> = { deletedAt: null };

  if (view === "monthly") {
    const targetYear = year || new Date().getFullYear();

    match.invoiceDate = {
      $gte: new Date(targetYear, 0, 1),
      $lt: new Date(targetYear + 1, 0, 1),
    };

    const result = await SubscriptionInvoice.aggregate([
      { $match: { status: SubscriptionInvoiceStatus.PAID } },

      {
        $group: {
          _id: { $month: "$invoiceDate" },
          amount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const amountByMonth = new Map(
      result.map((entry) => [entry._id, entry.amount])
    );

    const data = MONTH_NAMES.map((monthName, index) => ({
      month: index + 1,
      monthName,
      amount: amountByMonth.get(index + 1) || 0,
    }));

    return { view, year: targetYear, data };
  }

  const result = await SubscriptionInvoice.aggregate([
    { $match: { status: SubscriptionInvoiceStatus.PAID } },
    {
      $group: {
        _id: { $year: "$invoiceDate" },
        amount: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const data = result.map((entry) => ({
    year: entry._id,
    amount: entry.amount,
  }));

  return { view, data };
};

export const getTenantSubscriptionByTenantId  = async (
  tenantId: string
) => {
  const subscription = await tenantsubscription
    .findOne({
      tenantId: tenantId,
      deletedAt: null,
    })
    .populate({
      path: "planId",
    })
    .lean();

  if (!subscription) {
    return null;
  }

  const plan = subscription.planId as any;

  return {
    tenantId: subscription.tenantId,
    billingCycle: subscription.duration,
    status: subscription.status,
    nextRenewalDate: subscription.nextRenewalDate,
    plan,
    price:
      plan?.billingPeriods?.find(
        (billingPeriod: any) => billingPeriod.duration === subscription.duration
      )?.price || 0,
    // module: plan?.modules || {},
  };
};

export const getTenantsByPlan = async (planId: string) => {
  const tenants = await tenantsubscription.aggregate([
    {
      $match: {
        planId: new mongoose.Types.ObjectId(planId),
        status: "ACTIVE",
        paymentStatus: "PAID",
        deletedAt: null,
      },
    },

    {
      $lookup: {
        from: "tenants",
        localField: "tenantId",
        foreignField: "tenantCode",
        as: "tenantDetails",
      },
    },

    {
      $unwind: {
        path: "$tenantDetails",
        preserveNullAndEmptyArrays: false,
      },
    },

    {
      $project: {
        _id: 0,
        tenantId: 1,
        tenantName: "$tenantDetails.tenantName",
        planId: 1,
        planName: 1,
      },
    },

    {
      $sort: {
        tenantName: 1,
      },
    },
  ]);

  return tenants;
};