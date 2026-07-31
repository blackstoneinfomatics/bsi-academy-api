

import {
  Request,
  ResponseToolkit,
} from "@hapi/hapi";
import { z } from "zod";

import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "../../operations/plan";
import { createPlanValidation } from "../../models/plan-model";


const createInputValidation = z.object({
  payload: createPlanValidation.pick({
    planName: true,
    tenantId: true,
    planId: true,
    studentLimit: true,
    billingCycle: true,
    planDescription: true,
    planStatus: true,
    monthlyPrice: true,
    yearlyPrice: true,
    setupFee: true,
    trialDays: true,
    gstAndTax: true,
    maxUsers: true,
    allowedRoles: true,
    features: true,
    canCreateCustomRole: true,
    customDomain: true,
    backup: true,
    status: true,
    createdBy: true,
    lastUpdatedBy: true,
  }),
});

const updateInputValidation = z.object({
  params: z.object({
    planId: z.string(),
  }),
  payload: createPlanValidation
    .omit({
      tenantId: true,
      planId: true,
      createdBy: true,
      createdDate: true,
    })
    .partial(),
});



export default {

  // CREATE PLAN
  async createPlan(
    req: Request,
    h: ResponseToolkit
  ) {

 const { payload } = createInputValidation.parse({
      payload: req.payload,
    });

  const newPlan = await createPlan(payload);


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
  const { params, payload } =
    updateInputValidation.parse({
      params: req.params,
      payload: req.payload,
    });

  const updatedPlan = await updatePlan(
    params.planId,
    payload
  );

  if (!updatedPlan) {
    return h.response({
      success: false,
      message: "Plan not found",
    }).code(404);
  }

  return h.response({
    success: true,
    data: updatedPlan,
  }).code(200);
},



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