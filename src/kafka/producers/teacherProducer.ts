import { sendMessage } from "../producer";

export const teacherDashboardCardCount = async ( payload : any) => {
    sendMessage('teacherDashboardCardCount', payload);
}

export const teacherStudentMeeting = async (payload : any) => {
    sendMessage('teacherStudentMeeting', payload);
} 

export const teacherReScheduleNotify = async (payload : any) => {
    sendMessage('teacherReScheduleNotify', payload);
}

export const teacherAssignmentCard = async (payload : any) => {
    sendMessage('teacherAssignmentCard', payload);
}

export const teacherAnalysisCard = async ( payload : any) => {
    sendMessage('teacherAnalysisCard', payload);
}