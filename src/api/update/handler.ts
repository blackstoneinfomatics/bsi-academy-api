import { Request, ResponseToolkit } from "@hapi/hapi";
import { createUpdate } from "../../operations/update";
import { createUpdateValidation } from "../../models/update";

export default
{ 
  async createUpdateHandler(
  request: Request,
  h: ResponseToolkit
) {
  try {

    const parsed = createUpdateValidation.safeParse(request.payload);

    if (!parsed.success) {
      return h
        .response({
          success: false,
          message: parsed.error.issues[0]?.message || "Invalid update payload",
          errorCode: 400,
        })
        .code(400);
    }

    const result = await createUpdate(parsed.data);

    return h
      .response({
        success: true,
        message: "Update created successfully",
        data: result,
      })
      .code(201);

  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };

    return h
      .response({
        success: false,
        message: error.message || "Internal Server Error",
        errorCode: error.statusCode || 500,
      })
      .code(error.statusCode || 500);
  }
}
}