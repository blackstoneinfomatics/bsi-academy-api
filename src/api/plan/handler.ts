

import {
  Request,
  ResponseToolkit,
} from "@hapi/hapi";
import { z, ZodError } from "zod";

import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  getPlanDashboard,
  getPlanAnalytics,
} from "../../operations/plan";
import planModel, { createPlanValidation } from "../../models/plan-model";

const getPlanAnalyticsValidation = z.object({
  query: z.object({
    period: z.enum(["monthly", "quarterly", "yearly"]).default("yearly"),
  }),
});


const createInputValidation = z.object({
  payload: createPlanValidation.pick({
    planName: true,
    studentLimit: true,
    billingCycle: true,
    planDescription: true,
    planStatus: true,
    monthlyPrice: true,
    yearlyPrice: true,
    setupFee: true,
    trialDays: true,
    gstAndTax: true,
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
      planId: true,
      createdBy: true,
      createdDate: true,
    })
    .partial(),
});



export default {

  // CREATE PLAN
async createPlan(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createInputValidation.parse({
        payload: req.payload,
      });

      // Get the latest valid plan ID and generate the next sequential ID
      const lastPlan = await planModel
        .findOne(
          { planId: { $regex: /^PLAN-\d+$/ } },
          { planId: 1, _id: 0 }
        )
        .sort({ planId: -1 });

      let planId = "PLAN-001";

      if (lastPlan?.planId) {
        const match = lastPlan.planId.match(/^PLAN-(\d+)$/);
        const lastNumber = match ? parseInt(match[1], 10) : NaN;

        if (!Number.isNaN(lastNumber)) {
          planId = `PLAN-${String(lastNumber + 1).padStart(3, "0")}`;
        }
      }

      const newPlan = await createPlan({
        ...payload,
        planId,
      });

      console.log("Generated Plan ID:", planId);

      console.log("Payload to save:", {
  ...payload,
  planId,
});

      return h
        .response({
          success: true,
          message: "Plan created successfully",
          data: newPlan,
        })
        .code(201);
    } catch (error) {
      console.error(error);

      return h
        .response({
          success: false,
          message: "Failed to create plan",
          error,
        })
        .code(500);
    }
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


  // GET PLAN DASHBOARD
  async getPlanDashboard(
    req: Request,
    h: ResponseToolkit
  ) {
    try {
      const result = await getPlanDashboard();

      return h.response({
        success: true,
        message: "Plan dashboard fetched successfully.",
        data: result,
      }).code(200);
    } catch (error: any) {
      return h.response({
        success: false,
        message: error.message || "Failed to fetch plan dashboard.",
      }).code(500);
    }
  },

  // GET PLAN ANALYTICS
  async getPlanAnalytics(
    req: Request,
    h: ResponseToolkit
  ) {
    try {
      const { query } = getPlanAnalyticsValidation.parse({
        query: req.query,
      });

      const result = await getPlanAnalytics(query.period);

      return h.response({
        success: true,
        message: "Plan analytics fetched successfully.",
        data: result,
      }).code(200);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return h.response({
          success: false,
          message: "Validation Failed",
          errors: error.errors,
        }).code(400);
      }

      return h.response({
        success: false,
        message: error.message || "Failed to fetch plan analytics.",
      }).code(500);
    }
  },

};