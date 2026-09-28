import TenantSubscription from "../models/tenantsubscription";
import Tenants from "../models/tenants";
import PaymentTransaction from "../models/paymenttransaction";
import RefundTransaction from "../models/refundTransaction";


const getCurrentMonthRange = () => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  return {
    start,
    end,
  };
};


const getPreviousMonthRange = () => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  return {
    start,
    end,
  };
};


const calculatePercentage = (current: number, previous: number) => {
  if (previous === 0 && current === 0) {
    return {
      percentage: 0,
      direction: "same",
    };
  }

  if (previous === 0) {
    return {
      percentage: 100,
      direction: "up",
    };
  }

  const percentage = Math.round(
    ((current - previous) / previous) * 100
  );

  let direction: "up" | "down" | "same" = "same";

  if (percentage > 0) {
    direction = "up";
  }

  if (percentage < 0) {
    direction = "down";
  }

  return {
    percentage: Math.abs(percentage),
    direction,
  };
};


export const getDashboardCards = async () => {

  const currentMonth = getCurrentMonthRange();

  const previousMonth = getPreviousMonthRange();


  const currentActiveTenants =
    await Tenants.countDocuments({
      status: "Active",
      deletedAt: null,
      createdDate: {
        $gte: currentMonth.start,
        $lt: currentMonth.end,
      },
    });

  const currentInactiveTenants =
    await Tenants.countDocuments({
      status: "Inactive",
      deletedAt: null,
      createdDate: {
        $gte: currentMonth.start,
        $lt: currentMonth.end,
      },
    });

  const previousActiveTenants =
    await Tenants.countDocuments({
      status: "Active",
      deletedAt: null,
      createdDate: {
        $gte: previousMonth.start,
        $lt: previousMonth.end,
      },
    });

  const previousInactiveTenants =
    await Tenants.countDocuments({
      status: "Inactive",
      deletedAt: null,
      createdDate: {
        $gte: previousMonth.start,
        $lt: previousMonth.end,
      },
    });

  const currentTenants =
    currentActiveTenants + currentInactiveTenants;
  const previousTenants =
    previousActiveTenants + previousInactiveTenants;

  const tenantChange = calculatePercentage(
    currentTenants,
    previousTenants,
  );


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


  const currentRevenue = Math.round(
  currentPaymentAmount - currentRefundAmount
);


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


const previousRevenue = Math.round(
  previousPaymentAmount - previousRefundAmount
);


  const revenueChange = calculatePercentage(
    currentRevenue,
    previousRevenue
  );


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


  const subscriptionChange =
    calculatePercentage(
      currentSubscriptions,
      previousSubscriptions
    );


  const currentPlanExpired =
    await TenantSubscription.countDocuments({
      status: "EXPIRED",

      deletedAt: null,

      createdAt: {
        $gte: currentMonth.start,
        $lt: currentMonth.end,
      },
    });


  const previousPlanExpired =
    await TenantSubscription.countDocuments({
      status: "EXPIRED",

      deletedAt: null,

      createdAt: {
        $gte: previousMonth.start,
        $lt: previousMonth.end,
      },
    });


  const planExpiredChange =
    calculatePercentage(
      currentPlanExpired,
      previousPlanExpired
    );


  return {

    totalTenant: {
      count: currentTenants,
      percentage: tenantChange.percentage,
      direction: tenantChange.direction,
    },

    totalRevenue: {
      count: currentRevenue,
      percentage: revenueChange.percentage,
      direction: revenueChange.direction,
    },

    subscriptions: {
      count: currentSubscriptions,
      percentage: subscriptionChange.percentage,
      direction: subscriptionChange.direction,
    },

    planExpired: {
      count: currentPlanExpired,
      percentage: planExpiredChange.percentage,
      direction: planExpiredChange.direction,
    },

  };
};

export const getUpcomingTenantRenewals = async () => {
  const now = new Date();

  const fiveDaysLater = new Date(now);
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

  // Get total count of subscriptions expiring within 5 days
  const totalExpiryIn5Days = await TenantSubscription.countDocuments({
    nextRenewalDate: {
      $gte: now,
      $lte: fiveDaysLater,
    },
    deletedAt: null,
  });

  // Get only recent 7 tenants
  const tenants = await TenantSubscription.aggregate([
    {
      $match: {
        nextRenewalDate: {
          $gte: now,
          $lte: fiveDaysLater,
        },
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
      $addFields: {
        daysLeft: {
          $ceil: {
            $divide: [
              {
                $subtract: [
                  "$nextRenewalDate",
                  now,
                ],
              },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        tenantId: 1,
        tenantName: "$tenantDetails.tenantName",
        nextRenewalDate: 1,
        daysLeft: 1,
      },
    },

    {
      $sort: {
        nextRenewalDate: 1,
      },
    },

    {
      $limit: 7,
    },
  ]);

  return {
    totalExpiryIn5Days,
    tenants,
  };
};

export const getRecentlyAddedTenants = async () => {
  const tenants = await TenantSubscription.aggregate([
    // 1. Get latest subscriptions
    {
      $match: {
        deletedAt: null,
      },
    },

    // 2. Match tenantId with tenants.tenantCode
    {
      $lookup: {
        from: "tenants",
        localField: "tenantId",
        foreignField: "tenantCode",
        as: "tenantDetails",
      },
    },

    // 3. Get tenant details
    {
      $unwind: {
        path: "$tenantDetails",
        preserveNullAndEmptyArrays: false,
      },
    },

    // 4. Return required fields
    {
      $project: {
        _id: 1,
        tenantId: 1,
        tenantName: "$tenantDetails.tenantName",
        planName: 1,
        status: 1,
        startDate: 1,
        nextRenewalDate: 1,
        createdAt: 1,
      },
    },

    // 5. Recently added first
    {
      $sort: {
        createdAt: -1,
      },
    },

    // 6. Only latest 5
    {
      $limit: 5,
    },
  ]);

  return tenants;
};