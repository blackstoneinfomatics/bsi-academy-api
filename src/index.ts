import { initializeMongoDatabase } from "./shared/mongo";
// import { initializeSentry } from "./shared/sentry";
import Hapi, { Server } from "@hapi/hapi";
import AppLogger from "./helpers/logging";
import config from "./config/env";
import { appPlugins } from "./server/plugins";
import { serverSettings } from "./config/config";
import { initializeSocket } from "./shared/socket";
import { shutdownKafkaConsumer, startInvoiceConsumer } from './kafka/consumer';
import { connectProducer, disconnectProducer } from "./kafka/producer";
import Meeting from "../src/models/addmeeting";
import cron from "node-cron";
import { addAditionalSlots, cleanupOldDates } from "./redis/manage/autoClearSlots";
import { restoreCacheFromDb } from "./redis/manage/restoreCache";
import { loggerPlugin } from "./plugins/auditlog";
import teachermeeting from "./models/teachermeeting";
import Evaluation from "./models/evaluation";
import { removeBookedSlots } from "./redis/handler/teacherSlotHander";
import { updateEarningsCalculation } from "./operations/classschedule";
import adminmeeting from "./models/adminmeeting";
import { runSalaryCron } from "./operations/salarywages";
import moment from "moment";
import { IClassSchedule } from "../types/models.types";
import ClassScheduleModel from "./models/classShedule";
import { liveClassAutoEnd } from "./kafka/producers/adminProducer";
import { sendNotification } from "./operations/notification";
import { Types } from "mongoose";
import AlStudenModel from "./models/alstudents";
import UserModel from "./models/users";
import SubscriptionModel from "./models/subscription-models";
const start = async () => {
  // Create the server with server settings
  const server: Server = Hapi.server(serverSettings);

  // Register plugins
  await server.register(appPlugins);

  // MongoDB Connection Establishment
  await initializeMongoDatabase();

  // RedisDB Connection Establish
(async () => {
  await restoreCacheFromDb(); 
})();
  // Sentry Connection Establish
  //initializeSentry();
  // Initialize Socket.IO service
  initializeSocket(server.listener);
   await connectProducer();
   startInvoiceConsumer();
  // Initialize and Start the Application
  await server.initialize();
  await server.start();
  await server.register([loggerPlugin]);

  AppLogger.info(
    `Application is running on ${config.server.host}:${config.server.port}`
  );
};


// Server Start error handling
process.on("unhandledRejection", (err) => {
  AppLogger.error("unhandledRejection", err);
  process.exit(1);
});
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await shutdownKafkaConsumer();
  await disconnectProducer();
  process.exit(0);
});
start();


//meetingstatus cronjob
cron.schedule("0 0 * * 0", async () => {
  console.log("🧹 Weekly Redis + MongoDB cleanup");
  await cleanupOldDates(7);
});


cron.schedule("*/5 * * * *", async () => {
  console.log("⏰ Running meeting status update check every 5 minutes...");

  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1️⃣ Mark past meetings as Completed
    try {
      const resultPast = await Meeting.updateMany(
        {
          meetingStatus: { $ne: "Completed" },
          selectedDate: { $lt: today },
        },
        {
          $set: { meetingStatus: "Completed" },
        }
      );

      console.log(`${resultPast.modifiedCount} past meetings marked as Completed.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(" Error updating past meetings:", message);
    }

    // 2️⃣ Get today's meetings that are still not marked completed
    let meetingsToday: any[] = [];
    try {
      meetingsToday = await Meeting.find({
        meetingStatus: { $ne: "Completed" },
        selectedDate: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Less than tomorrow
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ Error fetching today's meetings:", message);
    }

    let updatedTodayCount = 0;

    for (const meeting of meetingsToday) {
      try {
        if (!meeting.endTime) continue;

        const [endHour, endMinute] = meeting.endTime.split(":").map(Number);
        const meetingEnd = new Date(meeting.selectedDate);
        meetingEnd.setHours(endHour, endMinute, 0, 0);

        if (now >= meetingEnd) {
          await Meeting.updateOne(
            { _id: meeting._id },
            { $set: { meetingStatus: "Completed" } }
          );
          console.log(`✅ Meeting ${meeting.meetingId} marked as Completed (endTime passed).`);
          updatedTodayCount++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error updating meeting ${meeting.meetingId}:`, message);
      }
    }

    console.log(`✅ ${updatedTodayCount} today's meetings updated as Completed.`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Unexpected error in meeting status update cron:", message);
  }
});  


//meetingstatus cronjob
cron.schedule("0 0 * * 0", async () => {
  console.log("🧹 Weekly Redis + MongoDB cleanup");
  await cleanupOldDates(7);
});

cron.schedule("*/5 * * * *", async () => {
  console.log("⏰ Running meeting status update check every 5 minutes...");

  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1️⃣ Mark past meetings as Completed
    try {
      const resultPast = await teachermeeting.updateMany(
        {
          meetingStatus: { $ne: "Completed" },
          selectedDate: { $lt: today },
        },
        {
          $set: { meetingStatus: "Completed" },
        }
      );

      console.log(`${resultPast.modifiedCount} past meetings marked as Completed.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(" Error updating past meetings:", message);
    }

    // 2️⃣ Get today's meetings that are still not marked completed
    let meetingsToday: any[] = [];
    try {
      meetingsToday = await teachermeeting.find({
        meetingStatus: { $ne: "Completed" },
        selectedDate: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Less than tomorrow
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ Error fetching today's meetings:", message);
    }

    let updatedTodayCount = 0;

    for (const meeting of meetingsToday) {
      try {
        if (!meeting.endTime) continue;

        const [endHour, endMinute] = meeting.endTime.split(":").map(Number);
        const meetingEnd = new Date(meeting.selectedDate);
        meetingEnd.setHours(endHour, endMinute, 0, 0);

        if (now >= meetingEnd) {
          await teachermeeting.updateOne(
            { _id: meeting._id },
            { $set: { meetingStatus: "Completed" } }
          );
          console.log(`✅ Meeting ${meeting.meetingId} marked as Completed (endTime passed).`);
          updatedTodayCount++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error updating meeting ${meeting.meetingId}:`, message);
      }
    }

    console.log(`✅ ${updatedTodayCount} today's meetings updated as Completed.`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Unexpected error in meeting status update cron:", message);
  }
});  


//invoice update cron every night at 12:00 AM (midnight)
cron.schedule("0 0 * * *", async () => {
  console.log("🧹 Invoice update for glass schedule");
  const currentDate = new Date()
  const formattedDate = currentDate.toISOString().split("T")[0]

  const startOfDayIST = `${formattedDate}T00:00:00.000+00:00`
  const endOfDayIST = `${formattedDate}T23:59:59.999+00:00`
  const getPaymentDetails = await Evaluation.find({
    joiningDate: { $gte: startOfDayIST, $lte: endOfDayIST }
  });
  for(const evaluation of getPaymentDetails){
    console.log("evaluation",evaluation);
  if( evaluation.classType == "REGULARCLASS"&& evaluation.weeklySlots && (!evaluation.paymentStatus||evaluation.paymentStatus == "Pending" || evaluation.paymentStatus == "" )){
    console.log("deleting booked");
   await removeBookedSlots(evaluation.joiningDate.toString(), evaluation.weeklySlots, evaluation.teacher.teacherId);
  } 
}
});


cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Running subscription update check...");

  const currentDate = new Date()
  const formattedDate = currentDate.toISOString().split("T")[0]

  const endOfDayIST = `${formattedDate}T23:59:59.999+00:00`
  const result = await SubscriptionModel.updateMany(
    {
      endDate: { $lte: endOfDayIST },
      subscriptionStatus: "ACTIVE",
      isTrialUsed: true
    },
    {
      $set: {
        subscriptionStatus: "EXPIRED",
        updatedDate: new Date(),
        isTrialUsed: false
      }
    }
  );

  console.log(`✅ Expired ${result.modifiedCount} subscriptions`);
});

//adminmeeting
cron.schedule("*/5 * * * *", async () => {
  console.log("Runningadmin meeting status update check every 5 minutes...");

  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const resultPast = await adminmeeting.updateMany(
        {
          meetingStatus: { $ne: "Completed" },
          selectedDate: { $lt: today },
        },
        {
          $set: { meetingStatus: "Completed" },
        }
      );

      console.log(`${resultPast.modifiedCount} past meetings marked as Completed.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(" Error updating past meetings:", message);
    }

    let meetingsToday: any[] = [];
    try {
      meetingsToday = await adminmeeting.find({
        meetingStatus: { $ne: "Completed" },
        selectedDate: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), 
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(" Error fetching today's meetings:", message);
    }

    let updatedTodayCount = 0;

    for (const meeting of meetingsToday) {
      try {
        if (!meeting.endTime) continue;

        const [endHour, endMinute] = meeting.endTime.split(":").map(Number);
        const meetingEnd = new Date(meeting.selectedDate);
        meetingEnd.setHours(endHour, endMinute, 0, 0);

        if (now >= meetingEnd) {
          await adminmeeting.updateOne(
            { _id: meeting._id },
            { $set: { meetingStatus: "Completed" } }
          );
          console.log(` Meeting ${meeting.meetingId} marked as Completed (endTime passed).`);
          updatedTodayCount++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(` Error updating meeting ${meeting.meetingId}:`, message);
      }
    }

    console.log(` ${updatedTodayCount} today's meetings updated as Completed.`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(" Unexpected error in meeting status update cron:", message);
  }
});  



// Run every day nit
cron.schedule("55 23 * * *", async () => {
  console.log("🧹 attendance and earnings update schedule");
  await runSalaryCron();
});

cron.schedule("*/5 * * * *", async () => {
  console.log("⏰ Running meeting status update check every 5 minutes...");

  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1️⃣ Mark past meetings as Completed
    try {
      const resultPast = await adminmeeting.updateMany(
        {
          meetingStatus: { $ne: "Completed" },
          selectedDate: { $lt: today },
        },
        {
          $set: { meetingStatus: "Completed" },
        }
      );

      console.log(`${resultPast.modifiedCount} past meetings marked as Completed.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(" Error updating past meetings:", message);
    }

    // 2️⃣ Get today's meetings that are still not marked completed
    let meetingsToday: any[] = [];
    try {
      meetingsToday = await adminmeeting.find({
        meetingStatus: { $ne: "Completed" },
        selectedDate: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Less than tomorrow
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ Error fetching today's meetings:", message);
    }

    let updatedTodayCount = 0;

    for (const meeting of meetingsToday) {
      try {
        if (!meeting.endTime) continue;

        const [endHour, endMinute] = meeting.endTime.split(":").map(Number);
        const meetingEnd = new Date(meeting.selectedDate);
        meetingEnd.setHours(endHour, endMinute, 0, 0);

        if (now >= meetingEnd) {
          await adminmeeting.updateOne(
            { _id: meeting._id },
            { $set: { meetingStatus: "Completed" } }
          );
          console.log(`✅ Meeting ${meeting.meetingId} marked as Completed (endTime passed).`);
          updatedTodayCount++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error updating meeting ${meeting.meetingId}:`, message);
      }
    }

    console.log(`✅ ${updatedTodayCount} today's meetings updated as Completed.`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Unexpected error in meeting status update cron:", message);
  }
}); 

cron.schedule("*/5 * * * *", async () => {
  const todayStart = moment().startOf("day").toDate();
  const todayEnd = moment().endOf("day").toDate();

  const rateMap = {
    REGULARCLASS: 4.0,
    GROUPCLASS: 6.0
  } as const;

  const classSchedules = await ClassScheduleModel.find({
    startDate: { $gte: todayStart, $lte: todayEnd },
    scheduleStatus: { $nin: ["Completed", "StudentAbsent", "TeacherAbsent", "BothAbsent"] },
    sessionClassType : "REGULARCLASS"
  });

  console.log(`🔄 Checking ${classSchedules.length} classes at ${moment().format("HH:mm:ss")}`);
   
  const groupClassSchedule = await ClassScheduleModel.find({
    startDate :{ $gte : todayStart , $lte : todayEnd },
    scheduleStatus: { $nin: ["Completed", "StudentAbsent", "TeacherAbsent", "BothAbsent"] },
    sessionClassType : "GROUPCLASS"
  });
  
  console.log(`🔄 Checking ${groupClassSchedule.length} classes at ${moment().format("HH:mm:ss")}`); 
 
  for (const cls of classSchedules) {
    const classId = cls._id.toString();
    const startTime = moment(cls.startTime?.[0], "HH:mm");
    const endTime = moment(cls.endTime?.[0], "HH:mm");
    const nowMoment = moment();

    const graceDeadline = startTime.clone().add(15, "minutes");

    if (nowMoment.isBefore(graceDeadline)) {
      console.log(`⏳ Class ${classId}: Grace period not over yet`);
      continue;
    }

    const studentJoined = Array.isArray(cls.student.studnetSessionStart) && cls.student.studnetSessionStart.length > 0;
    const teacherJoined = Array.isArray(cls.teacher.teacherSessionStart) && cls.teacher.teacherSessionStart.length > 0;

    console.log(`🔍 Class ${classId}: studentJoined=${studentJoined}, teacherJoined=${teacherJoined}`);

    // ✅ Case 1: Both present
    if (studentJoined && teacherJoined) {
  const nowHHMM = moment().format("HH:mm");
  const endHHMM = moment(cls.endTime[0], "HH:mm").format("HH:mm");

  // Clone original session times
  let teacherStartTime  = cls.teacher.teacherSessionStart?.[0] ?? null;
  let teacherStartTimeList  = [...(cls.teacher.teacherSessionStart || [])];
  let teacherEndTimeList = [...(cls.teacher.teacherSessionEnd || [])];
  let studentEndTimeList = [...(cls.student.studnetSessionEnd || [])];
  let studentStartTimeList  = [...(cls.student.studnetSessionStart || [])];

  // ✅ If current time === endTime, push end time to teacher/student if not already set
  if (nowHHMM === endHHMM) {
  const lastTeacherStart = teacherStartTimeList.at(-1);
  const lastTeacherEnd   = teacherEndTimeList.at(-1);
  const lastStudentStart = studentStartTimeList.at(-1);
  const lastStudentEnd   = studentEndTimeList.at(-1);

  // ✅ Teacher rule
  if (
    teacherEndTimeList.length === 0 ||
    (lastTeacherStart > lastTeacherEnd && lastTeacherEnd !== endHHMM)
  ) {
    teacherEndTimeList.push(endHHMM);
  }

  // ✅ Student rule
  if (
    studentEndTimeList.length === 0 ||
    (lastStudentStart > lastStudentEnd && lastStudentEnd !== endHHMM)
  ) {
    studentEndTimeList.push(endHHMM);
  }
}

  const teacherEndTime = teacherEndTimeList[teacherEndTimeList.at(-1)] || "";

  if (teacherStartTime && teacherEndTime) {
    const start = moment(teacherStartTime, "HH:mm");
    const end = moment(teacherEndTime, "HH:mm");
    const totalMinutes = moment.duration(end.diff(start)).asMinutes();

    if (totalMinutes <= 0) {
      console.log(`⚠️ Class ${cls._id}: Invalid duration`);
      return;
    }

    const classType = cls.sessionClassType as keyof typeof rateMap;
    const perClassAmount = rateMap[classType] || 0;
    const calculatedEarnings = parseFloat(((totalMinutes / 60) * perClassAmount).toFixed(2));
    const existingEarnings = cls.earnings || 0;
    const deltaEarning = parseFloat((calculatedEarnings - existingEarnings).toFixed(2));
    const updatedEarnings = parseFloat((existingEarnings + deltaEarning).toFixed(2));

    const updateData: any = {
      amount: updatedEarnings,
      studentAttendee: "Present",
      teacherAttendee: "Present",
      "teacher.teacherSessionEnd": teacherEndTimeList,
      "student.studnetSessionEnd": studentEndTimeList,
      sessionStarttime:teacherStartTime,
      sessionEndtime:teacherEndTime,
    };

    if (nowHHMM === endHHMM) {
      updateData.sessionStatus = "Completed";
      updateData.scheduleStatus = "Completed";
      updateData.classhour = totalMinutes;
      await liveClassAutoEnd({ data : cls.classLink });
    }

    await ClassScheduleModel.findByIdAndUpdate(cls._id, updateData);

    console.log(`✅ Class ${cls._id}: ₹${deltaEarning} added (Total: ₹${updatedEarnings}) — ${totalMinutes} mins`);
  }
}


    // ❌ Case 2: Student absent
    else if (!studentJoined && teacherJoined) {
      const totalMinutes = moment.duration(endTime.diff(startTime)).asMinutes();
      const classType = cls.sessionClassType as keyof typeof rateMap;
      const perClassAmount = rateMap[classType] || 0;
      const earning = parseFloat(((totalMinutes / 60) * perClassAmount).toFixed(2));

      await ClassScheduleModel.findByIdAndUpdate(cls._id, {
        sessionStatus: "Completed",
        scheduleStatus: "StudentAbsent",
        studentAttendee: "Absent",
        teacherAttendee: "Present",
        sessionStarttime:startTime,
        sessionEndtime:endTime,
        amount: earning,
      });
      await liveClassAutoEnd({ data : cls.classLink });
      
  const student = cls.student;
  const teacher = cls.teacher;
  const message = `Student ${student?.studentFirstName} was absent for the class on ${cls.startDate} at ${cls.startTime[0]}. The session has been marked accordingly.`;
const classSchedule = await ClassScheduleModel.findOne({
      _id: new Types.ObjectId(cls._id),
    });
    const alfstudent = await AlStudenModel.findOne({
      _id: new Types.ObjectId(classSchedule?.student.studentId),
    });
    const evaluation = await Evaluation.findOne({
  "student.studentId": alfstudent?.student.studentId,
    });
    const academicCoachId = evaluation?.academicCoachId;
    const academicCoach = await UserModel.findOne({_id : new Types.ObjectId(academicCoachId)});
  if (teacher?.teacherId) {
      await sendNotification({
      messages: message,
      senderId: "system123",
      senderName: "System",
      senderEmail: "system@gmail.com", 
      isRead: false,
      receiverId: [teacher.teacherId.toString(),academicCoach?._id.toString()],
      receiverName: [teacher.teacherName ,academicCoach?.userName],
      receiverEmail: [teacher.teacherEmail || 'some@gmail.com',academicCoach?.email],
      notificationType: "STUDENT_ABSENT_ALERT",
      notificationStatus: "Unseen",
      status: "active",
      createdBy: "system",
      updatedBy: "system",
    });
  }
      console.log(`❌ Class ${classId}: Student Absent — Teacher earned ₹${earning}`);
    }

    // ❌ Case 3: Teacher absent
    else if (studentJoined && !teacherJoined) {
      await ClassScheduleModel.findByIdAndUpdate(cls._id, {
        sessionStatus: "Completed",
        scheduleStatus: "TeacherAbsent",
        studentAttendee: "Present",
        teacherAttendee: "Absent",
        sessionStarttime:"",
        sessionEndtime:"",
        amount: 0
      });
      await liveClassAutoEnd({ data : cls.classLink });
      const student = cls.student;
  const teacher = cls.teacher;

  const message = `Teacher ${teacher?.teacherName} was absent for the class on ${cls.startDate} at ${cls.startTime[0]}. The session has been marked accordingly.`;

  const classSchedule = await ClassScheduleModel.findOne({
    _id: new Types.ObjectId(cls._id),
  });

  const alfstudent = await AlStudenModel.findOne({
    _id: new Types.ObjectId(classSchedule?.student.studentId),
  });

  const evaluation = await Evaluation.findOne({
    "student.studentId": alfstudent?.student.studentId,
  });

  const academicCoachId = evaluation?.academicCoachId;
  const academicCoach = await UserModel.findOne({
    _id: new Types.ObjectId(academicCoachId),
  });

  if (student?.studentId) {
    await sendNotification({
      messages: message,
      senderId: "system123",
      senderName: "System",
      senderEmail: "system@gmail.com",
      isRead: false,
      receiverId: [student.studentId.toString(), academicCoach?._id.toString()],
      receiverName: [student.studentFirstName, academicCoach?.userName],
      receiverEmail: [student.studentEmail || "unknown@student.com", academicCoach?.email],
      notificationType: "TEACHER_ABSENT_ALERT",
      notificationStatus: "Unseen",
      status: "active",
      createdBy: "system",
      updatedBy: "system",
    });
  }
      console.log(`❌ Class ${classId}: Teacher Absent — No earning`);
    }

    // ❌ Case 4: Both absent
    else {
      await ClassScheduleModel.findByIdAndUpdate(cls._id, {
        sessionStatus: "Completed",
        scheduleStatus: "BothAbsent",
        studentAttendee: "Absent",
        teacherAttendee: "Absent",
        sessionStarttime:"",
        sessionEndtime:"",
        amount: 0
      });
      const student = cls.student;
  const teacher = cls.teacher;

  const message = `Both the student (${student?.studentFirstName}) and the teacher (${teacher?.teacherName}) were absent for the class on ${cls.startDate} at ${cls.startTime[0]}. The session has been marked accordingly.`;

  const classSchedule = await ClassScheduleModel.findOne({
    _id: new Types.ObjectId(cls._id),
  });

  const alfstudent = await AlStudenModel.findOne({
    _id: new Types.ObjectId(classSchedule?.student.studentId),
  });

  const evaluation = await Evaluation.findOne({
    "student.studentId": alfstudent?.student.studentId,
  });

  const academicCoachId = evaluation?.academicCoachId;
  const academicCoach = await UserModel.findOne({
    _id: new Types.ObjectId(academicCoachId),
  });

  if (academicCoach?._id) {
    await sendNotification({
      messages: message,
      senderId: "system123",
      senderName: "System",
      senderEmail: "system@gmail.com",
      isRead: false,
      receiverId: [academicCoach._id.toString()],
      receiverName: [academicCoach.userName],
      receiverEmail: [academicCoach.email || "coach@default.com"],
      notificationType: "BOTH_ABSENT_ALERT",
      notificationStatus: "Unseen",
      status: "active",
      createdBy: "system",
      updatedBy: "system",
    });

    console.log(`📩 Notification sent to academic coach about both absent.`);
  }

      console.log(`❌ Class ${classId}: Both Absent — No earning`);
    }
  }
  const groupedByClassLink: Record<string, any[]> = {};

for (const cls of groupClassSchedule) {
  const link = cls.classLink;
  if (!groupedByClassLink[link]) groupedByClassLink[link] = [];
  groupedByClassLink[link].push(cls);
}

  for (const [classLink, sessions] of Object.entries(groupedByClassLink)) {
  const anyClass = sessions[0];
  const startTime = moment(anyClass.startTime?.[0], "HH:mm");
  const endTime = moment(anyClass.endTime?.[0], "HH:mm");
  const nowMoment = moment();
  const nowHHMM = nowMoment.format("HH:mm");
  const endHHMM = endTime.format("HH:mm");
  const graceDeadline = startTime.clone().add(15, "minutes");

  if (nowMoment.isBefore(graceDeadline)) {
    console.log(`⏳ Group class ${classLink}: Grace period not over yet`);
    continue;
  }

  const teacherJoined = Array.isArray(anyClass.teacher.teacherSessionStart) &&
                        anyClass.teacher.teacherSessionStart.length > 0;

  const teacherStartTime = anyClass.teacher.teacherSessionStart?.at(-1) || "";
  const teacherStartTimeList = [...(anyClass.teacher.teacherSessionStart || [])];
  let teacherEndList = [...(anyClass.teacher.teacherSessionEnd || [])];
  if (nowHHMM === endHHMM) {
  const lastTeacherStart = teacherStartTimeList.at(-1);
  const lastTeacherEnd   = teacherEndList.at(-1);

  if (
    teacherEndList.length === 0 ||
    (lastTeacherStart > lastTeacherEnd && lastTeacherEnd !== endHHMM)
  ) {
    teacherEndList.push(endHHMM);
  }
}

  const teacherEndTime = teacherEndList.at(-1) || "";

 const bulkOps: any[] = [];

for (const cls of sessions) {
  const studentJoined =
    Array.isArray(cls.student?.studnetSessionStart) &&
    cls.student.studnetSessionStart.length > 0;

 
  const updatePayload: any = {
    sessionStatus: nowHHMM === endHHMM ? "Completed" : cls.sessionStatus,
    "teacher.teacherSessionEnd": teacherEndList,
  };

 
  if (teacherJoined) {

    const duration = moment
      .duration(
        moment(teacherEndTime, "HH:mm").diff(
          moment(teacherStartTime, "HH:mm"),
        ),
      )
      .asMinutes();

    const rate = rateMap["GROUPCLASS"] || 0;
    const amount = parseFloat(((duration / 60) * rate).toFixed(2));

    console.log("[CALC]", { duration, rate, amount });

    if (studentJoined) {
      console.log("[ATTENDANCE] Student PRESENT", { sessionId: cls._id });

      Object.assign(updatePayload, {
        scheduleStatus:
          nowHHMM === endHHMM ? "Completed" : cls.scheduleStatus,
        studentAttendee: "Present",
        teacherAttendee: "Present",
        sessionStarttime: teacherStartTime,
        sessionEndtime: teacherEndTime,
        classhour: duration,
        amount,
      });
    } else {
      console.log("[ATTENDANCE] Student ABSENT", { sessionId: cls._id });

      Object.assign(updatePayload, {
        scheduleStatus: "StudentAbsent",
        studentAttendee: "Absent",
        teacherAttendee: "Present",
        sessionStarttime: teacherStartTime,
        sessionEndtime: teacherEndTime,
        classhour: duration,
        amount,
      });

      cls.__notify = {
        type: "STUDENT_ABSENT_ALERT",
        message: `Student ${cls.student?.studentFirstName ?? "Unknown Student"} was absent for the group class on ${anyClass.startDate} at ${anyClass.startTime?.[0] ?? "Unknown Time"}.`,
      };

      console.log("[NOTIFY_QUEUED]", cls.__notify);
    }
  } else {

    Object.assign(updatePayload, {
      scheduleStatus: studentJoined ? "TeacherAbsent" : "BothAbsent",
      sessionStatus:
        nowHHMM === endHHMM ? "Completed" : cls.sessionStatus,
      studentAttendee: studentJoined ? "Present" : "Absent",
      teacherAttendee: "Absent",
      classhour: 0,
      amount: 0,
      sessionStarttime: "",
      sessionEndtime: "",
    });

    cls.__notify = {
      type: "TEACHER_ABSENT_ALERT",
      message: `Teacher ${cls.teacher?.teacherName ?? "Unknown Teacher"} was absent for the group class on ${anyClass.startDate} at ${anyClass.startTime?.[0] ?? "Unknown Time"}.`,
    };

    console.log("[NOTIFY_QUEUED]", cls.__notify);
  }


  bulkOps.push({
    updateOne: {
      filter: { _id: cls._id },
      update: { $set: updatePayload },
    },
  });

  console.log("[BULK_OP_PUSHED]", { sessionId: cls._id });
}



// ✅ Do bulk update
await ClassScheduleModel.bulkWrite(bulkOps);

// ✅ Trigger notifications only AFTER update
for (const cls of sessions) {
  if (cls.__notify) {
    await sendGroupAbsentNotification(cls.__notify.type, cls.teacher, cls.student, cls.__notify.message ,cls._id);
  }
}

// ✅ Auto end logic
if (nowMoment.isSameOrAfter(endTime)) {
  await liveClassAutoEnd({ data: classLink });
}
  console.log(`✅ Group Class ${classLink}: ${teacherJoined ? "Teacher Present" : "Teacher Absent"} — Updated ${sessions.length} sessions`);
}


});
async function sendGroupAbsentNotification(type: any, user1: any, user2: any, message: any ,clsId : any) {
  console.log("🔔 Notification Type:", type);
  console.log("🧪 User1:", user1);
  console.log("🧪 User2:", user2);
  console.log("📩 Message:", message);

  // 🔍 Identify student and teacher
  const student = user1?.studentId ? user1 : user2;
  const teacher = user1?.teacherId ? user1 : user2;

  console.log("👨‍🎓 Identified Student:", student?.studentFirstName || student?.userName);
  console.log("👨‍🏫 Identified Teacher:", teacher?.teacherName || teacher?.userName);
   const classSchedule = await ClassScheduleModel.findOne({
    _id: new Types.ObjectId(clsId),
  });

  const alfstudent = await AlStudenModel.findOne({
    _id: new Types.ObjectId(classSchedule?.student.studentId),
  });
   const evaluation = await Evaluation.findOne({
    "student.studentId": alfstudent?.student.studentId,
  });

  const academicCoachId = evaluation?.academicCoachId;
  const academicCoach = await UserModel.findOne({
    _id: new Types.ObjectId(academicCoachId),
  });

  console.log("👩‍🏫 Academic Coach:", academicCoach?.userName);

  // 📦 Prepare Notification Targets
  const receivers = [
    ...(teacher?.teacherId ? [teacher.teacherId.toString()] : []),
    ...(student?.studentId ? [student.studentId.toString()] : []),
    ...(academicCoach?._id ? [academicCoach._id.toString()] : [])
  ];

  const receiverNames = [
    teacher?.teacherName,
    student?.studentFirstName,
    academicCoach?.userName
  ].filter(Boolean);

  const receiverEmails = [
    teacher?.teacherEmail || "some@gmail.com",
    student?.studentEmail || "some@gmail.com",
    academicCoach?.email || "some@gmail.com"
  ].filter(Boolean);

  console.log("📬 Final Receivers:", receivers);
  console.log("📬 Names:", receiverNames);
  console.log("📬 Emails:", receiverEmails);

  // ✅ Send the actual notification
  await sendNotification({
    messages: message,
    senderId: "system123",
    senderName: "System",
    senderEmail: "system@gmail.com",
    isRead: false,
    receiverId: receivers,
    receiverName: receiverNames,
    receiverEmail: receiverEmails,
    notificationType: type,
    notificationStatus: "Unseen",
    status: "active",
    createdBy: "system",
    updatedBy: "system"
  });

  console.log("✅ Notification sent successfully");
}


cron.schedule("0 0 * * 0", async () => {
  console.log("cron runs weekly once for add slots");
  addAditionalSlots();
});
