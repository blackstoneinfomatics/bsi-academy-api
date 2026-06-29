

import {
  Request,
  ResponseToolkit,
} from "@hapi/hapi";

import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "../../operations/plan";

interface PlanPayload {
  planName: string;
  price: number;
  billingCycle: string;
  trialDays: number;
  maxUsers: number;
  allowedRoles: string[];
  features: string[];
  canCreateCustomRole: boolean;
  status: string;
  createdBy: string;
  lastUpdatedBy: string;
}

export default {

  // CREATE PLAN
  async createPlan(
    req: Request,
    h: ResponseToolkit
  ) {

    const payload =
      req.payload as PlanPayload;

    const newPlan = await createPlan(
      payload
    );

    return h.response({
      success: true,
      data: newPlan,
    }).code(201);
  },

  // GET ALL PLANS
  async getPlans(
    req: Request,
    h: ResponseToolkit
  ) {

    const plans = await getAllPlans();

    return h.response({
      success: true,
      data: plans,
    }).code(200);
  },

  // GET PLAN BY ID
  async getPlanById(
    req: Request,
    h: ResponseToolkit
  ) {

    const { planId } =
      req.params;

    const plan = await getPlanById(
      planId
    );

    return h.response({
      success: !!plan,
      data: plan,
    }).code(plan ? 200 : 404);
  },

  // UPDATE PLAN
async updatePlan(
  req: Request,
  h: ResponseToolkit
) {

  const { planId } =
    req.params;
console.log("Updating plan with ID:", planId);
  const payload =
    req.payload;
console.log("Update payload:", payload);
  const updatedPlan =
    await updatePlan(
      planId,
      payload
    );
console.log("Updated plan:", updatedPlan);
  return h.response({
    success: true,
    data: updatedPlan,
  }).code(200);
} ,

  // DELETE PLAN
  async deletePlan(
    req: Request,
    h: ResponseToolkit
  ) {

    const { planId } =
      req.params;

    const result = await deletePlan(
      planId
    );

    return h.response({
      success: result.deletedCount > 0,
      message: result.deletedCount > 0 ? "Plan deleted successfully" : "Plan not found",
    }).code(200);
  },
};