import { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import _package, { zodPackageSchema } from "../../models/package";
import { createPackageService, getAllCreatePackage, updatePackageService } from "../../operations/package";
import { IPackage } from "../../../types/models.types";


const createInputValidation = z.object({
  payload: zodPackageSchema.pick({
    packageName: true,
    costPerHour: true,
    categories: true,
    descriptionPoint: true,
    status: true,
    createdDate: true,
    createdBy: true,
    updatedBy: true,
    updatedDate: true,
  }),
});

const getPackageInputValidation = z.object({
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
  async createPackage(req: Request, h: ResponseToolkit) {
    const { payload } = createInputValidation.parse({
      payload: req.payload,
    });
  
    const newPackage = await createPackageService({
      packageName: payload.packageName || "",
      costPerHour: payload.costPerHour || "",
      categories: payload.categories || {}, // expecting { [category]: string[] }
      descriptionPoint: payload.descriptionPoint || "",
      status: payload.status || "ACTIVE",
      createdDate: new Date(),
      createdBy: payload.createdBy || "System",
      updatedDate: new Date(),
      updatedBy: payload.updatedBy || "System",
    });
  
    return h.response({
      message: "Package created successfully",
      data: newPackage,
    }).code(201);
  }
  ,

     

  async updatePackageHandler(req: Request, h: ResponseToolkit) {
    try {
      const { packageId } = req.params;
      const payload = req.payload as Partial<IPackage>;
  
      if (!packageId) {
        return h.response({ error: "Package ID is required" }).code(400);
      }
  
      const existingPackage = await _package.findById(packageId);
  
      if (!existingPackage) {
        return h.response({ error: "Package not found" }).code(404);
      }
  
      // Merge arrays without duplicates
      const mergeArray = (oldArr: any[] = [], newArr: any[] = []) => {
        if (!Array.isArray(oldArr)) oldArr = [];
        if (!Array.isArray(newArr)) newArr = [];
        return [...new Set([...oldArr, ...newArr])];
      };
  
      // Safely convert existing categories from Map to plain object
      const existingCategories: Record<string, string[]> = {};
      if (existingPackage.categories instanceof Map) {
        existingPackage.categories.forEach((value: any, key: string) => {
          existingCategories[key] = Array.isArray(value) ? value : [];
        });
      } else {
        Object.assign(existingCategories, existingPackage.categories || {});
      }
  
      const incomingCategories = payload.categories || {};
  
      const mergedCategories: Record<string, string[]> = {};
      const allKeys = new Set([
        ...Object.keys(existingCategories),
        ...Object.keys(incomingCategories),
      ]);
  
      for (const key of allKeys) {
        mergedCategories[key] = mergeArray(
          existingCategories[key],
          incomingCategories[key]
        );
      }
  
      const updatedData: Partial<IPackage> = {
        costPerHour: payload.costPerHour || existingPackage.costPerHour,
        categories: mergedCategories,
        descriptionPoint: payload.descriptionPoint || existingPackage.descriptionPoint,
        status: payload.status || existingPackage.status,
        updatedDate: new Date(),
        updatedBy: payload.updatedBy || "System",
      };
  
      const updatedPackage = await _package.findByIdAndUpdate(packageId, updatedData, {
        new: true,
      });
  
      if (!updatedPackage) {
        return h.response({ error: "Package not found after update" }).code(404);
      }
  
      return h.response({ updatedPackage: updatedPackage.toObject() }).code(200);
    } catch (error) {
      console.error("Error updating package:", error);
      return h.response({ error: "Failed to update package" }).code(500);
    }
  }
  
      
 ,


  getAllCreatePackage(req: Request, h: ResponseToolkit) {
     const { query } = getPackageInputValidation.parse({
       query: {
         ...req.query,
         filterValues: req.query?.filterValues ? JSON.parse(String(req.query.filterValues)) : {},
       },
     });
     return getAllCreatePackage(query);
   },

}