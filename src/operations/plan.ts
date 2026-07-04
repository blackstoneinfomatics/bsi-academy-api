// ==============================
// plan-service.ts
// ==============================

import PlanModel from "../models/plan-model";


// CREATE PLAN
export const createPlan = async (
  payload: any
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
export const updatePlan =
  async (
    id: string,
    payload: any
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