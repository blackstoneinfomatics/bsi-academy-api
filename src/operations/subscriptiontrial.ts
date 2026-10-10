import mongoose from "mongoose";
import SubscriptionTrial from "../models/subcriptionTrial";
import { Status, SubscriptionTrialStatus } from "../shared/enum";
import { sendEmailClient } from "../shared/email";
import emailTemplate from "../models/emailTemplate";
import { throwError } from "../helpers/throwError";
import TrialMemberModel from "../models/trailmember";
import UserModel from "../models/users";
import {
  appStatus,
  subscriptionInvoiceMessages,
  subscriptionTrialMessages,
} from "../config/messages";
import Tenants from "../models/tenants";
import { Lookup } from "../models/lookup";
import { deleteChatRoomForTrialByTenantId, deleteChatRoomService } from "./tenantChat";
import { sendNotification } from "./notification";

const resolveTrialExpiryRecipient = async (tenant: {
  tenantCode: string;
  adminEmail?: string | null;
  emailId: string;
}) => {
  const recipientEmails = [...new Set([tenant.adminEmail, tenant.emailId])]
    .filter((email): email is string => Boolean(email))
    .map((email) => email.trim())
    .filter(Boolean);

  for (const email of recipientEmails) {
    const trialMember = await TrialMemberModel.findOne({
      tenantId: tenant.tenantCode,
      email,
      status: appStatus.ACTIVE,
    })
      .select("userId userName email _id")
      .lean();

    const paidUser = trialMember
      ? null
      : await UserModel.findOne({
          tenantId: tenant.tenantCode,
          email,
          status: appStatus.ACTIVE,
        })
          .select("userId userName email _id")
          .lean();
    const recipient = trialMember || paidUser;

    if (recipient) {
      return {
        receiverId: String(recipient.userId || recipient._id),
        receiverName: recipient.userName,
        receiverEmail: recipient.email,
      };
    }
  }

  return null;
};

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
          foreignField: "tenantCode",
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
              tenantId: "$tenant.tenantCode",
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
    const trial = await SubscriptionTrial.findById(trialId);

    if (!trial) {
      throwError(subscriptionTrialMessages.TRIAL_NOT_FOUND, 404);
      return;
    }

    const tenant = await Tenants.findOne({
      tenantCode: trial.tenantId,
      deletedAt: null,
      status: { $in: [Status.TRIAL, Status.ACTIVE] },
    }).lean();

    if (!tenant) {
      throwError(subscriptionInvoiceMessages.TENANT_NOT_FOUND, 404);
      return;
    }
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
         if (daysLeft <= 3) {
          derivedStatus = SubscriptionTrialStatus.EXPIRING_SOON;
        } else {
          derivedStatus = SubscriptionTrialStatus.ACTIVE;
        }
      }
    }

    return {
      trialId: trial._id,
      tenantId: tenant?.tenantCode,
      tenantName: tenant?.tenantName,
      tenantEmail: tenant?.emailId,

      trialStartDate: trial.trialStartDate,
      trialEndDate: trial.trialEndDate,

      status: derivedStatus,
      daysLeft,

      isConverted: trial.isConverted,
      convertedAt: trial.convertedAt,
    };
  } catch (error: any) {
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
                status: SubscriptionTrialStatus.ACTIVE,
                trialEndDate: { $gte: currentDate },
              },
            },
            { $count: "count" },
          ],

          completedTrials: [
            {
              $match: {
                status: SubscriptionTrialStatus.COMPLETED,
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
          completedTrials: {
            $ifNull: [{ $arrayElemAt: ["$completedTrials.count", 0] }, 0],
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
      completedTrials: 0,
      convertedCount: 0,
    };

    return {
      totalTrials: data.totalTrials,
      activeTrials: data.activeTrials,
      completedTrials: data.completedTrials,
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
    status?: SubscriptionTrialStatus;
    trialEndDate?: Date;
    updatedBy: string;
  },
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(trialId)) {
      throwError(subscriptionTrialMessages.VALIDATION_FAILED, 400);
    }

    console.log("Updating trial with ID:", trialId, "Payload:", payload);

    const trial = await SubscriptionTrial.findOne({
      _id: trialId,
      deletedAt: null,
    });

    console.log("trial", trial);

    if (trial?.status === payload.status) {
      throwError(subscriptionTrialMessages.STATUS_UNCHANGED, 400);
    }

    if (!trial) {
      throwError(subscriptionTrialMessages.TRIAL_NOT_FOUND, 404);
      return;
    }

    const tenant = await Tenants.findOne({
      tenantCode: trial.tenantId,
      deletedAt: null,
      status: { $in: [Status.TRIAL, Status.ACTIVE] },
    }).lean();

    console.log("tenant", tenant);

    if (!tenant) {
      throwError(subscriptionInvoiceMessages.TENANT_NOT_FOUND, 404);
      return;
    }

    let emailType: string | null = null;

    if (payload.trialEndDate) {
      if (payload.trialEndDate < trial.trialStartDate) {
        throwError(subscriptionTrialMessages.INVALID_DATE_LOGIC, 400);
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
        // SubscriptionTrialStatus.EXPIRED,
        SubscriptionTrialStatus.COMPLETED,
      ];

      if (!allowedStatus.includes(payload.status as SubscriptionTrialStatus)) {
        throwError(subscriptionTrialMessages.VALIDATION_FAILED, 400);
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

        // case SubscriptionTrialStatus.EXPIRED:
        //   emailType = "EXPIRED";
        //   break;

        case SubscriptionTrialStatus.ACTIVE:
          emailType = "UPDATED";
          await TrialMemberModel.updateMany(
            { tenantId: trial.tenantId },
            {
              $set: {
                status: Status.ACTIVE,
                lastUpdatedDate: new Date(),
                lastUpdatedBy: payload.updatedBy,
              },
            },
          );
          await Tenants.updateOne(
            {
              tenantCode: trial.tenantId,
              deletedAt: null,
              status: Status.COMPLETED,
            },
            {
              $set: {
                status: Status.TRIAL,
                updatedAt: new Date(),
              },
            },
          );
          break;

        case SubscriptionTrialStatus.INACTIVE:
          emailType = "UPDATED";
          break;

        case SubscriptionTrialStatus.COMPLETED:
          emailType = "COMPLETED";

          await TrialMemberModel.updateMany(
            { tenantId: trial.tenantId },
            {
              $set: {
                status: Status.IN_ACTIVE,
                lastUpdatedDate: new Date(),
                lastUpdatedBy: payload.updatedBy,
              },
            },
          );

          const updatedTenant = await Tenants.findOneAndUpdate(
            {
              tenantCode: trial.tenantId,
              deletedAt: null,
              status: Status.TRIAL,
            },
            {
              $set: {
                status: Status.COMPLETED,
                updatedAt: new Date(),
              },
            },
            { new: true },
          );

          if (!updatedTenant) {
            throwError("Tenant not found", 404);
          }

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
    throw error;
  }
};

export const updateTrailConvertedByTenantId = async(tenantId: string) => {
  try {
    if (!tenantId) {
      throwError(subscriptionTrialMessages.TENANT_NOT_FOUND, 404);
      return;
    }
   await SubscriptionTrial.findOneAndUpdate(
      {
        tenantId: tenantId,
      },
      {
        convertedAt: new Date(),
        isConverted: true,
        status: SubscriptionTrialStatus.CONVERTED,
      },
    );
     
    await deleteChatRoomForTrialByTenantId(tenantId);

  } catch (error: any) {
    console.log("error in trails update");
  }
};

export const processTrialReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const expiringTomorrow = await SubscriptionTrial.find({
      trialEndDate: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow,
      },
      status: SubscriptionTrialStatus.ACTIVE,
      deletedAt: null,
    }).lean();

    console.info(
      `[trial-reminder] Found ${expiringTomorrow.length} active trial(s) expiring tomorrow (${tomorrow.toISOString()} to ${dayAfterTomorrow.toISOString()})`
    );

    const sender = await Lookup.findOne({
      lookupKey: "SUPER_ADMIN",
      keyValue: "super_admin",
      status: "Active",
    })
      .select("userId")
      .lean();

    if (!sender?.userId) {
      console.error(
        "[trial-reminder] Active Super Admin lookup with userId was not found; reminders were not sent"
      );
      return;
    }

    for (const trial of expiringTomorrow) {
      try {
        const tenant = await Tenants.findOne({
          tenantCode: trial.tenantId,
          deletedAt: null,
        }).lean();

        if (!tenant) {
          console.error(`[trial-reminder] Tenant not found for trial ${trial._id}`);
          continue;
        }

        const recipient = await resolveTrialExpiryRecipient(tenant);
        if (!recipient) {
          console.error(
            `[trial-reminder] No active notification recipient found for tenant ${tenant.tenantCode}`
          );
          continue;
        }

        const result = await sendNotification({
          tenantId: tenant.tenantCode,
          title: "Your Trial Period Is Ending Soon",
          messages: `Your trial period for ${tenant.tenantName} (${tenant.tenantCode}) will expire tomorrow. Kindly upgrade your subscription plan to continue using the application without interruption.`,
          senderId: sender.userId,
          senderName: "System",
          receiverId: recipient.receiverId,
          receiverName: recipient.receiverName,
          receiverEmail: recipient.receiverEmail,
          notificationType: "TRIAL_EXPIRING",
          notificationStatus: "Unseen",
          isRead: false,
          metadata: {
            trialEndDate: trial.trialEndDate,
          },
          createdBy: sender.keyName,
          updatedBy: sender.keyName,
        });

        const duplicateCount = "duplicateCount" in result ? result.duplicateCount : 0;

        if (!result.success) {
          console.error(
            `[trial-reminder] Notification was not saved for tenant ${tenant.tenantCode}`,
            result.error ?? result.errors
          );
        } else if (result.data.length > 0) {
          console.info(
            `[trial-reminder] Saved ${result.data.length} notification(s) for tenant ${tenant.tenantCode}`
          );
        } else if (duplicateCount > 0) {
          console.info(
            `[trial-reminder] Reminder already exists for tenant ${tenant.tenantCode} and expiry ${trial.trialEndDate.toISOString()}`
          );
        }
      } catch (error) {
        console.error(
          `[trial-reminder] Failed to process trial ${trial._id}`,
          error
        );
      }
    }

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
      deletedAt: null,
    }).lean();
    for (const trial of trials) {
      const tenant = await Tenants.findOne({
        tenantCode: trial.tenantId,
        deletedAt: null,
      }).lean();
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

export const processTrialExpiry = async () => {
  try {
    const now = new Date();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const expiredTrials = await SubscriptionTrial.find({
      trialEndDate: { $lt: tomorrow },
      status: SubscriptionTrialStatus.ACTIVE,
    }).select("tenantId");

    if (!expiredTrials.length) {
      console.log("No trials to expire");
      return;
    }

    const tenantIds = expiredTrials.map((t) => t.tenantId);

    await SubscriptionTrial.updateMany(
      {
        trialEndDate: { $lt: tomorrow },
        status: SubscriptionTrialStatus.ACTIVE,
      },
      {
        $set: { status: SubscriptionTrialStatus.COMPLETED },
      },
    );

    await Tenants.updateMany(
      {
        tenantCode: { $in: tenantIds },
        deletedAt: null,
        status: Status.TRIAL,
      },
      {
        $set: {
          status: Status.COMPLETED,
        },
      },
    );

    await TrialMemberModel.updateMany(
      { tenantId: { $in: tenantIds } },
      {
        $set: {
          status: Status.IN_ACTIVE,
          lastUpdatedDate: now,
          lastUpdatedBy: "System",
        },
      },
    );

    console.log(
      `✅ Expired ${expiredTrials.length} trials and updated tenants`,
    );
  } catch (error) {
    console.error("❌ Error in processTrialExpiry:", error);
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
        .replace(/{{ORG_NAME}}/g, tenantName)
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
        .replace(/{{ORG_NAME}}/g, tenantName)
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
        .replace(/{{ORG_NAME}}/g, tenantName)
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
        .replace(/{{ORG_NAME}}/g, tenantName)
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
