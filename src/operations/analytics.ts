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