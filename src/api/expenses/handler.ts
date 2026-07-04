import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { zodExpenseSchema } from "../../models/expense";
import { createExpense, getAllExpensesCardCounts, getExpenses } from "../../operations/expense";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";


const createInputValidation = z.object({
  payload: zodExpenseSchema.pick({
    paymentDate: true,
    expenseType: true,
    amount: true,
    category:true,
    paymentMethod:true,
    status: true,
    createdDate: true,
    createdBy: true,
    updatedBy:true,
    updatedDate: true,
  }),
});
const getExpenseInputValidation = z.object({
    query: zodGetAllRecordsQuerySchema.pick({
      searchText: true,
      sortBy: true,
      sortOrder: true,
      offset: true,
      limit: true,
      trialClassStatus: true,
      filterValues: true
    }),
  });
export default {
    async createExpense(req: Request, h: ResponseToolkit) {
        const { payload } = createInputValidation.parse({
            payload: req.payload,
          });

          return await createExpense({  
            paymentDate:payload.paymentDate || "",
            expenseType:payload.expenseType || "",
            amount:payload.amount || "",
            category:payload.category||"",
            paymentMethod:payload.paymentMethod || "",  
            status: payload.status || "Active",
            createdDate: new Date(),
            createdBy: payload.createdBy || "System",
            updatedDate: new Date(),
            updatedBy: payload.updatedBy || "System",
        }) 
    },

    getAllExpenses(req: Request, h: ResponseToolkit) {
     const { query } = getExpenseInputValidation.parse({
       query: {
         ...req.query,
         filterValues: req.query?.filterValues ? JSON.parse(req.query.filterValues) : {},
       },
     });
     return getExpenses(query);
   },

   async getAllExpensesCardCount(req: Request, h: ResponseToolkit) {
    const { query } = getExpenseInputValidation.parse({
      query: {
        ...req.query,
        filterValues: req.query?.filterValues ? JSON.parse(req.query.filterValues) : {},
      },
    });
    return getAllExpensesCardCounts();
  },

}