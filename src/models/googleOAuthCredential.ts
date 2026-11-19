import mongoose, { Document, Schema } from "mongoose";

export interface IGoogleOAuthCredential extends Document {
  provider: string;
  encryptedRefreshToken: string;
}

const googleOAuthCredentialSchema = new Schema<IGoogleOAuthCredential>(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
    },
    encryptedRefreshToken: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    collection: "integrationCredentials",
    timestamps: true,
  }
);

export default mongoose.model<IGoogleOAuthCredential>(
  "GoogleOAuthCredential",
  googleOAuthCredentialSchema
);
