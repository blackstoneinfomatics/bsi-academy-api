import { IEmpwages, IEmpwagesCreate } from "../../types/models.types";
import  EmpWagesModel from "../models/empwages"
import usershiftschedule from "../models/usershiftschedule";

/**
 * Creates a new user.
 *
 * @param {IEmpwagesCreate} payload - The data of the user to be created.
 */


export const createEmpWages = async (  payload: IEmpwagesCreate
): Promise<IEmpwages | { error: any }> => {

     const newWages = new EmpWagesModel(payload);
     // Convert file to string (Base64 encoding)
      const savedUser = await newWages.save();   
      return savedUser;
};

export const getEmpWagesById = async (id: string) => {
  // Step 1: Get wage records for the employee
  const wageRecords = await EmpWagesModel.find({ employeeId: id }).lean();
  if (!wageRecords || wageRecords.length === 0) return null;

  // Step 2: Get shift schedule to get work hours per day
  const shift = await usershiftschedule.findOne({ employeeId: id }).lean();
  const workhrs = shift ? Number(shift.workhrs || 0) : 0;

  // Step 3: Get rate from the first record's classType
  const rate = Number(wageRecords[0]?.classType?.rate || 0);

  // Step 4: Calculate totals
  let totalhours = 0;
  const monthlyMap = new Map<string, { year: number; month: number; totalhours: number }>();

  wageRecords.forEach((record) => {
    const date = new Date(record.createdDate || record.updatedDate || new Date());
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month}`;

    totalhours += workhrs;

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        year,
        month,
        totalhours: workhrs,
      });
    } else {
      monthlyMap.get(key)!.totalhours += workhrs;
    }
  });

  const totalearnings = totalhours * rate;

  // Step 5: Return full structure
  return {
    employeeId: id,
    totalhours,
    totalearnings,
    monthlyData: Array.from(monthlyMap.values()),
    wageRecords, // full list of wage records
  };
};

export const updateEmpWageLogic = async (
  id: string,
  payload: { rate?: number | string; hoursMins?: string }
) => {
  const record = await EmpWagesModel.findById(id);
  if (!record) return null;

  const classType = record.classType?.className;

  // Update rate (allowed for all)
  if (payload.rate !== undefined) {
    record.classType.rate = String(payload.rate);
  }

  // Duration logic
  if (payload.hoursMins !== undefined) {
    if (classType === "TRAILCLASS") {
      // Duration must remain fixed
      throw new Error("TRAILCLASS duration is fixed and cannot be updated.");
    }

    if (classType === "REGULARCLASS" || classType === "GROUPCLASS") {
      const validDurations = ["30 min", "60 min"];
      if (validDurations.includes(payload.hoursMins)) {
        record.classType.hoursMins = payload.hoursMins;
      } else {
        throw new Error("Duration must be '30 min' or '60 min' for REGULARCLASS and GROUPCLASS.");
      }
    }
  }

  await record.save();
  return record;
};





