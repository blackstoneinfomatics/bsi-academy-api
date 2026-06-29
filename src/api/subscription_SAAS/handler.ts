import { ResponseToolkit, Request } from "@hapi/hapi";
import {
  createSubscription,
  updateSubscription,
  getAllSubscriptionRecords,
  getSubscriptionRecordById,
  cancelSubscription,
  deleteSubscriptionById,
} from "../../operations/subscription";
import { Subscription } from "../../../types/models.types";

interface SubscriptionPayload {
  tenantId: string;
  planId: string;
  planName: string;
  subscriptionStatus: Subscription['subscriptionStatus'];
  startDate: string;
  endDate: string;
  isTrialUsed: boolean;
  maxUsers?: number;
  features?: string[];
  createdBy: string;
  lastUpdatedBy?: string;
}

export default {
  // CREATE SUBSCRIPTION
  async createSubscription(req: Request, h: ResponseToolkit) {
    const payload = req.payload as SubscriptionPayload;

    const {
      tenantId,
      planId,
      planName,
      subscriptionStatus,
      startDate,
      endDate,
      isTrialUsed,
      createdBy,
      lastUpdatedBy,
    } = payload;

    const subscriptionId = `${tenantId}-${planId}`;

    return createSubscription({
      tenantId,
      planId,
      planName,
      subscriptionId,
      subscriptionStatus: subscriptionStatus as any,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isTrialUsed,
      createdBy,
      updatedBy: lastUpdatedBy,
    });
  },

  // UPDATE SUBSCRIPTION
 async updateSubscription(req: Request, h: ResponseToolkit) {
  try {
    const { subscriptionId } = req.params;

    const payload = req.payload as Partial<SubscriptionPayload>;

    const result = await updateSubscription(
      subscriptionId,
      payload as Partial<Subscription>
    );

    return h.response({
      success: true,
      data: result,
    }).code(200);

  } catch (error: any) {
    return h.response({
      success: false,
      message: error.message || "Something went wrong",
    }).code(error.statusCode || 500);
  }
},

  // GET ALL SUBSCRIPTIONS
  async getSubscriptions(req: Request, h: ResponseToolkit) {
    const result = await getAllSubscriptionRecords();
    return result.subscriptions;
  },

  // GET SUBSCRIPTION BY ID
  async getSubscriptionById(req: Request, h: ResponseToolkit) {
    const { subscriptionId } = req.params;

    return getSubscriptionRecordById(subscriptionId);
  },

  // CANCEL SUBSCRIPTION
  async cancelSubscription(req: Request, h: ResponseToolkit) {
    const { subscriptionId } = req.params;

    return cancelSubscription(subscriptionId);
  },

  // DELETE SUBSCRIPTION
  async deleteSubscription(req: Request, h: ResponseToolkit) {
    const { subscriptionId } = req.params;

    return deleteSubscriptionById(subscriptionId);
  },
};


