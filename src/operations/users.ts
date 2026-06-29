import { Types } from "mongoose";
import UserModel from "../models/users";
import { IUser, IUserCreate } from "../../types/models.types";
import { appStatus } from "../config/messages";
import {  isNil } from "lodash";
import { GetAllRecordsParams, GetAlluserRecordsParams } from "../shared/enum";
import RecruitmentModel from "../models/recruitment";
/**
 * Retrieves all user records for a given tenant, with support for search, pagination, sorting, role filtering, and excluding passwords.
 *
 * @param {GetAllRecordsParams} params - The parameters for fetching user records, including role filtering.
 *
 * @returns {Promise<{ users: IUser[]; totalCount: number }>} - A promise that resolves to an object containing:
 *  - `users`: An array of user records for the given tenant, with passwords excluded.
 *  - `totalCount`: The total number of user records matching the query.
 */

export const getAllUserRecords = async (
  params: GetAlluserRecordsParams
): Promise<{ users: IUser[]; totalCount: number }> => {
  const { role } = params;

  const query: any = {};
  if (role) query.role = role;

  // Fetch all users matching the query
  const users = await UserModel.find(query).exec();
  const totalCount = await UserModel.countDocuments(query);
  return { users, totalCount };
};


/**
 * Retrieves a user record by its ID, optionally filtered by role, excluding the password.
 *
 * @param {string} id - The Object ID of the user document.
 * @param {string} [role] - The role of the user to filter (optional).
 * @returns {Promise<IUser | null>} - A promise that resolves to the user record or null if not found.
 */
export const getUserRecordById = async (
  id: string,
  role?: string
): Promise<any> => {
  const query: any = { userId: new Types.ObjectId(id) };
  if (!isNil(role)) query.role = role;

  const user = await UserModel.findOne(query).select("-password").lean();
  if (!user) return null;

  // user.userId is the _id of the recruitment table
  const recruitment = await RecruitmentModel.findById(user.userId).lean();

  return {
    ...user,
    contact: recruitment?.candidatePhoneNumber || null,
    city: recruitment?.candidateCity || null,
    country: recruitment?.candidateCountry || null,
  };
};


/**
 * Fetches an active user record from the database based on the provided query, optionally filtered by role.
 *
 * @param {Partial<{ id: string; userName: string; tenantId: string; role: string }>} query - The query object used to match the user record. At least one of 'id' or 'userName' must be provided.
 * @returns {Promise<IUser | null>} - Returns a promise that resolves to the matched user record or null if no match is found.
 */
export const getActiveUserRecord = async (
  query: Partial<{ id: string; userName: string; tenantId: string; role: string }>
): Promise<IUser | null> => {
  const { id, userName, tenantId, role } = query;

  const dbQuery: any = {
    status: appStatus.ACTIVE,
  };

  if (!isNil(id)) dbQuery._id = new Types.ObjectId(id);
  if (!isNil(userName)) dbQuery.userName = userName;
  if (!isNil(tenantId)) dbQuery.tenantId = tenantId;
  if (!isNil(role)) dbQuery.role = role;

  return UserModel.findOne(dbQuery).lean();
};

/**
 * Creates a new user.
 *
 * @param {IUserCreate} payload - The data of the user to be created.
 * @returns {Promise<Omit<IUser, 'password'>>} - A promise that resolves to the created user document.
 */

export const createUser = async (
  payload: IUserCreate
): Promise<Omit<IUser, "password">> => {
  // Create a new instance of the UserModel with the provided data
  const newUser = new UserModel(payload);

  // Save the new user to the database
  const savedUser = await newUser.save();

  // Convert the savedUser to a plain object and omit the password
  const userObject = savedUser.toObject() as Omit<IUser, "password"> & {
    password?: string;
  };
  if (userObject.password) delete userObject.password;

  return userObject as Omit<IUser, "password">;
};
/**
 * Updates a user by their ID.
 *
 * @param {string} id - The Object ID of the user document.
 * @param {Partial<Omit<IUser, 'password'>>} payload - The data to update.
 * @param {string} [role] - The role of the user to filter (optional).
 * @returns {Promise<Omit<IUser, 'password'> | null>} - A promise that resolves to the updated user document without the password, or null if not found.
 */
export const updateUser = async (
  id: string,
  payload: Partial<Omit<IUser, "password">>,
  role?: string
): Promise<Omit<IUser, "password"> | null> => {
  const query: any = { _id: new Types.ObjectId(id) };
  if (!isNil(role)) query.role = role;

  return UserModel.findOneAndUpdate(
    query,
    { $set: payload },
    { new: true }
  )
    .select("-password")
    .lean();
};

/**
 * Delete a user by their ID, optionally filtered by role.
 *
 * @param {string} id - The Object ID of the user document.
 * @param {string} [role] - The role of the user to filter (optional).
 * @returns {Promise<{ acknowledged: boolean, deletedCount: number }>} - Promise resolving to the result of the delete operation.
 */
export const deleteUserById = async (
  id: string,
  role?: string
): Promise<{ acknowledged: boolean; deletedCount: number }> => {
  const query: any = { _id: new Types.ObjectId(id) };
  if (!isNil(role)) query.role = role;

  return UserModel.deleteOne(query).exec();
};

/**
 * Bulk delete users by their IDs and optionally filter by role.
 *
 * @param {string[]} ids - Array of user IDs to delete.
 * @param {string} [role] - The role of the users to filter (optional).
 * @returns {Promise<(Omit<IUser, 'password'> | null)[]>} - Promise resolving to the array of updated users without password.
 */
export const bulkDeleteUsers = async (
  ids: string[],
  role?: string
): Promise<(Omit<IUser, "password"> | null)[]> => {
  const bulkOps = ids.map((id) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(id), ...(role ? { role } : {}) },
      update: { $set: { status: appStatus.DELETED } },
    },
  }));

  await UserModel.bulkWrite(bulkOps);

  const updatedUsers = await UserModel.find({
    _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    ...(role ? { role } : {}),
  })
    .select("-password")
    .lean()
    .exec();

  return updatedUsers as (Omit<IUser, "password"> | null)[];
};

export const getTeacherCardCount = async () => {
  const teacherCount = await UserModel.aggregate([
    {
      $match: {
        role: "TEACHER",
      },
    },
    {
      $group: {
        _id: null,
        teacherTotalCount: { $sum: 1 },
        activeTeacher: {
          $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
        },
        inActiveTeacher: {
          $sum: { $cond: [{ $eq: ["$status", "InActive"] }, 1, 0] },
        },
        leaveOnTeacher: {
          $sum: { $cond: [{ $eq: ["$status", "HOLD"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        teacherTotalCount: 1,
        activeTeacher: 1,
        inActiveTeacher: 1,
        leaveOnTeacher: 1,
        overallCount: {
          $add: [
            "$teacherTotalCount",
            "$activeTeacher",
            "$inActiveTeacher",
            "$leaveOnTeacher",
          ],
        },
      },
    },
  ]);

  return teacherCount[0] || {
    teacherTotalCount: 0,
    activeTeacher: 0,
    inActiveTeacher: 0,
    leaveOnTeacher: 0,
    overallCount: 0,
  };
};


export const getTeacherGenderCountDetails = async () => {
  const teacherCount = await UserModel.aggregate([
    {
      $match: {
        role: { $in: ["TEACHER"] }, // fix: match against array
      },
    },
    {
      $group: {
        _id: null,
        teacherTotalCount: { $sum: 1 },
        maleTeacher: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: "$gender" }, "male"] }, 1, 0],
          },
        },
        femaleTeacher: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: "$gender" }, "female"] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (!teacherCount || teacherCount.length === 0) {
    return {
      teacherPercentage: 0,
      teacherMalePercentage: "0.00",
      teacherFemalePercentage: "0.00",
    };
  }

  const count = teacherCount[0];
  const total = count.teacherTotalCount || 0;
  const male = count.maleTeacher || 0;
  const female = count.femaleTeacher || 0;

  const teacherMalePercentage =
    total > 0 ? ((male / total) * 100).toFixed(2) : "0.00";
  const teacherFemalePercentage =
    total > 0 ? ((female / total) * 100).toFixed(2) : "0.00";

  return {
    teacherPercentage: total,
    teacherMalePercentage,
    teacherFemalePercentage,
  };
};


export const getOtherEmployeesDetails = async (): Promise<{ users: IUser[]; totalCount: number }> => {
  const users = await UserModel.find({
    role: { $ne: "TEACHER" },
  }).exec();

  const totalCount = users.length;

  return { users, totalCount };
};

export const getOtherEmpCardCount = async() =>{

  const otherempCount = await UserModel.aggregate([
    {
      $match: {
        status: "Active", // Optional filter
        role: { $ne: "TEACHER" },
      },
    },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 }, // Optional: sort descending
    },
  ]);
  
  const totalOtherEmpCount = await UserModel.countDocuments({
     status: "Active", // Optional filter
     role: { $ne: "TEACHER" },
  }).exec();
  
  const results: any[] = [];
  
  for (const otherempDetails of otherempCount) {
    let studentCountryPercentage = ((otherempDetails.count / totalOtherEmpCount) * 100).toFixed(2);
    results.push({
      country: otherempDetails._id,
      count: otherempDetails.count,
      percentage: parseFloat(studentCountryPercentage),
    });
  }
  
  
  return { totalOtherEmpCount, otherEmpCount: results };

};

export const getOtherEmpGender = async() => {
  const otherEmpCount= await UserModel.aggregate([
    {
      $match: {
        role: { $ne: "TEACHER" },
      },
    },
    {
      $group: {
        _id: null,
        otherEmpTotalCount: { $sum: 1 },
        maleEmployee: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
        femaleEmployee: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } },
      },
    },
    {
      $sort: { count: -1 }, // Optional: sort descending
    },
  ]);
  const employeePercentage = otherEmpCount[0].otherEmpTotalCount;
  const employeeMalePercentage = ((otherEmpCount[0].maleEmployee/ otherEmpCount[0].otherEmpTotalCount)*100).toFixed(2);
  const employeeFemalePercentage = ((otherEmpCount[0].femaleEmployee/ otherEmpCount[0].otherEmpTotalCount)*100).toFixed(2);
  
  return {employeePercentage, employeeMalePercentage, employeeFemalePercentage};

}