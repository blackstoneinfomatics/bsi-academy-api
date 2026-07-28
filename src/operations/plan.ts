// ==============================
// plan-service.ts
// ==============================

import PlanModel, { createPlanValidation } from "../models/plan-model";
import { z } from "zod";

export type CreatePlanPayload = z.infer<
  typeof createPlanValidation
>;

export type UpdatePlanPayload = Partial<
  z.infer<typeof createPlanValidation>
>;

// CREATE PLAN
export const createPlan = async (
  payload: CreatePlanPayload
) => {

  const newPlan =
    new PlanModel(payload);

  return await newPlan.save();
};


// GET ALL PLANS
export const getAllPlans =
  async () => {

    return await PlanModel.find()
      .lean()
      .exec();
  };


// GET PLAN BY ID
export const getPlanById =
  async (
    id: string
  ) => {

    return await PlanModel.findOne({
      planId: id,
    }).lean();
  };


// UPDATE PLAN

export const updatePlan = async (
  id: string,
  payload: UpdatePlanPayload
) => {
  return await PlanModel.findOneAndUpdate(
    {
      planId: id,
    },
    {
      $set: {
        ...payload,
        updatedDate: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();
};


// DELETE PLAN
export const deletePlan =
  async (
    id: string
  ) => {

    return await PlanModel.deleteOne({
      planId: id,
    }).exec();
  };