import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi'; 
import { zodleaverequestSchema } from '../../models/leaverequest';
import { z } from 'zod';
import { createLeaveRequest, dashboardLeaveRequestCounts, getAllLeaveList, getAllLeaveSummaryList, getLeaveRequestRecordByEmployeeId, getLeaveSummaryRecordById, updateLeaveRequest } from '../../operations/leaveRequest';
import { ILeaveRequest } from '../../../types/models.types';
import mongoose from 'mongoose';
import { isNil } from 'lodash';
import { leaveRequestMessages } from '../../config/messages';
import { notFound } from '@hapi/boom';

const createInputValidation = z.object({
  payload: zodleaverequestSchema.pick({
    employeeId: true,
    name: true,
    fromDate: true,
    toDate: true,
    leaveType: true,
    leaveStatus: true,
    reason: true,
    status: true,
    createdDate: true,
    createdBy: true,
    UpdatedDate: true,
    UpdatedBy: true,
  })
});

export default {
async createLeaveRequestHandler(req: Request, h: ResponseToolkit): Promise<ResponseObject> {
  try {
    const result = createInputValidation.safeParse({ payload: req.payload });

    if (!result.success) {
      return h.response({ error: result.error.flatten() }).code(400);
    }

    const { payload } = result.data;

    const leaveRequest = await createLeaveRequest(payload);

    if ('error' in leaveRequest) {
      return h.response({ error: leaveRequest.error }).code(400);
    }

    return h.response({
      message: 'Leave request processed successfully',
      data: leaveRequest,
    }).code(201);
  } catch (error) {
    return h.response({
      error: error instanceof Error ? error.message : error,
    }).code(400);
  }
}

,

//summary API for Leave


async updateLeaveRequestHandler(req: Request, h: ResponseToolkit) {
  try {
    const { id } = req.params as { id: string }; // Now summaryId
    const payload = req.payload as Partial<ILeaveRequest>;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return h.response({ error: "Invalid leave summary ID format" }).code(400);
    }

    const result = await updateLeaveRequest(id, payload); // id = summaryId

    if (result.error) {
      return h.response({ error: result.error }).code(400);
    }

    return h.response({
      message: "Leave summary and matching request updated successfully",
      data: result.updatedLeave,
      totalLeaveCounts: result.totalCounts,
    }).code(200);
  } catch (error) {
    return h.response({
      error: error instanceof Error ? error.message : error,
    }).code(500);
  }
}



,



//leave Request List

    async getleaverequestList(req: Request, h: ResponseToolkit) {
      const result = await getAllLeaveList();
    
      return result;
    },


//leave Summary List

async getleaveSummaryList(req: Request, h: ResponseToolkit) {
  const result = await getAllLeaveSummaryList();

  return result;
},

//LeaveRequestByID
async getLeaveRecordById(req: Request, h: ResponseToolkit) {
  const employeeId = Array.isArray(req.query.employeeId) ? req.query.employeeId[0] : req.query.employeeId;
  const result = await getLeaveRequestRecordByEmployeeId(employeeId ?? "");

  if (!result || result.length === 0) {
    return h.response({ message: "No leave records found" }).code(404);
  }

  return result;
}
,

//LeaveSummaryById
async getLeaveSummaryRecordById(req: Request, h: ResponseToolkit) {
  const result = await getLeaveSummaryRecordById(String(req.params.id)); // ✅ Fix here

  if (isNil(result)) {
    return notFound(leaveRequestMessages.USER_NOT_FOUND);
  }

  return result;
},

//card counts
  async getLeaveRequestCount(req: Request, h: ResponseToolkit) {
    try {
      const leaveRequest = await dashboardLeaveRequestCounts()
      return h.response(leaveRequest).code(200)
    } catch (error) {
      console.error("Error in leaveRequest:", error)
      return h.response({ error: "Failed to fetch leaveRequest counts." }).code(500)
    }
  },


}
  
  
