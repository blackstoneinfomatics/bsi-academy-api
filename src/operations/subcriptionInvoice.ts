import mongoose from "mongoose";
import { SubscriptionInvoice } from "../../types/models.types";
import Tenants from "../models/tenants";
import plan from "../models/plan-model";
import SubscriptionInvoiceModel from "../models/subscriptionInvoice";
import TenantSubscription from "../models/tenantsubscription";
import { SubscriptionInvoiceStatus } from "../shared/enum";

export const createSubscriptionInvoice = async (
  payload: SubscriptionInvoice,
  tenantId: string,
) => {
  try {
    const tenant = await Tenants.findOne({
      tenantCode: tenantId,
      status: "Active",
      // deletedAt: null,
    });

    if (!tenant) {
      throw new Error("Tenant not found.");
    }

    const subscriptionPlan = await plan.findOne({
      _id: payload.planId,
      status: "Active",
    });

    if (!subscriptionPlan) {
      throw new Error("Subscription Plan not found.");
    }

    if (payload.dueDate < payload.invoiceDate) {
      throw new Error(
        "Due Date should be greater than or equal to Invoice Date.",
      );
    }

    if(payload.paymentTerms < 0) {
      throw new Error(
        "Payment Terms should be a non-negative number.",
      );
    }
    
    if(payload.nextReminderDays && payload.nextReminderDays < payload.invoiceDate && payload.nextReminderDays < payload.dueDate) {
      throw new Error(
        "Next Reminder Days should be greater than or equal to Invoice Date.",
      );
    }

    const tenantSubscription = await TenantSubscription.findOne({
      _id: payload.subscriptionId,
      deletedAt: null,
    });

    if (!tenantSubscription) {
      throw new Error("Tenant Subscription not found.");
    }

    const duplicateInvoice = await SubscriptionInvoiceModel.findOne({
      invoiceNumber: payload.invoiceNumber,
    });

    if (duplicateInvoice) {
      throw new Error("Invoice number already exists.");
    }

    if (payload.attachments?.length) {
      for (const url of payload.attachments) {
        if (!url.startsWith("https://")) {
          throw new Error("Invalid Attachment URL.");
        }
      }
    }

    const newInvoice = new SubscriptionInvoiceModel({
      ...payload,
      tenantId: tenant._id,
    });

    await newInvoice.save();
    //send email notification to the tenant about the new invoice
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
  const invoice = await SubscriptionInvoiceModel.findOne({
    _id: invoiceId,
    deletedAt: null,
  })
    .populate({
      path: "tenantId",
      select: "tenantCode tenantName email phoneNumber status",
    })
    .populate({
      path: "planId",
      select: "planCode planName billingCycle price",
    })
    .populate({
      path: "subscriptionId",
      select:
        "subscriptionCode status paymentStatus billingCycle startDate endDate nextRenewalDate autoRenew",
    });

  if (!invoice) {
    throw new Error("Subscription Invoice not found.");
  }

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

    tenant: invoice.tenantId,

    subscriptionPlan: invoice.planId,

    subscription: invoice.subscriptionId,

    createdBy: invoice.createdBy,

    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
};
