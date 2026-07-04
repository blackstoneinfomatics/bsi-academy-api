import { getRedisClient } from "../../shared/redisClient";
import { TeacherTimeSlots } from "../../../types/models.types";
import teacheravaliableslots from "../../models/teacheravaliableslots";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";


const redis = getRedisClient();
const REDIS_KEY = "teacher_time_slots";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

interface UserSchedule {
  teacherId: string;
  name : string;
  position: string;
  startdate: string | Date;
  enddate: string | Date;
  fromtime: string;
  totime: string;
}

type TimeSlot = { from: string; to: string };
type WeeklySlotMap = {
  [day: string]: TimeSlot[];
};

export async function getAllSlots() {
  try {
    const raw = await redis.get(REDIS_KEY);
    const data = JSON.parse(raw ?? '{}');
    return data;
  } catch (err) {
    console.error("❌ Error in getAllSlots:", err);
    return {};
  }
}

export async function generateSlotsFromUserSchedule(schedule: UserSchedule) {
  try {
    const { teacherId, name, position, startdate, enddate, fromtime, totime } = schedule;

    console.log("🟡 Starting slot generation for:", {
      teacherId,
      name,
      position,
      startdate,
      enddate,
      fromtime,
      totime,
    });

    const start = dayjs(startdate).startOf("day");
    const end = dayjs(enddate).startOf("day");
    const startTimeFormat = "HH:mm";
    const mongoDocs: any[] = [];
    const redisData = await getAllSlots();

    for (
      let currentDate = start.clone();
      currentDate.isSameOrBefore(end);
      currentDate = currentDate.add(1, "day")
    ) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      console.log(`📆 Generating for date: ${dateStr}`);

      let time = dayjs(`${dateStr} ${fromtime}`, `YYYY-MM-DD ${startTimeFormat}`);
      const endTime = dayjs(`${dateStr} ${totime}`, `YYYY-MM-DD ${startTimeFormat}`);

      if (!time.isValid() || !endTime.isValid()) {
        console.warn(`⚠️ Invalid time parsing for ${dateStr}`);
        continue;
      }

      if (time.isAfter(endTime)) {
        console.warn(`⚠️ Skipping invalid time range on ${dateStr}`);
        continue;
      }

      while (time.isBefore(endTime)) {
        const from = time.format("HH:mm");
        const to = time.add(30, "minute").format("HH:mm");
        const isNew = addSlots(redisData, dateStr, teacherId, name, position, from, to, true);
        if (isNew) {
       mongoDocs.push({
       date: dateStr,
       teacherId,
       name,
       position,
       from,
       to,
       isStatus: true,
     });
      }
        time = time.add(30, "minute");
      }
    }

      await redis.set(REDIS_KEY, JSON.stringify(redisData));
      await teacheravaliableslots.insertMany(mongoDocs);
    console.log("✅ All slots generated and stored in Redis");
  } catch (err) {
    console.error("❌ Error in generateSlotsFromUserSchedule:", err);
  }
}

export function addSlots(
  redisData: Record<string, any>,
  date: string,
  teacherId: string,
  name: string,
  position:string,
  from: string,
  to: string,
  isStatus: boolean
): boolean {
  try {
    redisData[date] ??= {};
    redisData[date][teacherId] ??= [];

    const exists = redisData[date][teacherId].some(
      (slot: TeacherTimeSlots) => slot.from === from && slot.to === to
    );

    if (exists) {
      console.log(`⚠️ Slot already exists: ${date} ${teacherId} ${from}-${to}`);
      return false;
    }

    redisData[date][teacherId].push({ name , position ,from, to, isStatus });
    return true;
  } catch (err) {
    console.error("❌ Error in addSlotsInMemory:", err);
    return false;
  }
}


export async function bookSlot(date: string, teacherId: string, from: string, to: string, isStatus: boolean) {
  try {
    const data = await getAllSlots();
    if (!data[date]?.[teacherId]) {
      console.warn("⚠️ Slot not found in Redis for booking");
      return;
    }

    data[date][teacherId] = data[date][teacherId].map(
      (slot: TeacherTimeSlots) =>
        slot.from === from && slot.to === to ? { ...slot, isStatus , name : slot.name } : slot
    );

    await redis.set(REDIS_KEY, JSON.stringify(data));
    await teacheravaliableslots.findOneAndUpdate(
      { date, teacherId, from, to },
      { $set: { isStatus } }
    );

    console.log("✅ Slot updated in Redis + MongoDB");
  } catch (err) {
    console.error("❌ Error in bookSlot:", err);
  }
}
 export async function getUniqueTeacherList(startDate: string, position : string , WeeklySlots: WeeklySlotMap) {
  const start = dayjs(startDate).startOf("day");
  const end = start.add(27, "day");
  const redisData = await getAllSlots();

  const teacherSlotTracker: Record<string, number> = {};
  const teacherNameMap: Record<string, string> = {};
  let totalRequiredSlots = 0;

  for (
    let current = start.clone();
    current.isSameOrBefore(end);
    current = current.add(1, "day")
  ) {
    const dateStr = current.format("YYYY-MM-DD");
    const dayName = current.format("dddd");

    const daySlots = WeeklySlots[dayName];
    if (!daySlots || !redisData[dateStr]) continue;

    for (const { from, to } of daySlots) {
      totalRequiredSlots++; 

      for (const teacherId in redisData[dateStr]) {
        const slots = redisData[dateStr][teacherId];
        const slot = slots.find(
          (slot: any) => slot.from === from && slot.to === to && slot.isStatus === true && slot.position == position
        );

        if (slot) {
          teacherSlotTracker[teacherId] = (teacherSlotTracker[teacherId] || 0) + 1;
          teacherNameMap[teacherId] = slot.name ?? "Unknown";
        }
      }
    }
  }
  const fullyAvailableTeachers = Object.entries(teacherSlotTracker)
    .filter(([_, count]) => count === totalRequiredSlots)
    .map(([teacherId]) => ({
      teacherId,
      teacherName: teacherNameMap[teacherId],
    }));

  return fullyAvailableTeachers;
}

export async function getTeacherConsistentWeeklySlots(
  teacherId: string,
  startDate: string
): Promise<WeeklySlotMap> {
  const parsedDate = dayjs(startDate, "YYYY-MM-DD", true); 

  if (!parsedDate.isValid()) {
    console.error("❌ Invalid startDate received in getTeacherConsistentWeeklySlots:", startDate);
    return {};
  }

  const start = parsedDate.startOf("day");
  const end = start.add(27, "day");

  const redisData = await getAllSlots();

  const daySlotMap: Record<string, Map<string, number>> = {};

  for (
    let current = start.clone();
    current.isSameOrBefore(end);
    current = current.add(1, "day")
  ) {
    const dateStr = current.format("YYYY-MM-DD");
    const dayName = current.format("dddd");

    const teacherSlots = redisData[dateStr]?.[teacherId];

    if (!teacherSlots) {
      console.log(`📭 No slots for teacher ${teacherId} on ${dateStr}`);
      continue;
    }
    for (const slot of teacherSlots) {
      if (!slot.isStatus) {
        continue;
      }

      const key = `${slot.from}-${slot.to}`;

      if (!daySlotMap[dayName]) {
        daySlotMap[dayName] = new Map();
      }

      const currentCount = daySlotMap[dayName].get(key) ?? 0;
      daySlotMap[dayName].set(key, currentCount + 1);

    }
  }

  const consistentWeeklySlots: WeeklySlotMap = {};

  for (const day of Object.keys(daySlotMap)) {
    const timeMap = daySlotMap[day];
    const validSlots: { from: string; to: string }[] = [];

    for (const [key, count] of timeMap.entries()) {
      if (count === 4) {
        const [from, to] = key.split("-");
        validSlots.push({ from, to });
      } else {
        console.log(`🟡 ${day}: slot ${key} appeared ${count} times, not enough`);
      }
    }

    if (validSlots.length > 0) {
      consistentWeeklySlots[day] = validSlots;
    }
  }
  return consistentWeeklySlots;
}


export async function trailClassTeacherList (startDate : string ,position: string , from :  string , to : string ){
  try{

     if (!startDate || !from || !to) return;
     const dateStr = dayjs(startDate).format("YYYY-MM-DD");
     const redisData = await getAllSlots();
     const teacherNameMap: Record<string, string> = {};
     if (!redisData[dateStr]) return;
     for(const teacherId in redisData[dateStr]){
      const slots = redisData[dateStr][teacherId];
      const slot = slots.find((slot : any)=>slot.from === from && slot.to ===  to && slot.isStatus === true && slot.position == position);
      if(slot){
        teacherNameMap[teacherId] = slot?.name ?? "unknown"
       }
     }
     return teacherNameMap;

  }catch(error){
   console.error("❌ Error in trailclassTeacherSlotBook:", error);
  }
}
 
  export async function evaluationTeacherSlotBook ( startDate : string , WeeklySlots : WeeklySlotMap , teacherId : string ) {
         try{
              if (!WeeklySlots || Object.keys(WeeklySlots).length === 0) return;
              if (!teacherId) return;
              const start = dayjs(startDate).startOf("day");
              const end = start.add(27, "day");
              for(
                let current = start.clone();
                current.isSameOrBefore(end);
                 current = current.add(1, "day") 
              ){
                 const dateStr = current.format("YYYY-MM-DD");
                 const dayName = current.format("dddd");
                 const daySlots = WeeklySlots[dayName];
                 if(!daySlots || daySlots.length === 0) continue;
                 if(!teacherId) continue;
                 for (const {from , to } of daySlots){
                      await bookSlot(dateStr, teacherId, from, to, false);
                 }
              }
         }catch(error){
          console.error("❌ Error in evaluationTeacherSlotBook:", error);
         }
  }

export async function removeBookedSlots(startDate: string, WeeklySlots: WeeklySlotMap, teacherId: string) {
  try {
    const start = dayjs(startDate).startOf('day');
    const end = start.add(27, 'day');
    const redisData = await getAllSlots();
    const slotData: WeeklySlotMap = WeeklySlots instanceof Map
     ? Object.fromEntries(WeeklySlots.entries())
    : WeeklySlots;

    for (
      let current = start.clone();
      current.isSameOrBefore(end);
      current = current.add(1, 'day')
    ) {
      const dateStr = current.format('YYYY-MM-DD');
      const dayName = current.format('dddd');
      const daySlots = slotData[dayName];


     if (!daySlots || daySlots.length === 0 || !teacherId) {
      console.log("⚠️ Skipping: No day slots or teacherId");
      continue;
     }

      for (const { from, to } of daySlots) {
        const slots = redisData?.[dateStr]?.[teacherId];
        if (!slots) {
          console.log("❌ No slots found for this date and teacher.");
          continue;
        }
        redisData[dateStr][teacherId] = slots.map((slot: TeacherTimeSlots) => {
        const isTarget = slot.from === from && slot.to === to;
         if (isTarget) {
       return { ...slot, isStatus: true, name: slot.name };
       }
       return slot;
     });
        await teacheravaliableslots.findOneAndUpdate(
          { date: dateStr, teacherId, from, to },
          { $set: { isStatus: true } }
        );
      }
    }
    await redis.set(REDIS_KEY, JSON.stringify(redisData));
    console.log("\n✅ Booked slots have been reset (isStatus: true)");

  } catch (error) {
    console.error("❌ Error in removeBookedSlots:", error);
  }
}


export async function getAllSlotByDate(date: string) {
  try {
    const data = await getAllSlots();
    return data[date] ?? {};
  } catch (err) {
    console.error("❌ Error in getAllSlotByDate:", err);
    return {};
  }
}

//helper function
export async function setPositionTeacher(teacherId: string, position: string) {
  try {
    const redisData = await getAllSlots(); // full slots object from redis

    for (const date in redisData) {
      if (redisData[date][teacherId]) {
        // update slots in redisData object
        redisData[date][teacherId] = redisData[date][teacherId].map((slot: any) => ({
          ...slot,
          position: position // add new key-value
        }));

        // update MongoDB for all slots of this teacher on this date
        await teacheravaliableslots.updateMany(
          { date: date, teacherId: teacherId },
          { $set: { position: position } }
        );
      }
    }

    // finally, update redis once after loop
    await redis.set(REDIS_KEY, JSON.stringify(redisData));

    console.log(`✅ Position "${position}" set for teacher ${teacherId} across all dates`);
  } catch (err) {
    console.error("❌ Error updating teacher position:", err);
  }
}
