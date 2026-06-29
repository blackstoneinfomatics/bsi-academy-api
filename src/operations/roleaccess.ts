import { Types } from "mongoose";
import { IAccessModel } from "../../types/models.types";
import roleacces from "../models/roleacces";




export const updateUserAccess = async (
  payload: Partial<IAccessModel>
): Promise<{ totalCount: number; assignments: IAccessModel[] } | { error: any }> => {
  try {
    // Check if a record already exists for the given employeeId
    let roleAccess = await roleacces.findOne({ employeeId: payload.employeeId });

    if (roleAccess) {
      // If the record exists, update it
      roleAccess = await roleacces.findOneAndUpdate(
        { employeeId: payload.employeeId },  // Match by employeeId
        payload,  // Update with the new data
        { new: true }  // Return the updated document
      );

      if (!roleAccess) {
        throw new Error('Failed to update role access');
      }
    } else {
      // If the record doesn't exist, create a new one
      roleAccess = new roleacces(payload);
      await roleAccess.save();
    }

    // Get the total count of documents
    const totalCount = await roleacces.countDocuments();

    return {
      totalCount,
      assignments: [roleAccess]  // Return the updated or newly created roleAccess record
    };

  } catch (error) {
    console.error("Error saving role access:", error);
    return { error };
  }
};





/**
 * Retrieves all meeting records with optional filters.
 */
interface FilterOptions {
  employeeName?: string;
  designation?: string;
  fromDate?: string;
  toDate?: string;
}

export default async function getallsettinglist(filters: FilterOptions) {
  const query: any = {};

  if (filters.employeeName) {
    query.employeeName = { $regex: filters.employeeName, $options: 'i' }; // Case-insensitive
  }

  if (filters.designation) {
    query.designation = filters.designation; // or use $in if multiple possible
  }

  if (filters.fromDate && filters.toDate) {
    query.dateOfJoining = {
      $gte: new Date(filters.fromDate),
      $lte: new Date(filters.toDate),
    };
  }

  const result = await roleacces.find(query);
  return result;
}


export const getrolesettingById = async (employeeId: string) => {
  try {
    const settings = await roleacces.findOne({employeeId }).lean();
    return { settings };
  } catch (error) {
    throw new Error(`Failed to fetch role access: ${(error as Error).message}`);
  }
};

