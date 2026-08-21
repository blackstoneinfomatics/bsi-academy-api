

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
  addPlanBillingPeriod,
  updatePlanBillingPeriod,
  deletePlan,
  getPlanDashboard,
  getPlanAnalytics,
} from "../../operations/plan";
import planModel, {
  createPlanValidation,
  addBillingPeriodValidation,
  updateBillingPeriodValidation,
} from "../../models/plan-model";
import { planMessages } from "../../config/messages";

const getPlanAnalyticsValidation = z.object({
  query: z.object({
    period: z.enum(["monthly", "quarterly", "yearly"]).default("yearly"),
  }),
});

const getPlansValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    planStatus: z.enum(["Growing", "Low_Adoption", "Most_Popular"]).optional(),
    billingCycle: z
      .enum(["MONTHLY", "YEARLY",  "QUARTERLY", "HALF_YEARLY"])
      .optional(),
    sortBy: z
      .enum([
        "createdDate",
        "updatedDate",
        "planName",
        "monthlyPrice",
        "yearlyPrice",
        "studentLimit",
      ])
      .default("createdDate"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});


const createInputValidation = z.object({
  payload: createPlanValidation.pick({
    planName: true,
    studentLimit: true,
    userLimit: true,
    planDescription: true,
    planStatus: true,
    totalPrice: true,
    trialDays: true,
    gstAndTax: true,
    taxAmount: true,
    billingPeriods: true,
    allowedRoles: true,
    features: true,
    canCreateCustomRole: true,
    customDomain: true,
    domain: true,
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

const addBillingPeriodInputValidation = z.object({
  params: z.object({
    planId: z.string(),
  }),
  payload: addBillingPeriodValidation,
});

const updateBillingPeriodInputValidation = z.object({
  params: z.object({
    planId: z.string(),
    billingPeriodId: z.string(),
  }),
  payload: updateBillingPeriodValidation,
});

const parseTaxRate = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.trim().replace(/%$/, "");
    const parsed = Number(cleaned);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  throw new Error(planMessages.INVALID_GST_AND_TAX);
};



export default {

  // CREATE PLAN
async createPlan(req: Request, h: ResponseToolkit) {
    try {
      const payloadInput = (req.payload ?? {}) as Record<string, unknown>;
      const gstRate = parseTaxRate(payloadInput.gstAndTax);

      const { payload } = createInputValidation.parse({
        payload: {
          ...payloadInput,
          gstAndTax: gstRate,
        },
      });

      const computedTaxAmount = Number(
        ((payload.totalPrice * payload.gstAndTax) / 100).toFixed(2)
      );

      const normalizedBillingPeriods = payload.billingPeriods.map((period) => {
        const discountAmount = (period.price * period.discount) / 100;
        const discountedBase = Math.max(0, period.price - discountAmount);
        const effectiveGstRate = period.gstRate ?? payload.gstAndTax;
        const taxAmount = Number(
          ((discountedBase * effectiveGstRate) / 100).toFixed(2)
        );
        const totalAmount = Number((discountedBase + taxAmount).toFixed(2));

        return {
          ...period,
          gstRate: effectiveGstRate,
          taxAmount,
          totalAmount,
        };
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
        taxAmount: computedTaxAmount,
        billingPeriods: normalizedBillingPeriods,
      });

      console.log("Generated Plan ID:", planId);

      console.log("Payload to save:", {
  ...payload,
  planId,
});

      return h
        .response({
          success: true,
          message: planMessages.PLAN_CREATED_SUCCESS,
          data: newPlan,
        })
        .code(201);
    } catch (error: any) {
      console.error(error);

      return h
        .response({
          success: false,
          message: error?.message || planMessages.FAILED_TO_CREATE_PLAN,
          ...(error?.errors ? { errors: error.errors } : {}),
        })
        .code(500);
    }
  },

  // GET ALL PLANS
  async getPlans(
    req: Request,
    h: ResponseToolkit
  ) {
    try {
      const { query } = getPlansValidation.parse({
        query: req.query,
      });

      const plans = await getAllPlans(query);

      return h.response({
        success: true,
        data: plans,
      }).code(200);
    } catch (error: any) {
      return h.response({
        success: false,
        message: error?.message || planMessages.FAILED_TO_FETCH_PLANS,
        ...(error?.errors ? { errors: error.errors } : {}),
      }).code(500);
    }
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
  try {
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
        message: planMessages.PLAN_NOT_FOUND,
      }).code(404);
    }

    return h.response({
      success: true,
      data: updatedPlan,
    }).code(200);
  } catch (error: any) {
    return h.response({
      success: false,
      message: error?.message || planMessages.FAILED_TO_UPDATE_PLAN,
      ...(error?.errors ? { errors: error.errors } : {}),
    }).code(500);
  }
},

  // ADD BILLING PERIOD
async addBillingPeriod(
  req: Request,
  h: ResponseToolkit
) {
  try {
    const { params, payload } =
      addBillingPeriodInputValidation.parse({
        params: req.params,
        payload: req.payload,
      });

    const updatedPlan = await addPlanBillingPeriod(
      params.planId,
      payload
    );

    if (updatedPlan === "DUPLICATE") {
      return h.response({
        success: false,
        message: planMessages.BILLING_PERIOD_ALREADY_EXISTS,
      }).code(400);
    }

    if (!updatedPlan) {
      return h.response({
        success: false,
        message: planMessages.PLAN_NOT_FOUND,
      }).code(404);
    }

    // $push always appends, so the newly generated billing period is the last entry.
    const billingPeriod =
      updatedPlan.billingPeriods[updatedPlan.billingPeriods.length - 1];

    return h.response({
      success: true,
      message: planMessages.BILLING_PERIOD_ADDED_SUCCESS,
      data: {
        planId: updatedPlan.planId,
        billingPeriod,
      },
    }).code(201);
  } catch (error: any) {
    return h.response({
      success: false,
      message: error?.message || planMessages.FAILED_TO_ADD_BILLING_PERIOD,
      ...(error?.errors ? { errors: error.errors } : {}),
    }).code(500);
  }
},

  // UPDATE BILLING PERIOD
async updateBillingPeriod(
  req: Request,
  h: ResponseToolkit
) {
  try {
    const { params, payload } =
      updateBillingPeriodInputValidation.parse({
        params: req.params,
        payload: req.payload,
      });

    const updatedPlan = await updatePlanBillingPeriod(
      params.planId,
      params.billingPeriodId,
      payload
    );

    if (!updatedPlan) {
      return h.response({
        success: false,
        message: planMessages.PLAN_NOT_FOUND,
      }).code(404);
    }

    return h.response({
      success: true,
      data: updatedPlan,
    }).code(200);
  } catch (error: any) {
    return h.response({
      success: false,
      message: error?.message || planMessages.FAILED_TO_UPDATE_BILLING_PERIOD,
      ...(error?.errors ? { errors: error.errors } : {}),
    }).code(500);
  }
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
      message: result.deletedCount > 0 ? planMessages.PLAN_DELETED_SUCCESS : planMessages.PLAN_NOT_FOUND,
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
        message: planMessages.PLAN_DASHBOARD_FETCHED_SUCCESS,
        data: result,
      }).code(200);
    } catch (error: any) {
      return h.response({
        success: false,
        message: error?.message || planMessages.FAILED_TO_FETCH_PLAN_DASHBOARD,
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
        message: planMessages.PLAN_ANALYTICS_FETCHED_SUCCESS,
        data: result,
      }).code(200);
    } catch (error: any) {
      return h.response({
        success: false,
        message: error?.message || planMessages.FAILED_TO_FETCH_PLAN_ANALYTICS,
        ...(error?.errors ? { errors: error.errors } : {}),
      }).code(500);
    }
  },

};