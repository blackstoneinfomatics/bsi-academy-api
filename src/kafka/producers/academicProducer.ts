import { sendMessage } from "../producer";

export const academicDashboardCard = async(payload : any)=>{
    await sendMessage('academicDashboardCard',payload);
}

export const academicStudentList = async( payload : any ) =>{
    await sendMessage('academicStudentList',payload);
}

export const academicStudentProfile = async( payload : any ) =>{
    await sendMessage('academicStudentProfile',payload);
}

export const academicDashboardTeachersStudentCount = async (payload : any) =>{
    await sendMessage('academicDashboardTeachersStudentCount',payload);
}

export const academicTeacherStudentList = async (payload : any) =>{
    await sendMessage('academicTeacherStudentList',payload);
}

export const academicAvailableTeachers = async (payload : any) =>{
    await sendMessage('academicAvailableTeachers',payload);
}

export const academicTeacherReSchedule =  async (payload : any) =>{
    await sendMessage('academicTeacherReSchedule',payload)
}

export const academicStudentReSchedule = async ( payload : any)=>{
    await sendMessage('academicStudentReSchedule',payload)
}

export const academicAvailableTeachersList = async (payload : any) =>{
    await sendMessage('academicAvailableTeachersList',payload)
}

export const academicTrailClassTeacher = async (payload : any) =>{
    await sendMessage('academicTrailClassTeacher', payload);
}

export const academicTeacherWeeklySlots = async ( payload : any)=>{
    await sendMessage('academicTeacherWeeklySlots',payload);
}