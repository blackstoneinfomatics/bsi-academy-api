import { v4 as uuidv4 } from "uuid";
import ReminderHistoryModel from "../models/reminder-history";
import TenantModel from "../models/tenants";
import EmailTemplateModel from "../models/emailTemplate";
import TenantSubscriptionModel from "../models/tenantsubscription";
import SubscriptionInvoiceModel from "../models/subscriptionInvoice";
import { SubscriptionStatus } from "../shared/enum";

import { sendEmailClient } from "../shared/email";
import AppLogger from "../helpers/logging";
import { IReminderHistory, ISubscriptionInvoice } from "../../types/models.types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// No separate "reminder config" document — this is the single, fixed
// subscription-expiry reminder. Kept only as the required reminderId on
// ReminderHistory records (dedup key / audit trail).
const SUBSCRIPTION_EXPIRY_REMINDER_ID = "SUBSCRIPTION_EXPIRY";
const REMINDER_SUBJECT = "Your subscription has expired";


// ==============================
// Cron business logic
// ==============================

const daysBetween = (later: Date, earlier: Date): number =>
  Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY);

const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

interface ReminderBillingContext {
  tenantId: string;
  subscriptionId: string;
  dueDate: Date;
  currency: string;
  totalAmount: number;
  invoiceNumber: string;
}

const getEarliestExpiredSubscriptionPerTenant = async (
  now: Date,
): Promise<Map<string, ReminderBillingContext>> => {
  const expiredSubscriptions = await TenantSubscriptionModel.find({
    status: { $ne: SubscriptionStatus.CANCELLED },
    endDate: { $ne: null, $lte: now },
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

const isEligibleForReminder = async (tenantId: string, now: Date): Promise<boolean> => {
  const lastHistory = await ReminderHistoryModel.findOne({
    reminderId: SUBSCRIPTION_EXPIRY_REMINDER_ID,
    tenantId,
  })
    .sort({ sentDate: -1 })
    .lean();

  if (!lastHistory) {
    return true;
  }

  return !isSameCalendarDay(lastHistory.sentDate, now);
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

// Email only — no sms/whatsapp/inApp channels.
const sendReminderEmail = async (
  tenant: any,
  invoice: ReminderBillingContext,
  overdueDays: number,
): Promise<IReminderHistory["channels"]["email"]> => {
  const result: IReminderHistory["channels"]["email"] = { attempted: true, success: false };

  try {
    if (!tenant.emailId) {
      throw new Error("Tenant has no emailId on file");
    }

    const tenantName = tenant.organizationName || tenant.tenantCode;
    const templateContent = await getReminderEmailTemplate();

    const htmlPart = buildReminderEmailHtml(templateContent, {
      tenantName,
      subject: REMINDER_SUBJECT,
      overdueDays,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      supportEmail: "support@yourdomain.com",
    });

    const res = await sendEmailClient([{ email: tenant.emailId }], REMINDER_SUBJECT, htmlPart);

    if (!res) {
      throw new Error("Email provider did not confirm delivery");
    }

    result.success = true;
    console.log(`[Reminder] email sent successfully to ${tenant.emailId}`);
  } catch (error: any) {
    result.error = error.message;
    console.log(`[Reminder] email send FAILED for tenant=${tenant.tenantCode}, error=${error.message}`);
  }

  return result;
};

// Entry point invoked by src/cron/reminder.cron.ts
export const processReminders = async (): Promise<void> => {
  const now = new Date();

  const expiredSubscriptionByTenant = await getEarliestExpiredSubscriptionPerTenant(now);

  AppLogger.info(
    `Reminder cron: ${expiredSubscriptionByTenant.size} tenant(s) with an expired subscription`,
  );

  for (const [tenantId, invoice] of expiredSubscriptionByTenant.entries()) {
    try {
      const overdueDays = daysBetween(now, invoice.dueDate);

      const eligible = await isEligibleForReminder(tenantId, now);
      if (!eligible) {
        console.log(`[Reminder] SKIP tenantId=${tenantId} reason=already sent today`);
        continue;
      }

      const tenant = await TenantModel.findOne({ tenantCode: tenantId }).lean();
      if (!tenant) {
        AppLogger.error(`Reminder cron: tenant not found for tenantId=${tenantId}`);
        continue;
      }

      const emailResult = await sendReminderEmail(tenant, invoice, overdueDays);

      await ReminderHistoryModel.create({
        historyId: `RH-${uuidv4()}`,
        reminderId: SUBSCRIPTION_EXPIRY_REMINDER_ID,
        tenantId,
        subscriptionId: invoice.subscriptionId,
        subject: REMINDER_SUBJECT,
        overdueDays,
        amount: invoice.totalAmount,
        channels: {
          email: emailResult,
          sms: { attempted: false, success: false },
          whatsapp: { attempted: false, success: false },
          inApp: { attempted: false, success: false },
        },
        status: emailResult.success ? "SENT" : "FAILED",
        sentDate: now,
        createdBy: "system",
      });
    } catch (error) {
      AppLogger.error(
        `Reminder cron failed for tenantId=${tenantId}: ${(error as Error).message}`,
      );
    }
  }
};
