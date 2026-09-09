import Tenant from "../models/tenants";
import TenantSubscription from "../models/tenantsubscription";
import PaymentTransaction from "../models/paymenttransaction";
import RefundTransaction from "../models/refundTransaction";

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

  const result = await Tenant.aggregate([
    {
      $match: {
        tenantCode: {
          $exists: true,
          $ne: null,
        },

        createdDate: {
          $gte: startDate,
          $lt: endDate,
        },

        deletedAt: null,
      },
    },

    {
      $group: {
        _id: {
          $dateToString: {
            format: groupFormat,
            date: "$createdDate",
          },
        },

        totalTenants: {
          $sum: 1,
        },

        activeTenants: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$status",
                  "ACTIVE",
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
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