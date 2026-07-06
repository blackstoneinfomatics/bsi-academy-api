import { Types } from "mongoose";
import { IClassSchedule, IClassScheduleCreate } from "../../types/models.types";

import ClassScheduleModel from "../models/classShedule";
import UserModel from "../models/users";

import AppLogger from "../helpers/logging";
import { AssignmentStatus, GetAllRecordsParams } from "../shared/enum";
import { alstudentsMessages, commonMessages } from "../config/messages";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import moment from "moment";
import classShedule from "../models/classShedule";
import { badRequest } from "@hapi/boom";
import Evaluation from "../models/evaluation";
import AlStudenModel from "../models/alstudents";
import Course from "../models/course";
import Calendar from "../models/calendar";
import {
  endOfMonth,
  startOfMonth,
  subMonths,
  eachMonthOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  startOfDay,
  subWeeks,
  endOfDay,
  subDays,
} from "date-fns";
import assignment from "../models/assignments";
import { sendNotification } from "./notification";
import { getIO } from "../shared/socket";
import realtimemessage from "../models/realtimemessage";
import dayjs from "dayjs";
import { all } from "axios";
import evaluation from "../models/evaluation";

type AssignmentItem = {
  assignmentId: string;
  assignmentName: string;
  assignmentType:
    | "quiz"
    | "writing"
    | "reading"
    | "image identification"
    | "word match"
    | "reading comprehension";
  title: string;
  assignedDate: Date;
  dueDate: Date;
  questionName: string;
  questionType: string;
  typeofQuestion?: string;
  assignmentStatus:
    | "Assigned"
    | "Not Assigned"
    | "Completed"
    | "Not Completed"
    | "Pending";
};
/**
 * Creates a new candidate record in the database.
 *
 * @param {IClassScheduleCreate} payload - The data required to create a new candidate record.
 * @returns {Promise<IClassSchedule | null>} A promise that resolves to the created candidate record, or null if the creation fails.
 */

// Helper function to get dates for specific weekdays between two dates
const getDatesForWeekdays = (
  startDate: Date,
  endDate: Date,
  targetDay: number
): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (currentDate.getDay() === targetDay) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const updateStudentClassSchedule = async (
  id: any,
  payload: Partial<IClassScheduleCreate>
) => {
  const {
    classDay,
    startTime,
    endTime,
    startDate,
    endDate,
    student,
    teacher,
    classLink,
    course,
  } = payload;

  const alfurqanStudent = await AlStudenModel.findOne({
    _id: new Types.ObjectId(id),
  }).exec(); // 🧠 Extract reference values from the first student
  const courseDetails = await Course.findOne({courseName : course}).exec();
  if(!courseDetails){
    throw new Error("Course details are required.");
  }
  if (!student) {
    throw new Error("Student details are required.");
  }

  // Optional: validate day/time array lengths
  if (
    !classDay ||
    !startTime ||
    !endTime ||
    !startDate ||
    !endDate ||
    //classDay.length !== startTime.length ||
    startTime.length !== endTime.length
  ) {
    throw new Error(
      "classDay, startTime, endTime, startDate, and endDate must be provided and arrays must match in length."
    );
  }
  const results = [];
  let saved;
  for (let i = 0; i < classDay.length; i++) {
    const day = classDay[i];
    const start = startTime[i];
    const end = endTime[i];

    const dayIndex = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ].indexOf(day);
    if (dayIndex === -1) throw new Error(`Invalid classDay: ${day}`);

    const classDates = getDatesForWeekdays(
      new Date(startDate),
      new Date(endDate),
      dayIndex
    );

    for (const classDate of classDates) {
      if (payload.sessionClassType === "GROUPCLASS") {
        const duplicate = await ClassScheduleModel.findOne({
          "student.id": alfurqanStudent?._id.toString(),
          startDate: classDate,
          endDate: classDate,
          classDay: day,
          package: payload.package,
          startTime: start,
          endTime: end,
          sessionClassType: "GROUPCLASS",
          status: "Active",
        }).exec();

        if (duplicate) {
          console.log(`Duplicate found for ${day} ${classDate} — skipping.`);
          continue; // Skip creating this duplicate
        }
      }

      const newClassSchedule = new ClassScheduleModel({
        student: {
          id: alfurqanStudent?._id.toString(),
          studentId: alfurqanStudent?.student.studentId,
          studentFirstName: alfurqanStudent?.username,
          studentLastName: alfurqanStudent?.username,
          studentEmail: alfurqanStudent?.student.studentEmail,
          gender: alfurqanStudent?.student.gender,
          level: alfurqanStudent?.level,
        },
        teacher: {
          teacherId: teacher?.teacherId,
          teacherName: teacher?.teacherName,
          teacherEmail: teacher?.teacherEmail,
        },
        classLink: classLink,
        classDay: day,
        startTime: start,
        endTime: end,
        sessionClassType: payload.sessionClassType || "",
        sessionStarttime: payload.sessionStarttime || "",
        sessionsEndtime: payload.sessionsEndtime || "",
        sessionStatus: "NotCompleted",
        course: {
          courseId: courseDetails?._id.toString(),
          courseName: courseDetails?.courseName,
        },
        package: payload.package,
        startDate: classDate,
        endDate: classDate,
        createdBy: new Date(),
        status: "Active",
        scheduleStatus: payload.scheduleStatus,
        totalHourse: payload.totalHourse,
        preferedTeacher: payload.preferedTeacher,
      });

      await createEvent(newClassSchedule);
      saved = await newClassSchedule.save();
    }
  }
  return results.push(saved);
};

export const getAllClassShedule = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; students: IClassSchedule[] }> => {
  const { searchText, sortBy, sortOrder, offset, limit, filterValues } = params;

  // Construct query object based on filters
  const query: any = {};

  if (searchText?.trim()) {
    const escapedSearch = searchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const searchRegex = new RegExp(escapedSearch, "i");
    const isDate = !isNaN(Date.parse(searchText));
    const orConditions: any[] = [
      { "student.studentFirstName": searchRegex },
      { "student.studentLastName": searchRegex },
      { "student.studentEmail": searchRegex },
      { "teacher.teacherName": searchRegex },
      { "teacher.teacherEmail": searchRegex },
      { "course.courseName": searchRegex },
      { classDay: searchRegex },
      { scheduleStatus: searchRegex },
    ];

    // Only add phone number if searchText is a number
    if (!isNaN(Number(searchText))) {
      orConditions.push({ candidatePhoneNumber: Number(searchText) });
    }

    if (isDate) {
      const date = new Date(searchText);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      orConditions.push({ applicationDate: { $gte: date, $lt: nextDay } });
    }

    query.$or = orConditions;
  }

  // Add filters to the query
  if (filterValues?.course?.courseName) {
    const values = Array.isArray(filterValues.course.courseName)
      ? filterValues.course.courseName
      : [filterValues.course.courseName];
    if (values.length > 0) {
      query["course.courseName"] = {
        $in: values.map((v) => new RegExp(`^${v}$`, "i")),
      };
    }
  }
  if (filterValues?.sessionClassType) {
    const values = Array.isArray(filterValues.sessionClassType)
      ? filterValues.sessionClassType
      : [filterValues.sessionClassType];
    if (values.length > 0) {
      query["sessionClassType"] = {
        $in: values.map((v) => new RegExp(`^${v}$`, "i")),
      };
    }
  }

  // --- scheduleStatus filter ---
  if (filterValues?.scheduleStatus) {
    const values = Array.isArray(filterValues.scheduleStatus)
      ? filterValues.scheduleStatus
      : [filterValues.scheduleStatus];
    if (values.length > 0 && values[0]) {
      query["scheduleStatus"] = {
        $in: values.map((v) => new RegExp(`^${v}$`, "i")),
      };
    }
  }

  // --- startTime filter ---
  if (filterValues?.startTime) {
    const values = Array.isArray(filterValues.startTime)
      ? filterValues.startTime
      : [filterValues.startTime];
    // Remove empty/undefined values
    const cleaned = values.filter(
      (v) => typeof v === "string" && v.trim().length > 0
    );
    if (cleaned.length > 0) {
      // Use exact match (case-insensitive) for each time string
      query["startTime"] = {
        $in: cleaned.map((v) => new RegExp(`^${v}$`, "i")),
      };
    }
  }

  // --- Date Range filter (use startDate) ---
  if (
    filterValues?.dateRange?.from &&
    filterValues?.dateRange?.to &&
    !isNaN(Date.parse(filterValues.dateRange.from)) &&
    !isNaN(Date.parse(filterValues.dateRange.to))
  ) {
    const fromDate = new Date(filterValues.dateRange.from);
    const toDate = new Date(filterValues.dateRange.to);
    toDate.setHours(23, 59, 59, 999);
    query.startDate = {
      // <-- Correct field name
      $gte: fromDate,
      $lte: toDate,
    };
  }

  console.log("Constructed Query:", JSON.stringify(query, null, 2)); // Log the constructed query

  // Sorting options
  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  // Create the query with sorting
  const studentQuery = ClassScheduleModel.find(query).sort(sortOptions);

  // Execute the query and count concurrently
  const [students, totalCount] = await Promise.all([
    studentQuery.exec(), // Fetch students with pagination
    ClassScheduleModel.countDocuments(query).exec(), // Count total records
  ]);

  // Log successful retrieval
  AppLogger.info(alstudentsMessages.GET_ALL_LIST_SUCCESS, {
    totalCount: totalCount,
  });

  // Return total count and fetched students
  return { totalCount, students };
};

export const requestReschedule = async (payload: any) => {
  try {
    const classSchedule = await ClassScheduleModel.findOne({
      _id: new Types.ObjectId(payload._id),
    });
    const alfstudent = await AlStudenModel.findOne({
      _id: new Types.ObjectId(classSchedule?.student.id),
    });
    const evaluation = await Evaluation.findOne({
      "student.studentId": alfstudent?.student.studentId,
    });
    const oldresult = await ClassScheduleModel.findOne({
      _id: new Types.ObjectId(payload._id),
    }).exec();
    const rescheduleResult = await ClassScheduleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(payload._id) },
      { $set: { scheduleStatus: "Reschedulerequested" } },
      { new: true }
    );
    const academicCoachId = evaluation?.academicCoachId;
    const academicCoach = await UserModel.findOne({
      _id: new Types.ObjectId(academicCoachId),
    });
    const requestName =
      payload.requestedBy === "student"
        ? classSchedule?.student.studentFirstName
        : classSchedule?.teacher.teacherName;
    const requestUserId =
      payload.requestedBy === "student"
        ? classSchedule?.student.studentId
        : classSchedule?.teacher.teacherId;
    const requestEmail =
      payload.requestedBy === "student"
        ? classSchedule?.student.studentEmail
        : classSchedule?.teacher.teacherEmail;
    const message = `${requestName} (${payload.requestedBy}) has requested to reschedule class on ${classSchedule?.startDate} at ${classSchedule?.startTime[0]}.`;
    // Arrange message content for better readability:
    const messageContent =
      `Requesting to reschedule class:\n` +
      `- From: ${oldresult?.startDate} ${oldresult?.startTime[0]} to ${classSchedule?.startDate} at ${classSchedule?.startTime[0]}\n` +
      `- Time Change: from ${classSchedule?.endTime[0]} to ${payload.requestDate} at ${payload.fromTime} - ${payload.toTime}\n` +
      `Comment: ${payload.comment}`;
    if (rescheduleResult) {
      await sendNotification({
        messages: message,
        senderId: requestUserId?.toString(),
        senderName: requestName,
        senderEmail: requestEmail,
        isRead: false,
        receiverId: [academicCoach?._id.toString()],
        receiverName: [academicCoach?.userName],
        receiverEmail: [academicCoach?.email],
        notificationType: `REQUEST_RESCHEDULE_${payload.requestedBy.toUpperCase()}`,
        notificationStatus: "Unseen",
        status: "active",
        createdBy: "system",
        updatedBy: "system",
      });
      const newMessage = new realtimemessage({
        messages: messageContent,
        isRead: false,
        senderId: requestUserId?.toString(),
        senderName: requestName,
        senderEmail: requestEmail ?? "",
        receiverId: academicCoach?._id,
        receiverName: academicCoach?.userName,
        receiverEmail: academicCoach?.email ?? "",
        notificationStatus: "Unseen",
        status: payload.status ?? "",
        createdDate: new Date(),
        createdBy: "System",
        updatedDate: new Date(),
        updatedBy: "System",
      });
      const savedMessage = await newMessage.save();
      const io = getIO();
      io.to(newMessage.receiverId).emit("newmessage", savedMessage);
      AppLogger.info(`Notification(s) sent: ${JSON.stringify(savedMessage)}`);
    }
    return {
      success: true,
      message: "Class reschedule requested successfully",
    };
  } catch (error: any) {
    console.error("Error in requestReschedule:", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};

export interface IClassScheduleUpdate {
  student: {
    id: string;
    studentId: string;
    studentFirstName: string;
    studentLastName: string;
    studentEmail: string;
    gender: string;
    level: string;
    studnetSessionStart: any;
    studnetSessionEnd: any;
  };
  teacher: {
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    teacherSessionStart: any;
    teacherSessionEnd: any;
  };
}

export const updateClassAttendanceById = async (
  id: string,
  payload: Partial<IClassScheduleUpdate>
): Promise<IClassSchedule | null> => {
  return ClassScheduleModel.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    {
      $set: {
        ...payload,
      },
    },
    { new: true }
  ).lean() as unknown as IClassSchedule | null;
};

export const getAllClassSheduleById = async (
  _id: string
): Promise<IClassSchedule | null> => {
  return ClassScheduleModel.findOne({
    _id: new Types.ObjectId(_id),
  }).lean() as Promise<IClassSchedule | null>;
};

const {
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_TENANT_ID,
}: any = process.env;

// Initialize Azure Credential
const credential = new ClientSecretCredential(
  MICROSOFT_TENANT_ID,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET
);

// Initialize Microsoft Graph Client
const client = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async (): Promise<string> => {
      const tokenResponse = await credential.getToken(
        "https://graph.microsoft.com/.default"
      );
      return tokenResponse.token;
    },
  },
});

// Create Event Function
async function createEvent(newClassSchedule: any): Promise<void> {
  console.log("newClassSchedule>>>>", newClassSchedule);
  const event = {
    subject: "Team Meeting",
    body: {
      contentType: "HTML",
      content: "Discuss project updates and next steps.",
    },
    start: {
      dateTime: new Date(newClassSchedule.startDate).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: new Date(newClassSchedule.endDate).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    location: {
      displayName: "Conference Room 1",
    },
    attendees: [
      {
        emailAddress: {
          address: newClassSchedule.student.studentEmail,
          name: newClassSchedule.studentFirstName,
        },
        type: "required",
      },
      {
        emailAddress: {
          address: newClassSchedule.teacher.teacherEmail,
          name: newClassSchedule.teacher.teacherEmail,
        },
        type: "required",
      },
    ],
    allowNewTimeProposals: true,
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
  };

  try {
    const userId = "tech@alfurqan.academy";
    const response = await client
      .api(`/users/${userId}/calendar/events`)
      .post(event);
    console.log("Event created successfully:", response.id);

    console.log("Event created successfully:", response.id);
  } catch (error: any) {
    console.error("Error creating event:", error);
    if (error) {
      console.error("Response body:", error);
      console.error("Response headers:", error);
    } else {
      console.error("Error message:", error);
    }
  }
}

//
export const updateClassscheduleById = async (
  id: string,
  payload: Partial<IClassScheduleCreate>
): Promise<IClassSchedule | null> => {
  console.log("Fetching existing class for ID:", id);

  // Fetch the existing class schedule from the database
  const existingClass = await ClassScheduleModel.findById(id);
  if (!existingClass) {
    console.error("Class schedule not found for ID:", id);

    throw new Error("Class schedule not found");
  }

  return ClassScheduleModel.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    {
      $set: {
        ...payload,
      },
    },
    { new: true }
  ).lean() as unknown as IClassSchedule | null;
};

// Helper function to convert "HH:MM AM/PM" to minutes
const convertTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) {
    console.error("Invalid time string:", timeStr);
    return NaN;
  }

  // Fix formatting issue if time uses "." instead of ":"
  timeStr = timeStr.replace(".", ":");

  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (isNaN(hours) || isNaN(minutes)) {
    console.error("Invalid time format:", timeStr);
    return NaN;
  }

  return hours * 60 + minutes;
};

// Function implementation:
export const getClassesForStudent = async (
  params: GetAllRecordsParams
): Promise<
  { totalCount: number; classSchedule: IClassSchedule[] } | { error: any }
> => {
  const {
    studentId,
    sortBy = "_id",
    sortOrder = "asc",
    offset = 1,
    limit = 10,
  } = params;

  if (!studentId) {
    return {
      error: badRequest("Student id is Required"),
    };
  }
  // Query filtering for studentId
  const query: any = { "student.id": studentId };
  console.log(">>", query);

  // Sorting options
  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  try {
    // Pagination calculations
    const skip = Math.max(0, (Number(offset) - 1) * Number(limit));

    // Execute queries
    const [classSchedule, totalCount] = await Promise.all([
      ClassScheduleModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      ClassScheduleModel.countDocuments(query).exec(),
    ]);

    return { totalCount, classSchedule };
  } catch (error) {
    console.error("Error fetching classes for student:", error);
    throw new Error("Failed to fetch classes for the student");
  }
};

export const getClassesForTeacher = async (params: GetAllRecordsParams) => {
  const {
    teacherId,
    offset,
    limit,
  } = params;

  if (!teacherId) {
    throw new Error("Teacher ID is required");
  }

  // ✅ SAFE PAGINATION
  const page = Math.max(1, Number(offset) || 1);
  const pageSize = Math.max(1, Number(limit) || 10);
  const skip = (page - 1) * pageSize;

  try {
    const pipeline = [
  {
    $facet: {
      /* ================= GROUP CLASSES ================= */
      groupClasses: [
        { $match: { sessionClassType: "GROUPCLASS","teacher.teacherId": teacherId }   },

        {
          $unwind: "$classDay"
        },

        {
          $unwind: "$startTime"
        },

        {
          $unwind: "$endTime"
        },

        {
          $group: {
            _id: {
              classLink: "$classLink",
              classDay: "$classDay",
              startDate: "$startDate",
              startTime: "$startTime"
            },

            classLink: { $first: "$classLink" },
            sessionClassType: { $first: "$sessionClassType" },
            scheduleStatus: { $first: "$scheduleStatus" },

            course: { $first: "$course" },

            classDay: { $first: "$classDay" },
            startDate: { $first: "$startDate" },
            endDate: { $first: "$endDate" },

            startTime: { $first: "$startTime" },
            endTime: { $first: "$endTime" },

            student: {
              $push: {
                student: "$student",
                status: "$status",
                sessionStatus: "$sessionStatus",
                earnings: "$earnings"
              }
            }
          }
        },

        {
          $project: {
            _id: "$classLink",
            classLink: 1,
            sessionClassType: 1,
            scheduleStatus: 1,
            course: 1,
            classDay: ["$classDay"],
            startDate: 1,
            endDate: 1,
            startTime: ["$startTime"],
            endTime: ["$endTime"],
            student: 1
          }
        }
      ],

      /* ================= REGULAR CLASSES ================= */
      regularClasses: [
        { $match: { sessionClassType: "REGULARCLASS" ,"teacher.teacherId": teacherId} }
      ]
    }
  },

  /* ================= MERGE BOTH ================= */
  {
    $project: {
      classScheduleList: {
        $concatArrays: ["$groupClasses", "$regularClasses"]
      }
    }
  },

  { $unwind: "$classScheduleList" },

  {
    $replaceRoot: {
      newRoot: "$classScheduleList"
    }
  }
];

 const classScheduleList = await ClassScheduleModel.aggregate(pipeline);
const trialclasses = await Calendar.aggregate([
  {
    $match: {
      "teacher.teacherId": teacherId
    }
  },
  {
    $project: {
      _id: 0,
      id: "$_id",
      trialId: 1,
      classType: 1,

      student: {
        id: "$student.studentId",
        studentId: "$student.studentId",
        studentName: "$student.name"
      },
      course: {
        courseId: "$course.courseId",
        courseName: "$course.courseName"},
      meetingLink: 1,
      scheduledStartDate: 1,
      scheduledEndDate: 1,
      scheduledFrom: 1,
      scheduledTo: 1,
      meetingStatus: 1,
      trialClassStatus:1,
    }
  }
]);
const response = {
  totalCount: classScheduleList.length,
  classScheduleList,
  trialclasses // fetched separately
};

return response; 
  
  } catch (error) {
    console.error("Error fetching classes:", error);
    throw new Error("Failed to fetch teacher classes");
  }
};

// export const getClassesForTeacher = async (params: GetAllRecordsParams) => {
//   const {
//     teacherId,
//     sortBy = "_id",
//     sortOrder = "asc",
//     offset = 1,
//     limit = 10,
//   } = params;

//   if (!teacherId) {
//     throw new Error("Teacher ID is required");
//   }

//   const query: any = { "teacher.teacherId": teacherId };
//   const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

//   try {
//     const skip = Math.max(0, (Number(offset) - 1) * Number(limit));

//     const [classScheduleList, totalCount] = await Promise.all([
//       ClassScheduleModel.find(query)
//         .sort(sortOptions)
//         .skip(skip)
//         .limit(Number(limit))
//         .exec(),
//       ClassScheduleModel.countDocuments(query).exec(),
//     ]);
//     let evaluation: any;
//     // Enrich class schedule with student and evaluation data
//     const enrichedSchedules = await Promise.all(
//       classScheduleList.map(async (cls) => {
//         const studentId = cls?.student?.id;
//         const alfstudent = await AlStudenModel.findOne({
//           _id: new Types.ObjectId(studentId),
//         });
//         console.log("alfstudent", alfstudent);
//         evaluation = await Evaluation.findOne({
//           "student.studentId": alfstudent?.student?.studentId,
//         });

//         const trialclass = await Calendar.findOne({
//           trialId: evaluation?._id,
//         });
//         return {
//           ...cls.toObject(),
//           alfstudent,
//         };
//       })
//     );

//     const trialclass = await Calendar.find({
//       "teacher.teacherId": teacherId,
//     }).exec();
//     console.log("trialclass", trialclass);

//     return {
//       totalCount,
//       classSchedule: enrichedSchedules,
//       trialclasses: trialclass ?? [],
//     };
//   } catch (error) {
//     console.error("Error fetching classes for student:", error);
//     throw new Error("Failed to fetch classes for the student");
//   }
// };

export const getStudentClassHours = async (
  studentId: string
): Promise<{
  pendingPercentage: number;
  completedPercentage: number;
  totalHours: number;
}> => {
  if (!studentId) {
    console.error("Student ID is missing");
    throw new Error("Student ID is required");
  }

  try {
    console.log(`Fetching class hours for student: ${studentId}`);

    // Query for the student schedule
    const query: any = { "student.studentId": studentId };
    const classSchedule = await ClassScheduleModel.find(query).exec();

    if (!classSchedule || classSchedule.length === 0) {
      console.warn(`No class schedule found for student: ${studentId}`);
      return { pendingPercentage: 0, completedPercentage: 0, totalHours: 0 };
    }

    console.log(
      "Fetched class schedules:",
      JSON.stringify(classSchedule, null, 2)
    );

    let completedHours = 0;
    let pendingHours = 0;

    classSchedule.forEach((event) => {
      console.log("Raw event data:", JSON.stringify(event, null, 2));

      // Ensure `classStatus` exists and normalize case
      const status = event.classStatus
        ? event.classStatus.trim().toLowerCase()
        : "unknown";
      const hours = Number(event.totalHourse) || 0; // Ensure it's a number

      if (hours > 0) {
        if (status === "completed") {
          completedHours += hours;
          console.log(
            `Adding ${hours} hours to Completed (${completedHours} total)`
          );
        } else if (status === "pending") {
          pendingHours += hours;
          console.log(
            `Adding ${hours} hours to Pending (${pendingHours} total)`
          );
        } else {
          console.warn(
            `Skipping event with unknown status: "${status}"`,
            event
          );
        }
      } else {
        console.warn(`Skipping event with zero or invalid hours: ${hours}`);
      }
    });

    const totalHours = completedHours + pendingHours;
    const pendingPercentage =
      totalHours > 0 ? (pendingHours / totalHours) * 100 : 0;
    const completedPercentage =
      totalHours > 0 ? (completedHours / totalHours) * 100 : 0;

    console.log(
      `Final Totals -> Completed: ${completedHours}, Pending: ${pendingHours}, Total: ${totalHours}`
    );
    console.log(
      `Final Percentages -> Pending: ${pendingPercentage.toFixed(
        2
      )}%, Completed: ${completedPercentage.toFixed(2)}%`
    );

    return { pendingPercentage, completedPercentage, totalHours };
  } catch (error) {
    console.error("Error fetching class hours for student:", error);
    throw new Error("Failed to fetch class hours for the student");
  }
};

export const getUniqueTeachers = async () => {
  const uniqueTeachers = await evaluation.aggregate([
    {
      $match: {
        assignedTeacher: { $ne: null }, // only records that have a teacher
        assignedTeacherId: { $ne: null }
      }
    },
    {
      $group: {
        _id: "$assignedTeacherId",      // group by teacher ID
        teacherName: { $first: "$assignedTeacher" },
        teacherEmail: { $first: "$assignedTeacherEmail" },
      }
    },
    {
      $project: {
        _id: 0,
        teacherId: "$_id",
        teacherName: 1,
        teacherEmail: 1,
      }
    }
  ]);

  return uniqueTeachers;
};

export const teacherStudentCount = async (teacherId?: string) => {
  const matchStage: any = {
    "teacher.teacherId": { $ne: null },
    "teacher.teacherName": { $ne: null },
    "teacher.teacherEmail": { $ne: null },
  };

  if (teacherId) {
    matchStage["teacher.teacherId"] = teacherId;
  }

  const teachers = await classShedule.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: "$teacher.teacherId",
        teacherId: { $first: "$teacher.teacherId" },
        teacherName: { $first: "$teacher.teacherName" },
        teacherEmail: { $first: "$teacher.teacherEmail" },
        uniqueStudents: {
          $addToSet: {
            studentId: "$student.studentId",
            gender: "$student.gender",
          },
        },
      },
    },
    {
      $project: {
        teacherId: 1,
        teacherName: 1,
        teacherEmail: 1,
        studentCount: { $size: "$uniqueStudents" },
        maleCount: {
          $size: {
            $filter: {
              input: "$uniqueStudents",
              as: "student",
              cond: { $eq: ["$$student.gender", "Male"] },
            },
          },
        },
        femaleCount: {
          $size: {
            $filter: {
              input: "$uniqueStudents",
              as: "student",
              cond: { $eq: ["$$student.gender", "Female"] },
            },
          },
        },
      },
    },
  ]);

  return teachers;
};

export const teachingActivity = async (
  studentId: string
): Promise<
  {
    month: string;
    completedHours: number;
    pendingHours: number;
    totalHours: number;
  }[]
> => {
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  try {
    // Fetch all class schedules for the student
    const classSchedule = await ClassScheduleModel.find({
      "student.id": studentId,
    }).exec();

    if (!classSchedule || classSchedule.length === 0) {
      console.warn(`No class schedule found for student: ${studentId}`);
      return [];
    }

    // Debugging logs
    console.log("Fetched class schedules:", classSchedule);

    // Initialize an object to group hours by month
    const monthlyData: Record<
      string,
      { completedHours: number; pendingHours: number; totalHours: number }
    > = {};

    classSchedule.forEach((event) => {
      const month = moment(event.startDate).format("YYYY-MM"); // Get month in "YYYY-MM" format
      const hours = Number(event.totalHourse) || 0;
      const status = event.classStatus?.trim().toLowerCase();

      // Initialize month if not present
      if (!monthlyData[month]) {
        monthlyData[month] = {
          completedHours: 0,
          pendingHours: 0,
          totalHours: 0,
        };
      }

      // Categorize hours
      if (status === "completed") {
        monthlyData[month].completedHours += hours;
      } else if (status === "pending") {
        monthlyData[month].pendingHours += hours;
      } else {
        console.warn(
          `Unexpected classStatus "${event.classStatus}" for event:`,
          event
        );
      }

      // Update total hours
      monthlyData[month].totalHours += hours;
    });

    // Convert object to an array for frontend use
    const result = Object.keys(monthlyData).map((month) => ({
      month,
      ...monthlyData[month],
    }));

    console.log("Processed monthly teaching activity:", result);

    return result;
  } catch (error) {
    console.error("Error fetching class hours for student:", error);
    throw new Error("Failed to fetch class hours for the student");
  }
};

export const updateteacherreschedule = async (
  id: string,
  payload: Partial<IClassSchedule>
): Promise<(IClassSchedule | { error: any })[]> => {
  const { classDay, startTime, endTime, scheduleStatus, startDate, endDate } =
    payload;
  const results: (IClassSchedule | { error: any })[] = [];

  // Validate inputs
  if (
    !classDay ||
    !startTime ||
    !endTime ||
    !startDate ||
    !endDate ||
    classDay.length !== startTime.length ||
    startTime.length !== endTime.length
  ) {
    throw new Error(
      "classDay, startTime, endTime, startDate, and endDate must be provided and arrays must match in length."
    );
  }

  try {
    // Fetch student details
    const studentDetails = await classShedule
      .findById(new Types.ObjectId(id))
      .exec();
    if (!studentDetails) {
      throw new Error("Student not found.");
    }
    console.log("Student Details:", studentDetails);

    // Fetch teacher details
    const teacherDetails = await UserModel.findOne({
      role: "TEACHER",
      userId: payload.teacher?.teacherId,
    }).exec();
    if (!teacherDetails) {
      throw new Error("Teacher not found.");
    }
    console.log("Teacher Details:", teacherDetails);

    // Fetch current schedule
    const currentSchedule = await ClassScheduleModel.findById(
      new Types.ObjectId(id)
    ).lean<IClassSchedule>();
    if (!currentSchedule) {
      throw new Error("Class schedule not found.");
    }

    if (Array.isArray(startTime) && startTime.length > 0) {
      const newStartTime = startTime[0];
      const newEndTime = endTime[0];

      // Validate if reschedule status requires a new start time
      if (
        scheduleStatus === "Reschedule" &&
        currentSchedule.startTime === newStartTime
      ) {
        throw new Error(
          `Rescheduling failed: The new start time (${newStartTime}) cannot be the same as the existing start time.`
        );
      }

      // Update class schedule
      const updatedClassSchedule = await ClassScheduleModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        {
          $set: {
            teacher: {
              teacherId: teacherDetails.userId,
              teacherName: teacherDetails.userName,
              teacherEmail: teacherDetails.email,
            },
            startTime: newStartTime,
            endTime: newEndTime,
            package: payload.package,
            course: payload.course,
            startDate: payload.startDate,
            endDate: payload.endDate,
            sessionClassType: payload.sessionClassType,
            sessionStarttime: payload.sessionStarttime,
            sessionsEndtime: payload.sessionsEndtime,
            totalHourse: payload.totalHourse,
            scheduleStatus: scheduleStatus,
            studentAttendee: payload.studentAttendee,
            teacherAttendee: payload.teacherAttendee,
            preferedTeacher: payload.preferedTeacher,
          },
        },
        { new: true }
      ).lean<IClassSchedule>();

      console.log("Updated Class Schedule:", updatedClassSchedule);

      if (updatedClassSchedule) {
        results.push(updatedClassSchedule);
      } else {
        results.push({ error: "Failed to update class schedule." });
      }
    }
  } catch (error: any) {
    console.error("Error in scheduling process:", error.message);
    results.push({ error: error.message });
  }

  return results;
};

export const getStudentClassCount = async (studentId: string) => {
  try {
    const studentClassCount = await ClassScheduleModel.aggregate([
      {
        $match: {
          status: "Active",
          "student.id": studentId,
        },
      },
      {
        $group: {
          _id: null,
          totalClass: { $sum: 1 },
        },
      },
    ]);

    const studentLevel = await ClassScheduleModel.aggregate([
      {
        $match: {
          status: "Active",
          "student.id": studentId,
        },
      },
      {
        $group: {
          _id: "$course.level",
          level: { $sum: 1 },
        },
      },
    ]);

    const studentAttendanceCount = await ClassScheduleModel.aggregate([
      {
        $match: {
          status: "Active",
          "student.id": studentId,
        },
      },
      {
        $group: {
          _id: null,
          totalClass: { $sum: 1 },
          Attendance: {
            $sum: { $cond: [{ $eq: ["$scheduleStatus", "Completed"] }, 1, 0] },
          },
        },
      },
    ]);

    const studentDurationCount = await ClassScheduleModel.aggregate([
      {
        $match: {
          status: "Active",
          "student.id": studentId,
        },
      },
      {
        $group: {
          _id: "totalHourse",
          totalDuration: { $sum: 1 },
        },
      },
    ]);

    const totalClasses = studentClassCount[0].totalClass;
    const totalAttendance = (
      (studentAttendanceCount[0].Attendance /
        studentAttendanceCount[0].totalClass) *
      100
    ).toFixed(2);
    const level = studentLevel[0].level.toFixed(2);
    const totalduration = studentDurationCount[0].totalDuration.toFixed(2);

    return { totalClasses, totalAttendance, level, totalduration };
  } catch (e) {
    console.log("error: ", e);
  }
};

export const getTotalClassesCount = async (
  dateRange: string
): Promise<{ date: string; totalClass: number }[]> => {
  let startDate: Date;
  let endDate: Date = new Date(); // Default to today
  let dateFormat: string;
  let intervalFn: (interval: { start: Date; end: Date }) => Date[];
  let outputFormat: string;

  // Determine start and end dates based on dateRange
  switch (dateRange.toLowerCase()) {
    case "lastmonth":
      startDate = startOfMonth(subMonths(new Date(), 1));
      endDate = endOfMonth(subMonths(new Date(), 1));
      dateFormat = "%Y-%m";
      intervalFn = eachMonthOfInterval;
      outputFormat = "MMM-yyyy";
      break;

    case "last3months":
      startDate = startOfMonth(subMonths(new Date(), 2));
      endDate = endOfMonth(new Date());
      dateFormat = "%Y-%m";
      intervalFn = eachMonthOfInterval;
      outputFormat = "MMM-yyyy";
      break;

    case "last6months":
      startDate = startOfMonth(subMonths(new Date(), 5));
      endDate = endOfMonth(new Date());
      dateFormat = "%Y-%m";
      intervalFn = eachMonthOfInterval;
      outputFormat = "MMM-yyyy";
      break;

    case "lastyear":
      startDate = startOfMonth(subMonths(new Date(), 11)); // 12 months including current
      endDate = endOfMonth(new Date());
      dateFormat = "%Y-%m";
      intervalFn = eachMonthOfInterval;
      outputFormat = "MMM-yyyy";
      break;

    default:
      throw new Error(
        "Invalid dateRange. Use: lastmonth, last3months, last6months, last8months, lastyear"
      );
  }

  console.log(
    `Fetching results from ${startDate.toISOString()} to ${endDate.toISOString()}`
  );

  // MongoDB aggregation
  const result = await classShedule.aggregate([
    {
      $match: {
        status: "Active",
        startDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: dateFormat, date: "$startDate" } },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Group results correctly
  const groupedResults: Record<string, { date: string; totalClass: number }> =
    {};
  result.forEach(({ _id, count }) => {
    const dateFormatted = format(new Date(`${_id.date}-01`), outputFormat); // append `-01` for valid Date
    groupedResults[dateFormatted] = {
      date: dateFormatted,
      totalClass: count, // ❗ Assign the correct count here
    };
  });

  // Ensure all months are covered
  const allDates = intervalFn({ start: startDate, end: endDate }).map((d) =>
    format(d, outputFormat)
  );

  const finalResult = allDates.map(
    (date) => groupedResults[date] || { date, totalClass: 0 }
  );

  return finalResult;
};

export const getClassesStatusCount = async () => {
  const evaluationStats = await classShedule.aggregate([
    {
      $match: {
        status: "Active",
      },
    },
    {
      $group: {
        _id: null,
        totalClassCount: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ["$scheduleStatus", "Scheduled"] }, 1, 0] },
        },
        reschedule: {
          $sum: { $cond: [{ $in: ["$scheduleStatus",  ["Reschedule", "Reschedulerequested"]] }, 1, 0] },
        },
        complete: {
          $sum: { $cond: [{ $in: ["$scheduleStatus",["Completed","BothAbsent","TeacherAbsent","StudentAbsent"]] }, 1, 0] },
        },
      },
    },
  ]);
  const pendingPercentage = (
    (evaluationStats[0].pending / evaluationStats[0].totalClassCount) *
    100
  ).toFixed(2);
  const reschedulePercentage = (
    (evaluationStats[0].reschedule / evaluationStats[0].totalClassCount) *
    100
  ).toFixed(2);
  const completePercentage = (
    (evaluationStats[0].complete / evaluationStats[0].totalClassCount) *
    100
  ).toFixed(2);

  const total = evaluationStats[0].totalClassCount;

  return { total, pendingPercentage, reschedulePercentage, completePercentage };
};

export const getClassesWiseCount = async () => {
  const classscheduleRegular = await classShedule.aggregate([
    {
      $match: {
        sessionClassType: "REGULARCLASS",
      },
    },
    {
      $group: {
        _id: null,
        totalRegularClassCount: { $sum: 1 },
      },
    },
  ]);
  const classscheduleGroup = await classShedule.aggregate([
    {
      $match: {
        sessionClassType: "GROUPCLASS",
      },
    },
    {
      $group: {
        _id: null,
        totalGroupClassCount: { $sum: 1 },
      },
    },
  ]);

  const evaluationStats = await Evaluation.aggregate([
    {
      $match: {
        trialClassStatus: "COMPLETED",
      },
    },
    {
      $group: {
        _id: null,
        totalTrialClassCount: { $sum: 1 },
      },
    },
  ]);

  return { classscheduleRegular, evaluationStats, classscheduleGroup };
};

export const getStudentList = async (
  teacherId: string
): Promise<
  {
    studentId: string;
    name: string;
    level?: string;

    classType?: string;
    groupClassId?: string;
    assignment?: {
      assignmentId: string;
      assignmentType: string;
      assignmentName: string;
      status: string;
      title: string;
      assignedDate: Date;
      dueDate: Date;
      questionName: string;
      questionType: string;
      typeofQuestion?: string;
      assignmentStatus: AssignmentStatus;
    }[];
  }[]
> => {
  if (!teacherId) {
    throw new Error("Teacher ID is required");
  }

  try {
    // Fetch class schedules taught by the given teacher, returning only the 'student' field
    const classSchedules = await ClassScheduleModel.find(
      { "teacher.teacherId": teacherId },
      { student: 1, sessionClassType: 1, classLink: 1 }
    ).lean();
    const uniqueStudentsMap = new Map();

    for (const cls of classSchedules) {
      const student = cls.student;
      const classType = cls.sessionClassType;
      const groupClassId = cls.classLink;
      if (student?.id && !uniqueStudentsMap.has(student.id)) {
        const alstudent = await AlStudenModel.findOne({
          _id: cls.student.id,
        }).exec();
        let evaluation;
        if (alstudent) {
          evaluation = await Evaluation.findOne({
            "student.studentId": alstudent.student.studentId,
          }).exec();
        }
        let assignments: AssignmentItem[] = [];

        if (alstudent) {
          const assignmentList = await assignment
            .find(
              { studentId: alstudent._id.toString() },
              {
                assignmentId: 1,
                assignmentType: 1,
                assignmentStatus: 1,
                assignmentName: 1,
                title: 1,
                assignedDate: 1,
                dueDate: 1,
                questionName: 1,
                questionType: 1,
                typeofQuestion: 1,
              }
            )
            .lean();

          assignments = assignmentList.map(
            (a): AssignmentItem => ({
              assignmentId: a.assignmentId || "-",
              assignmentName: a.assignmentName || "-",
              assignmentType: a.assignmentType?.type ?? "quiz",
              title: a.title || "-",
              assignedDate: a.assignedDate ?? new Date(),
              dueDate: a.dueDate ?? new Date(),
              questionName: a.questionName ?? "",
              questionType: a.questionType ?? "",
              typeofQuestion: a.typeofQuestion ?? "",
              assignmentStatus: a.assignmentStatus ?? "Not Assigned",
            })
          );
        }
        uniqueStudentsMap.set(student.id, {
          studentId: student.id,
          name: student.studentFirstName,
          level: alstudent?.level || "", // ✅ Add level here

          studentDetails: {
            student: evaluation?.student,
            teacher: evaluation?.teacher,
            subscription: evaluation?.subscription,
            id: evaluation?._id,
            academicCoachId: evaluation?.academicCoachId,
            classType: evaluation?.classType,
            hours: evaluation?.hours,
            planTotalPrice: evaluation?.planTotalPrice,
            accomplishmentTime: evaluation?.accomplishmentTime,
            studentRate: evaluation?.studentRate,
            studentStatus: evaluation?.studentStatus,
            classStatus: evaluation?.classStatus,
            trialClassStatus: evaluation?.trialClassStatus,
            paymentLink: evaluation?.paymentLink,
            paymentStatus: evaluation?.paymentStatus,
            teacherStatus: evaluation?.teacherStatus,
            expectedFinishingDate: evaluation?.expectedFinishingDate,
            assignedTeacherEmail: evaluation?.assignedTeacherEmail,
          },
          classType,
          groupClassId,
          assignment: assignments, // ✅ This line must use `assignments`
        });
      }
    }

    return Array.from(uniqueStudentsMap.values());
  } catch (error) {
    console.error("Error fetching students for teacher:", error);
    throw new Error("Failed to fetch students for the teacher");
  }
};

export const getTeacherAttendanceSummary = async (
  teacherId: string
): Promise<{
  totalStudents: number;
  totalClasses: number;
  totalAttendance: number;
  totalWorkingHours: number;
  overallPerformance: number;
  students: {
    studentId: string;
    studentFirstname: string;
    studentLastName: string;
  }[];
}> => {
  if (!teacherId) {
    throw new Error("Teacher ID is required");
  }

  const DEFAULT_SESSION_DURATION_MINUTES = 30;

  try {
    const classSchedules = await ClassScheduleModel.find(
      { "teacher.teacherId": teacherId },
      {
        student: 1,
        sessionStarttime: 1,
        sessionsEndtime: 1,
        scheduleStatus: 1,
      }
    ).lean();

    let totalWorkingMinutes = 0;
    let totalAttendance = 0;

    const students: {
      studentId: string;
      studentFirstname: string;
      studentLastName: string;
    }[] = [];

    for (const cls of classSchedules) {
      const student = cls.student;

      if (student?.studentId) {
        students.push({
          studentId: student.studentId,
          studentFirstname: student.studentFirstName,
          studentLastName: student.studentLastName,
        });
      }

      if (cls.scheduleStatus === "Completed") {
        totalAttendance++;

        let sessionDuration = DEFAULT_SESSION_DURATION_MINUTES;

        if (cls.sessionStarttime && cls.sessionsEndtime) {
          const [startH, startM] = cls.sessionStarttime
            .replace(/[^0-9:]/g, "")
            .split(":")
            .map(Number);
          const [endH, endM] = cls.sessionsEndtime
            .replace(/[^0-9:]/g, "")
            .split(":")
            .map(Number);

          if (
            !isNaN(startH) &&
            !isNaN(startM) &&
            !isNaN(endH) &&
            !isNaN(endM)
          ) {
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const calculated = Math.max(0, endMinutes - startMinutes);
            sessionDuration =
              calculated > 0 ? calculated : DEFAULT_SESSION_DURATION_MINUTES;
          }
        }

        totalWorkingMinutes += sessionDuration;
      }
    }

    const totalWorkingHours = parseFloat((totalWorkingMinutes / 60).toFixed(2));

    // ✅ Your custom performance formula
    const overallPerformance = parseFloat(
      ((totalAttendance + totalWorkingHours) / 2).toFixed(2)
    );

    return {
      totalStudents: students.length,
      totalClasses: classSchedules.length,
      totalAttendance,
      totalWorkingHours,
      overallPerformance,
      students,
    };
  } catch (error) {
    console.error("Error generating teacher summary:", error);
    throw new Error("Failed to generate teacher attendance summary");
  }
};

//student perfomance summary

export const getStudentAttendanceSummary = async (
  studentId: string
): Promise<{
  totalAttendance: number;
  performance: number;
  package: string;
}> => {
  if (!studentId) {
    throw new Error("Student ID is required");
  }

  const DEFAULT_SESSION_DURATION_MINUTES = 30;

  try {
    // 🔹 Find all schedules where student.studentId matches alstudents._id
    const classSchedules = await ClassScheduleModel.find(
      { "student.id": studentId },
      {
        startTime: 1,
        endTime: 1,
        sessionStarttime: 1,
        sessionsEndtime: 1,
        scheduleStatus: 1,
        package: 1, // root-level package
        student: 1,
      }
    ).lean();

    let totalWorkingMinutes = 0;
    let totalAttendance = 0;
    let studentPackage: string | undefined;

    for (const cls of classSchedules) {
      if (!studentPackage && cls.package) {
        studentPackage = cls.package;
      }

      if (cls.scheduleStatus?.toLowerCase() === "completed") {
        totalAttendance++;

        let sessionDuration = DEFAULT_SESSION_DURATION_MINUTES;

        const start = cls.sessionStarttime || cls.startTime?.[0];
        const end = cls.sessionsEndtime || cls.endTime?.[0];

        if (start && end) {
          const [startH, startM] = start
            .replace(/[^0-9:]/g, "")
            .split(":")
            .map(Number);
          const [endH, endM] = end
            .replace(/[^0-9:]/g, "")
            .split(":")
            .map(Number);

          if (
            !isNaN(startH) &&
            !isNaN(startM) &&
            !isNaN(endH) &&
            !isNaN(endM)
          ) {
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const calculated = Math.max(0, endMinutes - startMinutes);
            sessionDuration =
              calculated > 0 ? calculated : DEFAULT_SESSION_DURATION_MINUTES;
          }
        }

        totalWorkingMinutes += sessionDuration;
      }
    }

    const totalWorkingHours = parseFloat((totalWorkingMinutes / 60).toFixed(2));
    const performance = parseFloat(
      ((totalAttendance + totalWorkingHours) / 2).toFixed(2)
    );

    return {
      totalAttendance,
      performance,
      package: studentPackage ?? "N/A",
    };
  } catch (error) {
    console.error("Error generating student summary:", error);
    throw new Error("Failed to generate student attendance summary");
  }
};

//Analytics cardcount with calculation
export const getgetAnalyticscardCalculation = async (
  teacherId: string
): Promise<{
  totalStudents: number;
  totalClasses: number;
  totalAmount: number;
  students: {
    studentId: string;
    studentFirstname: string;
    studentLastName: string;
  }[];
}> => {
  if (!teacherId) {
    throw new Error("Teacher ID is required");
  }

  try {
    const classSchedules = await ClassScheduleModel.find(
      { "teacher.teacherId": teacherId },
      {
        student: 1,
        amount: 1,
      }
    ).lean();

    const studentMap = new Map<
      string,
      { studentId: string; studentFirstname: string; studentLastName: string }
    >();
    let totalAmount = 0;

    for (const cls of classSchedules) {
      const student = cls.student;

      if (student?.studentId) {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            studentId: student.id,
            studentFirstname: student.studentFirstName,
            studentLastName: student.studentLastName,
          });
        }
      }

      const cleanedAmount = (cls.amount || "0").replace(/[^0-9.-]+/g, "");
      const amountValue = parseFloat(cleanedAmount);

      if (!isNaN(amountValue)) {
        totalAmount += amountValue;
      }
    }

    return {
      totalClasses: classSchedules.length,
      totalStudents: studentMap.size,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      students: Array.from(studentMap.values()),
    };
  } catch (error) {
    console.error("Error generating teacher analytics:", error);
    throw new Error("Failed to generate teacher analytics summary");
  }
};

// attendance and earnings update
export const updateEarningsCalculation = async () => {
  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
    console.log("dateRange>>>>", formattedDate);
    const startOfDayIST = `${formattedDate}T00:00:00.000+00:00`;
    const endOfDayIST = `${formattedDate}T23:59:59.999+00:00`;
    const getClasses = await ClassScheduleModel.find({
      startDate: {
        $gte: startOfDayIST,
        $lte: endOfDayIST,
      },
      status: "Active",
      sessionStatus: "NotCompleted",
    });
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Always pad single digits:
    const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;

    console.log("current time", formattedTime);

    for (const scheduleClass of getClasses) {
      const dateStr = dayjs(scheduleClass.startDate).format("YYYY-MM-DD");

      // Full class start datetime
      const classEndDateTime = dayjs(
        `${dateStr} ${scheduleClass.endTime}`,
        `YYYY-MM-DD HH:mm`
      );

      // Current datetime
      const now = dayjs();

      console.log(`Class ends at: ${classEndDateTime.format()}`);
      console.log(`Now: ${now.format()}`);

      // Check if class start time is before now
      if (now.isAfter(classEndDateTime)) {
        await ClassScheduleModel.findOneAndUpdate(
          { _id: new Types.ObjectId(scheduleClass._id) },
          {
            $set: {
              sessionStatus: "Completed",
              scheduleStatus: "Completed",
            },
          },
          { new: true }
        ).lean();
        console.log("✅ Session status: Completed");
      } else {
        await ClassScheduleModel.findOneAndUpdate(
          { _id: new Types.ObjectId(scheduleClass._id) },
          {
            $set: {
              sessionStatus: "NotCompleted",
            },
          },
          { new: true }
        ).lean();
        console.log("⏳ Session status: Not Completed");
      }
      const [startHour, startMinute] = scheduleClass.startTime[0]
        .split(":")
        .map(Number);
      const totalMinutes = startHour * 60 + startMinute + 15;
      const attendanceHour = Math.floor(totalMinutes / 60);
      const attendanceMinute = totalMinutes % 60;
      const attendanceTime = `${attendanceHour
        .toString()
        .padStart(2, "0")}:${attendanceMinute.toString().padStart(2, "0")}`;
      console.log("Attendance Time:", attendanceTime);

      const studentSessionStartTimes = await getSessionTime(
        scheduleClass.student.studnetSessionStart
      );
      const teacherSessionStartTime = await getSessionTime(
        scheduleClass.teacher.teacherSessionStart
      );

      const studentSessionEndTimes = await getSessionTime(
        scheduleClass.student.studnetSessionEnd
      );
      const teacherSessionEndTime = await getSessionTime(
        scheduleClass.teacher.teacherSessionEnd
      );
      if (scheduleClass.studentAttendee == "") {
        await studentAttendanceUpdate(
          attendanceTime,
          studentSessionStartTimes,
          scheduleClass
        );
      }

      if (scheduleClass.teacherAttendee == "") {
        await teacherAttendanceUpdate(
          attendanceTime,
          teacherSessionStartTime,
          scheduleClass
        );
      }

      const sessionlHours = await getSessionTotalHours(
        studentSessionStartTimes,
        teacherSessionStartTime,
        scheduleClass,
        studentSessionEndTimes,
        teacherSessionEndTime
      );
    }
  } catch (error) {
    console.error("Error in updateEarningsCalculation:", error);
    throw new Error("Failed to update earnings calculation");
  }

  return "Earnings calculation updated successfully";
};

function getSessionTime(times: any): any {
  // 1️⃣ Filter out "00:00"
  //const validTimes = times.filter((time: string));

  // 2️⃣ Convert to minutes since midnight
  const timesInMinutes = times.map((time: any) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  });

  // 3️⃣ Find minimum
  const minMinutes = Math.min(...timesInMinutes);

  // 4️⃣ Convert back to HH:mm
  const minHour = Math.floor(minMinutes / 60);
  const minMinute = minMinutes % 60;
  const earliestTime = `${minHour.toString().padStart(2, "0")}:${minMinute
    .toString()
    .padStart(2, "0")}`;
  return earliestTime;
}
async function studentAttendanceUpdate(
  attendanceTime: any,
  studentSessionStartTimes: any,
  scheduleClass: any
) {
  const dateStr = moment(scheduleClass.startDate).format("YYYY-MM-DD");
  const studentSessionStart: any = dayjs(
    `${dateStr} ${studentSessionStartTimes}`,
    "YYYY-MM-DD HH:mm"
  );
  const studentAttendanceTime: any = dayjs(
    `${dateStr} ${attendanceTime}`,
    "YYYY-MM-DD HH:mm"
  );

  console.log("Attendance time:", studentAttendanceTime.format());
  //console.log("Session starts at:", studentSessionStart.format());

  let studentAttendance;

  if (
    studentSessionStart.isBefore(studentAttendanceTime) ||
    studentAttendanceTime.isSame(studentSessionStart)
  ) {
    // Arrived before or exactly at session start time — present
    studentAttendance = await ClassScheduleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(scheduleClass._id) },
      { $set: { studentAttendee: "present" } },
      { new: true }
    ).lean();
    console.log("✅ Student is present");
  } else {
    // Arrived late — absent
    studentAttendance = await ClassScheduleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(scheduleClass._id) },
      { $set: { studentAttendee: "absent" } },
      { new: true }
    ).lean();
    console.log("❌ Student is absent");
  }
}

async function teacherAttendanceUpdate(
  attendanceTime: any,
  teacherSessionStartTime: any,
  scheduleClass: any
) {
  const dateStr = moment(scheduleClass.startDate).format("YYYY-MM-DD");
  const teacherSessionStart = dayjs(
    `${dateStr} ${teacherSessionStartTime}`,
    "YYYY-MM-DD HH:mm"
  );
  const teacherAttendanceTime: any = dayjs(
    `${dateStr} ${attendanceTime}`,
    "YYYY-MM-DD HH:mm"
  );

  console.log("Attendance time: ", teacherAttendanceTime.format());
  console.log("Session starts at :", teacherSessionStart.format());
  let teacherAttendance;
  if (
    teacherSessionStart.isBefore(teacherAttendanceTime) ||
    teacherAttendanceTime.isSame(teacherSessionStart)
  ) {
    teacherAttendance = await ClassScheduleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(scheduleClass._id) },
      {
        $set: {
          teacherAttendee: "present",
        },
      },
      { new: true }
    ).lean();
    console.log("✅ teacher is present");
  } else {
    teacherAttendance = await ClassScheduleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(scheduleClass._id) },
      {
        $set: {
          teacherAttendee: "absent",
        },
      },
      { new: true }
    ).lean();
    console.log("✅ teacher is present");
  }
  console.log("teacherAttendance>>>>>>", teacherAttendance);
  return teacherAttendance;
}

async function getSessionTotalHours(
  studentSessionStartTimes: any,
  teacherSessionStartTime: any,
  scheduleClass: any,
  studentSessionEndTimes: any,
  teacherSessionEndTime: any
) {
  console.log("studentSessionEndTimes>>", studentSessionEndTimes);
  console.log("teacherSessionEndTime>>", teacherSessionEndTime);

  // Convert to minutes
  const [studentHour, studentMinute] = studentSessionStartTimes
    .split(":")
    .map(Number);
  const [teacherHour, teacherMinute] = teacherSessionStartTime
    .split(":")
    .map(Number);

  const [studentEndHour, studentEndMinute] = studentSessionEndTimes
    .split(":")
    .map(Number);
  const [teacherEndHour, teacherEndMinute] = teacherSessionEndTime
    .split(":")
    .map(Number);

  const studentEndMinutes = studentEndHour * 60 + studentEndMinute;
  const teacherEndMinutes = teacherEndHour * 60 + teacherEndMinute;
  const studentMinutes = studentHour * 60 + studentMinute;
  const teacherMinutes = teacherHour * 60 + teacherMinute;

  const earliestMinutes = Math.min(studentMinutes, teacherMinutes);
  const lateMinutes = Math.max(studentEndMinutes, teacherEndMinutes);
  // Convert back to HH:mm
  const earliestHour = Math.floor(earliestMinutes / 60)
    .toString()
    .padStart(2, "0");
  const earliestMinute = (earliestMinutes % 60).toString().padStart(2, "0");

  const latestHour = Math.floor(lateMinutes / 60)
    .toString()
    .padStart(2, "0");
  const latestMinute = (lateMinutes % 60).toString().padStart(2, "0");

  const earliestTime = `${earliestHour}:${earliestMinute}`;
  const latestTime = `${latestHour}:${latestMinute}`;
  console.log("earliestTime>>", earliestTime);
  console.log("latestTime>>", latestTime);

  if (
    scheduleClass.studentAttendee ||
    (scheduleClass.teacherAttendee && scheduleClass.sessionStarttime == "")
  ) {
    let sessioStartUpdate = await ClassScheduleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(scheduleClass._id) },
      {
        $set: {
          sessionStarttime: earliestTime.toString(),
          sessionsEndtime: latestTime.toString(),
        },
      },
      { new: true }
    ).lean();
    console.log("sessioStartUpdate>>>");
  }
  if (scheduleClass?.teacherAttendee == "present") {
    const teacherSessionStartTime = scheduleClass.teacher.teacherSessionStart;
    const teacherSessionEndTime = scheduleClass.teacher.teacherSessionEnd;
    const validStartTimes = teacherSessionStartTime.filter(
      (time: string) => time !== "00:00"
    );
    const validEndTimes = teacherSessionEndTime.filter(
      (time: string) => time !== "00:00"
    );
    console.log("validstartTimes", validStartTimes);
    console.log("validendTimes", validEndTimes);

    const pairCount = Math.min(validStartTimes.length, validEndTimes.length);
    console.log("pairCount>>>", pairCount);
    let totalMinutes = 0;

    for (let i = 0; i < pairCount; i++) {
      const [startH, startM] = validStartTimes[i].split(":").map(Number);
      const [endH, endM] = validEndTimes[i].split(":").map(Number);

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      const diff = endTotal - startTotal;
      console.log(
        `Session ${i + 1}: ${validStartTimes[i]} - ${
          validEndTimes[i]
        } => ${diff} mins`
      );

      totalMinutes += diff;
    }
    console.log(`Total time: ${totalMinutes} mins`);

    if (scheduleClass.sessionClassType == "REGULARCLASS") {
      const regularClassAmount = 4.0;
      const classDefaultHours = 60;
      const classTotalEarnings =
        (totalMinutes / classDefaultHours) * regularClassAmount;

      await ClassScheduleModel.findOneAndUpdate(
        { _id: new Types.ObjectId(scheduleClass._id) },
        {
          $set: {
            classhour: totalMinutes.toString(),
            amount: classTotalEarnings,
          },
        },
        { new: true }
      ).lean();
    } else if (scheduleClass.sessionClassType == "GROUPCLASS") {
      console.log("GROUPCLASS update");
      const groupClassAmount = 6.0;
      const classDefaultHours = 60;
      const classTotalEarnings =
        (totalMinutes / classDefaultHours) * groupClassAmount;

      await ClassScheduleModel.findOneAndUpdate(
        { _id: new Types.ObjectId(scheduleClass._id) },
        {
          $set: {
            classhour: totalMinutes.toString(),
            amount: classTotalEarnings,
          },
        },
        { new: true }
      ).lean();
    }
  }
}

export const getTeacherTotalEarnings = async (
  teacherId: string,
  dateRange: "monthly" | "weekly"
): Promise<{
  currentPeriod: {
    totalEarnings: number;
    regularClass: number;
    groupClass: number;
    trialClass: number;
  };
  lastPeriod: {
    totalEarnings: number;
    regularClass: number;
    groupClass: number;
    trialClass: number;
  };
}> => {
  try {
    let currentStart: Date;
    let currentEnd: Date;
    let lastStart: Date;
    let lastEnd: Date;

    if (dateRange === "monthly") {
      currentStart = startOfMonth(new Date());
      currentEnd = endOfMonth(new Date());

      const lastMonthDate = subMonths(new Date(), 1);
      lastStart = startOfMonth(lastMonthDate);
      lastEnd = endOfMonth(lastMonthDate);
    } else if (dateRange === "weekly") {
      currentStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      currentEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const lastWeekDate = subWeeks(new Date(), 1);
      lastStart = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
      lastEnd = endOfWeek(lastWeekDate, { weekStartsOn: 1 });
    } else if (dateRange === "daily") {
      currentStart = startOfDay(new Date());
      currentEnd = endOfDay(new Date());

      const yesterday = subDays(new Date(), 1);
      lastStart = startOfDay(yesterday);
      lastEnd = endOfDay(yesterday);
    } else {
      throw new Error("Invalid dateRange. Use 'weekly' or 'monthly'.");
    }

    // 1️⃣ Current period
    const currentResult = await ClassScheduleModel.aggregate([
      {
        $match: {
          "teacher.teacherId": teacherId,
          startDate: {
            $gte: currentStart,
            $lte: currentEnd,
          },
        },
      },
      {
        $addFields: {
          amountNumber: { $toDouble: "$amount" },
        },
      },
      {
        $group: {
          _id: "$sessionClassType",
          total: { $sum: "$amountNumber" },
        },
      },
    ]);

    // 2️⃣ Last period
    const lastResult = await ClassScheduleModel.aggregate([
      {
        $match: {
          "teacher.teacherId": teacherId,
          startDate: {
            $gte: lastStart,
            $lte: lastEnd,
          },
        },
      },
      {
        $addFields: {
          amountNumber: { $toDouble: "$amount" },
        },
      },
      {
        $group: {
          _id: "$sessionClassType",
          total: { $sum: "$amountNumber" },
        },
      },
    ]);

    const result = await Evaluation.aggregate([
      {
        $match: {
          "teacher.teacherId": teacherId,
          updatedDate: {
            $gte: currentStart,
            $lte: currentEnd,
          },
        },
      },
      {
        $addFields: {
          amountNumber: { $toDouble: "$amount" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amountNumber" },
        },
      },
    ]);

    const resultLastPeriod = await Evaluation.aggregate([
      {
        $match: {
          "teacher.teacherId": teacherId,
          updatedDate: {
            $gte: lastStart,
            $lte: lastEnd,
          },
        },
      },
      {
        $addFields: {
          amountNumber: { $toDouble: "$amount" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amountNumber" },
        },
      },
    ]);

    console.log("result>>>>", result[0]?.total || 0);

    // 🔢 Unpack current
    const currentPeriod = {
      totalEarnings: 0,
      regularClass: 0,
      groupClass: 0,
      trialClass: result[0]?.total | 0,
    };

    for (const item of currentResult) {
      currentPeriod.totalEarnings += item.total;

      if (item._id === "REGULARCLASS") {
        currentPeriod.regularClass = item.total;
      } else if (item._id === "GROUPCLASS") {
        currentPeriod.groupClass = item.total;
      } else {
        currentPeriod.trialClass = item.total;
      }
    }

    // 🔢 Unpack last
    const lastPeriod = {
      totalEarnings: 0,
      regularClass: 0,
      groupClass: 0,
      trialClass: resultLastPeriod[0]?.total | 0,
    };

    for (const item of lastResult) {
      lastPeriod.totalEarnings += item.total;

      if (item._id === "REGULARCLASS") {
        lastPeriod.regularClass = item.total;
      } else if (item._id === "GROUPCLASS") {
        lastPeriod.groupClass = item.total;
      } else {
        lastPeriod.trialClass = item.total;
      }
    }

    return {
      currentPeriod,
      lastPeriod,
    };
  } catch (error) {
    console.log("error>>>>", error);
    return {
      currentPeriod: {
        totalEarnings: 0,
        regularClass: 0,
        groupClass: 0,
        trialClass: 0,
      },
      lastPeriod: {
        totalEarnings: 0,
        regularClass: 0,
        groupClass: 0,
        trialClass: 0,
      },
    };
  }
};

export const classesCountForTeacher = async (
  teacherId: string
): Promise<{
  scheduled: number;
  completed: number;
  rescheduled: number;
  absent: number;
}> => {
  const result = await classShedule.aggregate([
    {
      $match: {
        status: "Active",
        "teacher.teacherId": teacherId,
      },
    },
    {
      $group: {
        _id: "$scheduleStatus",
        count: { $sum: 1 },
        absentCount: {
          $sum: {
            $cond: [{ $eq: ["$teacherAttendee", "absent"] }, 1, 0],
          },
        },
      },
    },
  ]);

  console.log("Aggregation Result:", result);

  const finalResult = {
    scheduled: 0,
    completed: 0,
    rescheduled: 0,
    absent: 0,
  };

  result.forEach(({ _id, count, absentCount }) => {
    if (_id === "Scheduled") finalResult.scheduled += count;
    if (_id === "Completed") finalResult.completed += count;
    if (_id === "Rescheduled") finalResult.rescheduled += count;
    finalResult.absent += absentCount;
  });

  console.log("Final Result:", finalResult);
  return finalResult;
};

export const teacherClassLevelGrowth = async (
  teacherId: string,
  dateRange: string
) => {};

export const bulkupdateClassAttendanceByClassLink = async (
  classLink: string,
  payload: Partial<IClassScheduleUpdate>
): Promise<any> => {
  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
    const startOfDayIST = `${formattedDate}T00:00:00.000+00:00`;
    const endOfDayIST = `${formattedDate}T23:59:59.999+00:00`;
    const currentTime = moment().format("HH:mm");
    const teacherStart = payload.teacher?.teacherSessionStart || null;
    const teacherEnd = payload.teacher?.teacherSessionEnd || null;
    console.log("currentTime>>>", currentTime);
    // return await ClassScheduleModel.updateMany(
    //   { classLink }, // Find all classes with same link
    //   {
    //     $set: {
    //       teacher: payload.teacher,
    //         startDate: {
    //   $gte:startOfDayIST,
    //   $lte:endOfDayIST,
    // },
    // startTime: { $lte: currentTime },  // class already started
    // endTime: { $gte: currentTime },
    //     },
    //   },
    //     {
    //   $push: {
    //     ...(teacherStart && { "teacher.teacherSessionStart": teacherStart }),
    //     ...(teacherEnd && { "teacher.teacherSessionEnd": teacherEnd }),
    //   },
    // }
    // );

    return await ClassScheduleModel.updateMany(
      {
        classLink,
        startDate: {
          $gte: new Date(startOfDayIST),
          $lte: new Date(endOfDayIST),
        },
        startTime: { $lte: currentTime },
        endTime: { $gte: currentTime },
      },
      {
        $push: {
          "teacher.teacherSessionStart": { $each: teacherStart },
          "teacher.teacherSessionEnd":{ $each: teacherEnd },
        },
      }
    );
  } catch (e) {
    console.log(">>>>", e);
  }
};
