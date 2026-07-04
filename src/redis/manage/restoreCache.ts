
import teacheravaliableslots from '../../models/teacheravaliableslots';
import { TeacherTimeSlots } from '../../../types/models.types';
import { getRedisClient } from "../../shared/redisClient";

const redis = getRedisClient();

export async function restoreCacheFromDb(){
    const allSlots =await teacheravaliableslots.find();

    const reconstructed : Record<string,any> = {};
    for(const slot of allSlots){
        const { date, name, teacherId, position, from, to, isStatus } = slot;

    reconstructed[date] ??= {};
    reconstructed[date][teacherId] ??= [];

    const alreadyExists = reconstructed[date][teacherId].some(
      (s: TeacherTimeSlots) => s.from === from && s.to === to
    );

    if (!alreadyExists) {
      reconstructed[date][teacherId].push({ name, position, from, to, isStatus });
    }
    }
    await redis.set("teacher_time_slots", JSON.stringify(reconstructed));
   console.log("✅ Redis cache restored from MongoDB");

}