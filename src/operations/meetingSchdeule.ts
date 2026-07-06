import { isNil } from "lodash";
import { IMeetingSchedule } from "../../types/models.types";
import { commonMessages, meetingSchedulesMessages } from "../config/messages";
import { GetAllRecordsParams } from "../shared/enum";
import AppLogger from "../helpers/logging";
import MeetingSchedules from "../models/calendar";
import { Types } from "mongoose";
import SuprvisorMeeting from "../models/addmeeting";
import AdminMeeting from "../models/adminmeeting";

export const getAllAcademicCoach = async (
  params: GetAllRecordsParams
): Promise<{
  totalCount: number;
  academicCoach: IMeetingSchedule[];
  meetingList: any[];
  adminMeetingList: any[];
}> => {
  const { sortBy, sortOrder, offset, limit } = params;

  const query = {
    "academicCoach.academicCoachId": { $exists: true, $ne: null },
  };

  const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const queryBuilder = MeetingSchedules.find({
    "academicCoach.academicCoachId": params.academicCoachId,
  });

  if (!isNil(offset) && !isNil(limit)) {
    const page = Math.max(1, Number(offset));
    const size = Number(limit) || Number(commonMessages.LIMIT);
    queryBuilder.skip((page - 1) * size).limit(size);
  }

  const [academicCoach, totalCount] = await Promise.all([
    queryBuilder.exec(),
    MeetingSchedules.countDocuments(query),
  ]);

  const meetingList = await SuprvisorMeeting.find({
    "organizer.organizerId": params.academicCoachId,
  }).lean();

  const adminMeetingList = await AdminMeeting.find({
    "teacher.teacherId": params.academicCoachId,
  }).lean();

  AppLogger.info(meetingSchedulesMessages.GET_ALL_LIST_SUCCESS, { totalCount });

  return { totalCount, academicCoach, meetingList, adminMeetingList };
};

export const getAcademicCoachId = async (
  id: string
): Promise<IMeetingSchedule | null> => {
  console.log(">>>>>", id);
  return MeetingSchedules.findOne({
    _id: new Types.ObjectId(id),
  }).lean() as unknown as IMeetingSchedule | null;
};

export const getAllMeetings = async () => {
  return await MeetingSchedules.find();
};
