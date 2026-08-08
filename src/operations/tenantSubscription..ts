import tenantsubscription from "../models/tenantsubscription";

export const getActiveTenantSubscriptionRecord = async () => {
  const tenants = await tenantsubscription.find({}).lean();
  return {
    total: tenants.length,  
    tenants,
    
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