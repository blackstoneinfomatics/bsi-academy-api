import dayjs from 'dayjs';
import { generateSlotsFromUserSchedule, getAllSlots } from '../handler/teacherSlotHander';
import { getRedisClient } from '../../shared/redisClient';
import teacheravaliableslots from '../../models/teacheravaliableslots'; // your mongoose model
import ShiftSchedule from '../../models/usershiftschedule'
const redis = getRedisClient();
const REDIS_KEY = "teacher_time_slots";

export async function cleanupOldDates(daysBack = 7) {
  try {
    const data = await getAllSlots();
    const today = dayjs().startOf("day");

    let removedDates: string[] = [];


    for (const dateKey of Object.keys(data)) {
      console.log("data>>",data);
      const date = dayjs(dateKey);
      if (date.isBefore(today.subtract(daysBack, "day"))) {
        delete data[dateKey];
        removedDates.push(dateKey);
  
      }
    }

    await redis.set(REDIS_KEY, JSON.stringify(data));

    const deleted = await teacheravaliableslots.deleteMany({
      date: { $in: removedDates },
    });

    console.log(`🗑️ Removed slots for dates older than ${daysBack} days`);
    console.log(`📦 Redis keys cleared: ${removedDates.length}`);
    console.log(`🗃️ MongoDB documents deleted: ${deleted.deletedCount}`);
  } catch (err) {
    console.error("❌ Error cleaning old dates:", err);
  }
}

interface UserSchedule {
  teacherId: string;
  name: string;
  position: string;
  startdate: string | Date;
  enddate: string | Date;
  fromtime: string;
  totime: string;
}

export async function addAditionalSlots() {
  try {
    const getTeacherData = await ShiftSchedule.find({
      role: "TEACHER",
    }).exec();
   console.log("getTeacherData>>>", getTeacherData);
    for (const teacher of getTeacherData) {

      // Convert endDate to Date object
      const endDate = new Date(teacher.enddate);

      // Add 7 days
      const newEndDate = new Date(endDate);
      newEndDate.setDate(endDate.getDate() + 7);
      console.log("newEndDate>>>", newEndDate);

        const teacherDetails: UserSchedule = {
        teacherId: teacher.teacherId,
        name: teacher.name,
        position: teacher.position,
        startdate: teacher.startdate,
        enddate: newEndDate,
        fromtime: teacher.fromtime,
        totime: teacher.totime,
      };
      console.log("teacherDetails>>>", teacherDetails);

    // Now call your slot generator with the mapped data
    generateSlotsFromUserSchedule(teacherDetails);

   await ShiftSchedule.findOneAndUpdate(
  { teacherId: teacherDetails.teacherId }, // filter
  { $set: { enddate: newEndDate } },       // update
  { new: true }                            // return updated doc
).exec();

    }

  } catch (error) {
    console.error("Error adding slots:", error);
    throw error;
  }
}
