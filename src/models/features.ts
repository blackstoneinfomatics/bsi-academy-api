import mongoose, { Schema } from "mongoose";
import { IFeatures } from "../../types/models.types";
import { z } from "zod";
import { Status } from "../shared/enum";

const featureSchema = new Schema<IFeatures>(
  {
    
    selectmodule: {
      type: String,
      required: true,
    },
    tenantId :{  
     type: String,
     required : true,
    },
    selectcategory: {
      type: String,
      required: true,
    },
    navigationMenuInformation :{
    navigationName: {
      type: String,
      required: true,
    },
    menuicon:{
      type:String,
      reuired :true
    },
    discription:{
      type:String,
      reuired :true
    },
    display :{
      type:String,
      reuired :true
    },
    featureStatus:{
      type:String,
      reuired :true
    },

},

    status: {
      type: String,
      enum: Status,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
      type: String,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "features",
    timestamps: false,
  }
);

export const zodFeatureSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),

  selectmodule: z.string().min(1, "Module is required"),

  selectcategory: z.string().min(1, "Category is required"),

  navigationMenuInformation: z.object({
    navigationName: z.string().min(1, "Navigation name is required"),
    menuicon: z.string().min(1, "Menu icon is required"),
    discription: z.string().min(1, "Description is required"),
    display: z.string().min(1, "Display is required"),
    featureStatus: z.string().min(1, "Feature status is required"),
  }),

  status: z.string().min(1, "Status is required"),

  createdBy: z.string().min(1, "Created by is required"),

  updatedBy: z.string().nullable().optional(),

  deletedAt: z.date().nullable().optional(),

  createdAt: z.date().optional(),

  updatedAt: z.date().optional(),
});
export default mongoose.model<IFeatures>("Features", featureSchema);
