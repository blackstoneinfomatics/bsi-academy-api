import { sendMessage } from "../producer";

export const supervisorCardCount = async (payload : any) =>{
    await sendMessage('supervisorcardcount',payload);
}
export const supervisorRecruitmentList = async(payload : any) =>{
    await sendMessage('recruitmentlist',payload);
}
export const supervisorAddMeeting = async (payload : any) =>{
    await sendMessage('addmeeting',payload);
}
export const supervisorTeacherList = async (payload : any) =>{
    await sendMessage('supervisorteacherlist',payload);
}
export const supervisorFeedBackList = async (payload : any) =>{
    await sendMessage('supervisorfeedbacklist',payload);
}