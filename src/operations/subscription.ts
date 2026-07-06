import { Types } from "mongoose";
import { appStatus } from "../config/messages";
import { Subscription } from "../../types/models.types";
import SubscriptionModel from "../models/subscription-models";
import PlanModel from "../models/plan-model";

// CREATE SUBSCRIPTION
export const createSubscription =
  async (
    payload: Partial<Subscription>
  ): Promise<Subscription> => {

    const newSubscription =
      new SubscriptionModel(payload);

    const savedSubscription =
      await newSubscription.save();

    return savedSubscription.toObject();
  };

// GET ALL SUBSCRIPTIONS
export const getAllSubscriptionRecords =
  async (): Promise<{
    subscriptions: Subscription[];
    totalCount: number;
  }> => {

    const subscriptions =
      await SubscriptionModel.find().exec();

    const totalCount =
      await SubscriptionModel.countDocuments();

    return {
      subscriptions,
      totalCount,
    };
  };


// GET SUBSCRIPTION BY ID
export const getSubscriptionRecordById =
  async (
    id: string
  ): Promise<Subscription | null> => {

    return SubscriptionModel.findOne({
      _id: new Types.ObjectId(id),
    }).lean() as unknown as Subscription | null;
  };


// UPDATE SUBSCRIPTION
export const updateSubscription = async (
  subscriptionId: string,
  payload: Partial<Subscription>
): Promise<Subscription | null> => {
  try {
    if (!subscriptionId) {
      const err: any = new Error("Subscription ID is required");
      err.statusCode = 400;
      throw err;
    }

    // Direct update (no need extra findOne)
    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
      { subscriptionId },
      { $set: payload },
      { new: true }
    );

    if (!updatedSubscription) {
      const err: any = new Error(`Subscription not found for ID: ${subscriptionId}`);
      err.statusCode = 500;
      throw err;
    }

    return updatedSubscription;

  } catch (error: any) {
    console.error("Error updating subscription:", error.message);

    // Preserve original statusCode if exists
    const err: any = new Error(error.message || "Failed to update subscription");
    err.statusCode = error.statusCode || 500;

    throw err;
  }
};


// CANCEL SUBSCRIPTION
export const cancelSubscription =
  async (
    id: string
  ): Promise<Subscription | null> => {

    return SubscriptionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
      },

      {
        $set: {
          subscriptionStatus:
            appStatus.INACTIVE,
        },
      },

      {
        new: true,
      }
    ).lean() as unknown as Subscription | null;
  };


// DELETE SUBSCRIPTION
export const deleteSubscriptionById =
  async (
    id: string
  ): Promise<{
    acknowledged: boolean;
    deletedCount: number;
  }> => {

    return SubscriptionModel.deleteOne({
      _id: new Types.ObjectId(id),
    }).exec();
  };


// VALIDATE FEATURE ACCESS
export const validateFeatureAccess =
  async (
    tenantId: string,
    feature: string
  ): Promise<boolean> => {

    const subscription =
      await SubscriptionModel.findOne({
        tenantId,
        subscriptionStatus:
          appStatus.ACTIVE,
      }).lean();

    if (!subscription) {
      return false;
    }

    const plan = await PlanModel.findOne({
      planId: subscription.planId,
    }).lean();

    if (!plan) {
      return false;
    }

    return plan.features.includes(
      feature
    );
  };


// VALIDATE USER LIMIT
export const validateUserLimit =
  async (
    tenantId: string,
    currentUsers: number
  ): Promise<boolean> => {

    const subscription =
      await SubscriptionModel.findOne({
        tenantId,
        subscriptionStatus:
          appStatus.ACTIVE,
      }).lean();

    if (!subscription) {
      return false;
    }

    const plan = await PlanModel.findOne({
      planId: subscription.planId,
    }).lean();

    if (!plan) {
      return false;
    }

    return (
      currentUsers <
      plan.maxUsers
    );
  };


// CHECK TRIAL STATUS
export const checkTrialStatus =
  async (
    id: string
  ): Promise<boolean> => {

    const subscription =
      await SubscriptionModel.findById(id);

    if (!subscription) {
      return false;
    }

    const today = new Date();

    return (
      today <=
      new Date(subscription.endDate)
    );
  };