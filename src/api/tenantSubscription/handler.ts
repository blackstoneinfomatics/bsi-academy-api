import { ResponseToolkit, Request } from "@hapi/hapi";
import { z, ZodError } from "zod";
import {
  getActiveTenantSubscriptionRecord,
  getTenantSubscriptionDashboard,
  getTenantSubscriptionGrowthAnalytics,
} from "../../operations/tenantSubscription.";
import {
  BillingCycle,
  PaymentStatus,
  SubscriptionStatus,
} from "../../shared/enum";

export const getTenantSubscriptionGrowthAnalyticsValidation = z.object({
  query: z.object({
    view: z.enum(["yearly", "monthly"]).default("yearly"),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
});

export const getTenantSubscriptionDetailsValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    status: z.nativeEnum(SubscriptionStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    billingCycle: z.nativeEnum(BillingCycle).optional(),
    sortBy: z
      .enum([
        "createdAt",
        "startDate",
        "endDate",
        "nextRenewalDate",
        "subscriptionCode",
      ])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});


export default {
   async getTenantSubscriptionDetails(req: Request, h: ResponseToolkit) {
    const { query } = getTenantSubscriptionDetailsValidation.parse({
      query: req.query,
    });

    const result = await getActiveTenantSubscriptionRecord(query);

    return h
      .response({
        success: true,
        data: result,
      })
      .code(200);
  },
  
   async getTenantSubscriptionDashboard(
  req: Request,
  h: ResponseToolkit
) {
  try {
    const result =
      await getTenantSubscriptionDashboard();

    return h
      .response({
        success: true,
        message:
          "Tenant subscription dashboard fetched successfully.",
        data: result,
      })
      .code(200);

  } catch (error: any) {

    console.error(
      "Tenant Subscription Dashboard Error:",
      error
    );

    return h
      .response({
        success: false,
        message:
          error.message ||
          "Failed to fetch tenant subscription dashboard.",
      })
      .code(500);
  }
},

async getTenantSubscriptionGrowthAnalytics(req: Request, h: ResponseToolkit) {
    try {
      const { query } = getTenantSubscriptionGrowthAnalyticsValidation.parse({
        query: req.query,
      });

      const result = await getTenantSubscriptionGrowthAnalytics(
        query.view,
        query.year
      );

      return h
        .response({
          success: true,
          message:
            "Tenant subscription growth analytics fetched successfully.",
          data: result,
        })
        .code(200);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return h
          .response({
            success: false,
            message: "Validation Failed",
            errors: error.errors,
          })
          .code(400);
      }

      console.error(
        "Tenant Subscription Growth Analytics Error:",
        error
      );

      return h
        .response({
          success: false,
          message:
            error.message ||
            "Failed to fetch tenant subscription growth analytics.",
        })
        .code(500);
    }
  },

};
