import { badRequest } from "@hapi/boom";
import {
  IEvaluation,
  IEvaluationCreate,
  IMeetingSchedule,
  IStudents,
} from "../../types/models.types";
import EvaluationModel from "../models/evaluation";
import StudentModel from "../models/student";
import IAlStudents from "../models/alstudents";
import UserShiftSchedule from "../models/usershiftschedule"; // Add this import
import MeetingSchedule from "../models/calendar";
import SubscriptionModel from "../models/subscription";
import EmailTemplate from "../models/emailTemplate";
import { GetAllRecordsParams } from "../shared/enum";
import {
  commonMessages,
  evaluationMessages,
  learningInterest,
  teacherPosition,
} from "../config/messages";
import { isNil } from "lodash";
import AppLogger from "../helpers/logging";
import { Types } from "mongoose";
import axios from "axios";
import { sendEmailClient } from "../shared/email";
import Course from "../models/course";
import { config } from "../config/env";
import User from "../models/users";
import teacherAvaliableSlots from "../models/teacheravaliableslots";
import { academicAvailableTeachers } from "../kafka/producers/academicProducer";
import { teacherAvailableTimeList } from "./auth";
import { types } from "joi";
import { sendNotification } from "./notification";
import { evaluationTeacherSlotBook } from "../redis/handler/teacherSlotHander";
import moment from "moment";
import { generateRollNo } from "./rollcounter";
import users from "../models/users";
import student from "../models/student";

export interface EvaluationFilter {
  id(id: any): string;
  status: string;
  country?: string;
  course?: string;
  teacher?: string;
}

/**
 * Creates a new candidate record in the database.
 *
 * @param {IEvaluationCreate} payload - The data required to create a new candidate record.
 * @param {IStudentCreate} studentpayload - The course id
 * @returns {Promise<IEvaluation | null>} A promise that resolves to the created candidate record, or null if the creation fails.
 */
export const createEvaluationRecord = async (
  payload: IEvaluationCreate
): Promise<IEvaluation | { error: any }> => {
  let newStudent = new StudentModel(payload.student);
  console.log("payload>>>", payload);

  // if (payload.student.preferredDate?.toDateString() === new Date().toDateString()) {
  //     return {
  //         error: badRequest('Evaluation class is not allowed to current date. Select another date'),
  //     };
  // }

  const loginUser = await User.findOne({
    _id: new Types.ObjectId(payload.academicCoachId),
    role: "ACADEMICCOACH",
  }).exec();
  const teacherDetails = await User.findOne({
    userId: payload.teacher.teacherId,
    role: "TEACHER",
  }).exec();

  //rollNo
  const rollNo = await generateRollNo('ALFST', 3);
  if (loginUser) {
    newStudent.academicCoach = {
      academicCoachId: payload.academicCoachId || " ", // Provide a default value if undefined
      name: loginUser?.userName, // Provide a default value if undefined
      role: "ACADEMICCOACH", // Provide a default value if undefined
      email: loginUser?.email, // Provide a default value if undefined
    };
  }
  newStudent.studentId = rollNo;
  newStudent.firstName = payload.student.studentFirstName;
  newStudent.lastName = payload.student.studentLastName;
  newStudent.email = payload.student.studentEmail;
  newStudent.gender = payload.student.studentGender;
  newStudent.phoneNumber = payload.student.studentPhone;
  newStudent.city = payload.student.studentCity;
  newStudent.country = payload.student.studentCountry;
  newStudent.countryCode = payload.student.studentCountryCode;
  newStudent.learningInterest = payload.student.learningInterest;
  newStudent.numberOfStudents = payload.student.numberOfStudents;
  newStudent.preferredTeacher = payload.student.preferredTeacher;
  newStudent.preferredFromTime = payload.student.preferredFromTime ?? " ";
  newStudent.preferredToTime = payload.student.preferredToTime ?? " ";
  newStudent.timeZone = payload.student.timeZone;
  newStudent.referralSource = payload.student.referralSource;
  newStudent.startDate = payload.student.preferredDate ?? new Date();
  newStudent.evaluationStatus = payload.student.evaluationStatus;
  newStudent.status = payload.student.status;
  newStudent.createdDate = new Date();
  newStudent.createdBy = payload.student.studentEmail ?? "Admin";
  let createStudent;
  if (!payload.student.studentRegisterId) {
    createStudent = await newStudent.save();
  } else if (payload.student.studentRegisterId) {
    const updateInvoice = await StudentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(payload.student.studentRegisterId) },
      { $set: payload.student },
      { new: true }
    ).lean();

    (await updateInvoice) as unknown as IStudents;
  }

  const subscriptonDetaails = await SubscriptionModel.findOne({
    subscriptionName: payload.subscription.subscriptionName,
  }).exec();

  const newEvaluation = new EvaluationModel(payload);
  if (createStudent) {
    (newEvaluation.student = {
      studentRegisterId: createStudent.id.toString(),
      studentId: createStudent.studentId,
      studentFirstName: createStudent.firstName,
      studentLastName: createStudent.lastName,
      studentEmail: createStudent.email,
      studentGender: createStudent.gender,
      studentPhone: createStudent.phoneNumber,
      studentCity: createStudent.city,
      studentCountry: createStudent.country,
      studentCountryCode: createStudent.countryCode,
      learningInterest: createStudent.learningInterest,
      numberOfStudents: createStudent.numberOfStudents,
      preferredTeacher: createStudent.preferredTeacher,
      preferredFromTime: createStudent.preferredFromTime,
      preferredToTime: createStudent.preferredToTime,
      timeZone: createStudent.timeZone,
      referralSource: createStudent.referralSource,
      preferredDate: createStudent.startDate,
      evaluationStatus: createStudent.evaluationStatus,
      status: createStudent.status,
      createdDate: new Date(),
      createdBy: createStudent.createdBy,
    }),
      (newEvaluation.academicCoachId =
        createStudent.academicCoach.academicCoachId);
  }
  if (subscriptonDetaails) {
    newEvaluation.subscription = {
      subscriptionId: subscriptonDetaails?.id.toString(),
      subscriptionName: subscriptonDetaails?.subscriptionName,
      subscriptionPricePerHr: subscriptonDetaails?.subscriptionPricePerHr,
      subscriptionDays: subscriptonDetaails?.subscriptionDays,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    };
  }
  newEvaluation.teacher = {
    teacherId: teacherDetails?.userId || " ",
    teacherName: teacherDetails?.userName || " ",
    teacherEmail: teacherDetails?.email || " ",
  };
  newEvaluation.joiningDate = payload.joiningDate ?? new Date();
  newEvaluation.expectedFinishingDate = 28;
  newEvaluation.assignedTeacher = teacherDetails?.userName || " ";
  newEvaluation.studentStatus = payload.studentStatus;
  newEvaluation.classStatus = payload.classStatus;
  newEvaluation.trialClassStatus = "PENDING";
  newEvaluation.assignedTeacherId = teacherDetails?.userId || " ";
  newEvaluation.assignedTeacherEmail = teacherDetails?.email || " ";
  newEvaluation.teacherStatus = newEvaluation.teacher.teacherName
    ? "Assigned"
    : "Not Assigned";
  const createEvaluation = await newEvaluation.save();

  if (
    newEvaluation.studentStatus == "JOINED" &&
    newEvaluation.classStatus == "COMPLETED"
  ) {
    await trialClassAssigned(
      createEvaluation,
      teacherDetails,
      payload.preferredTrialDate,
      payload.preferredTrialFromTime,
      payload.preferredTrialToTime
    );
  }
  if (
    payload.classType === "REGULARCLASS" &&
    newEvaluation.studentStatus === "JOINED" &&
    newEvaluation.classStatus === "COMPLETED" &&
    payload.joiningDate instanceof Date &&
    !isNaN(payload.joiningDate.getTime()) &&
    payload.weeklySlots &&
    Object.keys(payload.weeklySlots).length > 0 &&
    typeof teacherDetails?.userId === "string" &&
    teacherDetails.userId.trim() !== ""
  ) {
    await evaluationTeacherSlotBook(
      payload.joiningDate.toISOString(),
      payload.weeklySlots,
      teacherDetails?.userId?.trim()
    );
  }

  return createEvaluation;
};

/**
 * Creates a new user.
 *
 * @param {IEvaluationCreate} payload - The data of the user to be created.
 * @returns {Promise<IEvaluation>} - A promise that resolves to the created user document.
 */
export const updateStudentEvaluation = async (
  id: string,
  payload: Partial<IEvaluationCreate>
): Promise<IEvaluation | null> => {
  // ✅ CASE 1: Invoice Mail (COMPLETED + JOINED)
  console.log("payload in update service>>>", payload);
  if (
    payload.trialClassStatus === "COMPLETED" &&
    payload.studentStatus === "JOINED"
  ) {
    console.log("💡 Running Invoice Mail Flow...");

    if (payload.trialClassStatus === "COMPLETED") {
      payload.amount = "2.00";
    }

    // 👉 Update evaluation only here
    const updateEvaluations = await EvaluationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { $set: payload },
      { new: true }
    ).lean();

    const evaluation = await EvaluationModel.findById(id).exec();
    const updatedEvaluation = updateEvaluations as unknown as IEvaluation;
    console.log("updatedEvaluation>>", updatedEvaluation);

    const emailTemplate = await EmailTemplate.findOne({
      templateKey: "Invoice",
    }).exec();

    if (emailTemplate && payload.student && payload.subscription && evaluation) {

      const emailTo = [{ email: payload.student.studentEmail }];
      const subject = "Invoice";

      // Base values
      const rawTotalPrice = Number(evaluation?.planTotalPrice) || 1;
      const hours = Number(evaluation?.accomplishmentTime) || 1;

      // Compute discount if family is being used for 4th time or more
      let displayTotal = Number(rawTotalPrice);
      let displayRate = displayTotal / (hours || 1);
      let discountApplied = false;

      const familyId = (evaluation && (evaluation as any).familyId) || payload.student.familyId || null;
      if (familyId) {
        try {
          const familyUsageCount = await EvaluationModel.countDocuments({ familyId }).exec();
          // Apply discount when family key has been used 4th time or more
          if (familyUsageCount >= 3) {
            discountApplied = true;
            displayTotal = Number((displayTotal * 0.9).toFixed(2)); // 10% off
            displayRate = Number((displayTotal / (hours || 1)).toFixed(2));

            // Persist discounted total/amount and flag to evaluation (best-effort; fields may vary by schema)
            try {
              await EvaluationModel.findByIdAndUpdate(
                id,
                {
                  $set: {
                    planTotalPrice: String(displayTotal),
                    amount: String(displayTotal),
                    discountApplied: true,
                  },
                },
                { new: true }
              ).exec();
            } catch (err) {
              // don't block email if DB update fails; just log
              AppLogger.error("Failed to persist discounted price for evaluation", { err, id, familyId });
            }
          }
        } catch (err) {
          AppLogger.error("Error counting family usage for discount", { err, familyId });
        }
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      // Prepare HTML using computed display values
      let htmlPart = emailTemplate.templateContent || "";
      htmlPart = htmlPart
        .replace(/{{Student Name}}/g, (payload.student.studentFirstName || "") + " " + (payload.student.studentLastName || ""))
        .replace(/{{Invoice Date}}/g, new Date().toDateString())
        .replace(/{{Hourly Rate}}/g, String(displayRate))
        .replace(/{{Total Amount}}/g, String(displayTotal))
        .replace(/{{Package Name}}/g, payload.subscription.subscriptionName)
        .replace(/{{Hours}}/g, String(hours))
        .replace(/{{Payment Link}}/g, (updatedEvaluation && (updatedEvaluation as any).paymentLink) || "")
        .replace(/{{Due Date}}/g, dueDate.toDateString());

      // If discount applied, optionally annotate the email (if template has a placeholder {{DiscountNote}})
      if (discountApplied) {
        htmlPart = htmlPart.replace(/{{DiscountNote}}/g, "10% family discount applied");
      } else {
        htmlPart = htmlPart.replace(/{{DiscountNote}}/g, "");
      }

      await sendEmailClient(emailTo, subject, htmlPart);

      console.log("✅ Invoice Email sent", { discountApplied });

    }
    return updatedEvaluation;
  } else if (
    payload.teacher ||
    payload.preferredTrialDate ||
    payload.preferredTrialFromTime ||
    payload.preferredTrialToTime
  ) {
    console.log("💡 Running Meeting Schedule Update (reuse Zoom link) Flow...");

    const evaluation = await EvaluationModel.findById(id).lean();
    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    const trialId = evaluation.trialId;
    // 👉 Get existing meeting schedule (to reuse link)
    const existingMeeting = await MeetingSchedule.findOne({ trialId });

    // 👉 If teacherId is present but name/email missing or 'Not Assigned', fetch from User model
    let teacherName = payload.teacher?.teacherName;
    let teacherEmail = payload.teacher?.teacherEmail;
    if (
      payload.teacher?.teacherId &&
      (!teacherName || teacherName === "Not Assigned" || !teacherEmail || teacherEmail === "Not Assigned")
    ) {
      const teacherUser = await User.findOne({ userId: payload.teacher.teacherId, role: "TEACHER" }).exec();
      teacherName = teacherUser?.userName || "";
      teacherEmail = teacherUser?.email || "";
    }

    // 👉 Update meeting schedule with new details but keep existing meetingLink
    const updatedMeetingDetails = await MeetingSchedule.findOneAndUpdate(
      { trialId },
      {
        $set: {
          teacher: {
            teacherId: payload.teacher?.teacherId,
            name: teacherName,
            email: teacherEmail,
          },
          scheduledFrom: payload.preferredTrialFromTime,
          scheduledTo: payload.preferredTrialToTime,
          scheduledStartDate: payload.preferredTrialDate,
          scheduledEndDate: payload.preferredTrialDate,
          lastUpdatedDate: new Date(),
          lastUpdatedBy: "Admin",
        },
      },
      { new: true }
    );
    console.log("✅ Updated Meeting Schedule:", updatedMeetingDetails);

    // 👉 Send Zoom email (with existing link + updated date/time)
    const zoomMailTemplate = await EmailTemplate.findOne({
      templateKey: "trailmanagement",
    }).exec();

    if (zoomMailTemplate) {
      const subject = "Trial class";
      const htmlPart = zoomMailTemplate.templateContent
        .replace(/{{Student Name}}/g, existingMeeting?.student?.name || " ")
        .replace(/{{Teacher Name}}/g, teacherName || " ")
        .replace(/{{Preferred Date}}/g, new Date(payload.preferredTrialDate || '').toDateString())
        .replace(/{{Preferred Time}}/g, payload.preferredTrialFromTime + " - " + payload.preferredTrialToTime)
        .replace(/{{Zoom Link}}/g, updatedMeetingDetails?.meetingLink || existingMeeting?.meetingLink || " ");

      // Only send to valid teacher email
      const emailTo = [];
      if (teacherEmail && teacherEmail !== "Not Assigned") {
        emailTo.push({ email: teacherEmail });
      } else if (existingMeeting?.teacher?.email && existingMeeting.teacher.email !== "Not Assigned") {
        emailTo.push({ email: existingMeeting.teacher.email });
      }
      if (existingMeeting?.student?.email) {
        emailTo.push({ email: existingMeeting.student.email });
      }

      if (emailTo.length > 0) {
        await sendEmailClient(emailTo, subject, htmlPart);
        console.log("✅ Zoom email sent (with reused meeting link)");
      } else {
        console.log("⚠️ No valid teacher email found, email not sent to teacher.");
      }
    }

    const updatedEvaluation = await EvaluationModel.findById(id).lean();
    return updatedEvaluation as unknown as IEvaluation;
  }

  console.log("ℹ️ No special email flow triggered");
  return null;
};





async function trialClassAssigned(
  createEvaluation: any,
  teacherDetails: any,
  preferredTrialDate: any,
  preferredTrialFromTime: any,
  preferredTrialToTime: any
) {
  //const meetingTiming = await getTeacherAvaialbleTime()
  console.log("Date>>>>>>>", new Date(preferredTrialDate));
  const startOfDayIST = `${preferredTrialDate}T00:00:00.000+00:00`;
  const today = new Date();
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);
  const formattedDate = nextDay.toISOString().split("T")[0];
  let alfTeacherPosition;

  if (createEvaluation.student.learningInterest == learningInterest.QURAN) {
    alfTeacherPosition = teacherPosition.QURANTEACHER;
  } else if (
    createEvaluation.student.learningInterest == learningInterest.ISLAMIC
  ) {
    alfTeacherPosition = teacherPosition.ISLAMICTEACHER;
  } else {
    alfTeacherPosition = teacherPosition.ARABICTEACHER;
  }
  let availableTeacher;

  let availableTeacherId;
  let teacherEmail;
  if (createEvaluation.teacher.teacherId == " ") {
    availableTeacher = await teacherAvailableTimeList(
      formattedDate,
      alfTeacherPosition
    );
    availableTeacherId = availableTeacher[0].teacherId;
    teacherEmail = await User.findOne({ userId: availableTeacherId });
  } else {
    availableTeacherId = createEvaluation.teacher.teacherId;
    teacherEmail = teacherDetails;
  }

  const meetingDetails = await zoomMeetingInvite(
    createEvaluation,
    preferredTrialFromTime
  );
  // 👉 Send Zoom email (with existing link + updated date/time)
  const zoomMailTemplate = await EmailTemplate.findOne({
    templateKey: "trailmanagement",
  }).exec();

  if (zoomMailTemplate) {
    const subject = "Trial class";
    const htmlPart = zoomMailTemplate.templateContent
      .replace(/{{Student Name}}/g, student.name || " ")
      .replace(/{{Teacher Name}}/g, teacherEmail.userName || " ")
      .replace(/{{Preferred Date}}/g, new Date(preferredTrialDate || '').toDateString())
      .replace(/{{Preferred Time}}/g, preferredTrialFromTime + " - " + preferredTrialToTime)
      .replace(/{{Zoom Link}}/g, meetingDetails.join_url || " ");

    const emailTo = [
      { email: teacherEmail.email },
      { email: createEvaluation.student.studentEmail },
    ];
    if (htmlPart) {
      sendEmailClient(emailTo, subject, htmlPart);
    }
    const course = await Course.findOne({
      courseName: createEvaluation.student.learningInterest,
    });
    const CreatemeetingDetails = await MeetingSchedule.create({
      academicCoach: {
        academicCoachId: null,
        name: null,
        role: null,
        email: null,
      },
      teacher: {
        teacherId: teacherEmail.userId,
        name: teacherEmail.userName,
        email: teacherEmail.email,
      },
      student: {
        studentId: createEvaluation.student.studentId,
        name:
          createEvaluation.student.studentFirstName +
          " " +
          createEvaluation.student.studentLastName,
        email: createEvaluation.student.studentEmail,
        city: createEvaluation.student.studentCity,
        country: createEvaluation.student.studentCountry,
        phonenumber: createEvaluation.student.studentPhone,
      },
      trialId: createEvaluation.trialId,
      subject: "Student First class",
      meetingLocation: "Zoom",
      course: {
        courseId: course?._id,
        courseName: course?.courseName,
      },
      classType: "Trail class",
      meetingType: "Online",
      meetingLink: meetingDetails.join_url,
      isScheduledMeeting: true,
      scheduledStartDate: startOfDayIST,
      scheduledEndDate: startOfDayIST,
      scheduledFrom: preferredTrialFromTime,
      scheduledTo: preferredTrialToTime,
      timeZone: createEvaluation.student.timeZone,
      description: "Test Description",
      meetingStatus: "Scheduled",
      studentResponse: "PENDING",
      status: "Active",
      createdDate: new Date(),
      createdBy: createEvaluation.createdBy,
      lastUpdatedDate: new Date(),
      lastUpdatedBy: "Admin",
    });
    await CreatemeetingDetails.save();
    const academicCoach = await users.findById(createEvaluation.academicCoachId);
    if (teacherDetails.userId) {
      await sendNotification({
        messages: `${createEvaluation.student.studentFirstName} ${createEvaluation.student.studentLastName} has been assigned to you for a trial class.`,
        senderId: createEvaluation.academicCoachId?.toString() ?? "system",
        senderName: academicCoach?.userName ?? "system",
        senderEmail: academicCoach?.email ?? "system",
        isRead: false,
        receiverId: [teacherDetails.userId],
        receiverName: [teacherDetails.userName],
        receiverEmail: [teacherDetails.email],
        notificationType: "TEACHER_TRAILCLASS_NOTIFICATION",
        notificationStatus: "Unseen",
        status: "active",
        createdBy: "system",
        updatedBy: "system",
      });
    }

    if (CreatemeetingDetails) {
      const teacherId = CreatemeetingDetails.teacher.teacherId;
      const from = CreatemeetingDetails.scheduledFrom;
      const to = CreatemeetingDetails.scheduledTo;
      const date = CreatemeetingDetails.scheduledStartDate;
      await academicAvailableTeachers({
        event: "update",
        data: { date, teacherId, from, to },
      });
    }
  }
}

async function zoomMeetingInvite(
  newEvaluation: any,
  preferredTrialFromTime: any
) {
  const token = await getZoomAccessToken();
  const response = await axios.post(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      topic: "Teacher Meeting",
      type: 2,
      start_time: preferredTrialFromTime, // Start in 10 minutes
      duration: 60,
      timezone: newEvaluation.student.timeZone,
      settings: {
        join_before_host: true,
        participant_video: true,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log("response.data.join_url>>", response.data.join_url);
  console.log("response.data.start_url>>", response.data.start_url);
  return {
    join_url: response.data.join_url,
    start_url: response.data.start_url,
  };
}

async function getZoomAccessToken() {
  let accessToken: any = null;
  if (accessToken) return accessToken; // Use cached token if available
  const clientId = config.zoomConfig.zoom_client_id;
  const clientSecret = config.zoomConfig.zoom_client_secret;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {},
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );
  accessToken = response.data.access_token;

  // Token is valid for 1 hour, so you may want to set up caching accordingly
  setTimeout(() => {
    accessToken = null;
  }, response.data.expires_in * 1000);

  return accessToken;
}

/**
 * Retrieves a list of all evaluation records with filters, sorting, and pagination.
 *
 * @param {GetAllRecordsParams} params - Parameters for filtering, sorting, and pagination.
 * @returns {Promise<{ totalCount: number; evaluation: IEvaluation[] }>} - The total count and list of evaluations.
 */
export const getAllEvaluationRecords = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; evaluation: IEvaluation[] }> => {
  const {
    academicCoachId,
    searchText,
    sortBy,
    sortOrder,
    offset,
    limit,
    filterValues,
  } = params;

  const query: any = {};

  // ✅ Only add academicCoachId to query if it is provided
  if (academicCoachId) {
    query.academicCoachId = academicCoachId;
  }

  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: "i" } },
      { email: { $regex: searchText, $options: "i" } },
    ];
  }

  if (filterValues) {
    if (filterValues.course) {
      query.course = { $in: filterValues.course };
    }
    if (filterValues.country) {
      query.country = { $in: filterValues.country };
    }
    if (filterValues.teacher) {
      query.teacher = { $in: filterValues.teacher };
    }
    if (filterValues.status) {
      query.status = { $in: filterValues.status };
    }
  }

  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const evaluationQuery = EvaluationModel.find(query).sort(sortOptions);

  if (!isNil(offset) && !isNil(limit)) {
    const skip = Math.max(
      0,
      ((Number(offset) ?? Number(commonMessages.OFFSET)) - 1) *
      (Number(limit) ?? Number(commonMessages.LIMIT))
    );
    evaluationQuery
      .skip(skip)
      .limit(Number(limit) ?? Number(commonMessages.LIMIT));
  }

  const [evaluation, totalCount] = await Promise.all([
    evaluationQuery.exec(),
    EvaluationModel.countDocuments(query).exec(),
  ]);

  AppLogger.info(evaluationMessages.GET_ALL_LIST_SUCCESS, {
    totalCount: totalCount,
  });

  return { totalCount, evaluation };
};

//evaluationRecordBYId
export const getEvaluationRecordById = async (
  id: string
): Promise<IEvaluation | null> => {
  return EvaluationModel.findOne({
    trialId: id,
  }).lean() as unknown as IEvaluation | null;
};

export interface EvaluationUpdate {
  invoiceStatus: string;
  paymentStatus: string;
}

export const updateStudentInvoice = async (
  id: string,
  payload: Partial<EvaluationUpdate>
): Promise<IEvaluation | null> => {
  const updateInvoice = await EvaluationModel.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    { $set: payload },
    { new: true }
  ).lean();
  const updatedEvaluation = (await updateInvoice) as unknown as IEvaluation; // Cast to expected type
  return updatedEvaluation;
};

export const getTotalTrialClassRequestCount = async () => {

  const evaluationStats = await EvaluationModel.aggregate([
    {
      $match: { status: "Active" }
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        maleCount: {
          $sum: { $cond: [{ $eq: ["$student.studentGender", "Male"] }, 1, 0] }
        },
        femaleCount: {
          $sum: { $cond: [{ $eq: ["$student.studentGender", "Female"] }, 1, 0] }
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ["$trialClassStatus", "COMPLETED"] }, 1, 0] }
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$trialClassStatus", ""] }, 1, 0] }
        },
        inprogressCount: {
          $sum: { $cond: [{ $eq: ["$trialClassStatus", "INPROGRESS"] }, 1, 0] }
        },
        studentNotJointCount: {
          $sum: { $cond: [{ $eq: ["$studentStatus", "NOTJOINED"] }, 1, 0] }
        }
      }
    }
  ]);

  const studentStats = await IAlStudents.countDocuments();

  return {
    evaluation: evaluationStats[0] || {},
    students: studentStats || {}
  };
};

export const getTeacherStatusCount = async () => {
  const evaluationStats = await EvaluationModel.aggregate([
    {
      $match: {
        status: "Active",
      },
    },
    {
      $group: {
        _id: null,
        totalClassCount: { $sum: 1 },
        assignedTeacherCount: {
          $sum: { $cond: [{ $eq: ["$teacherStatus", "Assigned"] }, 1, 0] },
        },
        notAssinedCount: {
          $sum: { $cond: [{ $eq: ["$teacherStatus", "Not Assigned"] }, 1, 0] },
        },
      },
    },
  ]);

  const total = evaluationStats[0].totalClassCount;

  const assignedTeacherPercentage = (
    (evaluationStats[0].assignedTeacherCount / total) *
    100
  ).toFixed(2);

  const notAssignedTeacherPercentage = (
    (evaluationStats[0].notAssinedCount / total) *
    100
  ).toFixed(2);

  return {
    total,
    assignedTeacherCount: evaluationStats[0].assignedTeacherCount,
    notAssinedCount: evaluationStats[0].notAssinedCount,
    assignedTeacherPercentage,
    notAssignedTeacherPercentage,
  };
};


export const getPreferedTeacherPercentage = async () => {
  const preferedTeahcer = await EvaluationModel.aggregate([
    {
      $match: {
        status: "Active",
      },
    },
    {
      $group: {
        _id: null,
        preferedTeacherCount: { $sum: 1 },
        preferedTeacherMaleCount: {
          $sum: {
            $cond: [{ $eq: ["$student.preferredTeacher", "Male"] }, 1, 0],
          },
        },
        preferedTeacherFemaleCount: {
          $sum: {
            $cond: [{ $eq: ["$student.preferredTeacher", "Female"] }, 1, 0],
          },
        },
      },
    },
  ]);
  const preferedTeacherPercentage = preferedTeahcer[0].preferedTeacherCount;
  const preferedTeacherMalePercentage = (
    (preferedTeahcer[0].preferedTeacherMaleCount /
      preferedTeahcer[0].preferedTeacherCount) *
    100
  ).toFixed(2);
  const preferedTeacherFemalePercentage = (
    (preferedTeahcer[0].preferedTeacherFemaleCount /
      preferedTeahcer[0].preferedTeacherCount) *
    100
  ).toFixed(2);

  return {
    preferedTeacherPercentage,
    preferedTeacherMalePercentage,
    preferedTeacherFemalePercentage,
  };
};

export const getStudentCourseCount = async () => {
  const studentCourseCount = await EvaluationModel.aggregate([
    {
      $match: {
        status: "Active",
      },
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        quranCount: {
          $sum: {
            $cond: [{ $eq: ["$student.learningInterest", "Quran"] }, 1, 0],
          },
        },
        arabicCount: {
          $sum: {
            $cond: [
              { $eq: ["$student.learningInterest", "Islamic Studies"] },
              1,
              0,
            ],
          },
        },
        islamicCount: {
          $sum: {
            $cond: [{ $eq: ["$student.learningInterest", "Arabic"] }, 1, 0],
          },
        },
      },
    },
  ]);
  const totalPercentage = studentCourseCount[0].totalCount;
  const quranPercentage = (
    (studentCourseCount[0].quranCount / studentCourseCount[0].totalCount) *
    100
  ).toFixed(2);
  const arabicPercentage = (
    (studentCourseCount[0].arabicCount / studentCourseCount[0].totalCount) *
    100
  ).toFixed(2);
  const islamicPercentage = (
    (studentCourseCount[0].islamicCount / studentCourseCount[0].totalCount) *
    100
  ).toFixed(2);

  return {
    totalPercentage,
    quranPercentage,
    arabicPercentage,
    islamicPercentage,
  };
};

export const getCountriesCount = async () => {
  const studentCountByCountry = await EvaluationModel.aggregate([
    {
      $match: {
        status: "Active", // Optional filter
      },
    },
    {
      $group: {
        _id: "$student.studentCountry",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 }, // Optional: sort descending
    },
  ]);

  const evaluationCount = await EvaluationModel.countDocuments({
    status: "Active",
  }).exec();

  const results: any[] = [];

  for (const studentCountry of studentCountByCountry) {
    let studentCountryPercentage = (
      (studentCountry.count / evaluationCount) *
      100
    ).toFixed(2);
    results.push({
      country: studentCountry._id,
      count: studentCountry.count,
      percentage: parseFloat(studentCountryPercentage),
    });
  }

  return { evaluationCount, studentCountByCountry: results };
};

export const getTrialbyTeacherCount = async () => {
  const studentCountByCountry = await EvaluationModel.aggregate([
    {
      $match: {
        status: "Active", // Optional filter
      },
    },
    {
      $group: {
        _id: "$teacher.teacherName",
        trialCount: { $sum: 1 },
        joined: {
          $sum: { $cond: [{ $eq: ["$trialClassStatus", "PENDING"] }, 1, 0] },
        },
      },
    },
    {
      $sort: { count: -1 }, // Optional: sort descending
    },
  ]);

  return studentCountByCountry;
};

export const getTrialClassCount = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; evaluation: IEvaluation[] }> => {
  const {
    trialClassStatus,
    searchText,
    sortBy,
    sortOrder,
    offset,
    limit,
    filterValues,
  } = params;

  const query: any = {};

  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: "i" } },
      { email: { $regex: searchText, $options: "i" } },
    ];
  }

  if (trialClassStatus) {
    query.trialClassStatus = { $in: trialClassStatus };
  }

  if (filterValues) {
    if (filterValues.course) {
      query.course = { $in: filterValues.course };
    }
    if (filterValues.country) {
      query.country = { $in: filterValues.country };
    }
    if (filterValues.teacher) {
      query.teacher = { $in: filterValues.teacher };
    }
    if (filterValues.status) {
      query.status = { $in: filterValues.status };
    }
  }

  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const evaluationQuery = EvaluationModel.find(query).sort(sortOptions);

  if (!isNil(offset) && !isNil(limit)) {
    const skip = Math.max(
      0,
      ((Number(offset) ?? Number(commonMessages.OFFSET)) - 1) *
      (Number(limit) ?? Number(commonMessages.LIMIT))
    );
    evaluationQuery
      .skip(skip)
      .limit(Number(limit) ?? Number(commonMessages.LIMIT));
  }

  const [evaluation, totalCount] = await Promise.all([
    evaluationQuery.exec(),
    EvaluationModel.countDocuments(query).exec(),
  ]);

  AppLogger.info(evaluationMessages.GET_ALL_LIST_SUCCESS, {
    totalCount: totalCount,
  });

  return { totalCount, evaluation };
};

//evaluationRecordBYId
export const getTrialClassRecordById = async (teacherId: string) => {
  const currentDate = new Date();
  const formattedDate = currentDate.toISOString().split("T")[0];
  console.log("formattedDate", formattedDate);
  const startOfDayIST = `${formattedDate}T00:00:00.000+00:00`;
  const endOfDayIST = `${formattedDate}T23:59:59.999+00:00`;
  const trialClass = await MeetingSchedule.find({
    ["teacher.teacherId"]: teacherId,
    // scheduledStartDate:  {
    //     $gte: startOfDayIST,
    //     $lte: endOfDayIST
    //   }
  }).sort({ scheduledFrom: 1 });
  let getTrialsClassstatus;
  for (const trialClassUpdateDetails of trialClass) {
    getTrialsClassstatus = await EvaluationModel.findOne({
      trialId: trialClassUpdateDetails.trialId
    }).exec();
    if (getTrialsClassstatus && (getTrialsClassstatus.trialClassStatus == "" || getTrialsClassstatus.trialClassStatus == "PENDING")) {
      const trialClass = await MeetingSchedule.find({
        trialId: getTrialsClassstatus.trialId,
        // scheduledStartDate:  {
        //     $gte: startOfDayIST,
        //     $lte: endOfDayIST
        //   }
      }).sort({ scheduledFrom: 1 });

      return trialClass || "";
    }
  }
};

// async function getTeacherAvaialbleTime() {

// const getAvailableTime = await MeetingSchedule.find({
//   classType: "Trail class"
// }).exec();

// }
