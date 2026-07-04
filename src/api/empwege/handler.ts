import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { zodEmpWagesSchema } from "../../models/empwages";
import { createEmpWages, getEmpWagesById, updateEmpWageLogic } from "../../operations/empwages";


const createInputValidation = z.object({
  payload: zodEmpWagesSchema.pick({
    employeeId: true,
    employeeName: true,
    classType: true,
    status: true,
    createdDate: true,
    createdBy: true,
    updatedDate: true,
  }),
});

export default {
    async createEmployeeWages(req: Request, h: ResponseToolkit) {
        const { payload } = createInputValidation.parse({
            payload: req.payload,
          });

          return await createEmpWages({  
        employeeId: payload.employeeId,
        employeeName: payload.employeeName,
        classType:{
            className:  payload.classType?.className || " ",
            hoursMins: payload.classType?.hoursMins || " ",
            rate: payload.classType?.rate || "",
            currency: payload.classType?.currency || "",
        },
       status:"Active",
       createdDate:  new Date(),
       createdBy: "Admin",
       updatedDate:  new Date(),
       updatedBy:  "Admin"
        }) 
    },

    // Retrieve all the Evaluation list
async getAllEmployeeWages(req: Request, h: ResponseToolkit) {
  const employeeId = String(req.query.employeeId);
  if (!employeeId) {
    return h.response({ message: "employeeId query parameter is required" }).code(400);
  }

  const result = await getEmpWagesById(employeeId);
  return result;
},

async updateEmpWageById(req: Request, h: ResponseToolkit) {
  const id = req.params.id;
  const payload = req.payload as {
    rate?: number;
    hoursMins?: number; // will convert to string if provided
  };

  // Convert duration to string format if present (e.g., 30 -> "30 min")
  const formattedPayload = {
    rate: payload.rate,
    hoursMins: payload.hoursMins !== undefined ? `${payload.hoursMins} min` : undefined,
  };

  try {
    const result = await updateEmpWageLogic(id, formattedPayload);
    if (!result) {
      return h.response({ message: "Wage record not found" }).code(404);
    }

    return { message: "Wage record updated", data: result };
  } catch (err: any) {
    return h.response({ message: err.message || "Update failed" }).code(400);
  }
}




}


