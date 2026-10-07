import Tenant from "../models/tenants";
import TenantSubscription from "../models/tenantsubscription";
import PaymentTransaction from "../models/paymenttransaction";
import RefundTransaction from "../models/refundTransaction";
import SubscriptionInvoice from "../models/subscriptionInvoice";


const getMonthRange = (date: Date) => {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1
  );

  return {
    start,
    end,
  };
};

const getPercentageChange = (
  current: number,
  previous: number
) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number(
    (((current - previous) / previous) * 100).toFixed(2)
  );
};

const getTrend = (percentage: number) => {
  if (percentage > 0) {
    return "up";
  }

  if (percentage < 0) {
    return "down";
  }

  return "same";
};

export const getDashboardCards = async () => {
  const currentDate = new Date();

  const currentMonth = getMonthRange(currentDate);

  const previousMonthDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    1
  );

  const previousMonth =
    getMonthRange(previousMonthDate);

  const currentTenants =
    await Tenant.countDocuments({
      tenantCode: {
        $exists: true,
        $ne: null,
      },
      createdDate: {
        $gte: currentMonth.start,
        $lt: currentMonth.end,
      },
      deletedAt: null,
    });

  const previousTenants =
    await Tenant.countDocuments({
      tenantCode: {
        $exists: true,
        $ne: null,
      },
      createdDate: {
        $gte: previousMonth.start,
        $lt: previousMonth.end,
      },
      deletedAt: null,
    });

  const currentSubscriptions =
    await TenantSubscription.countDocuments({
      subscriptionCode: {
        $exists: true,
        $ne: null,
      },

      status: "ACTIVE",

      createdAt: {
        $gte: currentMonth.start,
        $lt: currentMonth.end,
      },

      deletedAt: null,
    });

  const previousSubscriptions =
    await TenantSubscription.countDocuments({
      subscriptionCode: {
        $exists: true,
        $ne: null,
      },

      status: "ACTIVE",

      createdAt: {
        $gte: previousMonth.start,
        $lt: previousMonth.end,
      },

      deletedAt: null,
    });

  const currentPaymentResult =
    await PaymentTransaction.aggregate([
      {
        $match: {
          paymentStatus: "SUCCESS",

          createdAt: {
            $gte: currentMonth.start,
            $lt: currentMonth.end,
          },

          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$netAmount",
          },
        },
      },
    ]);

  const currentPaymentAmount =
    currentPaymentResult[0]?.totalAmount || 0;

  const currentRefundResult =
    await RefundTransaction.aggregate([
      {
        $match: {
          refundStatus: "SUCCESS",

          createdAt: {
            $gte: currentMonth.start,
            $lt: currentMonth.end,
          },

          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$netAmount",
          },
        },
      },
    ]);

  const currentRefundAmount =
    currentRefundResult[0]?.totalAmount || 0;

  const currentRevenue =
    currentPaymentAmount - currentRefundAmount;

  const previousPaymentResult =
    await PaymentTransaction.aggregate([
      {
        $match: {
          paymentStatus: "SUCCESS",

          createdAt: {
            $gte: previousMonth.start,
            $lt: previousMonth.end,
          },

          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$netAmount",
          },
        },
      },
    ]);

  const previousPaymentAmount =
    previousPaymentResult[0]?.totalAmount || 0;

  const previousRefundResult =
    await RefundTransaction.aggregate([
      {
        $match: {
          refundStatus: "SUCCESS",

          createdAt: {
            $gte: previousMonth.start,
            $lt: previousMonth.end,
          },

          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$netAmount",
          },
        },
      },
    ]);

  const previousRefundAmount =
    previousRefundResult[0]?.totalAmount || 0;

  const previousRevenue =
    previousPaymentAmount - previousRefundAmount;

  const tenantPercentage =
    getPercentageChange(
      currentTenants,
      previousTenants
    );

  const subscriptionPercentage =
    getPercentageChange(
      currentSubscriptions,
      previousSubscriptions
    );

  const revenuePercentage =
    getPercentageChange(
      currentRevenue,
      previousRevenue
    );

  return {
    tenants: {
      count: currentTenants,
      previousMonth: previousTenants,
      percentage: Math.abs(tenantPercentage),
      trend: getTrend(tenantPercentage),
    },

    subscriptions: {
      count: currentSubscriptions,
      previousMonth: previousSubscriptions,
      percentage: Math.abs(subscriptionPercentage),
      trend: getTrend(subscriptionPercentage),
    },

    revenue: {
      amount: currentRevenue,
      previousMonth: previousRevenue,
      percentage: Math.abs(revenuePercentage),
      trend: getTrend(revenuePercentage),
    },
  };
}; 


export const getTenantsGrowth = async (
  period: string = "monthly"
) => {
  const currentDate = new Date();

  let startDate: Date;
  let endDate: Date;
  let groupFormat: string;

  if (period === "weekly") {
    const day = currentDate.getDay();

    const difference =
      day === 0 ? 6 : day - 1;

    startDate = new Date(currentDate);

    startDate.setDate(
      currentDate.getDate() - difference
    );

    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);

    endDate.setDate(
      startDate.getDate() + 7
    );

    groupFormat = "%Y-%m-%d";
  }

  else if (period === "monthly") {
    startDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

    endDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );

    groupFormat = "%Y-%m-%d";
  }

  else if (period === "yearly") {
    startDate = new Date(
      currentDate.getFullYear(),
      0,
      1
    );

    endDate = new Date(
      currentDate.getFullYear() + 1,
      0,
      1
    );

    groupFormat = "%Y-%m";
  }

  else {
    const error = new Error(
      "Period must be weekly, monthly or yearly"
    );

    (error as any).statusCode = 400;

    throw error;
  }

  const result = await TenantSubscription.aggregate([
    {
      $match: {
        tenantId: {
          $exists: true,
          $ne: null,
        },
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
        deletedAt: null,
      },
    },
    {
      $project: {
        tenantId: 1,
        status: 1,
        period: {
          $dateToString: {
            format: groupFormat,
            date: "$createdAt",
          },
        },
      },
    },
    {
      $group: {
        _id: {
          period: "$period",
          tenantId: "$tenantId",
        },
        isActive: {
          $max: {
            $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0],
          },
        },
      },
    },
    {
      $group: {
        _id: "$_id.period",
        totalTenants: { $sum: 1 },
        activeTenants: { $sum: "$isActive" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return {
    period,

    startDate,

    endDate,

    data: result.map((item) => ({
      date: item._id,
      totalTenants: item.totalTenants,
      activeTenants: item.activeTenants,
    })),
  };
};

export const getTenantSubscriptionActivities = async () => {
  try {
    const activities = await SubscriptionInvoice.aggregate([

      {
        $match: {
          deletedAt: null,
          status: "PAID",
        },
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
        $lookup: {
          from: "plan",
          localField: "planId",
          foreignField: "_id",
          as: "planDetails",
        },
      },

      {
        $unwind: {
          path: "$planDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,

          date: "$createdAt",

          type: "Subscription Invoice",

          activity: "$status",

          activityMessage: {
  $concat: [
    "$tenant.tenantName",
    " subscribed."
  ]
},

          tenantId: "$tenantId",

          tenantName: "$tenant.tenantName",

          plan: "$tenant.plan",

          status: "$tenant.status",

          createdDate: "$tenant.createdDate",

          planName: "$planDetails.planName",
        },
      },

      {
        $unionWith: {
          coll: "paymenttransaction",

          pipeline: [

            {
              $match: {
                deletedAt: null,
                paymentStatus: "SUCCESS",
              },
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
              $lookup: {
                from: "plan",
                localField: "planId",
                foreignField: "_id",
                as: "planDetails",
              },
            },

            {
              $unwind: {
                path: "$planDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $project: {
                _id: 0,

                date: "$createdAt",

                type: "Payment Transaction",

                activity: "$paymentStatus",

                activityMessage: {
  $concat: [
    "$tenant.tenantName",
    " made a payment."
  ]
},

                tenantId: "$tenantId",

                tenantName: "$tenant.tenantName",

                plan: "$tenant.plan",

                status: "$tenant.status",

                createdDate: "$tenant.createdDate",

                planName: "$planDetails.planName",
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
              },
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
              $lookup: {
                from: "plan",
                localField: "planId",
                foreignField: "_id",
                as: "planDetails",
              },
            },

            {
              $unwind: {
                path: "$planDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $project: {
                _id: 0,

                date: "$createdAt",

                type: "Subscription Trial",

                activityMessage: {
  $cond: [
    { $eq: ["$status", "CONVERTED"] },
    {
      $concat: [
        "$tenant.tenantName",
        " converted."
      ]
    },
    {
      $concat: [
        "$tenant.tenantName",
        " started a trial."
      ]
    }
  ]
},

                tenantId: "$tenantId",

                tenantName: "$tenant.tenantName",

                plan: "$tenant.plan",

                status: "$tenant.status",

                createdDate: "$tenant.createdDate",

                planName: "$planDetails.planName",
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
                refundStatus: "SUCCESS",
              },
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
              $lookup: {
                from: "plan",
                localField: "planId",
                foreignField: "_id",
                as: "planDetails",
              },
            },

            {
              $unwind: {
                path: "$planDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $project: {
                _id: 0,

                date: "$createdAt",

                type: "Refund Transaction",

                activity: "$refundStatus",

activityMessage: {
  $concat: [
    "$tenant.tenantName",
    " received a refund."
  ]
},

                tenantId: "$tenantId",

                tenantName: "$tenant.tenantName",

                plan: "$tenant.plan",

                status: "$tenant.status",

                createdDate: "$tenant.createdDate",

                planName: "$planDetails.planName",

                refundStatus: "$refundStatus",

                refundMethod: "$refundMethod",
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "tenants",

          pipeline: [

            {
              $match: {
                deletedAt: null,
              },
            },

            {
              $project: {
                _id: 0,

                date: "$createdDate",

                type: "Tenant",

                activity: "Tenant Created",

activityMessage: {
  $concat: [
    "$tenantName",
    " was created."
  ]
},

                tenantId: "$tenantCode",

                tenantName: "$tenantName",

                plan: "$plan",

                status: "$status",

                createdDate: "$createdDate",
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

export const getAnalyticsChart = async () => {
  try {
    const subscriptions = await TenantSubscription.aggregate([

      {
        $match: {
          deletedAt: null,
          status: "ACTIVE",
          paymentStatus: "PAID"
        },
      },

      {
        $group: {
          _id: "$planName",
          count: {
            $sum: 1,
          },
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: "$count",
          },

          subscriptions: {
            $push: {
              planName: "$_id",
              count: "$count",
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          total: 1,

          subscriptions: {
            $map: {
              input: "$subscriptions",
              as: "subscription",

              in: {
                planName: "$$subscription.planName",

                count: "$$subscription.count",

percentage: {
  $round: [
    {
      $multiply: [
        {
          $divide: [
            "$$subscription.count",
            "$total",
          ],
        },
        100,
      ],
    },
    0,
  ],
},
              },
            },
          },
        },
      },
    ]);

    return (
      subscriptions[0] || {
        total: 0,
        subscriptions: [],
      }
    );
  } catch (error) {
    throw error;
  }
};

export const getRevenueOverview = async (
  period: string = "monthly"
) => {
  try {
    const now = new Date();

    if (
      period !== "weekly" &&
      period !== "monthly" &&
      period !== "yearly"
    ) {
      throw {
        statusCode: 400,
        message: "Period must be weekly, monthly or yearly",
      };
    }

    // =========================
    // WEEKLY
    // =========================
    if (period === "weekly") {
      const currentDay = now.getDay();

      // Sunday = 0
      // Monday = 1
      const monday = new Date(now);

      const daysFromMonday =
        currentDay === 0 ? 6 : currentDay - 1;

      monday.setDate(
        now.getDate() - daysFromMonday
      );

      monday.setHours(0, 0, 0, 0);

      // Next Monday
      const sunday = new Date(monday);

      sunday.setDate(
        monday.getDate() + 7
      );

      const paymentRevenue =
        await PaymentTransaction.aggregate([
          {
            $match: {
              deletedAt: null,
              paymentStatus: "SUCCESS",
              createdAt: {
                $gte: monday,
                $lt: sunday,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "Asia/Kolkata",
                },
              },

              revenue: {
                $sum: "$netAmount",
              },
            },
          },
        ]);

      const refundRevenue =
        await RefundTransaction.aggregate([
          {
            $match: {
              deletedAt: null,
              refundStatus: "SUCCESS",
              createdAt: {
                $gte: monday,
                $lt: sunday,
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "Asia/Kolkata",
                },
              },

              revenue: {
                $sum: "$netAmount",
              },
            },
          },
        ]);

      const weeklyRevenue = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);

        date.setDate(
          monday.getDate() + i
        );

        const dateKey =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${String(
            date.getDate()
          ).padStart(2, "0")}`;

        const payment =
          paymentRevenue.find(
            (item) => item._id === dateKey
          );

        const refund =
          refundRevenue.find(
            (item) => item._id === dateKey
          );

        const paymentAmount =
          Number(payment?.revenue || 0);

        const refundAmount =
          Number(refund?.revenue || 0);

        const revenue = Math.round(
  paymentAmount - refundAmount
);

        weeklyRevenue.push({
          date: dateKey,

          day: date.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
            }
          ),

          revenue,
        });
      }

      const totalRevenue =
        weeklyRevenue.reduce(
          (total, item) =>
            total + item.revenue,
          0
        );

      return {
        period: "weekly",

        startDate: monday,

        endDate: new Date(
          sunday.getTime() - 1
        ),

        totalRevenue,

        revenue: weeklyRevenue,
      };
    }

    // =========================
    // MONTHLY
    // =========================

    if (period === "monthly") {
      const currentYear =
        now.getFullYear();

      const yearStart = new Date(
        currentYear,
        0,
        1
      );

      const nextYearStart = new Date(
        currentYear + 1,
        0,
        1
      );

      const paymentRevenue =
        await PaymentTransaction.aggregate([
          {
            $match: {
              deletedAt: null,

              paymentStatus: "SUCCESS",

              createdAt: {
                $gte: yearStart,
                $lt: nextYearStart,
              },
            },
          },

          {
            $group: {
              _id: {
                $month: "$createdAt",
              },

              revenue: {
                $sum: "$netAmount",
              },
            },
          },
        ]);

      const refundRevenue =
        await RefundTransaction.aggregate([
          {
            $match: {
              deletedAt: null,

              refundStatus: "SUCCESS",

              createdAt: {
                $gte: yearStart,
                $lt: nextYearStart,
              },
            },
          },

          {
            $group: {
              _id: {
                $month: "$createdAt",
              },

              revenue: {
                $sum: "$netAmount",
              },
            },
          },
        ]);

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const monthlyRevenue = [];

      for (let month = 1; month <= 12; month++) {
        const payment =
          paymentRevenue.find(
            (item) =>
              item._id === month
          );

        const refund =
          refundRevenue.find(
            (item) =>
              item._id === month
          );

        const paymentAmount =
          Number(payment?.revenue || 0);

        const refundAmount =
          Number(refund?.revenue || 0);

        const revenue = Math.round(
  paymentAmount - refundAmount
);

        monthlyRevenue.push({
          month:
            monthNames[month - 1],

          monthNumber: month,

          revenue,
        });
      }

      const totalRevenue =
        monthlyRevenue.reduce(
          (total, item) =>
            total + item.revenue,
          0
        );

      return {
        period: "monthly",

        year: currentYear,

        totalRevenue,

        revenue: monthlyRevenue,
      };
    }

    // =========================
    // YEARLY
    // =========================

    const currentYear =
      now.getFullYear();

    // Current year + previous 4 years
    // Example:
    // 2026 => 2022, 2023, 2024, 2025, 2026
    const startYear =
      currentYear - 4;

    const yearStart = new Date(
      startYear,
      0,
      1
    );

    const nextYearStart = new Date(
      currentYear + 1,
      0,
      1
    );

    const paymentRevenue =
      await PaymentTransaction.aggregate([
        {
          $match: {
            deletedAt: null,

            paymentStatus: "SUCCESS",

            createdAt: {
              $gte: yearStart,
              $lt: nextYearStart,
            },
          },
        },

        {
          $group: {
            _id: {
              $year: "$createdAt",
            },

            revenue: {
              $sum: "$netAmount",
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    const refundRevenue =
      await RefundTransaction.aggregate([
        {
          $match: {
            deletedAt: null,

            refundStatus: "SUCCESS",

            createdAt: {
              $gte: yearStart,
              $lt: nextYearStart,
            },
          },
        },

        {
          $group: {
            _id: {
              $year: "$createdAt",
            },

            revenue: {
              $sum: "$netAmount",
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    const yearlyRevenue = [];

    for (
      let year = startYear;
      year <= currentYear;
      year++
    ) {
      const payment =
        paymentRevenue.find(
          (item) =>
            item._id === year
        );

      const refund =
        refundRevenue.find(
          (item) =>
            item._id === year
        );

      const paymentAmount =
        Number(payment?.revenue || 0);

      const refundAmount =
        Number(refund?.revenue || 0);

      const revenue = Math.round(
  paymentAmount - refundAmount
);

      yearlyRevenue.push({
        year,
        revenue,
      });
    }

    const totalRevenue =
      yearlyRevenue.reduce(
        (total, item) =>
          total + item.revenue,
        0
      );

    return {
      period: "yearly",

      startYear,

      endYear: currentYear,

      totalRevenue,

      revenue: yearlyRevenue,
    };
  } catch (error) {
    throw error;
  }
};