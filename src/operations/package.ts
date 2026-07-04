import { isNil } from "lodash";
import { GetAllRecordsParams } from "../shared/enum";
import AppLogger from "../helpers/logging";
import { IPackage } from "../../types/models.types";
import _package from "../models/package";


export const createPackageService = async (
  payload: Partial<IPackage>
): Promise<{ totalCount: number; package: IPackage } | { error: any }> => {
  try {
    const result = new _package({
      packageName: payload.packageName || "",
      costPerHour: payload.costPerHour || "",
      categories: payload.categories || {},
      descriptionPoint: payload.descriptionPoint || "",
      status: payload.status || "ACTIVE",
      createdDate: new Date(),
      createdBy: payload.createdBy || "System",
      updatedDate: new Date(),
      updatedBy: payload.updatedBy || "System",
    });

    const packageRecord = await result.save();
    const totalCount = await _package.countDocuments();

    return { totalCount, package: packageRecord.toObject() };
  } catch (error) {
    console.error("Error creating package:", error);
    return { error };
  }
};


export const updatePackageService = async (
    packageId: string,  // _id as packageId
    payload: Partial<IPackage>
  ): Promise<{ updatedPackage: IPackage } | { error: any }> => {
    try {
      // Find the package by the _id (packageId)
      const existingPackage = await _package.findById(packageId);
  
      if (!existingPackage) {
        return { error: "Package not found" };
      }
  
      // Merge arrays without duplicates
      const mergeArray = (oldArr: any[] = [], newArr: any[] = []) => {
        if (!Array.isArray(oldArr)) oldArr = [];
        if (!Array.isArray(newArr)) newArr = [];
        return [...new Set([...oldArr, ...newArr])];
      };
  
      // Safely extract existing categories from a Mongoose Map or plain object
      const existingCategories: Record<string, string[]> = {};
      if (existingPackage.categories instanceof Map) {
        existingPackage.categories.forEach((value: any, key: string) => {
          existingCategories[key] = Array.isArray(value) ? value : [];
        });
      } else {
        Object.assign(existingCategories, existingPackage.categories || {});
      }
  
      const incomingCategories = payload.categories || {};
  
      // Merge categories dynamically
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
  
      // Build updated payload
      const updatedData: Partial<IPackage> = {
        costPerHour: payload.costPerHour || existingPackage.costPerHour,
        categories: mergedCategories,
        descriptionPoint: payload.descriptionPoint || existingPackage.descriptionPoint,
        status: payload.status || existingPackage.status,
        updatedDate: new Date(),
        updatedBy: payload.updatedBy || "System",
      };
  
      // Update the package
      const updatedPackage = await _package.findByIdAndUpdate(packageId, updatedData, {
        new: true,
      });
  
      if (!updatedPackage) {
        return { error: "Package not found after update" };
      }
  
      return { updatedPackage: updatedPackage.toObject() };
    } catch (error) {
      console.error("Error updating package:", error);
      return { error };
    }
  };
  


export const getAllCreatePackage = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; packages: IPackage[] }> => {
  const {  sortBy, sortOrder } = params;

  const query: any = {};


  const sortOptions: any = sortBy ? { [sortBy]: sortOrder === "asc" ? 1 : -1 } : { createdDate: -1 };

  const Query = _package.find(query).sort(sortOptions);



  const [packages, totalCount] = await Promise.all([
    Query.exec(),
    _package.countDocuments(query),
  ]);

  return { totalCount, packages };
};









