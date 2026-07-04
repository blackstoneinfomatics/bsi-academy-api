import addmeeting from "../../models/addmeeting";
import teachermeeting from "../../models/teachermeeting";


/**
 * Fetch a meeting by ID.
 * @param meetingId - The ID of the meeting to find.
 * @returns The meeting object if found, otherwise null.
 */
export async function getMeetingById(meetingId: string) {
  return await addmeeting.findById(meetingId);
}



export async function getTeacherMeetingById(meetingId: string) {
  return await teachermeeting.findById(meetingId);
}
/**
 * Merge existing meeting details with update payload.
 * @param payload - The new update payload.
 * @param existingMeeting - The existing meeting record from the database.
 * @returns A merged payload object.
 */
export function mergeMeetingPayload(payload: any, existingMeeting: any) {
  return {
    meetingName: payload.meetingName ?? existingMeeting.meetingName,
    participants: payload.participants ?? existingMeeting.participants,
    supervisor: payload.supervisor ?? existingMeeting.supervisor,
    teacher: payload.teacher ?? existingMeeting.teacher,
    selectedDate: payload.selectedDate ?? existingMeeting.selectedDate,
    startTime: payload.startTime ?? existingMeeting.startTime,
    endTime: payload.endTime ?? existingMeeting.endTime,
    description: payload.description ?? existingMeeting.description,
    meetingStatus: payload.meetingStatus ?? existingMeeting.meetingStatus,
    updatedDate: new Date(),
    updatedBy: payload.updatedBy ?? existingMeeting.updatedBy,
  };
}

/**
 * Check for scheduling conflicts.
 * Ensures that neither the teacher nor supervisor has another meeting at the same time.
 * 
 * @param teacherId - The ID of the teacher.
 * @param supervisorId - The ID of the supervisor.
 * @param selectedDate - The meeting date.
 * @param startTime - The start time of the meeting.
 * @param endTime - The end time of the meeting.
 * @param meetingId - The ID of the current meeting (to exclude from the check).
 * @returns Boolean indicating whether a scheduling conflict exists.
 */
export async function checkMeetingConflict(
  teacherId?: string,
  organizerId?: string,
  studentId?:string,
  selectedDate?: string,
  startTime?: string,
  endTime?: string,
  meetingId?: string,
): Promise<boolean> {
  const conflictingMeeting = await addmeeting.findOne({
    $and: [
      { selectedDate }, // Same date
      {
        $or: [
          { "teacher.teacherId": teacherId }, // Check teacher conflict
          { "supervisor.supervisorId": organizerId },
          {'participants.studentId':studentId}, // Check supervisor conflict
        ],
      },
      {
        $or: [
          // Time overlap condition
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        ],
      },
      meetingId ? { _id: { $ne: meetingId } } : {}, // Exclude the current meeting
    ],
  });

  return conflictingMeeting !== null;
}


export async function checkTeacherMeetingConflict(
  teacherId?: string,
  studentId?: string,
  selectedDate?: string,
  startTime?: string,
  endTime?: string,
  meetingId?: string
): Promise<boolean> {
  const conflictingMeeting = await teachermeeting.findOne({
    $and: [
      { selectedDate },
      {
        $or: [
          { "teacher.teacherId": teacherId },
          { "participants.studentId": studentId },
        ],
      },
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      },
      meetingId ? { _id: { $ne: meetingId } } : {},
    ],
  });

  return conflictingMeeting !== null;
}
