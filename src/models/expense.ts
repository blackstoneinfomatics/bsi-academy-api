import mongoose, { Schema } from "mongoose";
import { appStatus, commonMessages } from "../config/messages";
import { IExpense } from "../../types/models.types";
import { z } from "zod";


const expenseSchema = new Schema<IExpense>(
  {
paymentDate:{
    type: String,
    required: true,
},
expenseType: 
{
    type: String,
    required: true,
},
amount: 
{
    type: String,
    required: true,
},
category: 
{
    type: String,
    required: true,
},
paymentMethod: 
{
    type: String,
    required: true,
},
status:
{
type: String,
required: false,
},
createdDate:
{
type: Date,
required: false,
},
createdBy:
{
type: String,
required: false,
},
updatedDate:
{
type: Date,
required: false,
},
updatedBy:
{
type: String,
required: false,
}

  },
  {
    collection: "expense",
    timestamps: false,
}
);
export const zodExpenseSchema = z.object({
    paymentDate:z.string(),
    expenseType:z.string(),
    amount:z.string(),
    category:z.string(),
    paymentMethod:z.string(),
      status: z.enum([appStatus.ACTIVE, appStatus.IN_ACTIVE, appStatus.DELETED]).optional(),
      createdDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      createdBy: z.string().optional(),
      updatedDate:z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: commonMessages.INVALID_DATE_FORMAT,
      }).transform((val) => new Date(val)).optional(),
      updatedBy:z.string().optional()
})
export default mongoose.model<IExpense>("Expense", expenseSchema);