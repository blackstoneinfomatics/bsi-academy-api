import paymenttransaction from "../models/paymenttransaction";
import { PaymentStatus, RefundApprovalStatus, RefundStatus } from "../shared/enum";
import SubscriptionInvoiceModel from "../models/subscriptionInvoice";
import PaymentTransactionModel from "../models/paymenttransaction";
import RefundTransactionModel from "../models/refundTransaction";

export const getAllTransactions = async (query: any = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      tenantName,
      planName,
      invoiceNumber,
      invoiceFromDate,
      invoiceToDate,
      dueFromDate,
      dueToDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const match: any = {
      deletedAt: null,
    };

    if (status) {
      match.paymentStatus = status;
    }

    if (invoiceFromDate || invoiceToDate) {
      match.paymentDate = {};

      if (invoiceFromDate) {
        match.paymentDate.$gte = new Date(invoiceFromDate);
      }

      if (invoiceToDate) {
        match.paymentDate.$lte = new Date(invoiceToDate);
      }
    }

    const pipeline: any[] = [
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
          from: "subscriptioninvoice",
          localField: "invoiceId",
          foreignField: "_id",
          as: "invoice",
        },
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "tenantsubscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "subscription",
        },
      },
      {
        $unwind: {
          path: "$subscription",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "plan",
          localField: "subscription.planId",
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
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            {
              paymentNumber: {
                $regex: search,
                $options: "i",
              },
            },
            {
              transactionReference: {
                $regex: search,
                $options: "i",
              },
            },
            {
              stripePaymentIntentId: {
                $regex: search,
                $options: "i",
              },
            },
            {
              "tenant.tenantName": {
                $regex: search,
                $options: "i",
              },
            },
            {
              "invoice.invoiceNumber": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    if (tenantName) {
      pipeline.push({
        $match: {
          "tenant.tenantName": {
            $regex: tenantName,
            $options: "i",
          },
        },
      });
    }

    if (planName) {
      pipeline.push({
        $match: {
          "plan.planName": {
            $regex: planName,
            $options: "i",
          },
        },
      });
    }

    if (invoiceNumber) {
      pipeline.push({
        $match: {
          "invoice.invoiceNumber": {
            $regex: invoiceNumber,
            $options: "i",
          },
        },
      });
    }

    if (dueFromDate || dueToDate) {
      const dueDate: any = {};

      if (dueFromDate) {
        dueDate.$gte = new Date(dueFromDate);
      }

      if (dueToDate) {
        dueDate.$lte = new Date(dueToDate);
      }

      pipeline.push({
        $match: {
          "invoice.dueDate": dueDate,
        },
      });
    }

    const sortFieldMap: Record<string, string> = {
      createdAt: "createdAt",
      invoiceDate: "invoice.invoiceDate",
      dueDate: "invoice.dueDate",
      invoiceNumber: "invoice.invoiceNumber",
      totalAmount: "amount",
    };

    const sortField = sortFieldMap[sortBy] || "createdAt";

    pipeline.push({
      $sort: {
        [sortField]: sortOrder === "asc" ? 1 : -1,
      },
    });

    pipeline.push({
      $facet: {
        items: [
          {
            $skip: (Number(page) - 1) * Number(limit),
          },
          {
            $limit: Number(limit),
          },
          {
            $project: {
              _id: 0,

              transactionId: "$_id",
              paymentNumber: 1,

              tenantId: 1,
              invoiceId: 1,
              subscriptionId: 1,

              paymentType: 1,
              gateway: 1,
              paymentStatus: 1,
              amount: 1,
              currency: 1,
              stripePaymentIntentId: 1,
              transactionReference: 1,
              paymentMethod: 1,
              paymentResponse: 1,
              failureReason: 1,
              paymentDate: 1,
              refundId: 1,
              refundAmount: 1,
              refundDate: 1,
              refundReason: 1,
              createdBy: 1,
              updatedBy: 1,
              createdAt: 1,
              updatedAt: 1,

              tenant: {
                tenantId: "$tenant._id",
                tenantCode: "$tenant.tenantCode",
                tenantName: "$tenant.tenantName",
              },

              invoice: {
                invoiceId: "$invoice._id",
                invoiceNumber: "$invoice.invoiceNumber",
                invoiceDate: "$invoice.invoiceDate",
                dueDate: "$invoice.dueDate",
              },

              subscription: {
                subscriptionId: "$subscription._id",
                subscriptionCode: "$subscription.subscriptionCode",
                billingCycle: "$subscription.billingCycle",
                status: "$subscription.status",
              },

              subscriptionPlan: {
                planId: "$plan._id",
                planName: "$plan.planName",
                billingCycle: "$plan.billingCycle",
              },
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

    const result = await paymenttransaction.aggregate(pipeline);

    const items = result[0]?.items || [];
    const totalRecords = result[0]?.totalCount[0]?.count || 0;

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages: Math.ceil(totalRecords / Number(limit)),
        hasNextPage: Number(page) * Number(limit) < totalRecords,
        hasPreviousPage: Number(page) > 1,
      },
    };
  } catch (error) {
    throw error;
  }
};

export const getFinanceTransactionCardCount = async () => {
  try {
    const now = new Date();
    const successfulStatus = PaymentStatus.SUCCESS;
    const pendingStatus = PaymentStatus.PENDING;
    const failedStatus = PaymentStatus.FAILED;

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const getTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return {
          percentageChange: current > 0 ? 100.0 : 0.0,
          trend: current > 0 ? "UP" : "NO_CHANGE",
        };
      }

      const percentage = ((current - previous) / previous) * 100;

      return {
        percentageChange: Number(percentage.toFixed(2)),
        trend: percentage > 0 ? "UP" : percentage < 0 ? "DOWN" : "NO_CHANGE",
      };
    };

    // Total Invoices
    const currentTotal = await paymenttransaction.countDocuments({
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousTotal = await paymenttransaction.countDocuments({
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Successful Transactions
    const currentSuccessful = await paymenttransaction.countDocuments({
      paymentStatus: successfulStatus,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousSuccessful = await paymenttransaction.countDocuments({
      paymentStatus: successfulStatus,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Pending Transactions
    const currentPending = await paymenttransaction.countDocuments({
      paymentStatus: pendingStatus,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousPending = await paymenttransaction.countDocuments({
      paymentStatus: pendingStatus,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Failed Transactions
    const currentFailed = await paymenttransaction.countDocuments({
      paymentStatus: failedStatus,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousFailed = await paymenttransaction.countDocuments({
      paymentStatus: failedStatus,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    return {
      totalTransactions: {
        count: currentTotal,
        previousMonthCount: previousTotal,
        ...getTrend(currentTotal, previousTotal),
      },
      successfulTransactions: {
        count: currentSuccessful,
        previousMonthCount: previousSuccessful,
        ...getTrend(currentSuccessful, previousSuccessful),
      },
      pendingTransactions: {
        count: currentPending,
        previousMonthCount: previousPending,
        ...getTrend(currentPending, previousPending),
      },
      failedTransactions: {
        count: currentFailed,
        previousMonthCount: previousFailed,
        ...getTrend(currentFailed, previousFailed),
      },
    };
  } catch (error) {
    throw error;
  }
};


const getTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return {
      value: current,
      percentageChange: current > 0 ? 100 : 0,
      trend: current > 0 ? "UP" : "NO_CHANGE",
    };
  }

  const percentage = ((current - previous) / previous) * 100;

  return {
    value: current,
    percentageChange: Number(percentage.toFixed(2)),
    trend: percentage > 0 ? "UP" : percentage < 0 ? "DOWN" : "NO_CHANGE",
  };
};


const getFinanceActivityMessage = (
  type: string,
  status?: string,
  paymentType?: string,
) => {
  const normalizedType = (type || "").toLowerCase();
  const normalizedStatus = (status || "").toUpperCase();
  const normalizedPaymentType = (paymentType || "").toUpperCase();

  if (normalizedType.includes("trial")) {
    if (normalizedStatus === "CONVERTED") return "Trail Converted";
    if (normalizedStatus === "ACTIVE") return "Trial Started";
    return "Trail Updated";
  }

  if (normalizedType.includes("refund")) {
    if (normalizedStatus === "PAID") return "Refund Processed";
    return "Refund Requested";
  }

  if (normalizedPaymentType === "RENEWAL" || normalizedStatus === "RENEWAL") {
    return "Plan Upgrade";
  }

  if (normalizedStatus === "SUCCESS" || normalizedStatus === "PAID") {
    return "New Subscription";
  }

  if (normalizedStatus === "PENDING") return "Subscription Pending";

  if (normalizedStatus === "FAILED") return "Payment Failed";

  if (normalizedStatus === "APPROVED") return "Feature enabled";

  return "Subscription Updated";
};

export const getFinanceTodayActivities = async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const activities = await SubscriptionInvoiceModel.aggregate([
      {
        $match: {
          deletedAt: null,
          createdAt: {
            $gte: todayStart,
            $lt: tomorrowStart,
          },
        },
      },
      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "_id",
          as: "tenant",
        },
      },
      { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          date: "$createdAt",
          type: "subscriptioninvoice",
          activity: "$status",
          paymentType: "SUBSCRIPTION",
          tenantName: "$tenant.tenantName",
          amount: { $ifNull: ["$totalAmount", 0] },
        },
      },
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
            {
              $lookup: {
                from: "tenants",
                localField: "tenantId",
                foreignField: "_id",
                as: "tenant",
              },
            },
            { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                date: "$createdAt",
                type: "paymenttransaction",
                activity: "$paymentStatus",
                paymentType: "$paymentType",
                tenantName: "$tenant.tenantName",
                amount: { $ifNull: ["$amount", 0] },
              },
            },
          ],
        },
      },
      {
        $unionWith: {
          coll: "refundtransaction",
          pipeline: [
            {
              $match: {
                deletedAt: null,
                refundedAt: {
                  $gte: todayStart,
                  $lt: tomorrowStart,
                },
              },
            },
            {
              $lookup: {
                from: "tenants",
                localField: "tenantId",
                foreignField: "_id",
                as: "tenant",
              },
            },
            { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                date: "$refundedAt",
                type: "refundtransaction",
                activity: "$refundStatus",
                paymentType: "REFUND",
                tenantName: "$tenant.tenantName",
                amount: { $ifNull: ["$amount", 0] },
              },
            },
          ],
        },
      },
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
            {
              $lookup: {
                from: "tenants",
                localField: "tenantId",
                foreignField: "_id",
                as: "tenant",
              },
            },
            { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                date: "$createdAt",
                type: "subscriptiontrial",
                activity: "$status",
                paymentType: "TRIAL",
                tenantName: "$tenant.tenantName",
                amount: { $literal: 0 },
              },
            },
          ],
        },
      },
      {
        $sort: { date: -1 },
      },
      { $limit: 20 },
    ]);

    const result = (activities || []).map((item: any) => ({
      date: item.date,
      activity: getFinanceActivityMessage(
        item.type,
        item.activity,
        item.paymentType,
      ),
      tenantName: item.tenantName || "Unknown Tenant",
      amount: Number(item.amount || 0),
    }));

    return {
      total: result.length,
      activities: result,
    };
  } catch (error) {
    throw error;
  }
};

export const getRevenueDashboardSummary = async (query: {
  month?: number | string;
  year?: number | string;
} = {}) => {
  const selectedYear = Number(query.year || new Date().getFullYear());
  const selectedMonth = Number(query.month || new Date().getMonth() + 1);

  const currentMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const currentMonthEnd = new Date(
    selectedYear,
    selectedMonth,
    0,
    23,
    59,
    59,
    999,
  );

  const previousMonthStart = new Date(selectedYear, selectedMonth - 2, 1);
  const previousMonthEnd = new Date(
    selectedYear,
    selectedMonth - 1,
    0,
    23,
    59,
    59,
    999,
  );

  const invoiceMatch: any = {
    deletedAt: null,
    invoiceDate: {
      $gte: currentMonthStart,
      $lte: currentMonthEnd,
    },
  };

  const prevInvoiceMatch: any = {
    deletedAt: null,
    invoiceDate: {
      $gte: previousMonthStart,
      $lte: previousMonthEnd,
    },
  };

 

  const currentPaymentMatch: any = {
    paymentDate: {
      $gte: currentMonthStart,
      $lte: currentMonthEnd,
    },
    paymentStatus: {
      $in: [PaymentStatus.SUCCESS, PaymentStatus.PAID],
    },
  };

  const previousPaymentMatch: any = {
    paymentDate: {
      $gte: previousMonthStart,
      $lte: previousMonthEnd,
    },
    paymentStatus: {
      $in: [PaymentStatus.SUCCESS, PaymentStatus.PAID],
    },
  };

  const currentRefundMatch: any = {
    refundedAt: {
      $gte: currentMonthStart,
      $lte: currentMonthEnd,
    },
    refundStatus: RefundStatus.PAID,
    status: RefundApprovalStatus.APPROVED,
  };

  const previousRefundMatch: any = {
    refundedAt: {
      $gte: previousMonthStart,
      $lte: previousMonthEnd,
    },
    refundStatus: RefundStatus.PAID,
    status: RefundApprovalStatus.APPROVED,
  };

  const [
    currentRevenueAgg,
    previousRevenueAgg,
    currentCollectedAgg,
    previousCollectedAgg,
    currentRefundAgg,
    previousRefundAgg,
    annualRevenueSeries,
  ] = await Promise.all([
    SubscriptionInvoiceModel.aggregate([
      { $match: invoiceMatch },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    SubscriptionInvoiceModel.aggregate([
      { $match: prevInvoiceMatch },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    PaymentTransactionModel.aggregate([
      { $match: currentPaymentMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    PaymentTransactionModel.aggregate([
      { $match: previousPaymentMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RefundTransactionModel.aggregate([
      { $match: currentRefundMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RefundTransactionModel.aggregate([
      { $match: previousRefundMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    SubscriptionInvoiceModel.aggregate([
      {
        $match: {
          deletedAt: null,
          invoiceDate: {
            $gte: new Date(selectedYear, 0, 1),
            $lte: new Date(selectedYear, 11, 31, 23, 59, 59, 999),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$invoiceDate" } },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]),
  ]);

  const totalRevenueCurrent = currentRevenueAgg[0]?.total || 0;
  const totalRevenuePrevious = previousRevenueAgg[0]?.total || 0;
  const totalCollectedCurrent = currentCollectedAgg[0]?.total || 0;
  const totalCollectedPrevious = previousCollectedAgg[0]?.total || 0;
  const totalRefundedCurrent = currentRefundAgg[0]?.total || 0;
  const totalRefundedPrevious = previousRefundAgg[0]?.total || 0;

  const totalPendingCurrent = Math.max(0, totalRevenueCurrent - totalCollectedCurrent);
  const totalPendingPrevious = Math.max(0, totalRevenuePrevious - totalCollectedPrevious);

  const totalCollectionRate =
    totalRevenueCurrent > 0
      ? (totalCollectedCurrent / totalRevenueCurrent) * 100
      : 0;

  const totalOverdueRate =
    totalRevenueCurrent > 0
      ? ((totalRevenueCurrent - totalCollectedCurrent) / totalRevenueCurrent) * 100
      : 0;

  const netRevenue = Math.max(0, totalCollectedCurrent - totalRefundedCurrent);

  const monthLabels = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(selectedYear, index, 1);
    return date.toLocaleString("en-US", { month: "short" });
  });

  const revenueByMonth = annualRevenueSeries.reduce(
    (acc: Record<number, number>, item: any) => {
      acc[item._id.month] = item.totalRevenue || 0;
      return acc;
    },
    {},
  );

  const chartValues = monthLabels.map((_, index) => {
    const monthNumber = index + 1;
    return revenueByMonth[monthNumber] || 0;
  });

  return {
    cards: {
      totalRevenue: getTrend(totalRevenueCurrent, totalRevenuePrevious),
      collected: getTrend(totalCollectedCurrent, totalCollectedPrevious),
      pending: getTrend(totalPendingCurrent, totalPendingPrevious),
      refunded: getTrend(totalRefundedCurrent, totalRefundedPrevious),
    },
    summary: {
      totalCollectionRate: {
        value: Number(totalCollectionRate.toFixed(2)),
        trend: totalCollectionRate >= 0 ? "UP" : "DOWN",
      },
      totalOverdueRate: {
        value: Number(totalOverdueRate.toFixed(2)),
        trend: totalOverdueRate >= 0 ? "UP" : "DOWN",
      },
      netRevenue: {
        value: Number(netRevenue.toFixed(2)),
      },
    },
    revenueGrowth: {
      labels: monthLabels,
      values: chartValues,
    },
    filters: {
      month: selectedMonth,
      year: selectedYear,
    },
  };

}

export const getRevenueGrowth = async (query: {
  view?: "monthly" | "yearly";
  month?: number | string;
  year?: number | string;
}) => {
  const selectedYear = Number(query.year || new Date().getFullYear());
  const selectedMonth = Number(query.month || new Date().getMonth() + 1);
  const selectedView = query.view === "yearly" ? "yearly" : "monthly";

  const currentMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const currentMonthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

  const previousMonthStart = new Date(selectedYear, selectedMonth - 2, 1);
  const previousMonthEnd = new Date(selectedYear, selectedMonth - 1, 0, 23, 59, 59, 999);

  const currentYearStart = new Date(selectedYear, 0, 1);
  const currentYearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  const previousYearStart = new Date(selectedYear - 1, 0, 1);
  const previousYearEnd = new Date(selectedYear - 1, 11, 31, 23, 59, 59, 999);

  const currentRevenueMatch: any = {
    deletedAt: null,
    invoiceDate: selectedView === "monthly"
      ? { $gte: currentMonthStart, $lte: currentMonthEnd }
      : { $gte: currentYearStart, $lte: currentYearEnd },
  };

  const previousRevenueMatch: any = {
    deletedAt: null,
    invoiceDate: selectedView === "monthly"
      ? { $gte: previousMonthStart, $lte: previousMonthEnd }
      : { $gte: previousYearStart, $lte: previousYearEnd },
  };

  const currentPaymentMatch: any = {
    paymentDate: selectedView === "monthly"
      ? { $gte: currentMonthStart, $lte: currentMonthEnd }
      : { $gte: currentYearStart, $lte: currentYearEnd },
    paymentStatus: {
      $in: [PaymentStatus.SUCCESS, PaymentStatus.PAID],
    },
  };

  const previousPaymentMatch: any = {
    paymentDate: selectedView === "monthly"
      ? { $gte: previousMonthStart, $lte: previousMonthEnd }
      : { $gte: previousYearStart, $lte: previousYearEnd },
    paymentStatus: {
      $in: [PaymentStatus.SUCCESS, PaymentStatus.PAID],
    },
  };

  const currentRefundMatch: any = {
    refundedAt: selectedView === "monthly"
      ? { $gte: currentMonthStart, $lte: currentMonthEnd }
      : { $gte: currentYearStart, $lte: currentYearEnd },
    refundStatus: RefundStatus.PAID,
    status: RefundApprovalStatus.APPROVED,
  };

  const previousRefundMatch: any = {
    refundedAt: selectedView === "monthly"
      ? { $gte: previousMonthStart, $lte: previousMonthEnd }
      : { $gte: previousYearStart, $lte: previousYearEnd },
    refundStatus: RefundStatus.PAID,
    status: RefundApprovalStatus.APPROVED,
  };

  const [
    totalRevenueCurrent,
    totalRevenuePrevious,
    collectedCurrent,
    collectedPrevious,
    refundedCurrent,
    refundedPrevious,
    trendSeries,
  ] = await Promise.all([
    SubscriptionInvoiceModel.aggregate([
      { $match: currentRevenueMatch },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    SubscriptionInvoiceModel.aggregate([
      { $match: previousRevenueMatch },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    PaymentTransactionModel.aggregate([
      { $match: currentPaymentMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    PaymentTransactionModel.aggregate([
      { $match: previousPaymentMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RefundTransactionModel.aggregate([
      { $match: currentRefundMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RefundTransactionModel.aggregate([
      { $match: previousRefundMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    selectedView === "monthly"
      ? SubscriptionInvoiceModel.aggregate([
          {
            $match: {
              deletedAt: null,
              invoiceDate: {
                $gte: new Date(selectedYear, 0, 1),
                $lt: new Date(selectedYear + 1, 0, 1),
              },
            },
          },
          {
            $group: {
              _id: { month: { $month: "$invoiceDate" } },
              totalRevenue: { $sum: "$totalAmount" },
            },
          },
          { $sort: { "_id.month": 1 } },
        ])
      : SubscriptionInvoiceModel.aggregate([
          {
            $match: {
              deletedAt: null,
              invoiceDate: {
                $gte: new Date(selectedYear - 7, 0, 1),
                $lt: new Date(selectedYear + 1, 0, 1),
              },
            },
          },
          {
            $group: {
              _id: { year: { $year: "$invoiceDate" } },
              totalRevenue: { $sum: "$totalAmount" },
            },
          },
          { $sort: { "_id.year": 1 } },
        ]),
  ]);

 
 
  const data =
    selectedView === "monthly"
      ? Array.from({ length: 12 }, (_, index) => {
          const monthNumber = index + 1;
          const item = trendSeries.find((entry: any) => entry._id.month === monthNumber);
          return {
            month: monthNumber,
            monthName: new Date(selectedYear, index, 1).toLocaleString("en-US", {
              month: "short",
            }),
            amount: item?.totalRevenue || 0,
          };
        })
      : trendSeries.map((item: any) => ({
          year: Number(item._id.year),
          amount: item.totalRevenue || 0,
        }));

  return {
    view: selectedView,
    year: selectedYear,
    data,
    
  };
};


