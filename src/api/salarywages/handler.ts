import { Request, ResponseToolkit } from '@hapi/hapi';
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { z } from "zod";
import { getAllSalaryCardCounts, getAllSalaryList, getRecordByTeacherId, updateSalaryWages } from '../../operations/salarywages';
import salaryandwages from '../../models/salaryandwages';

const getSalaryInputValidation = z.object({
    query: zodGetAllRecordsQuerySchema.pick({
      searchText: true,
      sortBy: true,
      sortOrder: true,
      offset: true,
      limit: true,
    }),
  });
  export const updateSalaryValidation = z.object({
    amount: z.number().optional(),
    status: z.string().optional(),
    deduction: z.number().optional(),
    paymentStatus: z.string().optional(),
    paymentDate: z.string().optional(), // or z.coerce.date().optional() if you want date conversion
    balanceAmount: z.number().optional()
  });


export default {
    async getAllSalaryList(req: Request, h: ResponseToolkit) {
     const { query } = getSalaryInputValidation.parse({
       query: {
         ...req.query,
         filterValues: req.query?.filterValues ? JSON.parse(req.query.filterValues) : {},
       },
     });
     return getAllSalaryList(query);
   },

   async getAllSalaryCard(req: Request, h: ResponseToolkit) {
    const { query } = getSalaryInputValidation.parse({
      query: {
        ...req.query,
        filterValues: req.query?.filterValues ? JSON.parse(req.query.filterValues) : {},
      },
    });
    return getAllSalaryCardCounts(query);
  },

  //get by employeeId


async getByEmployeeId(req: Request, h: ResponseToolkit) {
  try {
    const employeeId = req.query.employeeId as string;

    if (!employeeId) {
      return h.response({ error: "employeeId is required in query params." }).code(400);
    }

    const result = await getRecordByTeacherId({ employeeId });

    return h.response(result).code(200);
  } catch (error) {
    console.error("Error fetching salary/wages:", error);
    return h.response({ error: "Failed to fetch salary/wages data." }).code(500);
  }
},


  // Update salarywages record (employeeId from path params, no designation in body)
  async updateSalaryWages(req: Request, h: ResponseToolkit) {
    try {
      const employeeId = req.params.employeeId;
      const body = updateSalaryValidation.parse(req.payload);

      const result = await updateSalaryWages({
        employeeId,
        ...body
      });

      return h.response(result).code(200);
    } catch (error) {
      console.error("Error updating salary wages:", error);
      const message = error instanceof Error ? error.message : String(error);
      return h.response({ success: false, message }).code(400);
    }
  }
};
