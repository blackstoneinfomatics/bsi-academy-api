import { SubscriptionInvoice } from "../../types/models.types";
import Tenants from "../models/tenants";
import plan from "../models/plan-model";
import emailTemplate from "../models/emailTemplate";
import SubscriptionInvoiceModel from "../models/subscriptionInvoice";
import TenantSubscription from "../models/tenantsubscription";
import { SubscriptionInvoiceStatus } from "../shared/enum";
import { sendEmailClient } from "../shared/email";
import { throwError } from "../helpers/throwError";
import { subscriptionInvoiceMessages } from "../config/messages";
import paymenttransaction from "../models/paymenttransaction";

type InvoiceEmailType = "CREATED" | "REMINDER";

export const createSubscriptionInvoice = async (
  payload: SubscriptionInvoice,
  tenantId: string,
) => {
  try {
    const tenant = await Tenants.findOne({
      tenantCode: tenantId,
      status: "Active",
    });

    if (!tenant) {
      throwError(subscriptionInvoiceMessages.TENANT_NOT_FOUND, 404);
    }

    const subscriptionPlan = await plan.findOne({
      _id: payload.planId,
      billingPeriods: {
        $elemMatch: { billingPeriodId: payload.billingPeriodId },
      },
      status: "Active",
    });

    if (!subscriptionPlan) {
      throwError(subscriptionInvoiceMessages.SUBSCRIPTION_PLAN_NOT_FOUND, 404);
      return;
    }

    if (payload.dueDate < payload.invoiceDate) {
      throwError(subscriptionInvoiceMessages.INVALID_DUE_DATE, 400);
    }

    if (payload.paymentTerms < 0) {
      throwError(subscriptionInvoiceMessages.INVALID_PAYMENT_TERMS, 400);
    }

    if (
      payload.nextReminderDate &&
      (payload.nextReminderDate < payload.invoiceDate ||
        payload.nextReminderDate < payload.dueDate)
    ) {
      throwError(subscriptionInvoiceMessages.INVALID_REMINDER_DATE, 400);
    }

    const tenantSubscription = await TenantSubscription.findOne({
      _id: payload.subscriptionId,
      deletedAt: null,
    });

    if (!tenantSubscription) {
      throwError(
        subscriptionInvoiceMessages.TENANT_SUBSCRIPTION_NOT_FOUND,
        404,
      );
      return;
    }

    const duplicateInvoice = await SubscriptionInvoiceModel.findOne({
      invoiceNumber: payload.invoiceNumber,
    });

    if (duplicateInvoice) {
      throwError(subscriptionInvoiceMessages.DUPLICATE_INVOICE, 409);
    }

    if (payload.attachments?.length) {
      for (const url of payload.attachments) {
        if (!url.startsWith("https://")) {
          throwError(subscriptionInvoiceMessages.INVALID_ATTACHMENT_URL, 400);
        }
      }
    }

    const newInvoice = new SubscriptionInvoiceModel({
      ...payload,
      tenantId: tenantId,
    });

    await tenantSubscription.updateOne({
      $set: {
        duration: subscriptionPlan.billingPeriods.find(
          (billingPeriod) =>
            billingPeriod.billingPeriodId === payload.billingPeriodId,
        )?.duration,
      },
    });

    await newInvoice.save();

    await sendSubscriptionInvoiceEmail(newInvoice._id.toString(), "CREATED");

    return newInvoice;
  } catch (error: any) {
    throw error;
  }
};

export const getSubscriptionInvoiceDashboardCount = async () => {
  try {
    const now = new Date();

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const getTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return {
          percentageChange: current > 0 ? 100.0 : 0.0,
          trend: current > 0 ? "UP" : "NO_CHANGE",
        };
      }

      const percentage = ((current - previous) / previous) * 100;

      return {
        percentageChange: Number(percentage.toFixed(2)),
        trend: percentage > 0 ? "UP" : percentage < 0 ? "DOWN" : "NO_CHANGE",
      };
    };

    // Total Invoices
    const currentTotal = await SubscriptionInvoiceModel.countDocuments({
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousTotal = await SubscriptionInvoiceModel.countDocuments({
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Paid Invoices
    const currentPaid = await SubscriptionInvoiceModel.countDocuments({
      status: SubscriptionInvoiceStatus.PAID,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousPaid = await SubscriptionInvoiceModel.countDocuments({
      status: SubscriptionInvoiceStatus.PAID,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Pending Invoices
    const currentPending = await SubscriptionInvoiceModel.countDocuments({
      status: SubscriptionInvoiceStatus.PENDING,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousPending = await SubscriptionInvoiceModel.countDocuments({
      status: SubscriptionInvoiceStatus.PENDING,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Overdue Invoices
    const currentOverdue = await SubscriptionInvoiceModel.countDocuments({
      status: SubscriptionInvoiceStatus.PENDING,
      dueDate: { $lt: now },
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousOverdue = await SubscriptionInvoiceModel.countDocuments({
      status: SubscriptionInvoiceStatus.PENDING,
      dueDate: { $lt: startOfCurrentMonth },
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    return {
      totalInvoices: {
        count: currentTotal,
        previousMonthCount: previousTotal,
        ...getTrend(currentTotal, previousTotal),
      },
      paidInvoices: {
        count: currentPaid,
        previousMonthCount: previousPaid,
        ...getTrend(currentPaid, previousPaid),
      },
      pendingInvoices: {
        count: currentPending,
        previousMonthCount: previousPending,
        ...getTrend(currentPending, previousPending),
      },
      overdueInvoices: {
        count: currentOverdue,
        previousMonthCount: previousOverdue,
        ...getTrend(currentOverdue, previousOverdue),
      },
    };
  } catch (error) {
    throw error;
  }
};

export const getSubscriptionInvoices = async (query: any) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      tenantName,
      planName,
      invoiceFromDate,
      invoiceToDate,
      dueFromDate,
      dueToDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const match: any = {
      deletedAt: null,
    };

    if (status) {
      match.status = status;
    }

    if (invoiceFromDate || invoiceToDate) {
      match.invoiceDate = {};

      if (invoiceFromDate) {
        match.invoiceDate.$gte = new Date(invoiceFromDate);
      }

      if (invoiceToDate) {
        match.invoiceDate.$lte = new Date(invoiceToDate);
      }
    }

    if (dueFromDate || dueToDate) {
      match.dueDate = {};

      if (dueFromDate) {
        match.dueDate.$gte = new Date(dueFromDate);
      }

      if (dueToDate) {
        match.dueDate.$lte = new Date(dueToDate);
      }
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
          as: "plan",
        },
      },
      {
        $unwind: {
          path: "$plan",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          selectedBillingPeriod: {
            $first: {
              $filter: {
                input: "$plan.billingPeriods",
                as: "bp",
                cond: {
                  $eq: ["$$bp.billingPeriodId", "$billingPeriodId"],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          duration: "$selectedBillingPeriod.duration",
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            {
              invoiceNumber: {
                $regex: search,
                $options: "i",
              },
            },
            {
              "tenant.tenantName": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    if (tenantName) {
      pipeline.push({
        $match: {
          "tenant.tenantName": {
            $regex: tenantName,
            $options: "i",
          },
        },
      });
    }

    if (planName) {
      pipeline.push({
        $match: {
          "plan.planName": {
            $regex: planName,
            $options: "i",
          },
        },
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
          {
            $skip: (Number(page) - 1) * Number(limit),
          },
          {
            $limit: Number(limit),
          },
          {
            $project: {
              _id: 0,

              invoiceId: "$_id",
              invoiceNumber: 1,

              tenant: {
                tenantId: "$tenant._id",
                tenantCode: "$tenant.tenantCode",
                tenantName: "$tenant.tenantName",
              },

              subscriptionPlan: {
                _id: "$plan._id",
                planId: "$plan.planId",
                planName: "$plan.planName",
                duration: "$duration",
              },

              invoiceDate: 1,
              dueDate: 1,
              currency: 1,
              totalAmount: 1,
              status: 1,
            },
          },
        ],

        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    });

    const result = await SubscriptionInvoiceModel.aggregate(pipeline);

    const items = result[0]?.items || [];
    const totalRecords = result[0]?.totalCount[0]?.count || 0;

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages: Math.ceil(totalRecords / Number(limit)),
        hasNextPage: Number(page) * Number(limit) < totalRecords,
        hasPreviousPage: Number(page) > 1,
      },
    };
  } catch (error) {
    throw error;
  }
};

export const getSubscriptionInvoiceById = async (invoiceId: string) => {
  try {
    const invoice = await SubscriptionInvoiceModel.findOne({
      _id: invoiceId,
      deletedAt: null,
    }).populate({
      path: "subscriptionId",
      select:
        "subscriptionCode status paymentStatus duration startDate endDate nextRenewalDate autoRenew",
    });

    const tenant = await Tenants.findOne({
      tenantCode: invoice?.tenantId,
    });

    if (!invoice) {
      throwError(subscriptionInvoiceMessages.INVOICE_NOT_FOUND, 404);
      return;
    }

    const subscriptionPlan = await plan.findOne({
      _id: invoice.planId,
      billingPeriods: {
        $elemMatch: { billingPeriodId: invoice.billingPeriodId },
      },
    });

    if (!subscriptionPlan) {
      throwError(subscriptionInvoiceMessages.SUBSCRIPTION_PLAN_NOT_FOUND, 404);
      return;
    }

    const billingPeriod = subscriptionPlan.billingPeriods.find(
      (bp) => bp.billingPeriodId === invoice.billingPeriodId,
    );

    if(!billingPeriod) {
      throwError(subscriptionInvoiceMessages.BILLING_PERIOD_NOT_FOUND, 404);
      return;
    }

    const subscription = invoice.subscriptionId as any;

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      billingPeriodId: invoice.billingPeriodId,
      currency: invoice.currency,
      paymentTerms: invoice.paymentTerms,
      discountAmount: invoice.discountAmount,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      notes: invoice.notes,
      attachments: invoice.attachments,
      nextReminderDate: invoice.nextReminderDate,

      tenant: tenant
        ? {
            _id: tenant._id,
            tenantId: tenant.tenantCode,
            tenantName: tenant.tenantName,
            email: tenant.emailId,
            phoneNumber: tenant.phoneNumber,
            domainName: tenant.domainName,
            status: tenant.status,
          }
        : null,

      subscriptionPlan: subscriptionPlan
        ? {
            _id: subscriptionPlan._id,
            planId: subscriptionPlan.planId,
            planName: subscriptionPlan.planName,
            billingPeriod: billingPeriod.billingPeriod,
            duration: billingPeriod.duration,
            price: billingPeriod.price,
            discount: billingPeriod.discount,
            gstRate: billingPeriod.gstRate,
            taxAmount: billingPeriod.taxAmount,
          }
        : null,

      subscription: subscription
        ? {
            subscriptionId: subscription._id,
            subscriptionCode: subscription.subscriptionCode,
            status: subscription.status,
            paymentStatus: subscription.paymentStatus,
            duration: subscription.duration,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            nextRenewalDate: subscription.nextRenewalDate,
            autoRenew: subscription.autoRenew,
          }
        : null,

      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  } catch (error: any) {
    if (error.message === "Subscription Invoice not found.") {
      throw error;
    }
    throw new Error("Internal Server Error");
  }
};

export const processSubscriptionInvoiceReminders = async () => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await SubscriptionInvoiceModel.find({
      nextReminderDate: {
        $gte: start,
        $lte: end,
      },
      status: SubscriptionInvoiceStatus.PENDING,
      deletedAt: null,
    });

    for (const invoice of invoices) {
      try {
        await sendSubscriptionInvoiceEmail(invoice._id.toString(), "REMINDER");
        await SubscriptionInvoiceModel.updateOne(
          { _id: invoice._id },
          { $inc: { paymentTerms: 1 } },
        );
        console.log(
          `Reminder email sent for invoice: ${invoice.invoiceNumber}`,
        );
      } catch (error) {
        console.error(
          `Failed to send reminder email for invoice: ${invoice.invoiceNumber}`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("Error processing subscription invoice reminders:", error);
  }
};

export const sendSubscriptionInvoiceEmail = async (
  invoiceId: string,
  type: InvoiceEmailType = "CREATED",
) => {
  try {
    const invoice = await getSubscriptionInvoiceById(invoiceId);
    if (
      !invoice ||
      !invoice.tenant ||
      !invoice.subscriptionPlan ||
      !invoice.subscription
    ) {
      throwError(subscriptionInvoiceMessages.INVOICE_NOT_FOUND, 404);
      return;
    }

    const paymentLink = `https://blackstoneinfomaticstech.com/subscription-invoices/${invoice.invoiceId}/payment`;

    const isReminder = type === "REMINDER";

    const Email = await emailTemplate
      .findOne({
        templateKey: `subscription-invoice-${type.toLowerCase()}`,
      })
      .exec();

    if (!Email) {
      throw new Error(`Email template for ${type} not found.`);
    }

    const subject = isReminder
      ? `Reminder: Invoice ${invoice.invoiceNumber}`
      : `Subscription Invoice ${invoice.invoiceNumber}`;

    const html = Email.templateContent
      .replace(/{{ADMIN_EMAIL}}/g, invoice?.tenant?.email)
      .replace(/{{ORG_NAME}}/g, invoice?.tenant?.tenantName)
      .replace(/{{PLAN_NAME}}/g, invoice?.subscriptionPlan?.planName)
      .replace(/{{BILLING_CYCLE}}/g, invoice?.subscriptionPlan?.duration.toString())
      .replace(/{{PLAN_PRICE}}/g, invoice?.subtotal.toString())
      .replace(/{{INVOICE_ID}}/g, invoice?.invoiceId.toString())
      .replace(
        /{{INVOICE_DATE}}/g,
        new Date(invoice?.invoiceDate).toDateString(),
      )
      .replace(/{{DUE_DATE}}/g, new Date(invoice?.dueDate).toDateString())
      .replace(/{{TENANT_ID}}/g, invoice?.tenant?.tenantId.toString())
      .replace(/{{DOMAIN}}/g, invoice?.tenant?.domainName || "-")
      .replace(/{{PHONE}}/g, invoice?.tenant?.phoneNumber || "-")
      .replace(/{{SUBTOTAL}}/g, invoice?.subtotal.toString())
      .replace(
        /{{GST_RATE}}/g,
        invoice?.subscriptionPlan?.gstRate.toString(),
      )
      .replace(/{{GST_AMOUNT}}/g, invoice?.taxAmount.toString())
      .replace(/{{TOTAL_AMOUNT}}/g, invoice?.totalAmount.toString())
      .replace(/{{PAYMENT_LINK}}/g, paymentLink)
      .replace(/{{INVOICE_LINK}}/g, paymentLink)
      .replace(/{{COMPANY_URL}}/g, "https://blackstoneinfomaticstech.com")
      .replace(/{{LOGO_URL}}/g, "https://your-logo-url.com/logo.png")
      .replace(/{{WEBSITE_URL}}/g, "https://blackstoneinfomaticstech.com")
      .replace(/{{TERMS_URL}}/g, "https://blackstoneinfomaticstech.com/terms")
      .replace(
        /{{PRIVACY_URL}}/g,
        "https://blackstoneinfomaticstech.com/privacy",
      )
      .replace(/{{PAYMENT_VALIDITY}}/g, "24 hours")
      .replace(/{{INVITE_VALIDITY}}/g, "48 hours")
      .replace(/{{REFUND_WINDOW}}/g, "7 days");

    const emailTo = [
      {
        email: invoice.tenant?.email,
        name: invoice.tenant?.tenantName,
      },
    ];

    await sendEmailClient(emailTo, subject, html);

    return true;
  } catch (error: any) {
    console.error("Subscription invoice email failed:", error);
    throw error;
  }
};

export const getSubscriptionInvoiceByTenantId = async (
  tenantId: string
) => {
  const invoices = await SubscriptionInvoiceModel.find({
    tenantId,
    deletedAt: null,
  }).lean();

  if (!invoices.length) {
    return [];
  }

  const subscription = await TenantSubscription.findOne({
    tenantId,
    deletedAt: null,
  }).lean();

  if (!subscription) {
    return [];
  }

  const result = await Promise.all(
    invoices.map(async (invoice: any) => {
      const paymentRecord = await paymenttransaction
        .findOne({
          subscriptionId: invoice.subscriptionId,
          tenantId,
          deletedAt: null,
        })
        .lean();

      return {
        invoiceId: invoice.invoiceNumber,
        plan: subscription.planName || "",
        amount: paymentRecord?.amount || 0,
        planCycle: subscription.duration || 0,
        paymentMethod: paymentRecord?.paymentMethod || "",
        paymentDate: paymentRecord?.paymentDate || null,
        planStatus: subscription.status || "",
        paymentStatus: paymentRecord?.paymentStatus || "",
      };
    }),
  );

  return result;
};


