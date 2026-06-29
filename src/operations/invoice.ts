import { IStudentInvoice } from "../../types/models.types";
import { GetAllRecordsParams } from "../shared/enum";
import StudentInvoiceModel, { zodAlStudentInvoiceSchema } from "../models/stinvoice"
import { isNil } from "lodash";
import { commonMessages, evaluationMessages } from "../config/messages";
import AppLogger from "../helpers/logging";
import { Types } from "mongoose";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
  isWithinInterval
} from "date-fns";
import stinvoice from "../models/stinvoice";
import { Request, ResponseToolkit } from "@hapi/hapi";
import alstudents from "../models/alstudents";
import paymentDetails from "../models/paymentDetails";

/**
 * Retrieves a list of all evaluation records with filters, sorting, and pagination.
 *
 * @param {GetAllRecordsParams} params - Parameters for filtering, sorting, and pagination.
 * @returns {Promise<{ totalCount: number; invoice: IStudentInvoice[] }>} - The total count and list of evaluations.
 */
export const getAllStudetnInVoiceList = async (
    params: GetAllRecordsParams
  ): Promise<{ totalCount: number; invoice: IStudentInvoice[] }> => {
    const { sortBy, sortOrder, offset, limit } = params;
  
    const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
  
    const studentInvoiceQuery = StudentInvoiceModel.find().sort(sortOptions);
  
    if (!isNil(offset) && !isNil(limit)) {
      const skip = Math.max(
        0,
        ((Number(offset) ?? Number(commonMessages.OFFSET)) - 1) *
        (Number(limit) ?? Number(commonMessages.LIMIT))
      );
      studentInvoiceQuery
        .skip(skip)
        .limit(Number(limit) ?? Number(commonMessages.LIMIT));
    }
    const [invoice, totalCount] = await Promise.all([
        studentInvoiceQuery.exec(),
      StudentInvoiceModel.countDocuments().exec(),
    ]);
  
   // Log successful retrieval
   AppLogger.info(evaluationMessages.GET_ALL_LIST_SUCCESS, {
    totalCount: totalCount,
  });
  console.log(invoice);
    return { totalCount, invoice };
  };


export const getStudentInvoicesByAlStudentId = async (
  alStudentId: string,
  courseName: string
): Promise<IStudentInvoice[]> => {
  try {

    const objectId = new Types.ObjectId(alStudentId);

    const alStudent = await alstudents.findById(objectId);
    if (!alStudent) {
      return [];
    }

    const studentId = alStudent.student.studentId;

    // Get all payment details for this student
    const paymentDetailsList = await paymentDetails.find({
      userId: studentId
    });

    // Find all invoices for this student + course
    const query: any = {
      "student.studentId": studentId,
      courseName: courseName
    };

    const invoices = await StudentInvoiceModel.find(query)
      .sort({ lastUpdatedDate: -1 });

    // Attach paymentDate to invoice
   const invoicesWithPaymentDate = invoices.map((invoice) => {
  const invoiceObj = invoice.toObject();

  // Convert cents → dollars before comparison
  const matchingPayment = paymentDetailsList.find(
    (pd) =>
      Number(pd.paymentAmount) / 100 === Number(invoice.amount) &&
      pd.userId === studentId
  );

  if (matchingPayment) {
    invoiceObj.paymentDate = matchingPayment.paymentDate;
  }

  return invoiceObj;
});


    return invoicesWithPaymentDate;

  } catch (error) {
    console.error("🚨 Error in getStudentInvoicesByAlStudentId:", error);
    return [];
  }
};

 
  export const getStudentAllRevenue = async (
    dateRange: string,
    year: string // year as ISO string like "2023-01-01"
  ): Promise<{ date: string; label: string; revenue: number }[]> => {
    let startDate: Date;
    let endDate: Date;
    let intervalFn: (interval: { start: Date; end: Date }) => Date[];
    let outputFormat: string;
  
    // Parse the provided year string
    const parsedDate = parseISO(year);
    const parsedYear = parsedDate.getFullYear();
  
    const now = new Date();
  
    switch (dateRange.toLowerCase()) {
      case "yearly":
        startDate = new Date(Date.UTC(parsedYear, 0, 1));
        endDate = new Date(Date.UTC(parsedYear, 11, 31, 23, 59, 59, 999));
        intervalFn = eachMonthOfInterval;
        outputFormat = "MMM-yyyy";
        break;
      case "monthly":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        intervalFn = eachDayOfInterval;
        outputFormat = "yyyy-MM-dd";
        break;
      case "weekly":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        intervalFn = eachDayOfInterval;
        outputFormat = "yyyy-MM-dd";
        break;
      default:
        throw new Error("Invalid dateRange value. Use 'weekly', 'monthly', or 'yearly'.");
    }
  
    const invoices: IStudentInvoice[] = await StudentInvoiceModel.find({
      invoiceStatus: { $in: ["Paid"] },
    }).exec();
  
    const revenueMap: Record<string, number> = {};
  
    invoices.forEach((invoice) => {
      if (!invoice.createdDate) return; // ✅ Skip if date is undefined
  
      const invoiceDate = new Date(invoice.createdDate);
      const formattedDate = format(invoiceDate, outputFormat);
  
      if (revenueMap[formattedDate]) {
        revenueMap[formattedDate] += invoice.amount;
      } else {
        revenueMap[formattedDate] = invoice.amount;
      }
    });
  
    const result = intervalFn({ start: startDate, end: endDate }).map((date) => {
      const label = format(date, outputFormat);
      return {
        date: label,
        label,
        revenue: revenueMap[label] || 0,
      };
    });
  
    return result;
  };

  

export const getTotalAmountByCountry = async (
  dateRange: string
): Promise<{ country: string; revenue: number; count: number }[]> => {
  try {
    const matchStage: any = {
      status: "Active",
    };

    const now = new Date();
    let startDate: Date | undefined;

    if (dateRange === "all") {
      startDate = undefined; // no filter
    } else if (dateRange === "weekly") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    if (startDate) {
      matchStage.createdDate = { $gte: startDate, $lte: now };
    }
    

    const result = await stinvoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$student.country",
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          country: "$_id",
          revenue: 1,
          count: 1,
          _id: 0,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // 🔢 Add total revenue at the end
    const totalRevenue = result.reduce((acc, cur) => acc + cur.revenue, 0);
    const totalCount = result.reduce((acc, cur) => acc + cur.count, 0);

    result.push({
      country: "TotalAllCountries",
      revenue: totalRevenue,
      count: totalCount,
    });

    return result;
  } catch (error) {
    console.error("Error fetching student revenue by country:", error);
    throw error;
  }
};

export const getTotalAmountByCourse = async (
  dateRange: string
): Promise<{ courseName: string; revenue: number; count: number }[]> => {
  try {
    console.log("▶️ Called getTotalAmountByCourse with dateRange:", dateRange);

    const matchStage: any = {}; 

    const now = new Date();
    console.log("🕒 Current Date:", now);

    let startDate: Date | undefined;

    if (dateRange === "weekly") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      console.log("📅 Weekly Start Date:", startDate);
    } else if (dateRange === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      console.log("📅 Monthly Start Date:", startDate);
    } else if (dateRange === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
      console.log("📅 Yearly Start Date:", startDate);
    } else if (dateRange === "all") {
      console.log("📅 No date filter applied (ALL records)");
    }

    if (startDate) {
      matchStage.createdDate = { $gte: startDate, $lte: now };
      console.log("🔍 Applied Date Filter:", matchStage.createdDate);
    }

    console.log(" Final matchStage for aggregation:", matchStage);
    const matchedDocs = await stinvoice.find({});
    console.log("🧾 Total docs in collection:", matchedDocs.length);
    matchedDocs.forEach(doc => {
      console.log({
        courseName: doc.courseName,
        amount: doc.amount,
        createdDate: doc.createdDate,
        invoiceStatus: doc.invoiceStatus,
      });
    });
        

    const result = await stinvoice.aggregate([
      { $match: {} }, // No filtering
      {
        $group: {
          _id: { $ifNull: ["$courseName", "Unknown"] },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          courseName: "$_id",
          revenue: 1,
          count: 1,
          _id: 0,
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    

    console.log("📊 Aggregation Result:", result);

    const totalRevenue = result.reduce((acc, cur) => acc + cur.revenue, 0);
    const totalCount = result.reduce((acc, cur) => acc + cur.count, 0);

    console.log("💰 Total Revenue:", totalRevenue);
    console.log("🔢 Total Count:", totalCount);

    result.push({
      courseName: "TotalAllCourses",
      revenue: totalRevenue,
      count: totalCount,
    });

    console.log("✅ Final Result with Totals:", result);

    return result;
  } catch (error) {
    console.error("❌ Error in getTotalAmountByCourse:", error);
    throw error;
  }
};



export const sendInvoiceOperation = async (payload: IStudentInvoice) => {
  try {
    // Create new invoice document
    const newInvoice = new StudentInvoiceModel({
      ...payload,
      invoiceNumber: payload.invoiceNumber || Math.floor(100000 + Math.random() * 900000),
      invoiceStatus: payload.invoiceStatus || 'Pending',
      status: payload.status || 'Active',
      createdBy: payload.createdBy || 'Admin',
      lastUpdatedBy: payload.lastUpdatedBy || 'Admin',
      createdDate: payload.createdDate || new Date().toISOString(),
      lastUpdatedDate: payload.lastUpdatedDate || new Date().toISOString(),
    });

    const savedInvoice = await newInvoice.save();

    AppLogger.info(`Invoice created: ${JSON.stringify(savedInvoice)}`);
    return { invoice: savedInvoice };
  } catch (error) {
    AppLogger.error(`Error saving invoice: ${error}`);
    return {
      error: {
        message: "Failed to save invoice",
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
};


//listing all studentInvoice


export default async function getstudentInvoiceList() {
  const result = await StudentInvoiceModel.find();  // Simply retrieve all records without any filters
  return result;
}


export const getAllTotalInvoice = async (): Promise<{ date: string; total: number; paid: number }[]> => {
  const now = new Date();
  const currentYear = now.getFullYear(); // Ensure it's 2025 if needed

  const startDate = startOfYear(new Date(currentYear, 0, 1)); // Jan 1
  const endDate = endOfYear(new Date(currentYear, 0, 1));     // Dec 31

  const invoices = await StudentInvoiceModel.find({
    invoiceStatus: { $in: ["Paid"] }
  }).exec();

  const revenueMap: Record<string, { total: number; paid: number }> = {};

  invoices.forEach((invoice: IStudentInvoice) => {
    if (!invoice.createdDate) return; // ✅ Ensure date is defined

    const invoiceDate = new Date(invoice.createdDate);
    const formattedDate = format(invoiceDate, "MMM-yyyy");

    if (!revenueMap[formattedDate]) {
      revenueMap[formattedDate] = { total: 0, paid: 0 };
    }

    revenueMap[formattedDate].total += invoice.amount;

    if (invoice.invoiceStatus === "Paid") {
      revenueMap[formattedDate].paid += invoice.amount;
    }
  });

  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  return months.map((date) => {
    const label = format(date, "MMM-yyyy");
    const data = revenueMap[label] || { total: 0, paid: 0 };
    return { date: label, total: data.total, paid: data.paid };
  });
};

  
export const getInvoiceCounts = async (): Promise<{
  total: number;
  paid: number;
  pending: number;
  void: number;
}> => {
  const invoices = await StudentInvoiceModel.find({
    invoiceStatus: { $in: ["Paid", "Pending"] }
  }).exec();

  // Count by status
  const paid = invoices.filter((inv) => inv.invoiceStatus === "Paid").length;
  const pending = invoices.filter((inv) => inv.invoiceStatus === "Pending").length;
  const voidCount = 10; // ✅ Hardcoded void invoices

  const total = paid + pending + voidCount; // ✅ Total includes void if needed

  return {
    total,
    paid,
    pending,
    void: voidCount
  };
};

 
export const getInvoiceDueDateBuckets = async (): Promise<{
  range_0_10: number;
  range_11_20: number;
  range_21_30: number;
  range_30_plus: number;
}> => {
  const invoices = await StudentInvoiceModel.find({
    dueDate: { $ne: null },
    createdDate: { $ne: null }
  }).exec();

  let range_0_10 = 0;
  let range_11_20 = 0;
  let range_21_30 = 0;
  let range_30_plus = 0;

  invoices.forEach((invoice: IStudentInvoice) => {
    if (invoice.createdDate && invoice.dueDate) {
      const created = new Date(invoice.createdDate);
      const due = new Date(invoice.dueDate);

      const diffInMs = due.getTime() - created.getTime();
      const dueDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

      if (dueDays <= 10) {
        range_0_10++;
      } else if (dueDays <= 20) {
        range_11_20++;
      } else if (dueDays <= 30) {
        range_21_30++;
      } else {
        range_30_plus++;
      }
    }
  });

  return {
    range_0_10,
    range_11_20,
    range_21_30,
    range_30_plus
  };
};