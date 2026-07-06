import moment from "moment";
import { IUsershiftschedule } from "../../types/models.types";
import usershiftschedule from "../models/usershiftschedule";
import { GetAlluserRecordsParams } from "../shared/enum";
import { UpdateQuery } from "mongoose";

export const getAllTeachers = async (
  params: GetAlluserRecordsParams
): Promise<{ users: IUsershiftschedule[]; totalCount: number }> => {
  const { role, date } = params;

  // Construct the query object
  const query: any = {};

  // Add role filter if provided
  if (role) {
    query.role = role;
  }

  // Add filter for a date falling within the startdate and enddate range
  if (date) {
    query.startdate = { $lte: new Date(date) }; // Start date is on or before the selected date
    query.enddate = { $gte: new Date(date) };  // End date is on or after the selected date
  }

  console.log("Query Filters: ", query);

  // Fetch all users matching the query
  const users = await usershiftschedule.find(query).exec();

  // Ensure the result matches the expected type
  const usersFormatted: IUsershiftschedule[] = users.map((user) => ({
    ...user.toObject(),
  })) as unknown as IUsershiftschedule[];

  // Get the total count of users matching the query
  const totalCount = await usershiftschedule.countDocuments(query);

  return { users: usersFormatted, totalCount }; // Return both users and totalCount
};


interface ShiftScheduleQuery {
  teacherId?: string;
  academicCoachId?: string;
  supervisorId?: string;
  employeeId?: string;
}

export const getDayWiseShiftSchedule = async (
  query: ShiftScheduleQuery
): Promise<any[] | null> => {
  // Dynamically build the filter object
  const filter: any = {};

  if (query.teacherId) filter.teacherId = query.teacherId;
  else if (query.academicCoachId) filter.academicCoachId = query.academicCoachId;
  else if (query.supervisorId) filter.supervisorId = query.supervisorId;
  else if (query.employeeId) filter.employeeId = query.employeeId;

  const schedule = await usershiftschedule.findOne(filter).lean();

  if (!schedule) {
    return null;
  }

  const dayWiseSchedule = [];

  const startDate = new Date(schedule.startdate);
  const endDate = new Date(schedule.enddate);
  const fromTime = schedule.fromtime;
  const toTime = schedule.totime;

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const date = new Date(d);
    dayWiseSchedule.push({
      date: moment(date).format("YYYY-MM-DD"),
      day: moment(date).format("dddd"),
      fromTime,
      toTime,
    });
  }

  return dayWiseSchedule;
};


export const updateShiftScheduleService = async (employeeId: any, data: UpdateQuery<IUsershiftschedule> | undefined) => {
  const record = await usershiftschedule.findOneAndUpdate(
    { employeeId: employeeId },
    {
      ...data,
      lastUpdatedDate: new Date(),
    },
    { new: true }
  );

  if (!record) {
    throw new Error(`Shift schedule not found for employeeId: ${employeeId}`);
  }

  return record;
};



