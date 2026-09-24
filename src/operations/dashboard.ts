import EvaluationModel from "../models/evaluation"
import classShedule from "../models/classShedule"
import recruitment from "../models/recruitment"
// import feedback from "../models/feedback"
import alstudents from "../models/alstudents"
import tenantUser from "../models/users"
import TenantModel from "../models/tenants"
import SubscriptionModel from "../models/subscription-models"
import PaymentDetailsModel from "../models/paymentDetails"
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns"
import { Types } from "mongoose"
import meetingschedule from "../models/calendar"
import { PipelineStage } from "mongoose";
import evaluation from "../models/evaluation";
import StudentModel from "../models/student";

export interface EvaluationDetails {
  academicCoach: {
    academicCoachId: string
    name: string
    email: string
  }
  student: {
    studentId: string
    name: string
    email: string
    meetingLink: string
  }
  _id: string
  classType: string
  scheduledStartDate: string
  scheduledEndDate: string
  scheduledFrom: string
  scheduledTo: string
  timeZone: string
}

export const dashboardWidgetCounts = async (
  academicId: string,
): Promise<{
  trialAssigned: number
  evaluationCompleted: number
  evaluationPending: number
  totalPending: number
}> => {
  let totalPendingClasses
  const totaltrialpending = await EvaluationModel.aggregate([
    {
      $match: {
        academicCoachId: academicId,
        trialClassStatus: "PENDING",
      },
    },
    {
      $group: {
        _id: { trialClassStatus: "$trialClassStatus" },
        count: { $sum: 1 },
      },
    },
  ])

  const totalclasspending = await StudentModel.aggregate([
    {
      $match: {
       "academicCoach.academicCoachId": academicId,
        "evaluationStatus": "PENDING",
      },
    },
    {
      $group: {
        _id: { evaluationStatus: "$evaluationStatus" },
        count: { $sum: 1 },
      },
    },
  ])

  if (totaltrialpending.length != 0 || totalclasspending.length != 0) {
    let trialPending;
    let evaluationPending; 

    totaltrialpending.length == 0? trialPending = 0 : trialPending = totaltrialpending[0].count;
    totalclasspending.length == 0? evaluationPending = 0 : evaluationPending = totalclasspending[0].count
    totalPendingClasses = trialPending + evaluationPending;
  }

  // Execute all count queries in parallel
  const [trialclassAssigned, evaluationCompletedCount, evaluationPendingCount, totalPendingCount] = await Promise.all([
    // Count candidates with meeting status
    await EvaluationModel.countDocuments({
      academicCoachId: academicId,
      trialClassStatus: "PENDING",
    }).exec(),

    // Count candidates with evaluation status
    EvaluationModel.countDocuments({
      academicCoachId: academicId,
      "student.evaluationStatus": "COMPLETED", // Changed to uppercase if that's how it's stored in DB
    }).exec(),

    StudentModel.countDocuments({
      "academicCoach.academicCoachId": academicId,
      "evaluationStatus": "PENDING", // Changed to uppercase if that's how it's stored in DB
    }).exec(),

    // Count active candidates
    totalPendingClasses,
  ])
  return {
    trialAssigned: trialclassAssigned,
    evaluationCompleted: evaluationCompletedCount,
    evaluationPending: evaluationPendingCount,
    totalPending: totalPendingClasses || 0,
  }
}



export async function dashboardWidgetTeacherCounts(teacherId: string) {
  try {
    if (!teacherId || !Types.ObjectId.isValid(teacherId)) {
      throw new Error("Invalid teacher ID");
    }

    function parseDateTime(date: Date | string, time: string) {
      if (!date || !time) return null;
      const dateStr = date instanceof Date ? date.toISOString().split("T")[0] : date.split("T")[0];
      const dt = new Date(`${dateStr}T${time}:00`);
      return isNaN(dt.getTime()) ? null : dt;
    }

    function parseAmount(amount: string | number) {
      if (!amount) return 0;
      if (typeof amount === "number") return amount;
      return parseFloat(amount.toString().replace(/[$,]/g, "")) || 0;
    }

    const classes = await classShedule.find({
      "teacher.teacherId": teacherId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    }).lean();

    let totalClasses = 0;
    let totalHours = 0;
    let totalEarnings = 0;
    const allStudents = new Set<string>();

    const groupClassMap = new Map<string, { hours: number; earning: number; students: Set<string> }>();

    for (const cls of classes) {
      const isGroup = cls.sessionClassType === "GROUPCLASS";

      if (isGroup) {
        // Create unique key per group session
        const key = cls.classLink + "_" + cls.startDate.toString();
        if (!groupClassMap.has(key)) {
          // Compute total hours for this session
          let classHours = 0;
          if (Array.isArray(cls.startTime) && Array.isArray(cls.endTime) && cls.startTime.length === cls.endTime.length) {
            for (let i = 0; i < cls.startTime.length; i++) {
              const startDT = parseDateTime(cls.startDate, cls.startTime[i]);
              const endDT = parseDateTime(cls.startDate, cls.endTime[i]);
              if (!startDT || !endDT) continue;
              classHours += (endDT.getTime() - startDT.getTime()) / 36e5;
            }
          }
          const earning = parseAmount(cls.earnings || cls.amount);

          // Add group session once
          totalClasses += 1;
          totalHours += classHours;
          totalEarnings += earning;

          // Add group data
          groupClassMap.set(key, { hours: classHours, earning, students: new Set<string>() });
        }

        // Add students
        const groupData = groupClassMap.get(key)!;
        if (Array.isArray(cls.student)) {
          cls.student.forEach((s: any) => s.studentId && groupData.students.add(s.studentId));
        } else if (cls.student?.studentId) {
          groupData.students.add(cls.student.studentId);
        }

      } else {
        // Regular class
        const startDT = parseDateTime(cls.startDate, cls.startTime);
        const endDT = parseDateTime(cls.startDate, cls.endTime);
        if (!startDT || !endDT) continue;

        const hours = (endDT.getTime() - startDT.getTime()) / 36e5;
        const earning = parseAmount(cls.earnings || cls.amount);

        totalClasses += 1;
        totalHours += hours;
        totalEarnings += earning;

        if (cls.student?.studentId) allStudents.add(cls.student.studentId);
      }
    }

    // Merge all students from group classes
    for (const groupData of groupClassMap.values()) {
      groupData.students.forEach(s => allStudents.add(s));
    }

    return {
      totalclasses: totalClasses,
      totalhours: Number(totalHours.toFixed(2)),
      totalearnings: Math.round(totalEarnings * 100) / 100, // keep 2 decimal
      totalstudents: allStudents.size
    };

  } catch (error) {
    console.error("Error in dashboardWidgetTeacherCounts:", error);
    throw error;
  }
}







// export const dashboardWidgetStudentCounts = async (
//   studentId: string,
//   courseName: string // Pass course name dynamically from query
// ): Promise<{
//   totalLevel: number
//   totalAttendance: number
//   totalClasses: number
//   totalDuration: number
// }> => {
//   // Step 1: Get student record from alstudents
//   const studentRecord = await alstudents.findOne({
//     _id: studentId,
//     "course.courseName": courseName,
//   }).exec();

//   // Step 2: Calculate attendance: present and total class counts
//   const [presentCount, totalClassCount] = await Promise.all([
//     classShedule.countDocuments({
//       "student.studentId": studentId,
//       "course.courseName": courseName,
//       "studentAttendee": "present",
//     }).exec(),

//     classShedule.countDocuments({
//       "student.studentId": studentId,
//       "course.courseName": courseName,
//     }).exec(),
//   ]);

//   const totalAttendance =
//     totalClassCount > 0 ? (presentCount / totalClassCount) * 100 : 0;

//   // Step 3: Get totalDuration (accomplished hours from EvaluationModel)
//   // let totalDuration = 0;
//   // if (internalStudentId) {
//   //   const accomplishedHours = await EvaluationModel.aggregate([
//   //     {
//   //       $match: {
//   //         "student.studentId": internalStudentId,
//   //       },
//   //     },
//   //     {
//   //       $group: {
//   //         _id: null,
//   //         totalAccomplishedHours: {
//   //           $sum: "$student.accomplishedHours", // Update if the field is different
//   //         },
//   //       },
//   //     },
//   //   ]);

//   //   totalDuration = accomplishedHours[0]?.totalAccomplishedHours || 0;
//   // }

//   const totalLevel = studentRecord?.level || 1; 

//   // Step 5: Return final metrics
//   return {
//     totalLevel,
//     totalAttendance: parseFloat(totalAttendance.toFixed(2)),
//     totalClasses: totalClassCount,
//     // totalDuration,
//   };
// };


//pass the studentId and course from query
export const dashboardWidgetStudentCounts = async (
  studentId: string,
  courseName: string
): Promise<{
  totalLevel: string;
  totalAttendance: number;
  totalClasses: number;
  totalDuration: number;
}> => {
  console.log(`Fetching dashboard widget counts for studentId: ${studentId}, courseName: ${courseName}`);

  // Step 1: Get student record from alstudents
  const studentRecord = await alstudents.findOne({ _id: studentId }).exec();
  console.log("Student Record:", studentRecord);

  // Step 2: Get attendance counts from classShedule
  const presentCount = await classShedule.countDocuments({
    "student.studentId": studentId,
    "course.courseName": courseName,
    "student.attendee": "present",
  }).exec();
  console.log("Present Count:", presentCount);

  const totalClassCount = await classShedule.countDocuments({
    "student.studentId": studentId,
    "course.courseName": courseName,
  }).exec();
  console.log("Total Class Count:", totalClassCount);

  const attendancePercentage =
    totalClassCount > 0 ? (presentCount / totalClassCount) * 100 : 0;
  console.log("Attendance Percentage:", attendancePercentage);

  // Step 3: Get accomplishmentTime from evaluation
  let totalDuration = 0;

  if (studentRecord?.student?.studentId) {
    const innerStudentId = studentRecord.student.studentId;
    console.log("Inner Student ID for evaluation lookup:", innerStudentId);

    const evaluationRecord = await evaluation.findOne({
      "student.studentId": innerStudentId,
    }).exec();

    console.log("Evaluation Record:", evaluationRecord);

    totalDuration = Number(evaluationRecord?.accomplishmentTime) || 0;
  } else {
    console.log("No valid studentRecord.student.studentId found");
  }

  // Step 4: Return all the values
  const totalLevel = studentRecord?.level || "1";
  console.log("Total Level:", totalLevel);
  console.log("Total Duration:", totalDuration);

  return {
    totalLevel,
    totalAttendance: attendancePercentage,
    totalClasses: totalClassCount,
    totalDuration,
  };
};

export const dashboardWidgetSupervisorCounts = async (
): Promise<{
  totalApplication: number
  shortlisted: number
  rejected: number
  waiting: number
  shortlistedPercentage: number
  rejectedPercentage: number
  waitingPercentage: number
}> => {
  // Fetch counts in parallel
  const [shortlisted, rejected, waiting, totalApplication] = await Promise.all([
    recruitment
      .countDocuments({ applicationStatus: "SHORTLISTED" })
      .exec(),
    recruitment
      .countDocuments({ applicationStatus: "REJECTED" })
      .exec(),
    recruitment
      .countDocuments({ applicationStatus: "WAITING" })
      .exec(),
    recruitment.countDocuments().exec(),
  ])

  const shortlistedPercentage = (shortlisted / totalApplication) * 100
  const rejectedPercentage = (rejected / totalApplication) * 100
  const waitingPercentage = (waiting / totalApplication) * 100

  return {
    totalApplication,
    shortlisted,
    rejected,
    waiting,
    shortlistedPercentage,
    rejectedPercentage,
    waitingPercentage,
  }
}

export const dashboardCardCount = async (): Promise<{
  totalStudents: number
  maleStudents: number
  femaleStudents: number
  totalTeachers: number
  maleTeachers: number
  femaleTeachers: number
  totalStaffs: number
  maleStaffs: number
  femaleStaffs: number
}> => {
  // Fetch active students
  const students = await alstudents.find({ status: "Active" })
  const totalStudents = students.length
  const maleStudents = students.filter((student) => student.student.gender === "Male").length
  const femaleStudents = students.filter((student) => student.student.gender === "Female").length

  // Fetch active teachers from tenantUser
  const teachers = await tenantUser.find({ role: "TEACHER", status: "Active" })
  const totalTeachers = teachers.length
  const maleTeachers = teachers.filter((teacher) => teacher.gender === "Male").length
  const femaleTeachers = teachers.filter((teacher) => teacher.gender === "Female").length

  // Fetch other staff members from tenantUser
  const staffs = await tenantUser.find({
    role: { $in: ["SUPERVISOR", "ACADEMICCOACH"] },
    status: "Active",
  })
  const totalStaffs = staffs.length
  const maleStaffs = staffs.filter((staff) => staff.gender === "Male").length
  const femaleStaffs = staffs.filter((staff) => staff.gender === "Female").length

  return {
    totalStudents,
    maleStudents,
    femaleStudents,
    totalTeachers,
    maleTeachers,
    femaleTeachers,
    totalStaffs,
    maleStaffs,
    femaleStaffs,
  }
}

export const totalTrialRequestCount = async (): Promise<{
  totalTrialRequest: number
  pendingRequest: number
  pendingRequestPercentage: number
  joinedStudents: number
  joinedStudentsPercentage: number
  notJoinedStudents: number
  notJoinedrequestPercentage: number
}> => {
  const totalTrialRequestCount = await EvaluationModel.find({ status: "Active" }).exec()
  const totalTrialRequest = totalTrialRequestCount.length
  const pendingRequest = totalTrialRequestCount.filter((trialClass) => trialClass.trialClassStatus === "PENDING").length
  const joinedStudents = totalTrialRequestCount.filter((trialClass) => trialClass.studentStatus === "JOINED").length
  const notJoinedStudents = totalTrialRequestCount.filter(
    (trialClass) => trialClass.studentStatus === "NOTJOINED",
  ).length

  const pendingRequestPercentage = (pendingRequest / totalTrialRequest) * 100
  const joinedStudentsPercentage = (joinedStudents / totalTrialRequest) * 100
  const notJoinedrequestPercentage = (notJoinedStudents / totalTrialRequest) * 100

  return {
    totalTrialRequest,
    pendingRequest,
    pendingRequestPercentage,
    joinedStudents,
    joinedStudentsPercentage,
    notJoinedStudents,
    notJoinedrequestPercentage,
  }
}

export const totalClassCount = async (dateRange: string) => {
  let startDate: Date;
  let endDate: Date = new Date();

  switch (dateRange.toLowerCase()) {
    case "yearly":
      startDate = startOfYear(new Date());
      endDate = endOfYear(new Date());
      break;
    case "monthly":
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
      break;
    case "weekly":
      startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      break;
    default:
      throw new Error("Invalid dateRange value. Use 'weekly', 'monthly', or 'yearly'.");
  }

  console.log(`Fetching results from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const result = await classShedule.aggregate([
    {
      $match: {
        status: "Active",
        startDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$scheduleStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  console.log("Aggregation Result:", result);

  const finalResult = {
    classCompleted: 0,
    classScheduled: 0,
    classRescheduled: 0,
    classCancelled: 0,
  };

  result.forEach(({ _id, count }) => {
    if (_id === "Completed") finalResult.classCompleted += count;
    if (_id === "Scheduled") finalResult.classScheduled += count;
    if (_id === "Rescheduled") finalResult.classRescheduled += count;
    if (_id === "Cancelled") finalResult.classCancelled += count;
  });

  console.log("Final Result:", finalResult);
  return finalResult;
};

export const acUpcomingClassList = async (academicCoachId: string) => {
  // All upcoming classes from the start of today (inclusive) and beyond
  const startOfTodayUTC = new Date()
  startOfTodayUTC.setUTCHours(0, 0, 0, 0)

  const getUpcomingClass = await meetingschedule
    .find({
      ["academicCoach.academicCoachId"]: academicCoachId,
    })
    .sort({ scheduledStartDate: 1, scheduledFrom: 1 })

  const upcomingClass: EvaluationDetails[] = getUpcomingClass.map((item: any) => ({
    academicCoach: {
      academicCoachId: item.academicCoach?.academicCoachId || "",
      name: item.academicCoach?.name || "",
      email: item.academicCoach?.email || "",
    },
    student: {
      studentId: item.student?.studentId || "",
      name: item.student?.name || "",
      email: item.student?.email || "",
      meetingLink: item.meetingLink || "",
    },
    _id: item._id?.toString(),
    classType: item.classType || "",
    scheduledStartDate: item.scheduledStartDate || "",
    scheduledEndDate: item.scheduledEndDate || "",
    scheduledFrom: item.scheduledFrom || "",
    scheduledTo: item.scheduledTo || "",
    timeZone: item.timeZone || "",
  }))
console.log("upcomingClass>>>>>", upcomingClass);
  return upcomingClass
}

export const getTeacherAttendanceGet = async () => {
const teachers = await tenantUser.find({ role: "TEACHER", status: "Active" }).lean();
const maleTeachers = teachers.filter(t => t.gender === "Male");
const femaleTeachers = teachers.filter(t => t.gender === "Female");


const currentDate = new Date();
const formattedDate = currentDate.toISOString().split("T")[0];
const startOfDayIST = `${formattedDate}T00:00:00.000+00:00`;
const endOfDayIST = `${formattedDate}T23:59:59.999+00:00`;

const todaySessions = await classShedule.find({
  startDate: { $gte: startOfDayIST, $lte: endOfDayIST },
  sessionStatus: "Completed",
}).lean();


const presentTeacherIds = todaySessions
  .filter(s => s.teacherAttendee == "present")
  .map(s => s.teacher.teacherId);

const malePresentCount = maleTeachers.filter(
  t => t.userId && presentTeacherIds.includes(t.userId)
).length;

const femalePresentCount = femaleTeachers.filter(
  t => t.userId && presentTeacherIds.includes(t.userId)
).length;

const maleAbsentCount = maleTeachers.length - malePresentCount;
const femaleAbsentCount = femaleTeachers.length - femalePresentCount;

return {
  totalTeachers: teachers.length,
  maleTeachers: maleTeachers.length,
  femaleTeachers: femaleTeachers.length,
  maleAttendancePresent: malePresentCount,
  maleAttendanceAbsent: maleAbsentCount,
  femaleAttendancePresent: femalePresentCount,
  femaleAttendanceAbsent: femaleAbsentCount,
};

}



export const getSuperAdminTenantDashboardCards = async (): Promise<{
 totalTenants: number,
 totalRevenue: number,
 Subscription: number,
 pending: number,
 subscriptionTypes: {
   planType: string,
   count: number,
   percentage: number,
 }[],
}> => {
  const [totalTenants, pendingTenants, paymentRecords, subscriptionStatusCounts, activeSubscriptionCount] = await Promise.all([
    TenantModel.countDocuments().exec(),
    TenantModel.countDocuments({ status: { $in: ["Active", "Inactive"] } }).exec(),
    PaymentDetailsModel.find({ paymentStatus: { $in: ["Paid", "PAID"] } }).lean().exec(),
    SubscriptionModel.aggregate([
      {
        $group: {
          _id: "$planName",
          count: { $sum: 1 },
        },
      },
    ]).exec(),
    SubscriptionModel.countDocuments({ subscriptionStatus: { $in: ["ACTIVE", "TRIALS"] } }).exec(),
  ])

  const totalRevenue = paymentRecords.reduce((sum, payment) => {
    const amount = Number(String(payment.paymentAmount).replace(/[^0-9.-]+/g, "")) || 0
    return sum + amount
  }, 0)

  const totalSubscriptions = subscriptionStatusCounts.reduce((sum, item) => sum + item.count, 0)

  const subscriptionTypes = subscriptionStatusCounts.map((item) => ({
    planType: item._id,
    count: item.count,
    percentage: totalSubscriptions > 0 ? Number(((item.count / totalSubscriptions) * 100).toFixed(2)) : 0,
  }))

  return {
    totalTenants,
    totalRevenue,
    Subscription: activeSubscriptionCount,
    pending: pendingTenants,
    subscriptionTypes,
  };

}