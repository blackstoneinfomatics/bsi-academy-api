import mongoose, { Schema } from "mongoose";
import { z } from "zod";

export const createUpdateValidation = z.object({
  title: z.string().trim().min(1, "Title is required"),
  category: z.string().trim().min(1, "Category is required"),
  audience: z.array(z.string().trim().min(1)).min(1, "Audience is required"),
  selectedTenants: z.array(z.string().trim().min(1)).default([]),
  planName: z.string().trim().optional(),
  description: z.string().trim().min(1, "Description is required"),
  publishDate: z.coerce.date({ message: "Publish date must be a valid date" }),
  releaseDate: z.coerce.date({ message: "Release date must be a valid date" }).optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  attachments: z.array(z.string()).default([]),
  sendNotification: z.object({
    email: z.boolean().default(false),
    inApp: z.boolean().default(false),
  }).default({}),
  email: z.boolean().optional(),
  recipientEmail: z.string().email("Recipient email must be valid").optional(),
  recipientEmails: z.array(z.string().email("Recipient email must be valid")).default([]),
  purchaseTenant: z.number().min(0).default(0),
  status: z.enum(["Scheduled", "Published"]).default("Scheduled"),
});

export type CreateUpdateInput = z.infer<typeof createUpdateValidation>;

const UpdateSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    audience: { type: [String], required: true },

    selectedTenants: { type: [String], default: [] },
    planName: { type: String },
    audienceCount: { type: Number, default: 0 },
    selectedTenantsCount: { type: Number, default: 0 },

    description: { type: String, required: true },
    publishDate: { type: Date, required: true },
    releaseDate: { type: Date },
    priority: { type: String, enum: ["Low", "Medium", "High"] },

    attachments: { type: [String], default: [] },
    sendNotification: {
      email: { type: Boolean, default: false },
      inApp: { type: Boolean, default: false },
    },
    email: { type: Boolean },
    recipientEmail: { type: String },
    recipientEmails: { type: [String], default: [] },
    purchaseTenant: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Scheduled", "Published"],
      default: "Scheduled",
    },
    views: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "updates",
  }
);

// ✅ AUTO-COMPUTE COUNTS BEFORE SAVING
UpdateSchema.pre("save", function (next) {
  const tenantList = Array.isArray(this.selectedTenants)
    ? this.selectedTenants
    : [];

  this.selectedTenantsCount = tenantList.length;

  const audienceList = Array.isArray(this.audience) ? this.audience : [];
  const isAllTenants = audienceList.some((a: string) =>
    a.toLowerCase().includes("all tenant")
  );

  // For all-tenants → audienceCount is your global tenant count
  // You can set it from the handler if you know the real number.
  // Here we mirror selectedTenantsCount for "Select Tenants".
  this.audienceCount = isAllTenants ? this.audienceCount || 0 : tenantList.length;

  next();
});

export default mongoose.model("Update", UpdateSchema);