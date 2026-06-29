import { isNil } from "lodash";
import {  IExpense } from "../../types/models.types";
import expense from "../models/expense";
import paymentDetails from "../models/paymentDetails";
import { GetAllRecordsParams } from "../shared/enum";
import AppLogger from "../helpers/logging";


export const createExpense = async (
    payload: Partial<IExpense>
  ): Promise<{ totalCount: number; expense: IExpense } | { error: any }> => {
  try {
    const result = new expense({
      paymentDate:payload.paymentDate || "",
      expenseType:payload.expenseType || "",
      amount:payload.amount || "",
      category:payload.category||"",
      paymentMethod:payload.paymentMethod || "",  
      status: payload.status || "Active",
      createdDate: new Date(),
      createdBy: payload.createdBy || "System",
      UpdatedDate: new Date(),
      UpdatedBy: payload.updatedBy || "System",
    });

    const expenseRecord = await result.save();
    const totalCount = await expense.countDocuments();

    return { totalCount, expense: expenseRecord.toObject() };
  } catch (error) {
    console.error(" Error creating course:", error);
    return { error };
  }
};

export const getExpenses = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; expenses: IExpense[] }> => {
  const { searchText, sortBy, sortOrder, offset, limit, filterValues } = params;

  // Initialize the query object
  const query: any = {};

 

  // ✅ Add searchText if provided, searching across name and email
  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: "i" } },
      { email: { $regex: searchText, $options: "i" } },
    ];
  }

  // ✅ Apply filter values to query if provided
  if (filterValues) {
    if (filterValues.course) {
      query.course = { $in: filterValues.course };
    }
    if (filterValues.country) {
      query.country = { $in: filterValues.country };
    }
    if (filterValues.teacher) {
      query.teacher = { $in: filterValues.teacher };
    }
    if (filterValues.status) {
      query.status = { $in: filterValues.status };
    }
  }

  // ✅ Sorting options
  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  // ✅ Build the query for fetching expenses
  const Query = expense.find(query).sort(sortOptions); // Use `Expense` model here
  
  // ✅ Pagination logic (skip and limit)
  if (!isNil(offset) && !isNil(limit)) {
    const skip = Math.max(
      0,
      ((Number(offset) ?? 1) - 1) * (Number(limit) ?? 10) // Default to offset 1 and limit 10
    );
    Query.skip(skip).limit(Number(limit) ?? 10); // Default to 10 if limit is not provided
  }

  // ✅ Fetch expenses and the total count
  const [expenses, totalCount] = await Promise.all([
    Query.exec(),
    expense.countDocuments(query).exec(), // Count the documents that match the query
  ]);

  // Log total count for debugging
  AppLogger.info({ totalCount });

  // ✅ Return the result
  return { totalCount, expenses };
};

export const getAllExpensesCardCounts = async (): Promise<{
  totalExpense: number;
  totalPending: number;
  totalRevenue: number;
  balance: number;
}> => {
  // 1. Get all expenses
  const allExpenses = await expense.find();
  // 2. Get all payments (revenue)
  const allPayments = await paymentDetails.find(); // get all payment records

  // 3. Calculate totals
  let totalExpense = 0;
  let totalPending = 0;
  for (const exp of allExpenses) {
    const amount = parseFloat(exp.amount);
    if (isNaN(amount)) continue;
    totalExpense += amount;
    if (exp.status === "Pending") {
      totalPending += amount;
    }
  }

  let totalRevenue = 0;
  for (const pay of allPayments) {
    const amount = parseFloat(pay.paymentAmount);
    if (isNaN(amount)) continue;
    totalRevenue += amount;
  }

  // 4. Calculate balance
  const balance = totalRevenue - totalExpense;

  return {
    totalExpense,
    totalPending,
    totalRevenue,
    balance,
  };
};






