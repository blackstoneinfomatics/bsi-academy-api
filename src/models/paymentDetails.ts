import mongoose, { Schema } from "mongoose";
import { IPaymentDetails } from "../../types/models.types";

const paymentDetailsSchema = new Schema<IPaymentDetails>(
    {
      tenantId: { type: String, required: true },
      userId: {
        type: String,
        required: true,
      },
      userName: {
        type: String,
        required: true,
      },
      paymentStatus:{
        type: String,
        required: true
      },
      paymentAmount:{
        type: String,
        required: true
      },
      paymentResponse:{
        type: JSON,
        required: true
      },
      paymentResponseId:{
        type: String,
        required: true
      },
      paymentDate:{
        type: Date,
        required: false,
      },
      status:{
        type: String,
        required:  true
      },
      createdDate: {
        type: Date,
        required: true,
        default: Date.now
      },
      createdBy: {
        type: String,
        required: true
      },
      lastUpdatedDate: {
        type: Date,
        required: true,
        default: Date.now
      },
      lastUpdatedBy: {
        type: String,
        required: false
      },

    },
    {
        collection: "paymentDetails",
        timestamps: false,
      }
)
export default mongoose.model<IPaymentDetails>("PaymentDetails", paymentDetailsSchema);