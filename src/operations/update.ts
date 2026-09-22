import UpdateModel from "../models/update";
import { CreateUpdateInput } from "../models/update";
import Tenants from "../models/tenants";
import TenantSubscription from "../models/tenantsubscription";
import emailTemplates from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";

interface GetUpdatesListParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

const sendUpdateEmail = async (
  payload: CreateUpdateInput,
): Promise<void> => {
  const selectedTenantCodes = (payload.selectedTenants || [])
    .map((tenantCode) => tenantCode.trim())
    .filter(Boolean);

  console.log(
    "sendUpdateEmail >> start",
    JSON.stringify({
      emailNotificationEnabled: payload.sendNotification?.email,
      selectedTenants: selectedTenantCodes,
    }),
  );

  if (
    !payload.sendNotification?.email ||
    selectedTenantCodes.length === 0
  ) {
    console.log(
      "sendUpdateEmail >> skipped: notification disabled or no tenants selected",
    );

    return;
  }

  const emailTemplate = await emailTemplates
    .findOne({
      templateKey: "Publich_Update",
      status: "Active",
    })
    .exec();

  if (!emailTemplate) {
    console.log(
      "❌ sendUpdateEmail >> Email template not found",
    );

    return;
  }

  console.log(
    "✅ sendUpdateEmail >> Email template found",
    emailTemplate.templateKey,
  );

  const subscriptions = await TenantSubscription.find({
    tenantId: { $in: selectedTenantCodes },
    deletedAt: null,
  })
    .select({
      tenantId: 1,
      _id: 0,
    })
    .lean();

  console.log(
    "sendUpdateEmail >> subscriptions found",
    JSON.stringify(subscriptions),
  );

  const tenantCodes =
    subscriptions.length > 0
      ? subscriptions.map(
          (subscription) => subscription.tenantId,
        )
      : selectedTenantCodes;

  const tenants = await Tenants.find({
    tenantCode: { $in: tenantCodes },
  })
    .select({
      tenantCode: 1,
      emailId: 1,
    })
    .lean();

  console.log(
    "sendUpdateEmail >> tenants found",
    JSON.stringify(tenants),
  );

  const recipients = tenants
    .filter((tenant) => tenant.emailId)
    .map((tenant) => ({
      email: tenant.emailId,
    }));

  console.log(
    "sendUpdateEmail >> recipients",
    JSON.stringify(recipients),
  );

  if (recipients.length === 0) {
    console.log(
      "sendUpdateEmail >> skipped: no recipients resolved",
    );

    return;
  }

  const title = escapeHtml(payload.title);

  const description = escapeHtml(
    payload.description,
  ).replace(/\n/g, "<br />");

  const category = escapeHtml(payload.category);

  const priority = escapeHtml(payload.priority || "");

  const publishDate = new Date(
    payload.publishDate,
  ).toDateString();

  const attachments = (payload.attachments || [])
    .map((attachment) => escapeHtml(attachment))
    .join(", ");

  const htmlPart = emailTemplate.templateContent
    .replace(/<title>/g, title)
    .replace(/<description>/g, description)
    .replace(/<category>/g, category)
    .replace(/<priority>/g, priority)
    .replace(/<publishDate>/g, publishDate)
    .replace(/<attachments>/g, attachments);

  console.log(
    "sendUpdateEmail >> template prepared",
  );

  const subject = payload.title;

  console.log(
    "📨 Sending update email to:",
    JSON.stringify(recipients),
  );

  await sendEmailClient(
    recipients,
    subject,
    htmlPart,
  );

  console.log(
    "✅ sendUpdateEmail >> Update email sent successfully",
  );
};

const calculatePercentage = (
  current: number,
  previous: number,
) => {
  if (previous === 0) {
    if (current === 0) {
      return {
        percentage: 0,
        direction: "same",
      };
    }

    return {
      percentage: 100,
      direction: "up",
    };
  }

  const percentage = Math.round(
    ((current - previous) / previous) * 100,
  );

  let direction: "up" | "down" | "same" = "same";

  if (percentage > 0) {
    direction = "up";
  } else if (percentage < 0) {
    direction = "down";
  }

  return {
    percentage: Math.abs(percentage),
    direction,
  };
};

export const createUpdate = async (payload: CreateUpdateInput) => {

  const update = await UpdateModel.create({
    title: payload.title,

    category: payload.category,

    audience: payload.audience,

    selectedTenants: payload.selectedTenants || [],

    description: payload.description,

    publishDate: payload.publishDate,

    releaseDate: payload.releaseDate,

    priority: payload.priority,

    attachments: payload.attachments || [],

    sendNotification: {
      email: payload.sendNotification?.email || false,
      inApp: payload.sendNotification?.inApp || false,
    },

    email: payload.email,

    recipientEmail: payload.recipientEmail,

    recipientEmails: payload.recipientEmails || [],

    purchaseTenant: payload.purchaseTenant || 0,

    status: payload.status || "Scheduled",

    views: 0,
  });

  try {
    await sendUpdateEmail(payload);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.log("sendUpdateEmail >> FAILED", error?.message || err);
  }

  return update;
};

export const getUpdateDashboardCards = async () => {
  const now = new Date();

  // Current month
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

  // Previous month
  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );

  const [
    currentTotalUpdates,
    previousTotalUpdates,

    currentPublishedUpdates,
    previousPublishedUpdates,

    currentScheduledUpdates,
    previousScheduledUpdates,

    // currentViewsResult,
    // previousViewsResult,
  ] = await Promise.all([

    UpdateModel.countDocuments({
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Published",
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Published",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Scheduled",
      createdAt: {
        $gte: currentMonthStart,
        $lt: nextMonthStart,
      },
    }),

    UpdateModel.countDocuments({
      status: "Scheduled",
      createdAt: {
        $gte: previousMonthStart,
        $lt: currentMonthStart,
      },
    }),

    // UpdateModel.aggregate([
    //   {
    //     $match: {
    //       createdAt: {
    //         $gte: currentMonthStart,
    //         $lt: nextMonthStart,
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       totalViews: {
    //         $sum: {
    //           $ifNull: ["$views", 0],
    //         },
    //       },
    //     },
    //   },
    // ]),

    // UpdateModel.aggregate([
    //   {
    //     $match: {
    //       createdAt: {
    //         $gte: previousMonthStart,
    //         $lt: currentMonthStart,
    //       },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       totalViews: {
    //         $sum: {
    //           $ifNull: ["$views", 0],
    //         },
    //       },
    //     },
    //   },
    // ]),
  ]);

  // const currentTotalViews =
  //   currentViewsResult[0]?.totalViews || 0;

  // const previousTotalViews =
  //   previousViewsResult[0]?.totalViews || 0;

  const totalUpdatesChange = calculatePercentage(
    currentTotalUpdates,
    previousTotalUpdates,
  );

  const publishedUpdatesChange = calculatePercentage(
    currentPublishedUpdates,
    previousPublishedUpdates,
  );

  const scheduledUpdatesChange = calculatePercentage(
    currentScheduledUpdates,
    previousScheduledUpdates,
  );

  // const totalViewsChange = calculatePercentage(
  //   currentTotalViews,
  //   previousTotalViews,
  // );

  return {
    totalUpdates: {
      count: currentTotalUpdates,
      percentage: totalUpdatesChange.percentage,
      direction: totalUpdatesChange.direction,
    },

    publishedUpdates: {
      count: currentPublishedUpdates,
      percentage: publishedUpdatesChange.percentage,
      direction: publishedUpdatesChange.direction,
    },

    scheduledUpdates: {
      count: currentScheduledUpdates,
      percentage: scheduledUpdatesChange.percentage,
      direction: scheduledUpdatesChange.direction,
    },

    // totalViews: {
    //   count: currentTotalViews,
    //   percentage: totalViewsChange.percentage,
    //   direction: totalViewsChange.direction,
    // },
  };
  
};

export const getUpdatesList = async (
  params: GetUpdatesListParams,
) => {
  const {
    page,
    limit,
    search,
    status,
    category,
    priority,
  } = params;

  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Priority filter
  if (priority) {
    filter.priority = priority;
  }

  // Search filter
  if (search?.trim()) {
    const searchRegex = new RegExp(
      search.trim(),
      "i",
    );

    filter.$or = [
      {
        title: searchRegex,
      },
      {
        description: searchRegex,
      },
      {
        category: searchRegex,
      },
    ];
  }

  const [
    updates,
    totalRecords,
  ] = await Promise.all([
    UpdateModel.find(filter)
      .select({
        title: 1,
        description: 1,
        category: 1,
        priority: 1,
        audience: 1,
        createdAt: 1,
        publishDate: 1,
        status: 1,
      })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    UpdateModel.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(
    totalRecords / limit,
  );

  return {
    data: updates,

    pagination: {
      currentPage: page,
      limit,
      totalRecords,
      totalPages,
    },
  };
};