import mongoose, { Schema } from "mongoose";

const paymentNumberCounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, min: 0 },
  },
  {
    collection: "paymentnumbercounter",
    versionKey: false,
  },
);

export default mongoose.model(
  "PaymentNumberCounter",
  paymentNumberCounterSchema,
);
