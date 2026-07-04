import { Types } from "mongoose";
import UserModel from "../models/users";
import { IUser } from "../../types/models.types";
import { appStatus } from "../config/messages";
import ShiftSchedule from "../models/usershiftschedule";
import MeetingSchedule from "../models/calendar";
import moment from "moment";
import teacherAvaliableSlots from "../models/teacheravaliableslots"


/**
 * Updates a user's password by their ID.
 *
 * @param {string} id - The Object ID of the user document.
 * @param {string} newPassword - The new password to set.
 * @returns {Promise<Omit<IUser, 'password'> | null>} - A promise that resolves to the updated user document without the password, or null if not found.
 */
export const updateUserPassword = async (id: string, newPassword: string): Promise<Omit<IUser, 'password'> | null> => {
  return UserModel.findByIdAndUpdate(
    {
      '_id': new Types.ObjectId(id),
      status: appStatus.ACTIVE
    },
    { $set: { password: newPassword } },
    { new: true, projection: { password: 0 } }
  ).lean();
};

export const getAcademicAvaialableTimeList = async (
  scheduleDate: string
)=>{
  const academicCoachList = await UserModel.find({ 'role': 'ACADEMICCOACH' }).exec();
   for(const availableTime of academicCoachList){
const shiftTimeList = await ShiftSchedule.find({
  role: availableTime.role[0],
  startdate: { $lte: scheduleDate },
  enddate: { $gte: scheduleDate }
}).exec();

const result = [];
for(const shiftTime of shiftTimeList){
       const fromTime = moment(`${scheduleDate}T${shiftTime.fromtime}`, 'YYYY-MM-DDTHH:mm');
      const toTime = moment(`${scheduleDate}T${shiftTime.totime}`, 'YYYY-MM-DDTHH:mm');

      const allSlots: { start: moment.Moment, end: moment.Moment }[] = [];
      let slotStart = fromTime.clone();

      // Generate all 30-minute slots within the shift
      while (slotStart < toTime) {
        const slotEnd = slotStart.clone().add(30, 'minutes');
        if (slotEnd <= toTime) {
          allSlots.push({ start: slotStart.clone(), end: slotEnd.clone() });
        }
        slotStart.add(30, 'minutes');
      }

      // Find all meetings scheduled on that day for this coach
      const startOfDayIST = `${scheduleDate}T00:00:00.000+00:00`;
      const endOfDayIST = `${scheduleDate}T23:59:59.999+00:00`;

      const meetingList = await MeetingSchedule.find({
        'academicCoach.academicCoachId': shiftTime.academicCoachId,
        scheduledStartDate: {
          $gte: startOfDayIST,
          $lte: endOfDayIST
        }
      }).exec();
     // Map meetings to occupied time ranges
      const occupied = meetingList.map(m => ({
         
        start: moment(`${scheduleDate}T${m.scheduledFrom}`, 'YYYY-MM-DDTHH:mm'),
        end: moment(`${scheduleDate}T${m.scheduledTo}`, 'YYYY-MM-DDTHH:mm')
     
      }));
      // Filter out slots that overlap with any meeting
      const availableSlots = allSlots.filter(slot => {
        return !occupied.some(meeting =>
          slot.start < meeting.end && slot.end > meeting.start
        );
      });
      // Store results per coach
      result.push({
        academicCoachId: shiftTime.academicCoachId,
        availableSlots: availableSlots.map(slot => ({
          start: slot.start.format('HH:mm'),
          end: slot.end.format('HH:mm')
        }))
      });
    
}
 return result;
 }

};


export const teacherAvailableTimeList = async (
  scheduleDate: string,
  position: string
) => {
  const getAvailableTimeSlots = await teacherAvaliableSlots.find({
    date: scheduleDate,
    isStatus: true
  }).exec();

  const teacherAvailableTime: any[] = [];

  for (const availableTime of getAvailableTimeSlots) {
    const user = await UserModel.findOne({
      userId: availableTime.teacherId,
      position: position
    }).exec();

    if (user) {
      teacherAvailableTime.push({
        fromTime: availableTime.from,
        toTime: availableTime.to,
        name: availableTime.name,
        teacherId: user.userId,
        isStatus: true
      });
    }
  }
  return teacherAvailableTime;
};
