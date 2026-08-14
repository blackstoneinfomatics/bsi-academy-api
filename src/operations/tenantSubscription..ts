import mongoose from "mongoose";
import tenantsubscription from "../models/tenantsubscription";
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
        foreignField: "_id",
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
  const tenants = result[0]?.items || [];
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

export const getTenantSubscriptionDashboard = async () => {
  const now = new Date();

  // Current month start
  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  // Next month start
  const nextMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  // Previous month start
  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  const [
    totalSubscriptions,
    activeSubscriptions,
    inactiveSubscriptions,
    expiringThisMonth,

    // Previous month
    previousTotalSubscriptions,
    previousActiveSubscriptions,
    previousInactiveSubscriptions,
    previousExpiringSubscriptions,
  ] = await Promise.all([


    tenantsubscription.countDocuments(),

    tenantsubscription.countDocuments({
      status: "Active",
      paymentStatus: "PAID",
    }),

    tenantsubscription.countDocuments({
      status: "Inactive",
    }),

    tenantsubscription.countDocuments({
      status: "Active",
      endDate: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    tenantsubscription.countDocuments({
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    tenantsubscription.countDocuments({
      status: "Active",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    tenantsubscription.countDocuments({
      status: "Inactive",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    tenantsubscription.countDocuments({
      status: "Active",
      endDate: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),
  ]);

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

  const totalPercentage = calculatePercentage(
    totalSubscriptions,
    previousTotalSubscriptions
  );

  const activePercentage = calculatePercentage(
    activeSubscriptions,
    previousActiveSubscriptions
  );

  const inactivePercentage = calculatePercentage(
    inactiveSubscriptions,
    previousInactiveSubscriptions
  );

  const expiringPercentage = calculatePercentage(
    expiringThisMonth,
    previousExpiringSubscriptions
  );

  return {
    totalSubscriptions: {
      count: totalSubscriptions,
      percentage: totalPercentage,
    },

    activeSubscriptions: {
      count: activeSubscriptions,
      percentage: activePercentage,
    },

    inactiveSubscriptions: {
      count: inactiveSubscriptions,
      percentage: inactivePercentage,
    },

    expiringThisMonth: {
      count: expiringThisMonth,
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
  const match: any = { deletedAt: null };

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