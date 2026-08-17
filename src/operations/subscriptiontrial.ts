import mongoose from "mongoose";
import SubscriptionTrial from "../models/subcriptionTrial";
import { SubscriptionTrialStatus } from "../shared/enum";
import { sendEmailClient } from "../shared/email";
import emailTemplate from "../models/emailTemplate";

export const getSubscriptionTrials = async (query: any) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      tenantName,
      trialStartDate,
      trialEndDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;
    const currentDate = new Date();

    const match: any = {
      deletedAt: null,
    };

    if (trialStartDate) {
      match.trialStartDate = { $gte: new Date(trialStartDate) };
    }

    if (trialEndDate) {
      match.trialEndDate = { $lte: new Date(trialEndDate) };
    }

    const pipeline: any[] = [
      { $match: match },

      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "_id",
          as: "tenant",
        },
      },
      { $unwind: "$tenant" },

      {
        $match: {
          ...(search && {
            "tenant.tenantName": { $regex: search, $options: "i" },
          }),
          ...(tenantName && {
            "tenant.tenantName": { $regex: tenantName, $options: "i" },
          }),
        },
      },

      {
        $addFields: {
          daysLeft: {
            $switch: {
              branches: [
                {
                  case: {
                    $in: ["$status", ["CONVERTED", "COMPLETED", "CANCELLED"]],
                  },
                  then: 0,
                },
              ],
              default: {
                $ceil: {
                  $divide: [
                    { $subtract: ["$trialEndDate", currentDate] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
            },
          },
        },
      },

      {
        $addFields: {
          derivedStatus: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "INACTIVE"] }, then: "INACTIVE" },
                { case: { $eq: ["$status", "CANCELLED"] }, then: "CANCELLED" },
                { case: { $eq: ["$status", "CONVERTED"] }, then: "CONVERTED" },
                { case: { $eq: ["$status", "COMPLETED"] }, then: "COMPLETED" },
                {
                  case: { $lt: ["$trialEndDate", currentDate] },
                  then: "EXPIRED",
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$status", "ACTIVE"] },
                      { $lte: ["$daysLeft", 3] },
                      { $gt: ["$daysLeft", 0] },
                    ],
                  },
                  then: "EXPIRING_SOON",
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$status", "ACTIVE"] },
                      { $gt: ["$daysLeft", 3] },
                    ],
                  },
                  then: "ACTIVE",
                },
              ],
              default: "ACTIVE",
            },
          },
        },
      },
    ];

    if (status) {
      pipeline.push({
        $match: { derivedStatus: status },
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
          { $skip: Number(skip) },
          { $limit: Number(limit) },
          {
            $project: {
              trialId: "$_id",
              tenantName: "$tenant.tenantName",
              trialStartDate: 1,
              trialEndDate: 1,
              status: "$derivedStatus",
              daysLeft: 1,
              isConverted: 1,
              convertedAt: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    });

    const result = await SubscriptionTrial.aggregate(pipeline);

    const items = result[0]?.items || [];
    const totalRecords = result[0]?.total[0]?.count || 0;

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNext: page * limit < totalRecords,
        hasPrevious: page > 1,
      },
    };
  } catch (err) {
    console.error(err);
    throw new Error("Internal Server Error");
  }
};

export const getSubscriptionTrialById = async (trialId: string) => {
  try {
    const trial = await SubscriptionTrial.findById(trialId).populate(
      "tenantId",
      "tenantName email",
    );

    if (!trial) {
      throw new Error("Subscription Trial not found.");
    }

    const tenant = trial.tenantId as any;

    const currentDate = new Date();

    let daysLeft: number = 0;

    if (["CONVERTED", "COMPLETED", "CANCELLED"].includes(trial.status)) {
      daysLeft = 0;
    } else {
      const diffTime =
        new Date(trial.trialEndDate).getTime() - currentDate.getTime();

      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    let derivedStatus = trial.status as SubscriptionTrialStatus;

    if (trial.status === "CONVERTED") {
      derivedStatus = SubscriptionTrialStatus.CONVERTED;
    } else if (trial.status === "COMPLETED") {
      derivedStatus = SubscriptionTrialStatus.COMPLETED;
    } else if (trial.status === "CANCELLED") {
      derivedStatus = SubscriptionTrialStatus.CANCELLED;
    } else if (trial.status === "INACTIVE") {
      derivedStatus = SubscriptionTrialStatus.INACTIVE;
    } else {
      if (daysLeft !== null) {
        if (daysLeft < 0) {
          derivedStatus = SubscriptionTrialStatus.EXPIRED;
        } else if (daysLeft <= 3) {
          derivedStatus = SubscriptionTrialStatus.EXPIRING_SOON;
        } else {
          derivedStatus = SubscriptionTrialStatus.ACTIVE;
        }
      }
    }

    return {
      trialId: trial._id,
      tenantName: tenant?.tenantName,
      tenantEmail: tenant?.email,

      trialStartDate: trial.trialStartDate,
      trialEndDate: trial.trialEndDate,

      status: derivedStatus,
      daysLeft,

      isConverted: trial.isConverted,
      convertedAt: trial.convertedAt,
    };
  } catch (error: any) {
    if (error.message === "Subscription Trial not found.") {
      throw error;
    }

    console.error("❌ Error in getSubscriptionTrialById:", error);

    throw new Error("Internal Server Error");
  }
};

export const getSubscriptionTrialDashboardCount = async () => {
  try {
    const currentDate = new Date();

    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const result = await SubscriptionTrial.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $facet: {
          totalTrials: [{ $count: "count" }],

          activeTrials: [
            {
              $match: {
                status: "ACTIVE",
                trialEndDate: { $gte: currentDate },
              },
            },
            { $count: "count" },
          ],

          expiredTrials: [
            {
              $match: {
                trialEndDate: { $lt: currentDate },
              },
            },
            { $count: "count" },
          ],

          convertedTrials: [
            {
              $match: {
                status: "CONVERTED",
                convertedAt: {
                  $gte: startOfMonth,
                  $lte: endOfMonth,
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
      {
        $project: {
          totalTrials: {
            $ifNull: [{ $arrayElemAt: ["$totalTrials.count", 0] }, 0],
          },
          activeTrials: {
            $ifNull: [{ $arrayElemAt: ["$activeTrials.count", 0] }, 0],
          },
          expiredTrials: {
            $ifNull: [{ $arrayElemAt: ["$expiredTrials.count", 0] }, 0],
          },
          convertedCount: {
            $ifNull: [{ $arrayElemAt: ["$convertedTrials.count", 0] }, 0],
          },
        },
      },
    ]);

    const data = result[0] || {
      totalTrials: 0,
      activeTrials: 0,
      expiredTrials: 0,
      convertedCount: 0,
    };

    return {
      totalTrials: data.totalTrials,
      activeTrials: data.activeTrials,
      expiredTrials: data.expiredTrials,
      convertedTrials: data.convertedCount,
    };
  } catch (error) {
    console.error("❌ Error in getSubscriptionTrialDashboardCount:", error);
    throw new Error("Internal Server Error");
  }
};

export const updateSubscriptionTrial = async (
  trialId: string,
  payload: {
    status?: string;
    trialEndDate?: Date;
    updatedBy: string;
  },
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(trialId)) {
      throw new Error("Validation Failed");
    }

    const trial = await SubscriptionTrial.findOne({
      _id: trialId,
      deletedAt: null,
    }).populate("tenantId", "tenantName emailId");

    if (!trial) {
      throw new Error("Trial not found.");
    }

    const tenant: any = trial.tenantId;

    let emailType: string | null = null;

    if (payload.trialEndDate) {
      if (payload.trialEndDate < trial.trialStartDate) {
        throw new Error("Invalid Date Logic");
      }

      trial.trialEndDate = payload.trialEndDate;

      emailType = "RESCHEDULED";
    }

    if (payload.status) {
      const allowedStatus = [
        SubscriptionTrialStatus.ACTIVE,
        SubscriptionTrialStatus.INACTIVE,
        SubscriptionTrialStatus.CANCELLED,
        SubscriptionTrialStatus.CONVERTED,
        SubscriptionTrialStatus.EXPIRED,
        SubscriptionTrialStatus.COMPLETED,
      ];

      if (!allowedStatus.includes(payload.status as SubscriptionTrialStatus)) {
        throw new Error("Validation Failed - Invalid Status");
      }

      trial.status = payload.status as SubscriptionTrialStatus;

      switch (payload.status) {
        case SubscriptionTrialStatus.CONVERTED:
          trial.isConverted = true;
          trial.convertedAt = new Date();
          emailType = "CONVERTED";
          break;

        case SubscriptionTrialStatus.CANCELLED:
          emailType = "CANCELLED";
          break;

        case SubscriptionTrialStatus.EXPIRED:
          emailType = "EXPIRED";
          break;

        case SubscriptionTrialStatus.ACTIVE:
          emailType = "UPDATED";
          break;

        case SubscriptionTrialStatus.INACTIVE:
          emailType = "UPDATED";
          break;

        case SubscriptionTrialStatus.COMPLETED:
          emailType = "COMPLETED";
          break;
      }
    }

    trial.updatedBy = payload.updatedBy;

    await trial.save();

    try {
      if (emailType) {
        await sendTrialEmail({
          type: emailType,
          email: tenant?.emailId,
          tenantName: tenant?.tenantName,
          trial,
        });
      }
    } catch (emailError) {
      console.error("📧 Email failed, logging for retry:", emailError);
    }

    return {
      trialId: trial._id,
      trialStartDate: trial.trialStartDate,
      trialEndDate: trial.trialEndDate,
      status: trial.status,
      isConverted: trial.isConverted,
      convertedAt: trial.convertedAt,

      tenant: {
        tenantId: tenant?._id,
        tenantName: tenant?.tenantName,
      },

      updatedBy: trial.updatedBy,
      createdAt: trial.createdAt,
      updatedAt: trial.updatedAt,
    };
  } catch (error: any) {
    if (
      error.message === "Trial not found." ||
      error.message === "Validation Failed" ||
      error.message === "Invalid Date Logic"
    ) {
      throw error;
    }

    console.error("❌ Error in updateSubscriptionTrial:", error);
    throw new Error("Internal Server Error");
  }
};

export const processTrialReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 3);

    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const trials = await SubscriptionTrial.find({
      trialEndDate: {
        $gte: targetDate,
        $lt: nextDay,
      },
      status: SubscriptionTrialStatus.ACTIVE,
    })
      .populate("tenantId", "tenantName emailId")
      .lean();
    for (const trial of trials) {
      const tenant = trial.tenantId as any;
      if (!tenant) {
        console.error(`Tenant not found for trial ID: ${trial._id}`);
        continue;
      }
      await sendTrialEmail({
        type: "EXPIRING_SOON",
        email: tenant.emailId,
        tenantName: tenant.tenantName,
        trial,
      });
    }
  } catch (error) {
    console.error("❌ Error in processTrialReminders:", error);
  }
};

const sendTrialEmail = async ({
  type,
  email,
  tenantName,
  trial,
}: {
  type: string;
  email: string;
  tenantName: string;
  trial: any;
}) => {
  let subject = "";
  let message = "";

  const Email = await emailTemplate
    .findOne({
      templateKey: `subscription-trial-${type.toLowerCase()}`,
    })
    .exec();
  const template = Email?.templateContent || "";
  if (!Email) {
    throw new Error(`Email template for ${type} not found.`);
  }

  switch (type) {
    // case "CONVERTED":
    //   subject = "Trial Converted";
    //   message = `Hi ${tenantName}, your trial has been successfully converted to a paid plan.`;
    //   break;

    case "CANCELLED":
      subject = "Trial Cancelled";

      message = template
        .replace(/{{ORG_NAME}}/g, trial.tenantId.tenantName)
        .replace(
          /{{TRIAL_END_DATE}}/g,
          new Date(trial.trialEndDate).toDateString(),
        )
        .replace(/{{SUPPORT_EMAIL}}/g, "support@blackstone.com")
        .replace(/{{COMPANY_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{LOGO_URL}}/g, "https://your-logo-url.com/logo.png")
        .replace(/{{WEBSITE_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{TERMS_URL}}/g, "https://blackstoneinfomaticstech.com/terms")
        .replace(
          /{{PRIVACY_URL}}/g,
          "https://blackstoneinfomaticstech.com/privacy",
        );

      break;

    case "EXPIRED":
      subject = "Trial Expired";

      message = template
        .replace(/{{ORG_NAME}}/g, tenantName)
        .replace(
          /{{TRIAL_END_DATE}}/g,
          new Date(trial.trialEndDate).toDateString(),
        )
        .replace(/{{SUPPORT_EMAIL}}/g, "support@blackstone.com")
        .replace(/{{COMPANY_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{LOGO_URL}}/g, "https://your-logo-url.com/logo.png")
        .replace(/{{WEBSITE_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{TERMS_URL}}/g, "https://yourdomain.com/terms")
        .replace(/{{PRIVACY_URL}}/g, "https://yourdomain.com/privacy");

      break;

    case "RESCHEDULED":
      subject = "Trial Extended";

      message = template
        .replace(/{{ORG_NAME}}/g, trial.tenantId.tenantName)
        .replace(
          /{{NEW_TRIAL_END_DATE}}/g,
          new Date(trial.trialEndDate).toDateString(),
        )
        .replace(/{{SUPPORT_EMAIL}}/g, "support@blackstone.com")
        .replace(/{{COMPANY_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{LOGO_URL}}/g, "https://your-logo-url.com/logo.png")
        .replace(/{{WEBSITE_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{TERMS_URL}}/g, "https://blackstoneinfomaticstech.com/terms")
        .replace(
          /{{PRIVACY_URL}}/g,
          "https://blackstoneinfomaticstech.com/privacy",
        );

      break;

    case "UPDATED":
      subject = "Trial Updated";
      message = `Hi ${tenantName}, your trial details have been updated.`;
      break;

    case "COMPLETED":
      subject = "Trial Completed";

      message = template
        .replace(/{{ORG_NAME}}/g, trial.tenantId.tenantName)
        .replace(/{{SUPPORT_EMAIL}}/g, "support@blackstone.com")
        .replace(/{{COMPANY_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{LOGO_URL}}/g, "https://your-logo-url.com/logo.png")
        .replace(/{{WEBSITE_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{TERMS_URL}}/g, "https://blackstoneinfomaticstech.com/terms")
        .replace(
          /{{PRIVACY_URL}}/g,
          "https://blackstoneinfomaticstech.com/privacy",
        );

      break;

    case "EXPIRING_SOON":
      subject = "Trial Expiring Soon";

      const trialEndDate = new Date(trial.trialEndDate);
      const today = new Date();

      const diffTime = trialEndDate.getTime() - today.getTime();
      const daysRemaining = Math.max(
        Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
        0,
      );

      message = template
        .replace(/{{ORG_NAME}}/g, trial.tenantId.tenantName)
        .replace(/{{TRIAL_END_DATE}}/g, trialEndDate.toDateString())
        .replace(/{{DAYS_REMAINING}}/g, String(daysRemaining))
        .replace(/{{SUPPORT_EMAIL}}/g, "support@blackstone.com")
        .replace(/{{COMPANY_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{LOGO_URL}}/g, "https://your-logo-url.com/logo.png")
        .replace(/{{WEBSITE_URL}}/g, "https://blackstoneinfomaticstech.com")
        .replace(/{{TERMS_URL}}/g, "https://blackstoneinfomaticstech.com/terms")
        .replace(
          /{{PRIVACY_URL}}/g,
          "https://blackstoneinfomaticstech.com/privacy",
        );

      break;
  }

  console.log("📧 Sending Email:", { to: email, subject });

  const emailTo = [
    {
      email: email,
      name: tenantName,
    },
  ];

  await sendEmailClient(emailTo, subject, message);
};
