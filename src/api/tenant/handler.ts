/* eslint-disable @typescript-eslint/no-unused-vars */
import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { zodTenantSettingsSchema } from "../../models/tenant_setting";
import {
  createTenant,
  createTenantSettings,
  getActiveTenantRecord,
  getActiveTenantRecordByCode,
  getAllTenantSettingsRecords,
  getTenantAnalyticsCards,
  getTenantFullDetailsByCode,
  updateTenantDetailsByTenantId,
  updateTenantPlanService,
  updateTenantSettings,
} from "../../operations/tenants";
import { zodTenantSchema } from "../../models/tenants";
import { throwError } from "../../helpers/throwError";
import { tenantsMessages } from "../../config/messages";

// Input Validation for Create a tenant settings
const createInputValidation = z.object({
  payload: zodTenantSettingsSchema.pick({
    tenantId: true,
    keyName: true,
    keyValue: true,
    isConnected: true,
    module: true,
    status: true,
    createdBy: true,
    lastUpdatedBy: true,
  }),
});

// Input Validations for tenant settings list
const getTenantSettingsListInputValidation = z.object({
  query: zodGetAllRecordsQuerySchema.pick({
    // tenantId: true,
    // modules: true,
    // keyNames: true,
    sortBy: true,
  }),
});
const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const tenantFullDetailsParamsValidation = z.object({
  params: z.object({
    tenantCode: z.string().trim().min(1, tenantsMessages.TENANT_CODE_REQUIRED),
  }),
});

 const tenantPlanParamsValidation = z.object({
  params: z.object({
    tenantId: z.string(),
  }),
});

 const tenantPlanBodyValidation = z.object({
  planId: objectId,
  planName: z.string().trim().min(1, "Plan name is required"),
  updatedBy: z.string().optional(),
});

// Input Validation for Update a tenant settings
const updateInputValidation = z.object({
  payload: zodTenantSettingsSchema
    .pick({
      tenantId: true,
      keyName: true,
      keyValue: true,
      isConnected: true,
      module: true,
      status: true,
      createdBy: true,
      lastUpdatedBy: true,
      lastUpdatedDate: true,
    })
    .partial(), // Makes all picked fields optional
});

const updateTenantDetailsInput = z.object({
  payload: zodTenantSchema
    .omit({
      tenantCode: true,
      createdDate: true,
      createdBy: true,
    })
    .partial(),
});

const createTenantInputValidation = z.object({
  payload: zodTenantSchema.pick({
    tenantName: true,
    tenantLogo: true,
    mobileNumber: true,
    organizationName: true,
    phoneNumber: true,
    state: true,
    city: true,
    street: true,
    country: true,
    companyRegistrationCertificate: true,
    addressProof: true,
    gstCertificate: true,
    plan: true,
    timeZone: true,
    currency: true,
    emailId: true,
    faxNo: true,
    gstNo: true,
    panNo: true,
    postalCode: true,
    tenantJobCode: true,
    website: true,
    domainName: true,
    status: true,
    adminName: true,
    adminEmail: true,
    designation: true,
    comments: true,
    createdBy: true,
    lastUpdatedBy: true
  })
});


export default {

  //create new tenant

  async createTenant(req: Request, h: ResponseToolkit) {
    const raw: any = req.payload || {};
    console.log(
  "PAYLOAD KEYS:",
  Object.keys(raw)
);

console.log(
  "TENANT LOGO:",
  raw.tenantLogo
);

console.log(
  "REG CERT:",
  raw.companyRegistrationCertificate
);

console.log(
  "GST CERT:",
  raw.gstCertificate
);

console.log(
  "ADDRESS PROOF:",
  raw.addressProof
);
console.log("RAW PAYLOAD:", raw);
const validationPayload = {
  payload: {
    ...raw,

    tenantLogo:
      raw.tenantLogo?.hapi?.filename || "",

    companyRegistrationCertificate:
      raw.companyRegistrationCertificate?.hapi?.filename || "",

    gstCertificate:
      raw.gstCertificate?.hapi?.filename || "",

    addressProof:
      raw.addressProof?.hapi?.filename || "",
  },
};

console.log("VALIDATION PAYLOAD:", validationPayload);
   const { payload } = createTenantInputValidation.parse(validationPayload); 
    const {
    tenantName,
    tenantLogo,
    organizationName,
    phoneNumber,
    mobileNumber,
    emailId,
    gstNo,
    panNo,
    website,
    domainName,
    tenantJobCode,
    faxNo,
    state,
    city,
    street ,
    postalCode,
    country,
    companyRegistrationCertificate,
    addressProof,
    plan,
    timeZone,
    currency,
    status,
    adminName,
    adminEmail,
    designation,
    comments,
    createdBy,
    lastUpdatedBy
    } = payload;


    return createTenant({
      tenantName,
      tenantLogo,
      mobileNumber,
      organizationName,
      phoneNumber,
      state,
      city,
      street,
      country,
      companyRegistrationCertificate,
      addressProof,
      plan,
      timeZone,
      currency,
      emailId,
      faxNo,
      gstNo,
      panNo,
      postalCode,
      tenantJobCode,
      website,
      domainName,
      status,
      adminName,
      adminEmail,
      designation,
      comments,
      createdBy,
      lastUpdatedBy
    });
  },




  // Create a new tenant settings
  async createTenantSettings(req: Request, h: ResponseToolkit) {
    const { payload } = createInputValidation.parse({
      payload: req.payload,
    });

    const {
      keyName,
      keyValue,
      isConnected,
      module,
      status,
      createdBy,
      lastUpdatedBy,
    } = payload;

    return createTenantSettings({
      tenantId: payload.tenantId,
      keyName,
      keyValue,
      isConnected,
      module,
      status,
      createdBy,
      lastUpdatedBy,
    });
  },

  // Retrieve all the tenant settings list
  async getAllTenantsSettings(req: Request, h: ResponseToolkit) {
    const { query } = getTenantSettingsListInputValidation.parse({
      query: {
        ...req.query,
        keyNames: req.query.keyNames ? JSON.parse(req.query.keyNames) : [],
        modules: req.query.modules ? JSON.parse(req.query.modules) : []
      },
    });

    // Fetch the tenant settings records using the validated and parsed parameters
    return getAllTenantSettingsRecords(query);
  },

  // Update a tenant settings record
  async updateTenantSettings(req: Request, h: ResponseToolkit) {
    const { payload } = updateInputValidation.parse({
      payload: req.payload,
    });

    let formData = {
      ...payload,
      tenantId: payload.tenantId,
      lastUpdatedDate: new Date(),
    };

    return updateTenantSettings(String(req.params.tenantSettingsId), formData);
  },
  async getTenantDetailsByCode(req: Request, h: ResponseToolkit) {
    return getActiveTenantRecordByCode(String(req.params.tenantCode));
  },


  // Company info + subscription + modules/features access for the Tenant Details screen
  async getTenantFullDetails(req: Request, h: ResponseToolkit) {
    try {
      const validation = tenantFullDetailsParamsValidation.safeParse({
        params: req.params,
      });

      if (!validation.success) {
        throwError(validation.error.errors[0].message, 400);
        return;
      }

      const result = await getTenantFullDetailsByCode(
        validation.data.params.tenantCode,
      );

      return h
        .response({
          success: true,
          message: tenantsMessages.TENANT_FULL_DETAILS_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      console.error("Error in getTenantFullDetails:", error);

      return h
        .response({
          success: false,
          message: error.message || tenantsMessages.INTERNAL_SERVER_ERROR,
          errorCode: error.statusCode || 500,
        })
        .code(error.statusCode || 500);
    }
  },

   async getTenantDetails(req: Request, h: ResponseToolkit) {
    return getActiveTenantRecord();
  },
  
  async updateTenantDetailsById(req: Request, h: ResponseToolkit) {
    try {
      const raw: any = req.payload || {};

      const validationPayload = {
        payload: {
          ...raw,
          ...(raw.tenantLogo !== undefined && {
            tenantLogo: raw.tenantLogo?.hapi?.filename || raw.tenantLogo,
          }),
          ...(raw.companyRegistrationCertificate !== undefined && {
            companyRegistrationCertificate:
              raw.companyRegistrationCertificate?.hapi?.filename ||
              raw.companyRegistrationCertificate,
          }),
          ...(raw.gstCertificate !== undefined && {
            gstCertificate:
              raw.gstCertificate?.hapi?.filename || raw.gstCertificate,
          }),
          ...(raw.addressProof !== undefined && {
            addressProof:
              raw.addressProof?.hapi?.filename || raw.addressProof,
          }),
        },
      };

      const { payload } = updateTenantDetailsInput.parse(validationPayload);

      const result = await updateTenantDetailsByTenantId(
        String(req.params.tenantId),
        {
          ...payload,
          lastUpdatedDate: new Date(),
        },
      );

      if ((result as any)?.isBoom) {
        return result;
      }

      return h
        .response({
          success: true,
          message: tenantsMessages.TENANT_UPDATE_SUCCESS,
          data: result,
        })
        .code(200);
    } catch (error: any) {
      return h
        .response({
          success: false,
          message: error.message || tenantsMessages.INTERNAL_SERVER_ERROR,
        })
        .code(error.statusCode || 400);
    }
  },

  async getTenantAnalyticsCards(
  req: Request,
  h: ResponseToolkit
) {
  try {
    const result =
      await getTenantAnalyticsCards();

    return h
      .response({
        success: true,
        message:
          "Tenant analytics cards fetched successfully.",
        data: result,
      })
      .code(200);

  } catch (error: any) {
    console.error(
      "Get Tenant Analytics Cards Error:",
      error
    );

    return h
      .response({
        success: false,
        message:
          error?.message ||
          "Failed to fetch tenant analytics cards.",
      })
      .code(500);
  }
},
   
async updateTenantPlan(request: Request, h: ResponseToolkit) {
  try {
    const { params } = tenantPlanParamsValidation.parse({
      params: request.params,
    });

    const body = tenantPlanBodyValidation.safeParse(request.payload);

    if (!body.success) {
      throwError(body.error.errors[0].message, 400);
    }

    const result = await updateTenantPlanService(params.tenantId, {
      planId: body?.data?.planId,
      planName: body?.data?.planName,
      updatedBy: body?.data?.updatedBy,
    });

    return h
      .response({
        success: true,
        message: "Tenant plan updated successfully.",
        data: result
      })
      .code(200);

  } catch (error: any) {
    console.error("Error in updateTenantPlan:", error);

    return h
      .response({
        success: false,
        message: error.message || "Internal Server Error",
        errorCode: error.statusCode || 500,
      })
      .code(error.statusCode || 500);
  }
}
};
