import { Request, ResponseToolkit } from "@hapi/hapi";
import { createChildModuleValidation, createFeatureValidation, createParentModuleValidation, updateAccessValidation, updateChildModuleValidation, updateFeatureValidation, updateParentModuleValidation } from "../../models/portalModule";



// ---------------------------------------------------------------------------
// Parent module
// ---------------------------------------------------------------------------

export const createParentModule = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = createParentModuleValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const result = await operation.createParentModule(parsed.data);

    return h
      .response({
        success: true,
        message: "Parent module created successfully",
        data: result,
      })
      .code(201);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const getParentModules = async (_request: Request, h: ResponseToolkit) => {
  try {
    const result = await operation.getParentModules();

    return h
      .response({
        success: true,
        message: "Parent modules fetched successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const updateParentModule = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = updateParentModuleValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId } = request.params;
    const result = await operation.updateParentModule(parentModuleId, parsed.data);

    return h
      .response({
        success: true,
        message: "Parent module updated successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const updateParentModuleAccess = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = updateAccessValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId } = request.params;
    const result = await operation.updateParentModuleAccess(parentModuleId, parsed.data);

    return h
      .response({
        success: true,
        message: "Parent module access updated successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

// ---------------------------------------------------------------------------
// Child module
// ---------------------------------------------------------------------------

export const createChildModule = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = createChildModuleValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId } = request.params;
    const result = await operation.createChildModule(parentModuleId, parsed.data);

    return h
      .response({
        success: true,
        message: "Child module created successfully",
        data: result,
      })
      .code(201);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const getChildModules = async (request: Request, h: ResponseToolkit) => {
  try {
    const { parentModuleId } = request.params;
    const result = await operation.getChildModules(parentModuleId);

    return h
      .response({
        success: true,
        message: "Child modules fetched successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const updateChildModule = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = updateChildModuleValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId, childModuleId } = request.params;
    const result = await operation.updateChildModule(parentModuleId, childModuleId, parsed.data);

    return h
      .response({
        success: true,
        message: "Child module updated successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const updateChildModuleAccess = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = updateAccessValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId, childModuleId } = request.params;
    const result = await operation.updateChildModuleAccess(
      parentModuleId,
      childModuleId,
      parsed.data
    );

    return h
      .response({
        success: true,
        message: "Child module access updated successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------

export const createFeature = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = createFeatureValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId, childModuleId } = request.params;
    const result = await operation.createFeature(parentModuleId, childModuleId, parsed.data);

    return h
      .response({
        success: true,
        message: "Feature created successfully",
        data: result,
      })
      .code(201);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const getFeatures = async (request: Request, h: ResponseToolkit) => {
  try {
    const { parentModuleId, childModuleId } = request.params;
    const result = await operation.getFeatures(parentModuleId, childModuleId);

    return h
      .response({
        success: true,
        message: "Features fetched successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const updateFeature = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = updateFeatureValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId, childModuleId, featureId } = request.params;
    const result = await operation.updateFeature(
      parentModuleId,
      childModuleId,
      featureId,
      parsed.data
    );

    return h
      .response({
        success: true,
        message: "Feature updated successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};

export const updateFeatureAccess = async (request: Request, h: ResponseToolkit) => {
  try {
    const parsed = updateAccessValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0].message,
          errorCode: 400,
        })
        .code(400);
    }

    const { parentModuleId, childModuleId, featureId } = request.params;
    const result = await operation.updateFeatureAccess(
      parentModuleId,
      childModuleId,
      featureId,
      parsed.data
    );

    return h
      .response({
        success: true,
        message: "Feature access updated successfully",
        data: result,
      })
      .code(200);
  } catch (err: any) {
    return h
      .response({
        success: false,
        message: err.message || "Internal Server Error",
        errorCode: err.statusCode || 500,
      })
      .code(err.statusCode || 500);
  }
};


