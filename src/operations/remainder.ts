import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import ReminderModel, { reminderValidation } from "../models/remainder";
import ReminderHistoryModel from "../models/reminder-history";
import TenantModel from "../models/tenants";
import EmailTemplateModel from "../models/emailTemplate";
import TenantSubscriptionModel from "../models/tenantsubscription";
import SubscriptionInvoiceModel from "../models/subscriptionInvoice";
import { PaymentStatus, SubscriptionStatus } from "../shared/enum";

import { sendEmailClient } from "../shared/email";
import { sendSmsClient } from "../shared/sms";
import { sendWhatsappClient } from "../shared/whatsapp";
import { sendNotification } from "./notification";
import { notificationStatus } from "../config/messages";
import AppLogger from "../helpers/logging";
import { IReminder, IReminderHistory, ISubscriptionInvoice } from "../../types/models.types";

export type CreateReminderPayload = z.infer<typeof reminderValidation>;
export type UpdateReminderPayload = Partial<CreateReminderPayload>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ==============================
// CRUD — Reminder configuration
// ==============================

// Business Flow step 1 & 2: saving a reminder config never sends anything.
// Dispatch only happens from processReminders(), run by the cron.
export const createReminder = async (payload: CreateReminderPayload) => {
  const reminder = new ReminderModel({
    ...payload,
    reminderId: payload.reminderId ?? `REM-${uuidv4()}`,
  });

  return reminder.save();
};

export const getAllReminders = async () => {
  return ReminderModel.find().sort({ createdDate: -1 }).lean();
};

export const getReminderById = async (reminderId: string) => {
  return ReminderModel.findOne({ reminderId }).lean();
};

export const updateReminder = async (
  reminderId: string,
  payload: UpdateReminderPayload,
) => {
  return ReminderModel.findOneAndUpdate(
    { reminderId },
    {
      $set: {
        ...payload,
        updatedDate: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

export const deleteReminder = async (reminderId: string) => {
  return ReminderModel.deleteOne({ reminderId });
};

export const getReminderHistory = async (reminderId: string) => {
  return ReminderHistoryModel.find({ reminderId })
    .sort({ sentDate: -1 })
    .lean();
};

// ==============================
// Cron business logic
// ==============================

const daysBetween = (later: Date, earlier: Date): number =>
  Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY);

const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Billing details needed to dispatch a reminder, assembled from
// TenantSubscription.endDate (the actual reminder trigger) plus the linked
// SubscriptionInvoice (amount/currency/invoiceNumber) for message content.
interface ReminderBillingContext {
  tenantId: string;
  subscriptionId: string;
  dueDate: Date;
  currency: string;
  totalAmount: number;
  invoiceNumber: string;
}

/**
 * For every tenant with an unpaid subscription whose endDate has passed,
 * returns their single oldest expired subscription (the one that has been
 * expired the longest). Reads from TenantSubscriptionModel
 * (src/models/tenantsubscription.ts) — CANCELLED subscriptions are
 * excluded alongside PAID ones since there's nothing left to collect on.
 *
 * TenantSubscription has no invoiceId field — the relation runs the other
 * way (SubscriptionInvoice.subscriptionId), so billing details are fetched
 * with a separate query keyed by subscriptionId.
 */
const getEarliestExpiredSubscriptionPerTenant = async (
  tenantIds: string[] | undefined,
  now: Date,
): Promise<Map<string, ReminderBillingContext>> => {
  console.log(
    `[Reminder] getEarliestExpiredSubscriptionPerTenant tenantIds filter=`,
    tenantIds ?? "ALL_OVERDUE_TENANTS (no filter)",
  );

  const expiredSubscriptions = await TenantSubscriptionModel.find({
    paymentStatus: { $ne: PaymentStatus.PAID },
    status: { $ne: SubscriptionStatus.CANCELLED },
    endDate: { $ne: null, $lte: now },
    ...(tenantIds ? { tenantId: { $in: tenantIds } } : {}),
  })
    .sort({ endDate: 1 })
    .lean();

  console.log(
    `[Reminder] expired subscriptions found: ${expiredSubscriptions.length}, first record:`,
    expiredSubscriptions[0] ?? null,
  );

  const earliestByTenant = new Map<string, ReminderBillingContext>();

  for (const subscription of expiredSubscriptions) {
    const tenantId = subscription.tenantId.toString();
    if (earliestByTenant.has(tenantId)) {
      continue;

      
    }

    earliestByTenant.set(tenantId, {
      tenantId,
      subscriptionId: subscription._id.toString(),
      dueDate: subscription.endDate as Date,
      currency: "INR",
      totalAmount: 0,
      invoiceNumber: subscription.subscriptionCode,
    });
  }

  const subscriptionIds = Array.from(earliestByTenant.values(), (context) => context.subscriptionId);

  const invoices = subscriptionIds.length
    ? await SubscriptionInvoiceModel.find({
        subscriptionId: { $in: subscriptionIds },
      }).lean()
    : [];

  const invoiceBySubscriptionId = new Map(
    invoices.map((invoice) => [invoice.subscriptionId.toString(), invoice as unknown as ISubscriptionInvoice]),
  );

  for (const context of earliestByTenant.values()) {
    const invoice = invoiceBySubscriptionId.get(context.subscriptionId);
    if (invoice) {
      context.currency = invoice.currency;
      context.totalAmount = invoice.totalAmount;
      context.invoiceNumber = invoice.invoiceNumber;
    }
  }

  return earliestByTenant;
};

/**
 * Applies repeatReminder / repeatEveryDays / duplicate-same-day rules
 * (business flow steps 4 & 7) based on the last time this reminder config
 * actually fired for this tenant.
 */
const isEligibleForReminder = async (
  reminder: IReminder,
  tenantId: string,
  now: Date,
): Promise<boolean> => {
  const lastHistory = await ReminderHistoryModel.findOne({
    reminderId: reminder.reminderId,
    tenantId,
  })
    .sort({ sentDate: -1 })
    .lean();

  console.log(
    `[Reminder] isEligibleForReminder reminderId=${reminder.reminderId} tenantId=${tenantId} lastHistory=`,
    lastHistory ?? null,
  );

  if (!lastHistory) {
    console.log("[Reminder] eligible=true reason=no prior history");
    return true;
  }

  if (isSameCalendarDay(lastHistory.sentDate, now)) {
    console.log("[Reminder] eligible=false reason=already sent today");
    return false;
  }

  if (!reminder.repeatReminder) {
    console.log("[Reminder] eligible=false reason=repeatReminder disabled");
    return false;
  }

  const daysSinceLast = daysBetween(now, lastHistory.sentDate);
  const eligible = daysSinceLast >= reminder.repeatEveryDays;
  console.log(
    `[Reminder] daysSinceLast=${daysSinceLast} repeatEveryDays=${reminder.repeatEveryDays} eligible=${eligible}`,
  );
  return eligible;
};

// Saved in MongoDB (emailTemplates collection) under this templateKey.
const REMINDER_EMAIL_TEMPLATE_KEY = "remainder-email-temp";

const getReminderEmailTemplate = async (): Promise<string> => {
  const template = await EmailTemplateModel.findOne({
    templateKey: REMINDER_EMAIL_TEMPLATE_KEY,
    status: "Active",
  }).lean();

  if (!template?.templateContent) {
    throw new Error(
      `No active email template found for templateKey=${REMINDER_EMAIL_TEMPLATE_KEY}`,
    );
  }

  return template.templateContent;
};

interface ReminderEmailTemplateData {
  tenantName: string;
  subject: string;
  overdueDays: number;
  amount: number;
  currency: string;
  dueDate: Date;
  supportEmail: string;
}

const buildReminderEmailHtml = (
  templateContent: string,
  data: ReminderEmailTemplateData,
): string =>
  templateContent
    .replace(/<tenantName>/g, data.tenantName)
    .replace(/<subject>/g, data.subject)
    .replace(/<overdueDays>/g, String(data.overdueDays))
    .replace(/<amount>/g, data.amount.toFixed(2))
    .replace(/<currency>/g, data.currency)
    .replace(/<dueDate>/g, data.dueDate.toDateString())
    .replace(/<supportEmail>/g, data.supportEmail);

const buildReminderTextMessage = (
  reminder: IReminder,
  tenantName: string,
  overdueDays: number,
  invoice: ReminderBillingContext,
): string =>
  `Hi ${tenantName}, ${reminder.subject}. Your payment of ${invoice.currency} ${invoice.totalAmount} ` +
  `is overdue by ${overdueDays} day(s). Please pay at the earliest to avoid service interruption.`;

const dispatchReminderChannels = async (
  reminder: IReminder,
  tenant: any,
  invoice: ReminderBillingContext,
  overdueDays: number,
): Promise<IReminderHistory["channels"]> => {
  const channels: IReminderHistory["channels"] = {
    email: { attempted: false, success: false },
    sms: { attempted: false, success: false },
    whatsapp: { attempted: false, success: false },
    inApp: { attempted: false, success: false },
  };

  const tenantName = tenant.organizationName || tenant.tenantCode;
  const textMessage = buildReminderTextMessage(reminder, tenantName, overdueDays, invoice);

  console.log(
    `[Reminder] dispatchReminderChannels reminderId=${reminder.reminderId} tenant=${tenant.tenantCode} channels=`,
    reminder.channels,
  );

  if (reminder.channels.email) {
    channels.email.attempted = true;
    console.log(`[Reminder] email channel enabled, tenant.emailId=${tenant.emailId}`);
    try {
      if (!tenant.emailId) {
        throw new Error("Tenant has no emailId on file");
      }

      const templateContent = await getReminderEmailTemplate();
      console.log(`[Reminder] email template length=${templateContent.length}`);

      const htmlPart = buildReminderEmailHtml(templateContent, {
        tenantName,
        subject: reminder.subject,
        overdueDays,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        supportEmail: "support@yourdomain.com",
      });

      const emailPayload = {
        to: [{ email: tenant.emailId }],
        subject: reminder.subject,
        htmlPart,
      };
      console.log("[Reminder] email payload:", emailPayload);

      const res = await sendEmailClient([{ email: tenant.emailId }], reminder.subject, htmlPart);

      if (!res) {
        throw new Error("Email provider did not confirm delivery");
      }

      channels.email.success = true;
      console.log(`[Reminder] email sent successfully to ${tenant.emailId}, success=true`);
    } catch (error: any) {
      channels.email.error = error.message;
      console.log(`[Reminder] email send FAILED for ${tenant.emailId}, success=false, error=${error.message}`);
    }
  } else {
    console.log("[Reminder] email channel disabled on this reminder config, skipping");
  }

  if (reminder.channels.sms) {
    channels.sms.attempted = true;
    const result = await sendSmsClient(tenant.mobileNumber, textMessage);
    channels.sms.success = result.success;
    if (!result.success) {
      channels.sms.error = result.error;
    }
  }

  if (reminder.channels.whatsapp) {
    channels.whatsapp.attempted = true;
    const result = await sendWhatsappClient(tenant.mobileNumber, textMessage);
    channels.whatsapp.success = result.success;
    if (!result.success) {
      channels.whatsapp.error = result.error;
    }
  }

  if (reminder.channels.inApp) {
    channels.inApp.attempted = true;
    try {
      const result = await sendNotification({
        tenantId: tenant.tenantCode,
        messages: textMessage,
        senderId: "system",
        senderName: "System",
        senderEmail: "system@blackstoneinfomatics.com",
        isRead: false,
        receiverId: tenant.tenantCode,
        receiverName: tenantName,
        receiverEmail: tenant.emailId,
        notificationType: "PAYMENT_REMINDER",
        notificationStatus: notificationStatus.UN_SEEN,
        status: "active",
        createdBy: "system",
        updatedBy: "system",
      });

      if (!result.success) {
        throw new Error(result.error ?? "In-app notification failed");
      }

      channels.inApp.success = true;
    } catch (error: any) {
      channels.inApp.error = error.message;
    }
  }

  return channels;
};

const processSingleReminderConfig = async (reminder: IReminder, now: Date): Promise<void> => {
  console.log(
    `[Reminder] processSingleReminderConfig START reminderId=${reminder.reminderId} sendReminder=${reminder.sendReminder} tenantIds=`,
    reminder.tenantIds,
  );

  // reminder.tenantIds holds Tenant _id strings directly — matched as-is
  // against TenantSubscription.tenantId (an ObjectId ref to Tenants).
  const targetTenantIds =
    reminder.sendReminder === "ALL_OVERDUE_TENANTS" ? undefined : reminder.tenantIds;

  if (reminder.sendReminder !== "ALL_OVERDUE_TENANTS" && !targetTenantIds?.length) {
    console.log(
      `[Reminder] EXIT EARLY reminderId=${reminder.reminderId} reason=sendReminder is not ALL_OVERDUE_TENANTS and tenantIds is empty`,
    );
    return;
  }

  const expiredSubscriptionByTenant = await getEarliestExpiredSubscriptionPerTenant(
    targetTenantIds,
    now,
  );

  console.log(
    `[Reminder] reminderId=${reminder.reminderId} tenants with an expired subscription: ${expiredSubscriptionByTenant.size}`,
    Array.from(expiredSubscriptionByTenant.entries()),
  );

  let firedForAnyTenant = false;

  for (const [tenantId, invoice] of expiredSubscriptionByTenant.entries()) {
    // Business flow step 5: a tenant missing from this map (i.e. paid /
    // renewed) is never reminded about again, regardless of
    // stopAfterPayment — there is nothing expired left to remind them of.
    const overdueDays = daysBetween(now, invoice.dueDate);
    console.log(
      `[Reminder] tenantId=${tenantId} overdueDays=${overdueDays} minimumOverdueDays=${reminder.minimumOverdueDays}`,
    );

    if (overdueDays < reminder.minimumOverdueDays) {
      console.log(`[Reminder] SKIP tenantId=${tenantId} reason=overdueDays below minimumOverdueDays`);
      continue;
    }

    const eligible = await isEligibleForReminder(reminder, tenantId, now);
    if (!eligible) {
      console.log(`[Reminder] SKIP tenantId=${tenantId} reason=not eligible (see isEligibleForReminder log above)`);
      continue;
    }

    // tenantId here is the Tenant's _id (TenantSubscription.tenantId is an
    // ObjectId ref to "Tenants"), not the tenantCode business identifier.
    const tenant = await TenantModel.findOne({ _id: tenantId }).lean();
    console.log(`[Reminder] tenant lookup for tenantId=${tenantId} found=${!!tenant}`, tenant ?? null);
    if (!tenant) {
      AppLogger.error(`Reminder cron: tenant not found for tenantId=${tenantId}`);
      console.log(`[Reminder] SKIP tenantId=${tenantId} reason=tenant document not found`);
      continue;
    }

    const channelResults = await dispatchReminderChannels(reminder, tenant, invoice, overdueDays);
    console.log(`[Reminder] channelResults for tenantId=${tenantId}:`, channelResults);
    const anyChannelSucceeded = Object.values(channelResults).some((result) => result.success);
    console.log(`[Reminder] anyChannelSucceeded=${anyChannelSucceeded} for tenantId=${tenantId}`);

    await ReminderHistoryModel.create({
      historyId: `RH-${uuidv4()}`,
      reminderId: reminder.reminderId,
      tenantId,
      subscriptionId: invoice.subscriptionId,
      subject: reminder.subject,
      overdueDays,
      amount: invoice.totalAmount,
      channels: channelResults,
      status: anyChannelSucceeded ? "SENT" : "FAILED",
      sentDate: now,
      createdBy: "system",
    });
    console.log(`[Reminder] history record created for tenantId=${tenantId}`);

    if (anyChannelSucceeded) {
      firedForAnyTenant = true;
    }
  }

  // Business flow step 9: update lastReminderSentDate on the config itself.
  if (firedForAnyTenant) {
    await ReminderModel.updateOne(
      { reminderId: reminder.reminderId },
      { $set: { lastReminderSentDate: now, updatedDate: now } },
    );
    console.log(`[Reminder] lastReminderSentDate updated for reminderId=${reminder.reminderId}`);
  }

  console.log(`[Reminder] processSingleReminderConfig END reminderId=${reminder.reminderId}`);
};

// Entry point invoked by src/cron/reminder.cron.ts
export const processReminders = async (): Promise<void> => {
  const now = new Date();

  const activeReminders = await ReminderModel.find({ status: "ACTIVE" }).lean();

  AppLogger.info(
    `Reminder cron: ${activeReminders.length} active reminder configuration(s) found`,
  );

  for (const reminder of activeReminders) {
    console.log(`[Reminder] processReminders loop -> reminderId=${reminder.reminderId}`);
    try {
      await processSingleReminderConfig(reminder as unknown as IReminder, now);
    } catch (error) {
      console.log(`[Reminder] processSingleReminderConfig THREW for reminderId=${reminder.reminderId}:`, error);
      AppLogger.error(
        `Reminder cron failed for reminderId=${reminder.reminderId}: ${(error as Error).message}`,
      );
    }
  }
};
