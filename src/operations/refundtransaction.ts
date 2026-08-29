import mongoose from "mongoose";
import {
  refundMessages,
} from "../config/messages";
import { throwError } from "../helpers/throwError";
import RefundTransaction from "../models/refundTransaction";
import {
  PaymentGateway,
  RefundApprovalStatus,
  RefundStatus,
} from "../shared/enum";
import Stripe from "stripe";
import { config } from "../config/env";
import paymenttransaction from "../models/paymenttransaction";
import refundTransaction from "../models/refundTransaction";

const stripe = new Stripe(config.stripeKey.stripesecretkey);

const ZERO_DECIMAL_CURRENCIES = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
];

const THREE_DECIMAL_CURRENCIES = ["BHD", "JOD", "KWD", "OMR", "TND"];

export function fromStripeAmount(amount: number, currency: string) {
  currency = currency.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.includes(currency)) {
    return amount;
  }

  if (THREE_DECIMAL_CURRENCIES.includes(currency)) {
    return amount / 1000;
  }

  return amount / 100;
}

export function toStripeAmount(amount: number, currency: string) {
  currency = currency.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.includes(currency)) {
    return Math.round(amount);
  }

  if (THREE_DECIMAL_CURRENCIES.includes(currency)) {
    return Math.round(amount * 1000);
  }

  return Math.round(amount * 100);
}

function roundTo2(value: number) {
  return Math.round(value * 100) / 100;
}

function convertFromStripeSettlement(
  amount: number,
  stripeCurrency: string,
  targetCurrency: string,
  exchangeRate?: number,
  originalCurrency?: string,
) {
  const normalized = fromStripeAmount(amount, stripeCurrency);

  if (stripeCurrency.toLowerCase() === targetCurrency.toLowerCase()) {
    return roundTo2(normalized);
  }

  if (!exchangeRate || !originalCurrency) {
    throw new Error("Missing exchange rate or original currency");
  }

  const originalAmount = normalized / exchangeRate;

  if (targetCurrency.toLowerCase() === originalCurrency.toLowerCase()) {
    return roundTo2(originalAmount);
  }

  throw new Error("External FX conversion required");
}

export const getRefundTransactionsService = async (query: any) => {
  const {
    page,
    limit,
    tenantName,
    refundStartDate,
    refundEndDate,
    status,
    refundStatus,
    paymentMethod,
    gateway,
    sortBy,
    sortOrder,
  } = query;

  const match: any = {
    deletedAt: null,
  };

  if (status) match.status = status;
  if (refundStatus) match.refundStatus = refundStatus;
  if (paymentMethod) match.paymentMethod = paymentMethod;
  if (gateway) match.gateway = gateway;

  if (refundStartDate || refundEndDate) {
    match.requestedDate = {};
    if (refundStartDate) match.requestedDate.$gte = refundStartDate;
    if (refundEndDate) match.requestedDate.$lte = refundEndDate;
  }

  const sortField = sortBy || "createdAt";
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

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
    { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "subscriptioninvoice",
        localField: "invoiceId",
        foreignField: "_id",
        as: "invoice",
      },
    },
    { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },

    ...(tenantName
      ? [
          {
            $match: {
              "tenant.tenantName": {
                $regex: tenantName,
                $options: "i",
              },
            },
          },
        ]
      : []),

    {
      $addFields: {
        refundWindow: {
          $let: {
            vars: {
              daysLeft: {
                $ceil: {
                  $divide: [
                    {
                      $subtract: [
                        {
                          $add: ["$requestedDate", 7 * 24 * 60 * 60 * 1000],
                        },
                        "$$NOW",
                      ],
                    },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
            },
            in: {
              $cond: [{ $lt: ["$$daysLeft", 0] }, "EXPIRED", "$$daysLeft"],
            },
          },
        },
      },
    },

    {
      $sort: {
        [sortField]: sortDirection,
      },
    },

    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              refundId: "$_id",
              refundNumber: 1,
              invoiceId: "$invoice.invoiceNumber",
              tenantName: "$tenant.tenantName",

              amount: 1,
              currency: 1,

              status: 1,
              refundStatus: 1,

              paymentMethod: 1,
              gateway: 1,

              requestedDate: 1,
              paymentDate: 1,
              refundedAt: 1,

              refundWindow: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const result = await RefundTransaction.aggregate(pipeline);

  const items = result[0].items;
  const totalRecords = result[0].totalCount[0]?.count || 0;

  return {
    items,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      hasNext: page * limit < totalRecords,
      hasPrevious: page > 1,
    },
  };
};

export const getRefundTransactionsByIdService = async (refundId: string) => {
  try {
    const objectId = new mongoose.Types.ObjectId(refundId);

    const result = await RefundTransaction.aggregate([
      {
        $match: {
          _id: objectId,
          deletedAt: null,
        },
      },

      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "tenantCode",
          as: "tenant",
        },
      },
      { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "subscriptioninvoice",
          localField: "invoiceId",
          foreignField: "_id",
          as: "invoice",
        },
      },
      { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "paymenttransaction",
          localField: "paymentId",
          foreignField: "_id",
          as: "payment",
        },
      },
      { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "tenantsubscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          refundWindowRaw: {
            $ceil: {
              $divide: [
                {
                  $subtract: [
                    {
                      $add: [
                        "$requestedDate",
                        7 * 24 * 60 * 60 * 1000, // +7 days
                      ],
                    },
                    "$$NOW",
                  ],
                },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          refundWindow: {
            $let: {
              vars: {
                daysLeft: {
                  $ceil: {
                    $divide: [
                      {
                        $subtract: [
                          {
                            $add: ["$requestedDate", 7 * 24 * 60 * 60 * 1000],
                          },
                          "$$NOW",
                        ],
                      },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
              },
              in: {
                $cond: [{ $lt: ["$$daysLeft", 0] }, "EXPIRED", "$$daysLeft"],
              },
            },
          },
        },
      },

      {
        $project: {
          refundId: "$_id",
          refundNumber: 1,
          invoice: {
            invoiceId: "$invoice._id",
            invoiceNumber: "$invoice.invoiceNumber",
            invoiceDate: "$invoice.invoiceDate",
            dueDate: "$invoice.dueDate",
            totalAmount: "$invoice.totalAmount",
          },

          tenant: {
            tenantId: "$tenant._id",
            tenantName: "$tenant.tenantName",
            email: "$tenant.emailId",
            domain: "$tenant.domainName",
            tenantCode: "$tenant.tenantCode",
            phoneNumber: "$tenant.phoneNumber",
          },

          plan: {
            planId: "$plan._id",
            planName: "$plan.planName",
          },

          payment: {
            paymentId: "$payment._id",
            paymentNumber: "$payment.paymentNumber",
            paymentDate: "$payment.paymentDate",
            amount: "$payment.amount",
            currency: "$payment.currency",
            paymentMethod: "$payment.paymentMethod",
            gateway: "$payment.gateway",
          },

          amount: 1,
          currency: 1,

          status: 1,
          refundStatus: 1,

          paymentMethod: 1,
          gateway: 1,
          processingFee: "$payment.processingFee",

          requestedDate: 1,
          paymentDate: 1,
          refundedAt: 1,

          refundWindow: 1,
          failureReason: 1,
          refundReason: 1,
          attachments: 1,
          description:1,

          createdBy: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
    return result[0] || null;
  } catch (error) {
    throw new Error("Internal Server Error");
  }
};

export const getRefundDashboardStatsService = async () => {
  const now = new Date();

  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const startOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );

  const result = await RefundTransaction.aggregate([
    {
      $match: {
        deletedAt: null,
      },
    },

    {
      $facet: {
        currentMonth: [
          {
            $match: {
              createdAt: {
                $gte: startOfCurrentMonth,
                $lt: startOfNextMonth,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
              failedCount: {
                $sum: {
                  $cond: [{ $eq: ["$refundStatus", "FAILED"] }, 1, 0],
                },
              },
              pendingCount: {
                $sum: {
                  $cond: [{ $eq: ["$refundStatus", "PENDING"] }, 1, 0],
                },
              },
            },
          },
        ],

        previousMonth: [
          {
            $match: {
              createdAt: {
                $gte: startOfPreviousMonth,
                $lt: startOfCurrentMonth,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
              failedCount: {
                $sum: {
                  $cond: [{ $eq: ["$refundStatus", "FAILED"] }, 1, 0],
                },
              },
              pendingCount: {
                $sum: {
                  $cond: [{ $eq: ["$refundStatus", "PENDING"] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    },
  ]);

  const current = result[0].currentMonth[0] || {};
  const previous = result[0].previousMonth[0] || {};

  const getVal = (obj: any, key: string) => obj?.[key] || 0;

  const calculatePercentage = (currentVal: number, prevVal: number) => {
    if (prevVal === 0) {
      if (currentVal > 0) return 100;
      return 0;
    }
    return ((currentVal - prevVal) / prevVal) * 100;
  };

  const getTrend = (val: number) => {
    if (val > 0) return "UP";
    if (val < 0) return "DOWN";
    return "NO_CHANGE";
  };

  const formatAmount = (amount: number) => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(0)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return `${amount}`;
  };

  const totalRefundsCurrent = getVal(current, "totalCount");
  const totalRefundsPrev = getVal(previous, "totalCount");

  const totalAmountCurrent = getVal(current, "totalAmount");
  const totalAmountPrev = getVal(previous, "totalAmount");

  const failedCurrent = getVal(current, "failedCount");
  const failedPrev = getVal(previous, "failedCount");

  const pendingCurrent = getVal(current, "pendingCount");
  const pendingPrev = getVal(previous, "pendingCount");

  const totalRefundsChange = calculatePercentage(
    totalRefundsCurrent,
    totalRefundsPrev,
  );

  const amountChange = calculatePercentage(totalAmountCurrent, totalAmountPrev);

  const failedChange = calculatePercentage(failedCurrent, failedPrev);
  const pendingChange = calculatePercentage(pendingCurrent, pendingPrev);

  return {
    totalRefunds: {
      count: totalRefundsCurrent,
      percentageChange: Number(totalRefundsChange.toFixed(2)),
      trend: getTrend(totalRefundsChange),
    },

    totalRefundAmount: {
      amount: formatAmount(totalAmountCurrent),
      rawAmount: totalAmountCurrent,
      percentageChange: Number(amountChange.toFixed(2)),
      trend: getTrend(amountChange),
    },

    failedRefunds: {
      count: failedCurrent,
      percentageChange: Number(failedChange.toFixed(2)),
      trend: getTrend(failedChange),
    },

    pendingRefunds: {
      count: pendingCurrent,
      percentageChange: Number(pendingChange.toFixed(2)),
      trend: getTrend(pendingChange),
    },
  };
};

export const updateRefundTransactionService = async (
  refundId: string,
  updateData: {
    gateway?: PaymentGateway;
    status?: RefundApprovalStatus;
    refundStatus?: RefundStatus;
    updatedBy?: string;
  },
) => {
  try {
    const refund = await getRefundTransactionsByIdService(refundId);

    if (!refund) {
      throwError(refundMessages.REFUND_NOT_FOUND, 404);
    }

    console.log("Refund Details:", refund);

    const payment = await paymenttransaction.findOne({
      _id: refund?.payment.paymentId,
    });
    console.log("Payment Details:", payment);
    if (!payment) {
      throwError(refundMessages.PAYMENT_NOT_FOUND, 404);
    }

    if (refund.refundStatus === RefundStatus.SUCCESS) {
      throwError(refundMessages.REFUND_ALREADY_PROCESSED, 400);
    }

    if (updateData.status === RefundApprovalStatus.REJECTED) {
      const updatedRefund = await refundTransaction.findOneAndUpdate(
        { _id: refundId, deletedAt: null },
        {
          $set: {
            status: RefundApprovalStatus.REJECTED,
            refundStatus: RefundStatus.FAILED,
            failureReason: refundMessages.REFUND_REJECTED_BY_ADMIN,
            updatedBy: "Super-Admin",
          },
        },
        { new: true }, 
      );

      if (!updatedRefund) {
        throwError(refundMessages.REFUND_NOT_FOUND, 404);
      }

      return formatResponse(updatedRefund);
    }

    if (
      updateData.gateway === PaymentGateway.MANUAL &&
      updateData.status === RefundApprovalStatus.APPROVED
    ) {
      const updatedRefund = await refundTransaction.findOneAndUpdate(
        {
          _id: refundId,
          deletedAt: null,
          refundStatus: { $ne: RefundStatus.SUCCESS }, // prevent duplicate
        },
        {
          $set: {
            status: RefundApprovalStatus.APPROVED,
            refundStatus: RefundStatus.SUCCESS,
            gateway: PaymentGateway.MANUAL,
            refundedAt: new Date(),
            updatedBy: "Super-Admin",
          },
        },
        { new: true },
      );

      if (!updatedRefund) {
        throwError(refundMessages.REFUND_NOT_FOUND, 404);
      }

      return formatResponse(updatedRefund);
    }

    if (
      updateData.gateway === PaymentGateway.STRIPE &&
      updateData.status === RefundApprovalStatus.APPROVED
    ) {
      try {
        const stripeResponse = await stripe.refunds.create({
          payment_intent: payment?.stripePaymentIntentId,
          amount: toStripeAmount(refund.amount, refund.currency),
        });

        if (stripeResponse.status === "failed") {
          await refundTransaction.findOneAndUpdate(
            { _id: refundId },
            {
              $set: {
                gateway: PaymentGateway.STRIPE,
                refundStatus: RefundStatus.FAILED,
                failureReason:
                  stripeResponse.failure_reason || "Stripe refund failed",
                refundResponse: stripeResponse,
                updatedBy: "Super-Admin",
              },
            },
          );

          throwError("Stripe refund failed", 400);
        }

        const refundDetails = await stripe.refunds.retrieve(stripeResponse.id, {
          expand: ["balance_transaction"],
        });

        console.log("Refund Details:", refundDetails);

        if (!refundDetails.balance_transaction) {
          throwError(refundMessages.STRIPE_REFUND_FAILED, 500);
          return;
        }

        const bt: any = refundDetails.balance_transaction;

        const netAmount = convertFromStripeSettlement(
          Math.abs(bt.net),
          bt.currency,
          refund.currency,
          bt.exchange_rate,
          refund.currency,
        );

        const settlementAmount = fromStripeAmount(
          Math.abs(bt.amount),
          bt.currency,
        );

        const updatedRefund = await refundTransaction.findOneAndUpdate(
          {
            _id: refundId,
            deletedAt: null,
            refundStatus: { $ne: RefundStatus.SUCCESS },
          },
          {
            $set: {
              status: RefundApprovalStatus.APPROVED,
              refundStatus: RefundStatus.SUCCESS,
              gateway: PaymentGateway.STRIPE,
              stripeRefundId: stripeResponse.id,
              refundMethod: refund.paymentMethod,
              netAmount: netAmount,
              settlementAmount: settlementAmount,
              settlementCurrency: bt.currency.toUpperCase(),
              exchangeRate: bt.exchange_rate || 1,
              refundedAt: new Date(),
              refundResponse: stripeResponse,
              updatedBy: "Super-Admin",
            },
          },
          { new: true },
        );

        if (!updatedRefund) {
          throwError(refundMessages.REFUND_NOT_FOUND, 404);
        }

        return formatResponse(updatedRefund);
      } catch (error: any) {
        await refundTransaction.findOneAndUpdate(
          { _id: refundId, deletedAt: null },
          {
            $set: {
              gateway: PaymentGateway.STRIPE,
              refundStatus: RefundStatus.FAILED,
              failureReason: error.message,
              refundResponse: error,
              updatedBy: "Super-Admin",
            },
          },
        );

        throwError(refundMessages.STRIPE_REFUND_FAILED, 500);
      }
    }
  } catch (error: any) {
    console.error("Error in updateRefundTransactionService:", error);
    throw error;
  }
};
const formatResponse = (refund: any) => {
  return {
    refundId: refund._id,
    status: refund.status,
    refundStatus: refund.refundStatus,
    gateway: refund.gateway,
    refundedAt: refund.refundedAt,
  };
};
