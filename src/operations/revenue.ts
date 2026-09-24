import moment from "moment";
import InvoiceModel from "../models/subscriptionInvoice";
import Tenant from "../models/tenants";
import { FilterOptions } from "../shared/enum";
import { revenueMessages } from "../config/messages";

type RevenueRow = {
  month: string;
  grossRevenue: number;
  tax: number;
  discount: number;
  collectedRevenue: number;
  pendingRevenue: number;
  refund: number;
  fee: number;
  netRevenue: number;
  netRevenueGrowth: number;
  trend: string;
};

const calcPercentage = (current: number, prev: number) => {
  if (prev === 0) return current > 0 ? 100 : 0;

  const result = ((current - prev) / prev) * 100;
  return Number(result.toFixed(2));
};

const trend = (val: number) =>
  val > 0 ? "UP" : val < 0 ? "DOWN" : "NO_CHANGE";

const formatAmount = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 100000).toFixed(2)}L`;

  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;

  return amount.toFixed(2);
};

const safeNumber = (val: any) => Number(val || 0);

export const getRevenueDashboardStatsService = async () => {
  try {
    const now = moment();

    // Current Periods
    const startOfMonth = now.clone().startOf("month").toDate();
    const endOfMonth = now.clone().endOf("month").toDate();

    const startOfYear = now.clone().startOf("year").toDate();
    const endOfYear = now.clone().endOf("year").toDate();

    // Previous Periods
    const prevMonthStart = now
      .clone()
      .subtract(1, "month")
      .startOf("month")
      .toDate();
    const prevMonthEnd = now
      .clone()
      .subtract(1, "month")
      .endOf("month")
      .toDate();

    const prevYearStart = now
      .clone()
      .subtract(1, "year")
      .startOf("year")
      .toDate();
    const prevYearEnd = now.clone().subtract(1, "year").endOf("year").toDate();

    const currentDate = new Date();

    const result = await InvoiceModel.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },

      {
        $facet: {
          monthlyPayments: [
            {
              $lookup: {
                from: "paymenttransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "payments",
              },
            },
            { $unwind: "$payments" },
            {
              $match: {
                "payments.paymentStatus": "SUCCESS",
                "payments.paymentDate": {
                  $gte: startOfMonth,
                  $lte: endOfMonth,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$payments.netAmount" },
              },
            },
          ],

          monthlyRefunds: [
            {
              $lookup: {
                from: "refundtransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "refunds",
              },
            },
            { $unwind: "$refunds" },
            {
              $match: {
                "refunds.refundStatus": { $ne: "FAILED" },
                "refunds.refundedAt": { $gte: startOfMonth, $lte: endOfMonth },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$refunds.netAmount" },
              },
            },
          ],

          /** ---------------- PREVIOUS MONTH ---------------- **/
          prevMonthlyPayments: [
            {
              $lookup: {
                from: "paymenttransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "payments",
              },
            },
            { $unwind: "$payments" },
            {
              $match: {
                "payments.paymentStatus": "SUCCESS",
                "payments.paymentDate": {
                  $gte: prevMonthStart,
                  $lte: prevMonthEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$payments.netAmount" },
              },
            },
          ],

          prevMonthlyRefunds: [
            {
              $lookup: {
                from: "refundtransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "refunds",
              },
            },
            { $unwind: "$refunds" },
            {
              $match: {
                "refunds.refundStatus": { $ne: "FAILED" },
                "refunds.refundedAt": {
                  $gte: prevMonthStart,
                  $lte: prevMonthEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$refunds.netAmount" },
              },
            },
          ],

          /** ---------------- YEARLY ---------------- **/
          yearlyPayments: [
            {
              $lookup: {
                from: "paymenttransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "payments",
              },
            },
            { $unwind: "$payments" },
            {
              $match: {
                "payments.paymentStatus": "SUCCESS",
                "payments.paymentDate": { $gte: startOfYear, $lte: endOfYear },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$payments.netAmount" },
              },
            },
          ],

          yearlyRefunds: [
            {
              $lookup: {
                from: "refundtransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "refunds",
              },
            },
            { $unwind: "$refunds" },
            {
              $match: {
                "refunds.refundStatus": { $ne: "FAILED" },
                "refunds.refundedAt": { $gte: startOfYear, $lte: endOfYear },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$refunds.netAmount" },
              },
            },
          ],

          prevYearlyPayments: [
            {
              $lookup: {
                from: "paymenttransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "payments",
              },
            },
            { $unwind: "$payments" },
            {
              $match: {
                "payments.paymentStatus": "SUCCESS",
                "payments.paymentDate": {
                  $gte: prevYearStart,
                  $lte: prevYearEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$payments.netAmount" },
              },
            },
          ],

          prevYearlyRefunds: [
            {
              $lookup: {
                from: "refundtransaction",
                localField: "_id",
                foreignField: "invoiceId",
                as: "refunds",
              },
            },
            { $unwind: "$refunds" },
            {
              $match: {
                "refunds.refundStatus": { $ne: "FAILED" },
                "refunds.refundedAt": {
                  $gte: prevYearStart,
                  $lte: prevYearEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$refunds.netAmount" },
              },
            },
          ],

          /** ---------------- PENDING ---------------- **/
          pending: [
            {
              $match: {
                status: "PENDING",
                invoiceDate: { $gte: startOfMonth, $lte: endOfMonth },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalAmount" },
              },
            },
          ],

          prevPending: [
            {
              $match: {
                status: "PENDING",
                invoiceDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalAmount" },
              },
            },
          ],

          /** ---------------- OVERDUE ---------------- **/
          overdue: [
            {
              $match: {
                status: "PENDING",
                invoiceDate: { $gte: startOfMonth, $lte: endOfMonth },
                dueDate: { $lt: currentDate },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalAmount" },
              },
            },
          ],

          prevOverdue: [
            {
              $match: {
                status: "PENDING",
                invoiceDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
                dueDate: { $lt: prevMonthEnd },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalAmount" },
              },
            },
          ],
        },
      },
    ]);

    const data = result[0];

    /** ---------- HELPERS ---------- **/

    const getValue = (arr: any[]) => arr?.[0]?.total || 0;

    /** ---------- CALCULATIONS ---------- **/

    const monthlyNet =
      getValue(data.monthlyPayments) - getValue(data.monthlyRefunds);

    const prevMonthlyNet =
      getValue(data.prevMonthlyPayments) - getValue(data.prevMonthlyRefunds);

    const yearlyNet =
      getValue(data.yearlyPayments) - getValue(data.yearlyRefunds);

    const prevYearlyNet =
      getValue(data.prevYearlyPayments) - getValue(data.prevYearlyRefunds);

    const pending = getValue(data.pending);
    const prevPending = getValue(data.prevPending);

    const overdue = getValue(data.overdue);
    const prevOverdue = getValue(data.prevOverdue);

    /** ---------- RESPONSE ---------- **/

    return {
      monthlyRevenue: {
        rawAmount: monthlyNet.toFixed(2),
        amount: formatAmount(monthlyNet),
        percentageChange: calcPercentage(monthlyNet, prevMonthlyNet),
        trend: trend(calcPercentage(monthlyNet, prevMonthlyNet)),
      },
      annualRevenue: {
        rawAmount: yearlyNet.toFixed(2),
        amount: formatAmount(yearlyNet),
        percentageChange: calcPercentage(yearlyNet, prevYearlyNet),
        trend: trend(calcPercentage(yearlyNet, prevYearlyNet)),
      },
      pendingRevenue: {
        rawAmount: pending.toFixed(2),
        amount: formatAmount(pending),
        percentageChange: calcPercentage(pending, prevPending),
        trend: trend(calcPercentage(pending, prevPending)),
      },
      overdueRevenue: {
        rawAmount: overdue.toFixed(2),
        amount: formatAmount(overdue),
        percentageChange: calcPercentage(overdue, prevOverdue),
        trend: trend(calcPercentage(overdue, prevOverdue)),
      },
    };
  } catch (error) {
    throw error;
  }
};

export const getLatestTenantRevenueService = async () => {
  try {
    const data = await Tenant.aggregate([
      { $sort: { createdDate: -1 } },
      { $limit: 5 },

      {
        $lookup: {
          from: "paymenttransaction",
          let: { tenantCode: "$tenantCode" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tenantId", "$$tenantCode"] },
                    { $eq: ["$paymentStatus", "SUCCESS"] },
                    { $eq: ["$deletedAt", null] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$netAmount" },
              },
            },
          ],
          as: "tenantPayments",
        },
      },

      {
        $addFields: {
          revenue: {
            $ifNull: [{ $arrayElemAt: ["$tenantPayments.revenue", 0] }, 0],
          },
        },
      },

      {
        $lookup: {
          from: "paymenttransaction",
          pipeline: [
            {
              $match: {
                paymentStatus: "SUCCESS",
                deletedAt: null,
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$netAmount" },
              },
            },
          ],
          as: "totalData",
        },
      },

      {
        $addFields: {
          totalRevenue: {
            $ifNull: [{ $arrayElemAt: ["$totalData.totalRevenue", 0] }, 0],
          },
        },
      },

      {
        $addFields: {
          percentage: {
            $cond: [
              { $eq: ["$totalRevenue", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$revenue", "$totalRevenue"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
        },
      },

      {
        $project: {
          _id: 0,
          tenantId: "$tenantCode",
          tenantName: "$tenantName",
          revenue: 1,
          percentage: 1,
        },
      },
    ]);

    return data;
  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};

export const getRevenueNetRevenueOverviewService = async (
  filter: FilterOptions,
) => {
  try {
    const now = moment();
    const filterOption = filter.toLowerCase();

    const start = now
      .clone()
      .startOf(filterOption as moment.unitOfTime.StartOf)
      .toDate();
    const end = now
      .clone()
      .endOf(filterOption as moment.unitOfTime.StartOf)
      .toDate();

    const preStart = now
      .clone()
      .subtract(1, filterOption as moment.unitOfTime.DurationConstructor)
      .startOf(filterOption as moment.unitOfTime.DurationConstructor)
      .toDate();
    const preEnd = now
      .clone()
      .subtract(1, filterOption as moment.unitOfTime.DurationConstructor)
      .endOf(filterOption as moment.unitOfTime.StartOf)
      .toDate();

    const buildFacet = (start: any, end: any) => [
      {
        $lookup: {
          from: "paymenttransaction",
          let: { invoiceId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$invoiceId", "$$invoiceId"] },
                paymentStatus: "SUCCESS",
                paymentDate: { $gte: start, $lte: end },
              },
            },
          ],
          as: "payments",
        },
      },
      {
        $lookup: {
          from: "refundtransaction",
          let: { invoiceId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$invoiceId", "$$invoiceId"] },
                refundStatus: "SUCCESS",
                refundedAt: { $gte: start, $lte: end },
              },
            },
          ],
          as: "refunds",
        },
      },
      {
        $addFields: {
          paymentAmount: { $sum: "$payments.netAmount" },
          processingFee: { $sum: "$payments.processingFee" },
          refundAmount: { $sum: "$refunds.netAmount" },
        },
      },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: "$totalAmount" },
          discount: { $sum: "$discountAmount" },
          tax: { $sum: "$taxAmount" },
          Fee: { $sum: "$processingFee" },
          collectedRevenue: { $sum: "$paymentAmount" },
          refunds: { $sum: "$refundAmount" },
        },
      },
      {
        $addFields: {
          netRevenue: {
            $subtract: ["$collectedRevenue", "$refunds"],
          },
        },
      },
    ];

    const result = await InvoiceModel.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $facet: {
          currentPeriod: buildFacet(start, end),
          previousPeriod: buildFacet(preStart, preEnd),
        },
      },
    ]);

    const currentPeriodData = result[0].currentPeriod[0] || {
      grossRevenue: 0,
      discount: 0,
      tax: 0,
      Fee: 0,
      refunds: 0,
      netRevenue: 0,
    };

    const previousPeriodData = result[0].previousPeriod[0] || {
      grossRevenue: 0,
      discount: 0,
      tax: 0,
      Fee: 0,
      refunds: 0,
      netRevenue: 0,
    };

    return {
      filter: filter,
      grossRevenue: {
        amount: formatAmount(currentPeriodData.grossRevenue),
        rawAmount: safeNumber(currentPeriodData.grossRevenue).toFixed(2),
      },
      discount: {
        amount: formatAmount(currentPeriodData.discount),
        rawAmount: safeNumber(currentPeriodData.discount).toFixed(2),
      },
      tax: {
        amount: formatAmount(currentPeriodData.tax),
        rawAmount: safeNumber(currentPeriodData.tax).toFixed(2),
      },
      processingFee: {
        amount: formatAmount(currentPeriodData.Fee),
        rawAmount: safeNumber(currentPeriodData.Fee).toFixed(2),
      },
      refunds: {
        amount: formatAmount(currentPeriodData.refunds),
        rawAmount: safeNumber(currentPeriodData.refunds).toFixed(2),
      },
      netRevenue: {
        amount: formatAmount(currentPeriodData.netRevenue),
        rawAmount: safeNumber(currentPeriodData.netRevenue).toFixed(2),
        percentageChange: calcPercentage(
          currentPeriodData.netRevenue,
          previousPeriodData.netRevenue,
        ),
        trend: trend(
          calcPercentage(
            currentPeriodData.netRevenue,
            previousPeriodData.netRevenue,
          ),
        ),
      },
    };
  } catch (error: any) {
    throw error;
  }
};

export const getMonthRevenueService = async (query: any) => {
  try {
    const { page, limit, from, to, sortBy, sortOrder } = query;

    if (from && to && moment(from).isAfter(moment(to))) {
      throw new Error("Invalid Query Parameters");
    }

    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      startDate = moment(from, "YYYY-MM").startOf("month").toDate();
      endDate = moment(to, "YYYY-MM").endOf("month").toDate();
    } else {
      const minInvoice = await InvoiceModel.findOne({ deletedAt: null })
        .sort({ invoiceDate: 1 })
        .select("invoiceDate");

      if (!minInvoice) {
        return {
          success: true,
          message: "No revenue data found.",
          data: {
            items: [],
            pagination: {
              page,
              limit,
              totalRecords: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false,
            },
          },
        };
      }

      startDate = moment(minInvoice.invoiceDate).startOf("month").toDate();
      endDate = moment().endOf("month").toDate();
    }

    const data = await InvoiceModel.aggregate([
      {
        $match: {
          deletedAt: null,
          invoiceDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: "paymenttransaction",
          let: { invoiceId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$invoiceId", "$$invoiceId"] },
                paymentStatus: "SUCCESS",
              },
            },
          ],
          as: "payments",
        },
      },
      {
        $lookup: {
          from: "refundtransaction",
          let: { invoiceId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$invoiceId", "$$invoiceId"] },
                refundStatus: "SUCCESS",
              },
            },
          ],
          as: "refunds",
        },
      },
      {
        $addFields: {
          feeAmount: { $sum: "$payments.processingFee" },
          paymentAmount: { $sum: "$payments.netAmount" },
          refundAmount: { $sum: "$refunds.netAmount" },
          month: {
            $dateToString: { format: "%Y-%m", date: "$invoiceDate" },
          },
        },
      },
      {
        $group: {
          _id: "$month",

          grossRevenue: { $sum: { $ifNull: ["$subtotal", 0] } },
          discount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          refund: { $sum: { $ifNull: ["$refundAmount", 0] } },
          fee: { $sum: { $ifNull: ["$feeAmount", 0] } },
          tax: { $sum: "$taxAmount" },

          collectedRevenue: { $sum: { $ifNull: ["$paymentAmount", 0] } },

          pendingRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$totalAmount", 0],
            },
          },

          totalAmount: { $sum: { $ifNull: ["$totalAmount", 0] } },
        },
      },
      {
        $addFields: {
          netRevenue: {
            $subtract: ["$collectedRevenue", "$refund"],
          },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          grossRevenue: 1,
          tax: 1,
          discount: 1,
          collectedRevenue: 1,
          pendingRevenue: 1,
          refund: 1,
          fee: 1,
          netRevenue: 1,
        },
      },
      {
        $sort: { month: 1 },
      },
    ]);

    const months: string[] = [];
    let cursor = moment(startDate);

    while (cursor.isSameOrBefore(endDate)) {
      months.push(cursor.format("YYYY-MM"));
      cursor.add(1, "month");
    }

    const map = new Map(data.map((d: any) => [d.month, d]));

    let fullData = months.map((m) => {
      const d = map.get(m);
      return {
        month: moment(m).format("MMMM YYYY"),
        grossRevenue: safeNumber(d?.grossRevenue),
        tax: safeNumber(d?.tax),
        discount: safeNumber(d?.discount),
        collectedRevenue: safeNumber(d?.collectedRevenue),
        pendingRevenue: safeNumber(d?.pendingRevenue),
        refund: safeNumber(d?.refund),
        fee: safeNumber(d?.fee),
        netRevenue: safeNumber(d?.netRevenue),
      };
    });

    fullData.sort((a, b) =>
      moment(a.month, "MMMM YYYY").diff(moment(b.month, "MMMM YYYY")),
    );

    const withGrowth = fullData.map((item, index) => {
      if (index === 0) {
        return { ...item, netRevenueGrowth: 0, trend: "neutral" };
      }

      const prev = fullData[index - 1].netRevenue;
      const curr = item.netRevenue;

      let growth = 0;
      if (prev > 0) {
        growth = ((curr - prev) / prev) * 100;
      }

      return {
        ...item,
        netRevenueGrowth: Number(growth.toFixed(2)),
        trend: growth > 0 ? "up" : growth < 0 ? "down" : "neutral",
      };
    });

    const sortFieldMap: Record<string, keyof RevenueRow> = {
      amount: "netRevenue",
      netRevenue: "netRevenue",
      taxRevenue: "tax",
      discountRevenue: "discount",
      refundRevenue: "refund",
      grossRevenue: "grossRevenue",
      feeRevenue: "fee",
      collectedRevenue: "collectedRevenue",
      pendingRevenue: "pendingRevenue",
      month: "month",
    };

    const field = sortFieldMap[sortBy as string] || "month";
    const order = sortOrder === "desc" ? -1 : 1;

    if (field === "month") {
      withGrowth.sort((a, b) =>
        order === 1
          ? moment(a.month, "MMMM YYYY").diff(moment(b.month, "MMMM YYYY"))
          : moment(b.month, "MMMM YYYY").diff(moment(a.month, "MMMM YYYY")),
      );
    } else {
      withGrowth.sort((a, b) =>
        order === 1
          ? (a[field] as number) - (b[field] as number)
          : (b[field] as number) - (a[field] as number),
      );
    }

    const totalRecords = withGrowth.length;
    const totalPages = Math.ceil(totalRecords / limit);

    const startIdx = (page - 1) * limit;
    const items = withGrowth.slice(startIdx, startIdx + limit);

    return {
      message:
        items.length > 0
          ? revenueMessages.MONTHLY_TENANT_REVENUE_FETCH_SUCCESS
          : revenueMessages.NODATA_FOUND,
      data: {
        items,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages,
          hasNext: page * limit < totalRecords,
          hasPrevious: page > 1,
        },
      },
    };
  } catch (error: any) {
    throw error;
  }
};
