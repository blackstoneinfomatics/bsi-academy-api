import mongoose, { Schema } from "mongoose"
import { ISubscritions } from "../../types/models.types";

const subscritionsSchema = new Schema<ISubscritions>({
    subscriptionName: {
        type: String,
        required: true
    },
    subscriptionPricePerHr: {
        type: Number,
        required: true
    },
    subscriptionDays: {
        type: Number,
        required: true
    },  
    subscriptionStartDate: {
        type: Date,
        required: true
    },
    subscriptionEndDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    createdDate: {
        type: Date,
        required: true
    },
    createdBy: {
        type: String,
        required: false
    },
    updatedDate: {
        type: Date,
        required: false
    },
    updatedBy:{
        type: String,
        required: false
    },
    
},
{
    collection: "subscriptions",
    timestamps: false,
  }
)
export default mongoose.model<ISubscritions>("Subscritions", subscritionsSchema);

