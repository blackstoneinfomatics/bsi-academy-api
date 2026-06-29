import dayjs from "dayjs";
import {
  getStudentList,
  teacherStudentCount
} from "../operations/classschedule";
import {
  dashboardWidgetCounts,
  dashboardWidgetSupervisorCounts,
  dashboardWidgetTeacherCounts,
} from "../operations/dashboard";
import { getTotalAmountByCourse } from "../operations/invoice";
import {
  bookSlot,
  getAllSlotByDate,
  getAllSlots,
  getTeacherConsistentWeeklySlots,
  getUniqueTeacherList,
  trailClassTeacherList,
} from "../redis/handler/teacherSlotHander";
import { emitEventToClient } from "../shared/socket";
import AuditLog from "../models/auditlog";
import users from "../models/users";

export const topicHandler: Record<string, (data: any) => Promise<void>> = {

  "invoice-paid": async (data: any) => {
    console.log("invioce data ", data);
    const latestRevenue = await getTotalAmountByCourse("yearly");
      const admin = await users.find({role: "ADMIN" , status: "ACTIVE" }).exec();
    console.log("💰 Latest Revenue:", latestRevenue);
    emitEventToClient(
      "revenueUpdated",
      latestRevenue,
      admin[0]?._id.toString()
    );
  },

  supervisorcardcount: async (data: any) => {
    console.log("running supervisor card count");
    const cardcount = await dashboardWidgetSupervisorCounts();
    console.log("cardcount", cardcount);
    emitEventToClient("supervisordashboardcount", cardcount, data.supervisorId);
  },

  recruitmentlist: async (data: any) => {
    console.log("running recruitment list");
    emitEventToClient("recruitmentlist", data);
  },

  addmeeting: async (data: any) => {
    console.log("add meeting");
    emitEventToClient("addmeeting", data, data.data.supervisor.supervisorId);
  },

  supervisorteacherlist: async (data: any) => {
    console.log("supervisorteacherlist");
    emitEventToClient("supervisorteacherlist", data);
  },

  supervisorfeedbacklist: async (data: any) => {
    console.log("supervisorfeedbacklist");
    emitEventToClient("supervisorfeedbacklist", data);
  },

  academicDashboardCard: async (data: any) => {
    console.log("academicDashboardCard");
    const cardcount = await dashboardWidgetCounts(data.academicCoachId);
    emitEventToClient("academicDashboardCard", cardcount, data.academicCoachId);
  },

  academicStudentList: async (data: any) => {
    console.log("academicStudentList");
    emitEventToClient("academicStudentList", data, data.sender);
  },

  academicStudentProfile: async (data: any) => {
    console.log("academicStudentProfile");
    emitEventToClient("academicStudentProfile", data, data.sender);
  },

  academicDashboardTeachersStudentCount: async (data: any) => {
    console.log("academicDashboardTeachersStudentCount");
    if (data.classType == "REGULARCLASS" || data.classType == "GROUPCLASS") {
      const getTeacherStudentCount = teacherStudentCount();
      emitEventToClient(
        "academicDashboardTeachersStudentCount",
        getTeacherStudentCount
      );
    }
  },
 //frontend binding pending 
  academicTeacherStudentList: async (data: any) => {
    console.log("academicTeacherStudentList");
    const teacherId = data?.data?.assignedTeacherId;
    if (!teacherId) {
    console.error("No teacherId provided");
    return;
    }
    const getTeacherStudentList = getStudentList(teacherId);
    emitEventToClient("academicTeacherStudentList", getTeacherStudentList);
  },

  academicAvailableTeachers: async (data: any) => {
    console.log("academicAvailableTeachers");

    try {
      if (data.event === "create") {
        const academicAvailableTeachers = await getAllSlots();
        emitEventToClient(
          "academicAvailableTeachers",{event : "create", data: academicAvailableTeachers});
      } else {
        const { date, teacherId, from, to } = data.data;
        const teacherList = Array.isArray(teacherId) ? teacherId : [teacherId];
        const formattedDate = dayjs(date).format("YYYY-MM-DD");

        const fromTime = dayjs(`${formattedDate} ${from}`);
        const toTime = dayjs(`${formattedDate} ${to}`);

        const timeSlots: { from: string; to: string }[] = [];
        let slotStart = fromTime;

        while (slotStart.isBefore(toTime)) {
          const slotEnd = slotStart.add(30, "minute");

          if (slotEnd.isAfter(toTime)) break;

          timeSlots.push({
            from: slotStart.format("HH:mm"),
            to: slotEnd.format("HH:mm"),
          });

          slotStart = slotEnd;
        }

        for (const teacher of teacherList) {
          const id = typeof teacher === "string" ? teacher : teacher.teacherId;
          if (!id) {
            console.warn("⚠️ Skipping teacher with missing ID:", teacher);
            continue;
          }

          await Promise.all(
            timeSlots.map((slot) =>
              bookSlot(formattedDate, id, slot.from, slot.to, false))
          );
        }
        const academicAvailableTeachers = await getAllSlotByDate(formattedDate);
        emitEventToClient("academicAvailableTeachers", {
          event : "update",
          date: data.data.date,
          slots: academicAvailableTeachers,
        });
      }
    } catch (err: any) {
      console.error("❌ Redis/Kafka handler error:", err.message);
    }
  },
   //kept inactive 
  'academicTeacherReSchedule' : async (data: any) => {
    console.log("academicTeacherReSchedule");
    emitEventToClient("academicTeacherReSchedule", data);
  },

  'academicStudentReSchedule' : async (data: any) => {
    console.log("academicStudentReSchedule");
    emitEventToClient("academicStudentReSchedule", data);
  },

  'teacherDashboardCardCount' : async ( data : any) =>{
    console.log("teacherDashboardCardCount");
    const teacherCounts = await dashboardWidgetTeacherCounts(data.sender);
    emitEventToClient("teacherDashboardCardCount", teacherCounts , data.sender);
  },

  'teacherStudentMeeting' : async ( data : any) =>{
    console.log("teacherStudentMeeting");
    emitEventToClient("teacherStudentMeeting", data.data );
  },

  'teacherReScheduleNotify' : async ( data : any) => {
    console.log('teacherReScheduleNotify');
    // sender will be academic coach
    emitEventToClient("teacherReScheduleNotify", data);
  },

  'teacherAssignmentCard' : async ( data : any) => {
    console.log('teacherAssignmentCard');
    // send to teacher and handler for count
    emitEventToClient("teacherAssignmentCard", data);
  },

  'teacherAnalysisCard' : async ( data : any) => {
    console.log('teacherAnalysisCard');
    // send to teacher and handler for count
    emitEventToClient("teacherAnalysisCard", data);
  },

  'academicAvailableTeachersList' : async ( data : any) =>{
    console.log('academicAvailableTeachersList');
    const teacherLsit = await getUniqueTeacherList(data.startDate ,data.position, data.WeeklySlots);
    emitEventToClient("availableTeachersListResponse", teacherLsit ,data.requestId);
  },

  'academicTrailClassTeacher' : async ( data : any) => {
   console.log("academicTrailClassTeacher");
   const teacherList = await trailClassTeacherList(data.startDate ,data.position, data.from , data.to);
   emitEventToClient("academicTrailClassTeacherListResponse", teacherList ,data.requestId);
  },

  'academicTeacherWeeklySlots' : async ( data : any) => {
     console.log("academicTeacherWeeklySlots");
     const teachersList = await getTeacherConsistentWeeklySlots( data.teacherId ,data.startDate );
     emitEventToClient("academicTeacherWeeklySlotsListResponse", teachersList ,data.requestId);
  },

  'sendLogsToKafka' : async ( data : any) =>{
    try{
    const log = new AuditLog({
      userId: data.data.userId ?? 'anonymous', 
      logType: data.data.logType,
      action: data.data.action,
      description: data.data.description,
      route: data.data.route,
      errorMessage: data.data.errorMessage,
      stack: data.data.stack,
      ip: data.data.ip,
      meta: data.data.meta,
      createdDate: data.data.createdDate ?? new Date()
    });

    await log.save();
    }catch(error){
      console.error('❌ Failed to save log:', error);
    }
  },

  'liveClassAutoEnd' : async ( data : any) =>{
    console.log('liveClassAutoEnd');
    emitEventToClient("liveClassAutoEnd",data);
  }

};
