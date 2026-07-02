import mongoose, { model, Schema } from "mongoose";
import { IRollCounter } from "../../types/models.types";

const rollCounterSchema = new Schema<IRollCounter>({
    tenantId: { type: String, required: true },
    prefix: { 
        type: String,
        require: true
    },
    sequence:{
        type: Number,
        require: true
    }
    
},
{
    collection: "rollcounter",
    timestamps: false,

}
)
export default mongoose.model<IRollCounter>("rollcounter", rollCounterSchema);

