import {TeacherMeetingCreate, TeacherMeeting, IAdminMeeting, IMeeting, ITeacher} from '../../types/models.types'
import teacherMeeting, { zodTeacherMeetingSchema } from '../models/teachermeeting';

import { Types } from 'mongoose';
import teachermeeting from '../models/teachermeeting';
import addmeeting from '../models/addmeeting';
import adminmeeting from '../models/adminmeeting';
import { v4 as uuidv4 } from 'uuid';


export interface ITeacherMeetingUpdate{
  meetingName:string,
  selectedDate: Date,
  status?:string,
  meetingStatus?: string,
  startTime:string,
  endTime:string,
  updatedDate?:Date,
  updatedBy?:string,
  description:string,
  }


  export interface IMeetingMinutesUpdate {
  meetingStatus: string;
  meetingminutes?: string;
  teacher: ITeacher[];  // Fix this from `string` to `ITeacher[]`
}

  
export const createTeacherMeeting = async (
  payload: TeacherMeetingCreate
): Promise<TeacherMeeting | { error: any }> => {
  try {
    // Ensure teacher object is preserved
    const teacher = {
      teacherId: payload.teacher?.teacherId ?? "",
      teacherName: payload.teacher?.teacherName ?? "",
      teacherEmail: payload.teacher?.teacherEmail ?? ""
    };
    
    console.log("📌 Teacher Info:", teacher);
    

    // Ensure participants is an array of objects
    const participants = Array.isArray(payload.participants)
      ? payload.participants.map(p => ({
          studentId: p.studentId ?? "",
          studentName: p.studentName ?? "",
          studentEmail: p.studentEmail ?? ""
        }))
      : [];

    const selectedDate = new Date(payload.selectedDate);
    const { startTime, endTime } = payload;

    // Check for meeting conflict
    const conflictingMeeting = await teacherMeeting.findOne({
      selectedDate: selectedDate,
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (conflictingMeeting) {
      return {
        error: "A meeting is already scheduled at this time. Please choose a different time slot."
      };
    }

    if (selectedDate < new Date()) {
      return { error: "Meeting date cannot be in the past. Please select a future date." };
    }

   const meetingId = `teacher-${uuidv4()}`;

    const newMeeting = new teacherMeeting({
      meetingId,
      meetingName: payload.meetingName,
      teacher,
      participants,
      selectedDate: selectedDate,
      startTime,
      endTime,
      description: payload.description,
      meetingStatus: payload.meetingStatus ?? "Scheduled",
      status: payload.status,
      createdDate: payload.createdDate ? new Date(payload.createdDate) : new Date(),
      createdBy: payload.createdBy ?? "system",
      updatedDate: payload.updatedDate ? new Date(payload.updatedDate) : new Date(),
      updatedBy: payload.updatedBy ?? "system"
    });

    const savedMeeting = await newMeeting.save();
    return savedMeeting;
  } catch (error) {
    console.error("Error creating meeting:", error);
    return { error };
  }
};



export const getallTeachermeeting = async (
  params: { teacherId: string }
): Promise<{
  totalCount: number;
  meetings: (TeacherMeeting | IAdminMeeting | IMeeting)[];
}> => {
  const { teacherId } = params;

  const query = {
    "teacher.teacherId": teacherId.trim(),
  };

  console.log("🔍 Query used:", query);

const [teacherMeetings, adminMeetings, supervisormeeting] = await Promise.all([
  teacherMeeting.find({ "teacher.teacherId": teacherId.trim() }).exec(),
  addmeeting.find({ "participants.participantId": teacherId.trim() }).exec(),
  adminmeeting.find({ "teacher.teacherId": teacherId.trim() }).exec(),
]);


  console.log("📘 teacherMeetings:", teacherMeetings.length);
  console.log("📘 adminMeetings:", adminMeetings.length);
  console.log("📘 studentMeetings:", supervisormeeting);

  const mergedMeetings = [...teacherMeetings, ...adminMeetings, ...supervisormeeting].sort(
    (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  );

  return {
    totalCount: mergedMeetings.length,
    meetings: mergedMeetings,
  };
};

//studentId aGAINST mEETING
export const getByStudentId = async (
  params: { studentId: string }
): Promise<{
  totalCount: number;
  records: TeacherMeeting[];
}> => {
  const { studentId } = params;

  const query = {
    "participants.studentId": studentId, // ✅ Correctly query inside participants array of objects
  };

  console.log("🔍 TeacherMeeting Query:", query);

  const records = await teachermeeting.find(query).exec();

  return {
    totalCount: records.length,
    records,
  };
};




export const getMeetingsByMeetingId = async (
  meetingId: string
): Promise<
  { source: 'teacher' | 'supervisor' | 'admin'; data: any }[]
> => {
  const trimmedId = meetingId.trim();

  const [teacherMatches, supervisorMatches, adminMatches] = await Promise.all([
    teacherMeeting.find({ meetingId: trimmedId }).lean(),
    addmeeting.find({ meetingId: trimmedId }).lean(),
    adminmeeting.find({ meetingId: trimmedId }).lean(),
  ]);

  return [
    ...teacherMatches.map((data) => ({ source: 'teacher' as const, data })),
    ...supervisorMatches.map((data) => ({ source: 'supervisor' as const, data })),
    ...adminMatches.map((data) => ({ source: 'admin' as const, data })),
  ];
};



export const getTeachermeetingById = async (
  id: string
): Promise<TeacherMeeting | null> => {
  return teacherMeeting.findOne({
    _id: id,
  }).lean() as unknown as TeacherMeeting | null;
  };



export const updateAllTeacherMeeting = async (
  id: string,
  payload: Partial<ITeacherMeetingUpdate>
): Promise<TeacherMeeting | null> => {
    console.log("🔄 DB Update attempt for ID:", id);
  console.log("📦 Payload to update:", payload);
  return teachermeeting.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    { $set: payload },
    { new: true }
  ).lean() as unknown as TeacherMeeting | null;
}

//updatemeetingAttendee

export const updateTeacherMeetingAtt = async (
  id: string,
  meetingStatus: string,
  teacher: ITeacher[],
  updatedBy?: string
): Promise<any | null> => {
  const updated = await addmeeting.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    {
      $set: {
        meetingStatus,
        teacher,
        updatedBy,
        updatedDate: new Date(), // set server-side
      },
    },
    { new: true, projection: { meetingminutes: 1, meetingStatus: 1, teacher: 1, _id: 0 } } // return only relevant fields
  ).lean();

  return updated;
};



