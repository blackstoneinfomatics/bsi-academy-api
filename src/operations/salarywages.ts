import {
  ISalarywages,
  ISalarywagesCreate
} from "../../types/models.types";
import { GetAllRecordsParams } from "../shared/enum";
import salaryandwages from "../models/salaryandwages";
import classShedule from "../models/classShedule";
import EmpWagesModel from "../models/empwages";
import UserModel from "../models/users";
import AppLogger from "../helpers/logging";
import moment from "moment";






// const processAllUsers = async (now: Date, monthLabel: string) => {
//   // Get all active users with relevant roles
//   const eligibleUsers = await UserModel.find({
//     role: { $in: ["TEACHER", "SUPERVISOR", "ACADEMICCOACH"] },
//     status: "Active"
//   }).lean();

//   console.log(`👥 Found ${eligibleUsers.length} eligible users`);

//   for (const user of eligibleUsers) {
//     const designation = user.role.find(r => 
//       ["TEACHER", "SUPERVISOR", "ACADEMICCOACH"].includes(r)
//     )?.toUpperCase();

//     if (!designation) continue;

//     if (!user.userId) {
//       console.warn(`User ${user.userName} is missing userId, skipping salary record creation.`);
//       return;
//     }

//     try {
//       // Check if record exists using atomic operation
//       const result = await salaryandwages.findOneAndUpdate(
//         {
//           employeeId: user.userId,
//           designation,
//           status: "Active"
//         },
//         { $setOnInsert: { 
//           employeeName: user.userName,
//           employeeMail: user.email || "",
//           designation,
//           salaryAmount: designation === "TEACHER" ? "0" : await getFixedSalaryAmount(user.userId),
//           deductionAmount: 0,
//           balanceAmount: designation === "TEACHER" ? 0 : await getFixedSalaryAmount(user.userId),
//           paymentMethod: "Bank Transfer",
//           status: "Active",
//           paymentStatus: "Pending",
//           createdDate: new Date().toISOString(),
//           createdBy: "SYSTEM",
//           paymentDate: new Date().toISOString()
//         }},
//         { 
//           upsert: true,
//           new: true,
//           setDefaultsOnInsert: true
//         }
//       );

//       if (!result) {
//         console.log(`🆕 Created initial ${designation} record for ${user.userName}`);
//       } else {
//         console.log(`✅ Existing record found for ${designation} ${user.userName}`);
//       }

//       // Process based on designation
//       if (designation === "TEACHER" && user.userId) {
//         await processTeacherSalary(user.userId, now);
//       } else if (now.getDate() <= 3 && user.userId) { // Only process fixed salaries on 1st-3rd
//         await processFixedSalaryEmployee(user.userId, designation, monthLabel);
//       }
//     } catch (err) {
//       console.error(`❌ Error processing ${designation} ${user.userName}:`, err);
//     }
//   }
// };

// const getFixedSalaryAmount = async (employeeId: string) => {
//   const wageInfo = await EmpWagesModel.findOne({ employeeId }).lean();
//   if (!wageInfo) {
//     console.warn(`⚠️ No wage info found for employee ${employeeId}`);
//     return 0;
//   }
//   return parseFloat(String(wageInfo.classType.rate).replace(/\$|,/g, '') || "0");
// };

// const processTeacherSalary = async (teacherId: string, now: Date) => {
//   try {
//     // 1. Find all payable classes (regardless of processing status)
//     const payableClasses = await classShedule.find({
//       "teacher.teacherId": teacherId,
//       amount: { $exists: true, $ne: "$0.00" }
//     }).lean();

//     if (!payableClasses.length) {
//       console.log(`⏩ No payable classes found for teacher ${teacherId}`);
//       return;
//     }

//     // 2. Calculate total amount (simple sum)
//     let totalAmount = 0;
//     for (const cls of payableClasses) {
//       const amount = parseFloat(String(cls.amount).replace(/\$|,/g, ""));
//       if (!isNaN(amount)) {
//         totalAmount += amount;
//       }
//     }

//     if (totalAmount <= 0) {
//       console.log(`⚠️ No valid payable amount for teacher ${teacherId}`);
//       return;
//     }

//     // 3. Update salary record with simple increment
//     await salaryandwages.updateOne(
//       {
//         employeeId: teacherId,
//         designation: "TEACHER",
//         status: "Active"
//       },
//       {
//         $inc: {
//           salaryAmount: totalAmount,
//           balanceAmount: totalAmount
//         },
//         $set: {
//           updatedAt: now,
//           paymentDate: now,
//           isSalaryProcessed: true
//         }
//       }
//     );

//     console.log(`➕ Added ₹${totalAmount.toFixed(2)} to TEACHER ${teacherId}`);
//   } catch (error) {
//     console.error(`❌ Error processing salary for teacher ${teacherId}:`, error);
//     throw error;
//   }
// };

// const processFixedSalaryEmployee = async (employeeId: string, designation: string, monthLabel: string) => {
//   const salaryAmount = await getFixedSalaryAmount(employeeId);

//   if (salaryAmount <= 0) {
//     return;
//   }

//   // Update fixed salary (only updates if record exists)
//   await salaryandwages.updateOne(
//     {
//       employeeId,
//       designation,
//       monthLabel,
//       status: "Active"
//     },
//     {
//       $set: {
//         salaryAmount: salaryAmount.toString(),
//         balanceAmount: salaryAmount,
//         updatedAt: new Date(),
//         paymentDate: new Date()
//       }
//     }
//   );

//   console.log(`💰 Updated ${designation} ${employeeId} salary to $${salaryAmount}`);
// };





export const getAllSalaryList = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; expenses: ISalarywages[] }> => {
  const { searchText, sortBy, sortOrder, offset, limit, filterValues } = params;

  // Initialize the query object
  const query: any = {};

  // ✅ Sorting options
  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  // ✅ Build the query for fetching expenses
  const Query = salaryandwages.find(query).sort(sortOptions); // Use `Expense` model here


  // ✅ Fetch expenses and the total count
  const [expenses, totalCount] = await Promise.all([
    Query.exec(),
    salaryandwages.countDocuments(query).exec(), // Count the documents that match the query
  ]);

  // Log total count for debugging
  AppLogger.info({ totalCount });

  // ✅ Return the result
  return { totalCount, expenses };
};




export const getAllSalaryCardCounts = async (
  params: GetAllRecordsParams
): Promise<{
  totalCount: number;
  salarywages: ISalarywagesCreate[];
  totalSalaryPaid: number;
  totalPendingSalary: number;
  balanceSalary: number;
}> => {


  // ✅ Simulated or actual merged list from source(s)
  const SalaryList = await salaryandwages.find(); // get all salary records

  // Calculate totals, etc. using SalaryList

  let totalSalaryPaid = 0;
  let totalPendingSalary = 0;

  for (const salary of SalaryList) {
    const amount = parseFloat(String(salary.salaryAmount));
    if (isNaN(amount)) continue;

    if (salary.paymentStatus === "Paid") {
      totalSalaryPaid += amount;
    } else if (salary.paymentStatus === "Pending") {
      totalPendingSalary += amount;
    }
  }

  const balanceSalary = totalSalaryPaid - totalPendingSalary;

  return {
    totalCount: SalaryList.length,
    salarywages: SalaryList,
    totalSalaryPaid,
    totalPendingSalary,
    balanceSalary,
  };
};




export const updateSalaryWages = async ({
  employeeId,
  designation,
  amount,
  status,
  deduction,
  paymentStatus,
  paymentDate,
  balanceAmount
}: {
  employeeId: string;
  designation?: string;
  amount?: number;
  status?: string;
  deduction?: number;
  paymentStatus?: string;
  paymentDate?: string;
  balanceAmount?: number;
}) => {
  const update: any = {};
  if (amount !== undefined) update.salaryAmount = String(amount);
  if (status !== undefined) update.status = status;
  if (deduction !== undefined) update.deductionAmount = deduction;
  if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;
  if (paymentDate !== undefined) update.paymentDate = paymentDate;
  if (balanceAmount !== undefined) update.balanceAmount = balanceAmount;

  const query: any = { employeeId, status: "Active" };
  if (designation) query.designation = designation;

  const existing = await salaryandwages.findOne(query);
  console.log('Matching document:', existing);
  const result = await salaryandwages.updateOne(query, { $set: update });
  const updatedRecord = await salaryandwages.findOne(query);
  console.log('Updated record:', updatedRecord);
  console.log('Update payload:', update);
  console.log('Incoming payload:', {
    employeeId,
    designation,
    amount,
    deduction,
    paymentStatus,
    paymentDate,
    balanceAmount
  });

  console.log('Update object to DB:', update);

  return {
    success: true,
    updated: result.modifiedCount,
    amount: updatedRecord?.salaryAmount,
    deduction: updatedRecord?.deductionAmount,
    balance: updatedRecord?.balanceAmount,
    status: updatedRecord?.status,
    paymentStatus: updatedRecord?.paymentStatus,
    paymentDate: updatedRecord?.paymentDate
  };
};


export const runSalaryCron = async () => {
  console.log("🔄 Starting salary calculation cron job...");

  try {
    const today = moment().format("YYYY-MM-DD"); // Get current date as string
    await runSalaryCalculationForDate(today);
    console.log("✅ Salary processing completed successfully");
  } catch (error) {
    console.error("❌ Salary processing failed:", error);
  }
};

export const runSalaryCalculationForDate = async (dateStr: string) => {
  console.log("⏰ Running salary calculation for:", dateStr);

  try {
    const testDate = moment(dateStr, "YYYY-MM-DD");
    const todayStart = testDate.startOf("day").toDate();
    const todayEnd = testDate.endOf("day").toDate();
    const todayDate = testDate.format("YYYY-MM-DD");
    const monthLabel = testDate.format("MMM YYYY"); // For AC/Supervisor fixed salary

    const eligibleUsers = await UserModel.find({
      role: { $in: ["TEACHER", "ACADEMICCOACH", "SUPERVISOR"] },
      status: "Active",
    }).lean();

    for (const user of eligibleUsers) {
      const { userId: employeeId, email: employeeEmail, userName: employeeName } = user;
      const designation = Array.isArray(user.role) ? user.role[0] : user.role;

      if (!employeeId) continue;

      // AC / Supervisor fixed salary
      if (["ACADEMICCOACH", "SUPERVISOR"].includes(designation)) {
        await processFixedSalaryEmployee(
          employeeId,
          employeeName,
          employeeEmail,
          designation
        );
        continue;
      }

      console.log("👔 Fixed salary user:", employeeName);

      // ✅ TEACHER – DAILY CLASS BASED SALARY
      const query = {
        "teacher.teacherId": employeeId,
        scheduleStatus: "Completed",
        sessionStatus: "Completed",
        startDate: { $gte: todayStart, $lte: todayEnd },
      };

      const todayClasses = await classShedule.find(query).lean();
      console.log(`📚 ${designation} class count: ${todayClasses.length}`);

      if (!todayClasses.length) continue;

      let regularTotal = 0;
      let groupTotal = 0;
      const seenRegular = new Set<string>();
      const seenGroup = new Set<string>();

      for (const cls of todayClasses) {
        const amt = parseFloat(cls.amount || "0");

        if (cls.sessionClassType === "REGULARCLASS") {
          if (!seenRegular.has(cls.classLink)) {
            seenRegular.add(cls.classLink);
            regularTotal += amt;
          }
        } else if (cls.sessionClassType === "GROUPCLASS") {
          const groupKey = `${cls.classLink}_${employeeId}_${todayDate}`;
          if (!seenGroup.has(groupKey)) {
            seenGroup.add(groupKey);
            groupTotal += amt;
          }
        }
      }

      const totalEarnings = +(regularTotal + groupTotal).toFixed(2);
      if (totalEarnings === 0) continue;

      // ✅ Insert or update daily salary for teacher
      const pendingSalary = await salaryandwages.findOne({
        employeeId,
        paymentStatus: "Pending",
        $or: [{ paymentDate: "" }],
      });

      if (pendingSalary) {
        pendingSalary.salaryAmount =
          Number(pendingSalary.salaryAmount || 0) + totalEarnings;
        await pendingSalary.save();
        console.log(
          `✅ Updated pending salary for ${employeeName} ${employeeEmail} ➕${totalEarnings}`
        );
      } else {
        await salaryandwages.create({
          employeeId,
          employeeName,
          employeeMail: employeeEmail,   // required
          designation,
          salaryMonth: todayDate,
          salaryAmount: totalEarnings,
          balanceAmount: totalEarnings,
          deductionAmount: 0,
          paymentMethod: "Bank Transfer",
          paymentStatus: "Pending",
          status: "Active",
          createdDate: new Date(),
          createdBy: "Cron",
        });

        console.log(
          `🆕 Created new pending salary for ${employeeEmail} = ${totalEarnings}`
        );
      }
    }

    console.log("✅🎉 Salary calculation completed for", dateStr);
  } catch (error) {
    console.error("🔥 Fatal error during salary calculation:", error);
  }
};

// A.C and Supervisor 
const getFixedSalaryAmount = async (employeeId: string) => {
  const wageInfo = await EmpWagesModel.findOne({ employeeId }).lean();
  if (!wageInfo) return 0;
  return parseFloat(String(wageInfo.classType.rate).replace(/\$|,/g, '') || "0");
};

export const processFixedSalaryEmployee = async (
  employeeId: string,
  employeeName: string,
  employeeEmail: string,
  designation: string
) => {
  const salaryAmount = await getFixedSalaryAmount(employeeId);
  if (salaryAmount <= 0) return;

  const monthLabel = moment().format("MMM YYYY"); // current month

  // Check if a salary record already exists for this employee + month
  const existing = await salaryandwages.findOne({
    employeeId,
    designation,
    monthLabel,
    status: "Active",
  });

  if (existing && existing.paymentStatus === "Pending") {
    console.log(`⏭️ Salary already pending for ${employeeName} (${monthLabel})`);
    return; // DO NOTHING
  }

  if (existing && existing.paymentStatus === "Paid") {
    // Create new pending record for next cycle/month
    await salaryandwages.create({
      employeeId,
      employeeName,
      employeeMail: employeeEmail,
      designation,
      monthLabel,
      salaryAmount: salaryAmount,
      balanceAmount: salaryAmount,
      deductionAmount: 0,
      paymentMethod: "Bank Transfer",
      status: "Active",
      paymentStatus: "Pending",
      paymentDate: "",
      createdDate: new Date(),
      updatedAt: new Date(),
      createdBy: "Cron",
    });
    console.log(`🆕 Created new salary for ${employeeName} (${monthLabel})`);
    return;
  }

  if (!existing) {
    // First time salary for this month
    await salaryandwages.create({
      employeeId,
      employeeName,
      employeeMail: employeeEmail,
      designation,
      monthLabel,
      salaryAmount: salaryAmount,
      balanceAmount: salaryAmount,
      deductionAmount: 0,
      paymentMethod: "Bank Transfer",
      status: "Active",
      paymentStatus: "Pending",
      paymentDate: "",
      createdDate: new Date(),
      updatedAt: new Date(),
      createdBy: "Cron",
    });
    console.log(`🆕 First salary created for ${employeeName} (${monthLabel})`);
  }
};




//get by employeeId
export const getRecordByTeacherId = async (
  params: { employeeId: string }
): Promise<{
  totalCount: number;
  records: ISalarywages[];
}> => {
  const { employeeId } = params;

  const query = {
    employeeId: employeeId.trim(), // querying SalaryandWages table/collection
  };

  console.log("🔍 Salary/Wages Query:", query);
  const records = await salaryandwages.find(query).exec(); // use find() for MongoDB/Mongoose
  return {
    totalCount: records.length,
    records,
  };
};