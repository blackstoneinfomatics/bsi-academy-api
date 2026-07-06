import mongoose, { Types } from "mongoose";
import { ILeaveRequest, ILeaveRequestCreate, IleaveSummary } from "../../types/models.types";
import LeaveRequestModel from "../models/leaverequest";
import User from "../models/users";
import LeaveSummaryModel from "../models/leavesummary"
import AppLogger from "../helpers/logging";
import leavesummary from "../models/leavesummary";


export const createLeaveRequest = async (
  payload: Partial<ILeaveRequestCreate>
): Promise<
  ILeaveRequest & {
    totalCounts: {
      sickLeave: number;
      casualLeave: number;
      paidLeave: number;
    };
  } | { error: any }
> => {
  try {
    const employee = await User.findOne({ _id: new Types.ObjectId(payload.employeeId) }).exec();
    if (!employee) return { error: "Employee not found with the given ID." };

    const admin = await User.findOne({
      userName: payload.createdBy,
      role: { $in: ["ADMIN"] },
    }).exec();
    if (!admin) return { error: "Admin not found with the given createdBy." };

    const approvedDays = Number(payload.approvedDays) || 0;
    const deductionDays = Number(payload.deductionDays) || 0;

    const basePayload = {
      ...payload,
      name: employee.userName,
      employeeId: employee._id.toString(),
      role: Array.isArray(employee.role) ? employee.role[0] : employee.role,
      approvedId: admin._id.toString(),
      approvedName: admin.userName,
    };

    const existingLeaveRequest = await LeaveRequestModel.findOne({
      employeeId: basePayload.employeeId,
      leaveType: basePayload.leaveType,
    }).exec();

    let updatedLeaveRequest;

    if (!existingLeaveRequest) {
      const newRequest = new LeaveRequestModel({
        ...basePayload,
        approvedDays,
        deductionDays,
      });
      updatedLeaveRequest = await newRequest.save();
    } else {
      updatedLeaveRequest = await LeaveRequestModel.findByIdAndUpdate(
        existingLeaveRequest._id,
        {
          $inc: {
            approvedDays,
            deductionDays,
          },
          fromDate: payload.fromDate,
          toDate: payload.toDate,
          reason: payload.reason,
          leaveStatus: payload.leaveStatus,
          status: payload.status,
          updatedDate: new Date(),
        },
        { new: true }
      ).exec();

      if (!updatedLeaveRequest) {
        return { error: "Failed to update existing leave request." };
      }
    }

    // Insert into LeaveSummary
    const newSummary = new LeaveSummaryModel({
      employeeId: basePayload.employeeId,
      name: basePayload.name,
      role: basePayload.role,
      leaveType: basePayload.leaveType,
      fromDate: basePayload.fromDate,
      toDate: basePayload.toDate,
      leaveStatus: basePayload.leaveStatus,
      approvedDays,
      deductionDays,
      approvedId: basePayload.approvedId,
      approvedName: basePayload.approvedName,
      reason: basePayload.reason,
      status: basePayload.status,
      createdBy: basePayload.createdBy,
      createdDate: new Date(),
    });

    await newSummary.save();

    // ✅ Count total number of summary records per leave type
    const leaveCounts = await LeaveSummaryModel.aggregate([
      {
        $match: {
          employeeId: basePayload.employeeId,
        },
      },
      {
        $group: {
          _id: "$leaveType",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      sickLeave: 0,
      casualLeave: 0,
      paidLeave: 0,
    };

    for (const entry of leaveCounts) {
      if (entry._id === "SICK") counts.sickLeave = entry.count;
      if (entry._id === "CASUAL") counts.casualLeave = entry.count;
      if (entry._id === "PAID") counts.paidLeave = entry.count;
    }

    // ✅ Update all LeaveRequest records for that employee
    await LeaveRequestModel.updateMany(
      { employeeId: basePayload.employeeId },
      {
        sickLeaveCount: counts.sickLeave,
        casualLeaveCount: counts.casualLeave,
        paidLeaveCount: counts.paidLeave,
      }
    );

    return {
      ...(updatedLeaveRequest?.toObject() ?? {}),
      employeeId: employee._id.toString(),
      totalCounts: counts,
    } as unknown as ILeaveRequest & {
      totalCounts: {
        sickLeave: number;
        casualLeave: number;
        paidLeave: number;
      };
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : error };
  }
};



 
//Update leave summary
export const updateLeaveRequest = async (
  summaryId: string,
  updates: Partial<ILeaveRequest>
): Promise<{
  updatedLeave?: ILeaveRequest;
  totalCounts?: {
    sickLeave: number;
    casualLeave: number;
    paidLeave: number;
  };
  error?: any;
}> => {
  try {
    // Step 1: Find the LeaveSummary record
    const existingSummary = await LeaveSummaryModel.findById(summaryId).exec();
    if (!existingSummary) return { error: "Leave summary not found" };

    const approvedDays = Number(updates.approvedDays) || 0;
    const deductionDays = Number(updates.deductionDays) || 0;

    // Step 2: Update the LeaveSummary document
    await LeaveSummaryModel.findByIdAndUpdate(summaryId, {
      ...updates,
      approvedDays,
      deductionDays,
      updatedBy: updates.approvedName || "Admin",
      updatedDate: new Date(),
    });

    // Step 3: Find matching LeaveRequest by employeeId + leaveType
    const matchingLeaveRequest = await LeaveRequestModel.findOne({
      employeeId: existingSummary.employeeId,
      leaveType: existingSummary.leaveType,
    }).exec();

    if (!matchingLeaveRequest) return { error: "Matching leave request not found" };

    // Step 4: Update the LeaveRequest document
    const updatedLeave = await LeaveRequestModel.findByIdAndUpdate(
      matchingLeaveRequest._id,
      {
        ...updates,
        approvedDays,
        deductionDays,
        updatedDate: new Date(),
      },
      { new: true }
    ).exec();

    if (!updatedLeave) {
      return { error: "Failed to update leave request" };
    }

    // Step 5: Recalculate leave counts from LeaveSummary collection
    const leaveCounts = await LeaveSummaryModel.aggregate([
      {
        $match: {
          employeeId: existingSummary.employeeId,
        },
      },
      {
        $group: {
          _id: "$leaveType",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      sickLeave: 0,
      casualLeave: 0,
      paidLeave: 0,
    };

    for (const entry of leaveCounts) {
      if (entry._id === "SICK") counts.sickLeave = entry.count;
      if (entry._id === "CASUAL") counts.casualLeave = entry.count;
      if (entry._id === "PAID") counts.paidLeave = entry.count;
    }

    // Step 6: Update all LeaveRequest records with new counts
    await LeaveRequestModel.updateMany(
      { employeeId: existingSummary.employeeId },
      {
        sickLeaveCount: counts.sickLeave,
        casualLeaveCount: counts.casualLeave,
        paidLeaveCount: counts.paidLeave,
      }
    );

    return {
      updatedLeave,
      totalCounts: counts,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : error };
  }
};

















//leave Request List


export const getAllLeaveList = async (): Promise<{ totalCount: number; leaveRequest: ILeaveRequest[] }> => {
  const [leaveRequest, totalCount] = await Promise.all([
    LeaveRequestModel.find().exec(),
    LeaveRequestModel.countDocuments().exec(),
  ]);

  AppLogger.info("Fetched all leave requests", { totalCount });

  return { totalCount, leaveRequest };
};


//leave Summary List


export const getAllLeaveSummaryList = async (): Promise<{ totalCount: number; leavesummary: IleaveSummary[] }> => {
  const [leavesummary, totalCount] = await Promise.all([
    LeaveSummaryModel.find().exec(),
    LeaveSummaryModel.countDocuments().exec(),
  ]);

  AppLogger.info("Fetched all leave Summary", { totalCount });

  return { totalCount, leavesummary }; 
};

//LeaveRequestById

export const getLeaveRequestRecordByEmployeeId = async (
  employeeId: string
): Promise<any> => {
  const [leaveRecords, statusCounts, typeCounts] = await Promise.all([
    leavesummary.find({ employeeId }).lean(),
    leavesummary.aggregate([
      { $match: { employeeId } },
      {
        $group: {
          _id: "$leaveStatus",
          count: { $sum: 1 },
        },
      },
    ]),
    leavesummary.aggregate([
      { $match: { employeeId } },
      {
        $group: {
          _id: "$leaveType",
          count: { $sum: 1 },
        },
      },
    ])
  ]);

  // Status counts
  const countMap = {
    totalApplied: 0,
    totalApproved: 0,
    totalDeclined: 0,
  };

  statusCounts.forEach((item) => {
    if (item._id === "WAITINGLIST") {
      countMap.totalApplied = item.count;
    } else if (item._id === "APPROVED") {
      countMap.totalApproved = item.count;
    } else if (item._id === "DECLINED" || item._id === "REJECTED") {
      countMap.totalDeclined += item.count;
    }
  });

  // Leave type counts
  let sickLeave = 0;
  let casualLeave = 0;
  let paidLeave = 0;

  typeCounts.forEach((item) => {
    if (item._id === "SICK") sickLeave = item.count;
    if (item._id === "CASUAL") casualLeave = item.count;
    if (item._id === "PAID") paidLeave = item.count;
  });

  return {
    records: leaveRecords,
    ...countMap,
    sickLeave,
    casualLeave,
    paidLeave,
    deductionDays: countMap.totalApproved,
  };
};





//LeaveSummary

export const getLeaveSummaryRecordById = async (
  id: string
): Promise<IleaveSummary | null> => {
  return LeaveSummaryModel.findOne({
    _id: new Types.ObjectId(id),
  }).lean() as unknown as IleaveSummary | null;
};

//card counts for leave requests

export const dashboardLeaveRequestCounts = async (): Promise<{
  totalApplication: number;
  pending: number;
  approved: number;
  rejected: number;
}> => {
  const [pending, approved, rejected, totalApplication] = await Promise.all([
    leavesummary.countDocuments({ leaveStatus: "WAITINGLIST" }).exec(),
    leavesummary.countDocuments({ leaveStatus: "APPROVED" }).exec(),
    leavesummary.countDocuments({ leaveStatus: "REJECTED" }).exec(),
    leavesummary.countDocuments().exec(),
  ]);

  return {
    totalApplication,
    pending,
    approved,
    rejected,
  };
};



