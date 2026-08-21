import { SubscriptionInvoice } from "../../types/models.types";
import Tenants from "../models/tenants";
import plan from "../models/plan-model";
import emailTemplate from "../models/emailTemplate";
import SubscriptionInvoiceModel from "../models/subscriptionInvoice";
import TenantSubscription from "../models/tenantsubscription";
import { PaymentStatus, SubscriptionInvoiceStatus } from "../shared/enum";
import { sendEmailClient } from "../shared/email";
import paymenttransaction from "../models/paymenttransaction";
import { throwError } from "../helpers/throwError";
import { subscriptionInvoiceMessages } from "../config/messages";

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
      status: "Active",
    });

    if (!subscriptionPlan) {
      throwError(subscriptionInvoiceMessages.SUBSCRIPTION_PLAN_NOT_FOUND, 404);
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
      throwError(subscriptionInvoiceMessages.TENANT_SUBSCRIPTION_NOT_FOUND, 404);
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

    await newInvoice.save();

    await sendSubscriptionInvoiceEmail(
      newInvoice._id.toString(),
      "CREATED",
    );

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
      {
        $match: match,
      },

      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "_id",
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
                planId: "$plan._id",
                planName: "$plan.planName",
                billingCycle: "$plan.billingCycle",
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
    })
      // .populate({
      //   path: "tenantId",
      //   select: "tenantCode tenantName emailId phoneNumber domainName status",
      // })
      .populate({
        path: "planId",
        select: "planCode planName billingCycle totalPrice taxAmount gstAndTax",
      })
      .populate({
        path: "subscriptionId",
        select:
          "subscriptionCode status paymentStatus billingCycle startDate endDate nextRenewalDate autoRenew",
      });

    const tenant = await Tenants.findOne({
      tenantCode: invoice?.tenantId,
    });
    
    if (!invoice) {
      throwError(subscriptionInvoiceMessages.INVOICE_NOT_FOUND, 404);
      return;
     }

    const plan = invoice.planId as any;
    const subscription = invoice.subscriptionId as any;

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
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
            tenantId: tenant._id,
            tenantCode: tenant.tenantCode,
            tenantName: tenant.tenantName,
            email: tenant.emailId,
            phoneNumber: tenant.phoneNumber,
            domainName: tenant.domainName,
            status: tenant.status,
          }
        : null,

      subscriptionPlan: plan
        ? {
            planId: plan._id,
            planCode: plan.planCode,
            planName: plan.planName,
            billingCycle: plan.billingCycle,
            price: plan.totalPrice,
            taxAmount: plan.taxAmount,
            gstAndTax: plan.gstAndTax,
          }
        : null,

      subscription: subscription
        ? {
            subscriptionId: subscription._id,
            subscriptionCode: subscription.subscriptionCode,
            status: subscription.status,
            paymentStatus: subscription.paymentStatus,
            billingCycle: subscription.billingCycle,
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
      .replace(/{{BILLING_CYCLE}}/g, invoice?.subscriptionPlan?.billingCycle)
      .replace(/{{PLAN_PRICE}}/g, invoice?.subscriptionPlan?.price.toString())
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
      .replace(/{{GST_RATE}}/g, invoice?.subscriptionPlan?.gstAndTax.toString())
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

export const getAllTransactions = async (query: any = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      tenantName,
      planName,
      invoiceNumber,
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
      match.paymentStatus = status;
    }

    if (invoiceFromDate || invoiceToDate) {
      match.paymentDate = {};

      if (invoiceFromDate) {
        match.paymentDate.$gte = new Date(invoiceFromDate);
      }

      if (invoiceToDate) {
        match.paymentDate.$lte = new Date(invoiceToDate);
      }
    }

    const pipeline: any[] = [
      {
        $match: match,
      },

      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "_id",
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
          from: "subscriptioninvoice",
          localField: "invoiceId",
          foreignField: "_id",
          as: "invoice",
        },
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "tenantsubscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "subscription",
        },
      },
      {
        $unwind: {
          path: "$subscription",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "plan",
          localField: "subscription.planId",
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
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            {
              paymentNumber: {
                $regex: search,
                $options: "i",
              },
            },
            {
              transactionReference: {
                $regex: search,
                $options: "i",
              },
            },
            {
              stripePaymentIntentId: {
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
            {
              "invoice.invoiceNumber": {
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

    if (invoiceNumber) {
      pipeline.push({
        $match: {
          "invoice.invoiceNumber": {
            $regex: invoiceNumber,
            $options: "i",
          },
        },
      });
    }

    if (dueFromDate || dueToDate) {
      const dueDate: any = {};

      if (dueFromDate) {
        dueDate.$gte = new Date(dueFromDate);
      }

      if (dueToDate) {
        dueDate.$lte = new Date(dueToDate);
      }

      pipeline.push({
        $match: {
          "invoice.dueDate": dueDate,
        },
      });
    }

    const sortFieldMap: Record<string, string> = {
      createdAt: "createdAt",
      invoiceDate: "invoice.invoiceDate",
      dueDate: "invoice.dueDate",
      invoiceNumber: "invoice.invoiceNumber",
      totalAmount: "amount",
    };

    const sortField = sortFieldMap[sortBy] || "createdAt";

    pipeline.push({
      $sort: {
        [sortField]: sortOrder === "asc" ? 1 : -1,
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

              transactionId: "$_id",
              paymentNumber: 1,

              tenantId: 1,
              invoiceId: 1,
              subscriptionId: 1,

              paymentType: 1,
              gateway: 1,
              paymentStatus: 1,
              amount: 1,
              currency: 1,
              stripePaymentIntentId: 1,
              transactionReference: 1,
              paymentMethod: 1,
              paymentResponse: 1,
              failureReason: 1,
              paymentDate: 1,
              refundId: 1,
              refundAmount: 1,
              refundDate: 1,
              refundReason: 1,
              createdBy: 1,
              updatedBy: 1,
              createdAt: 1,
              updatedAt: 1,

              tenant: {
                tenantId: "$tenant._id",
                tenantCode: "$tenant.tenantCode",
                tenantName: "$tenant.tenantName",
              },

              invoice: {
                invoiceId: "$invoice._id",
                invoiceNumber: "$invoice.invoiceNumber",
                invoiceDate: "$invoice.invoiceDate",
                dueDate: "$invoice.dueDate",
              },

              subscription: {
                subscriptionId: "$subscription._id",
                subscriptionCode: "$subscription.subscriptionCode",
                billingCycle: "$subscription.billingCycle",
                status: "$subscription.status",
              },

              subscriptionPlan: {
                planId: "$plan._id",
                planName: "$plan.planName",
                billingCycle: "$plan.billingCycle",
              },
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

    const result = await paymenttransaction.aggregate(pipeline);

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

export const getFinanceTransactionCardCount = async () => {
  try {
    const now = new Date();
    const successfulStatus = PaymentStatus.SUCCESS;
    const pendingStatus = PaymentStatus.PENDING;
    const failedStatus = PaymentStatus.FAILED;

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
    const currentTotal = await paymenttransaction.countDocuments({
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousTotal = await paymenttransaction.countDocuments({
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Successful Transactions
    const currentSuccessful = await paymenttransaction.countDocuments({
      paymentStatus: successfulStatus,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousSuccessful = await paymenttransaction.countDocuments({
      paymentStatus: successfulStatus,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Pending Transactions
    const currentPending = await paymenttransaction.countDocuments({
      paymentStatus: pendingStatus,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousPending = await paymenttransaction.countDocuments({
      paymentStatus: pendingStatus,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    // Failed Transactions
    const currentFailed = await paymenttransaction.countDocuments({
      paymentStatus: failedStatus,
      createdAt: {
        $gte: startOfCurrentMonth,
        $lt: startOfNextMonth,
      },
    });

    const previousFailed = await paymenttransaction.countDocuments({
      paymentStatus: failedStatus,
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfCurrentMonth,
      },
    });

    return {
      totalTransactions: {
        count: currentTotal,
        previousMonthCount: previousTotal,
        ...getTrend(currentTotal, previousTotal),
      },
      successfulTransactions: {
        count: currentSuccessful,
        previousMonthCount: previousSuccessful,
        ...getTrend(currentSuccessful, previousSuccessful),
      },
      pendingTransactions: {
        count: currentPending,
        previousMonthCount: previousPending,
        ...getTrend(currentPending, previousPending),
      },
      failedTransactions: {
        count: currentFailed,
        previousMonthCount: previousFailed,
        ...getTrend(currentFailed, previousFailed),
      },
    };
  } catch (error) {
    throw error;
  }
};
