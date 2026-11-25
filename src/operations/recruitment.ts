


import {
  IRecruitment,
  IRecruitmentCreate,
  IRecruitmentFieldChange,
} from "../../types/models.types";
import RecruitModel from "../models/recruitment"
import RecruitmentInterviewScheduleModel from "../models/recruitmentInterviewSchedule";
import { GetAllApplicationsRecordsParams, GetAllTeachersRecordsParams } from "../shared/enum";
import { applicationStatus } from "../config/messages";
import AppLogger from "../helpers/logging";
import { Types } from "mongoose";
import { isEqual } from "lodash";
import User from "../models/users";
import EmailTemplate from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";
import { eachDayOfInterval, eachMonthOfInterval, format } from "date-fns";
import ShiftSchedule from "../models/usershiftschedule"
import { generateSlotsFromUserSchedule } from "../redis/handler/teacherSlotHander";
import { academicAvailableTeachers } from "../kafka/producers/academicProducer";
import SalaryAndWages from "../models/empwages";
import classShedule from "../models/classShedule"
import {
  RecruitmentInterviewMode,
  RecruitmentInterviewPlatform,
} from "../shared/enum";
import { IRecruitmentInterviewSchedule } from "../../types/models.types";
import { hashPassword } from "../shared/common";
import axios from "axios";
import { config } from "../config/env";
import TenantModel from "../models/tenants";

export interface IRecruitmentAdminUpdate{
  tenantId?: string;
  applicationStatus?: string;
  gender?: string;
  preferedWorkingHours?: string;
  updatedBy: string;
  updatedByRole?: string[];
}

export class RecruitmentApprovalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecruitmentApprovalValidationError";
  }
}

/**
 * Creates a new user.
 *
 * @param {IRecruitmentCreate} payload - The data of the user to be created.
 */
export const createRecruitment = async (  payload: IRecruitmentCreate
): Promise<IRecruitment | { error: any }> => {

     const createdAt = payload.createdDate || new Date();
     const newRecruit = new RecruitModel({
       ...payload,
       createdDate: createdAt,
     });

        // if (newRecruit.applicationDate?.toDateString() === new Date().toDateString()) {
        //      return {
        //          error: badRequest('Evaluation class is not allowed to current date. Select another date'),
        //      };
        //  }
       

     // Convert file to string (Base64 encoding)
      const savedUser = await newRecruit.save();
    
      return savedUser;
}

const normalizeInterviewDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const GOOGLE_MEET_BROWSER_SHORTCUT = "https://meet.google.com/new";

const isInterviewSlotBooked = async (
  interviewDate: Date,
  interviewTime: string
): Promise<boolean> => {
  const interviewDay = normalizeInterviewDay(interviewDate);
  const nextInterviewDay = new Date(interviewDay.getTime() + 24 * 60 * 60 * 1000);
  const bookedSlot = await RecruitmentInterviewScheduleModel.exists({
    interviewDate: { $gte: interviewDay, $lt: nextInterviewDay },
    interviewTime,
  });

  return !!bookedSlot;
};




const getInterviewScheduleEmailTemplate = async () => {
  const emailTemplate = await EmailTemplate.findOne({
    templateKey: "Recruitment Interview Schedule",
    status: "Active",
  }).exec();


  if (!emailTemplate) {
    throw new Error(
      'Active email template not found (templateKey: "Recruitment Interview Schedule")'
    );
  }


  return emailTemplate;
};


const sendInterviewScheduleEmail = async (
  recruitment: Pick<
    IRecruitment,
    "candidateFirstName" | "candidateEmail" | "position" | "teachingExperience"
  >,
  templateContent: string,
  interviewDate: Date,
  interviewTime: string,
  interviewMode: RecruitmentInterviewMode,
  interviewPlatform: RecruitmentInterviewPlatform | undefined,
  interviewMeetingLink: string
): Promise<void> => {
  const formattedInterviewDate = interviewDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const values: Record<string, string> = {
    username: recruitment.candidateFirstName,
    candidatefirstname: recruitment.candidateFirstName,
    candidatename: recruitment.candidateFirstName,
    position: recruitment.position || "",
    teachingexperience: String(recruitment.teachingExperience ?? ""),
    date: formattedInterviewDate,
    meetingtime: interviewTime,
    meetingmode: interviewMode,
    interviewmode: interviewMode,
    meetingplatform: interviewPlatform || interviewMode,
    zoomlink: interviewMeetingLink,
    interviewdate: formattedInterviewDate,
    interviewtime: interviewTime,
    interviewplatform: interviewPlatform || "",
    interviewmeetinglink: interviewMeetingLink,
  };
  const normalizePlaceholder = (key: string) =>
    key.replace(/[\s_-]/g, "").toLowerCase();
  const htmlPart = templateContent
    .replace(/<([a-zA-Z][\w -]*)>/g, (placeholder, key: string) =>
      values[normalizePlaceholder(key)] ?? placeholder
    )
    .replace(/{{\s*([\w -]+)\s*}}/g, (placeholder, key: string) =>
      values[normalizePlaceholder(key)] ?? placeholder
    );


  await sendEmailClient(
    [{ email: recruitment.candidateEmail }],
    `Interview Schedule - ${recruitment.candidateFirstName}`,
    htmlPart
  );
};

export const createRecruitmentInterviewSchedule = async (
  recruitmentId: string,
  interviewDate: Date,
  interviewTime: string,
  interviewPlatform: RecruitmentInterviewPlatform | undefined,
  interviewMode: RecruitmentInterviewMode
): Promise<IRecruitmentInterviewSchedule | { duplicate: "recruitment" | "slot" } | null> => {
  const recruitment = await RecruitModel.findById(recruitmentId)
    .select("tenantId candidateFirstName candidateEmail position teachingExperience")
    .exec();

  if (!recruitment) {
    return null;
  }

  const existingSchedule = await RecruitmentInterviewScheduleModel.exists({
    recruitmentId: recruitment._id,
  });

  if (existingSchedule) {
    return { duplicate: "recruitment" };
  }

  if (await isInterviewSlotBooked(interviewDate, interviewTime)) {
    return { duplicate: "slot" };
  }

  const emailTemplate = await getInterviewScheduleEmailTemplate();
  const tenant = await TenantModel.findOne({ tenantCode: recruitment.tenantId })
    .select("timeZone")
    .lean();
  const timeZone = tenant?.timeZone || "UTC";
  const interviewDay = normalizeInterviewDay(interviewDate);
  let interviewMeetingLink = "";
  if (interviewMode === RecruitmentInterviewMode.ONLINE) {
    if (!interviewPlatform) {
      throw new Error("Interview platform is required for online interviews");
    }
    interviewMeetingLink = await createInterviewMeeting({
      candidateFirstName: recruitment.candidateFirstName,
      interviewDate: interviewDay,
      interviewTime,
      timeZone,
      interviewPlatform,
    });
  }

  const schedule = new RecruitmentInterviewScheduleModel({
    recruitmentId: recruitment._id,
    tenantId: recruitment.tenantId,
    candidateFirstName: recruitment.candidateFirstName,
    position: recruitment.position,
    teachingExperience: recruitment.teachingExperience,
    interviewDate: interviewDay,
    interviewTime,
    interviewMode,
    interviewPlatform:
      interviewMode === RecruitmentInterviewMode.ONLINE
        ? interviewPlatform
        : undefined,
    interviewmeetinglink: interviewMeetingLink,
  });

  const savedSchedule = await schedule.save();
  await RecruitModel.updateOne(
    { _id: recruitment._id },
    { $set: { applicationStatus: applicationStatus.SCHEDULED } }
  ).exec();
  await sendInterviewScheduleEmail(
    recruitment,
    emailTemplate.templateContent,
    interviewDay,
    interviewTime,
    interviewMode,
    interviewPlatform,
    interviewMeetingLink
  );

  return savedSchedule;
};

export const rescheduleRecruitmentInterview = async (
  recruitmentId: string,
  interviewDate: Date,
  interviewTime: string,
  interviewPlatform: RecruitmentInterviewPlatform | undefined,
  interviewMode?: RecruitmentInterviewMode
): Promise<IRecruitmentInterviewSchedule | { duplicate: "slot" } | null> => {
  const recruitment = await RecruitModel.findById(recruitmentId).exec();
  if (!recruitment) {
    return null;
  }

  const schedule = await RecruitmentInterviewScheduleModel.findOne({
    recruitmentId: recruitment._id,
  }).exec();
  if (!schedule) {
    return null;
  }

  const interviewDay = new Date(Date.UTC(
    interviewDate.getUTCFullYear(),
    interviewDate.getUTCMonth(),
    interviewDate.getUTCDate()
  ));
  const nextInterviewDay = new Date(interviewDay.getTime() + 24 * 60 * 60 * 1000);
  const existingSlot = await RecruitmentInterviewScheduleModel.exists({
    _id: { $ne: schedule._id },
    interviewDate: { $gte: interviewDay, $lt: nextInterviewDay },
    interviewTime,
    interviewPlatform,
  });

  if (existingSlot) {
    return { duplicate: "slot" };
  }

  const resolvedInterviewMode =
    interviewMode ?? schedule.interviewMode ?? RecruitmentInterviewMode.ONLINE;
  const resolvedInterviewPlatform =
    resolvedInterviewMode === RecruitmentInterviewMode.ONLINE
      ? interviewPlatform ?? schedule.interviewPlatform
      : undefined;

  if (
    resolvedInterviewMode === RecruitmentInterviewMode.ONLINE &&
    !resolvedInterviewPlatform
  ) {
    throw new Error("Interview platform is required for online interviews");
  }

  if (resolvedInterviewMode === RecruitmentInterviewMode.OFFLINE) {
    schedule.interviewmeetinglink = "";
  } else {
    if (!resolvedInterviewPlatform) {
      throw new Error("Interview platform is required for online interviews");
    }

    if (
      schedule.interviewMode !== RecruitmentInterviewMode.ONLINE ||
      schedule.interviewPlatform !== resolvedInterviewPlatform ||
      resolvedInterviewPlatform === RecruitmentInterviewPlatform.GOOGLE_MEET
    ) {
      const tenant = await TenantModel.findOne({ tenantCode: recruitment.tenantId })
        .select("timeZone")
        .lean();
      schedule.interviewmeetinglink = await createInterviewMeeting({
        candidateFirstName: recruitment.candidateFirstName,
        interviewDate: interviewDay,
        interviewTime,
        timeZone: tenant?.timeZone || "UTC",
        interviewPlatform: resolvedInterviewPlatform,
      });
    }
  }

  schedule.previousInterviewDate = schedule.interviewDate;
  schedule.previousInterviewTime = schedule.interviewTime;
  schedule.interviewDate = interviewDay;
  schedule.interviewTime = interviewTime;
  schedule.interviewMode = resolvedInterviewMode;
  schedule.interviewPlatform = resolvedInterviewPlatform;
  const savedSchedule = await schedule.save();

  await RecruitModel.updateOne(
    { _id: recruitment._id },
    { $set: { applicationStatus: applicationStatus.RESCHEDULED } }
  ).exec();

  return savedSchedule;
};

export const getAllApplicantsRecords = async (
  params: GetAllApplicationsRecordsParams
): Promise<{
  totalCount: number;
  applicants: Array<
    Omit<
      IRecruitment,
      | "updatedBy"
      | "updatedDate"
      | "shortlistedBy"
      | "shortlistedAt"
      | "rejectedBy"
      | "rejectedAt"
      | "approvedBy"
      | "approvedAt"
    > & {
      updatedBy: string | null;
      updatedDate: Date | null;
      shortlistedBy: string | null;
      shortlistedAt: Date | null;
      rejectedBy: string | null;
      rejectedAt: Date | null;
      approvedBy: string | null;
      approvedAt: Date | null;
      interviewSchedule: IRecruitmentInterviewSchedule | null;
    }
  >;
}> => {
  const { searchText, offset, limit, filterValues } = params;
  const query: any = {};

 if (searchText?.trim()) {
  const escapedSearch = searchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const searchRegex = new RegExp(escapedSearch, 'i');
  const isDate = !isNaN(Date.parse(searchText));
  const orConditions: any[] = [
    { candidateFirstName: searchRegex },
    { candidateLastName: searchRegex },
    { candidateEmail: searchRegex },
    { candidateCity: searchRegex },
    { positionApplied: searchRegex }
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

// --- Application Status ---
if (filterValues?.applicationStatus) {
  const values = Array.isArray(filterValues.applicationStatus)
    ? filterValues.applicationStatus
    : [filterValues.applicationStatus];
  if (values.length > 0) {
    query.applicationStatus = { $in: values.map(v => new RegExp(`^${v}$`, "i")) };
  }
}

// --- Position Applied ---
if (filterValues?.positionApplied) {
  const values = Array.isArray(filterValues.positionApplied)
    ? filterValues.positionApplied
    : [filterValues.positionApplied];
  if (values.length > 0) {
    query.positionApplied = { $in: values.map(v => new RegExp(`^${v}$`, "i")) };
  }
}

 // Date Range
  if (
    filterValues?.dateRange?.from &&
    filterValues?.dateRange?.to &&
    !isNaN(Date.parse(filterValues.dateRange.from)) &&
    !isNaN(Date.parse(filterValues.dateRange.to))
  ) {
    const fromDate = new Date(filterValues.dateRange.from);
    const toDate = new Date(filterValues.dateRange.to);
    toDate.setHours(23, 59, 59, 999); // End of day
    query.applicationDate = {
      $gte: fromDate,
      $lte: toDate
    };
  }

  const applicants = await RecruitModel.find(query)
    .sort({ applicationDate: -1 })
    .lean()
    .exec();

  const interviewSchedules = applicants.length
    ? await RecruitmentInterviewScheduleModel.find({
        recruitmentId: { $in: applicants.map((applicant) => applicant._id) },
      })
        .lean()
        .exec()
    : [];
  const interviewSchedulesByRecruitmentId = new Map(
    interviewSchedules.map((schedule) => [String(schedule.recruitmentId), schedule])
  );

const totalCount = applicants.length;

  return {
    totalCount,
    applicants: applicants.map((applicant) => ({
      ...applicant,
      createdByRole: applicant.createdByRole ?? [],
      updatedBy: applicant.updatedBy ?? null,
      updatedByRole: applicant.updatedByRole ?? [],
      updatedDate: applicant.updatedDate ?? null,
      shortlistedBy: applicant.shortlistedBy ?? null,
      shortlistedByRole: applicant.shortlistedByRole ?? [],
      shortlistedAt: applicant.shortlistedAt ?? null,
      rejectedBy: applicant.rejectedBy ?? null,
      rejectedByRole: applicant.rejectedByRole ?? [],
      rejectedAt: applicant.rejectedAt ?? null,
      approvedBy: applicant.approvedBy ?? null,
      approvedByRole: applicant.approvedByRole ?? [],
      approvedAt: applicant.approvedAt ?? null,
      interviewSchedule:
        interviewSchedulesByRecruitmentId.get(String(applicant._id)) ?? null,
    })),
  };
};


export const getApplicantRecordById = async (id: string) => {
  const applicant = await RecruitModel.findById(id).lean().exec();
  if (!applicant) {
    return null;
  }

  const interviewSchedule = await RecruitmentInterviewScheduleModel.findOne({
    recruitmentId: applicant._id,
  })
    .lean()
    .exec();

  return {
    ...applicant,
    interviewSchedule: interviewSchedule ?? null,
  };
};

/**
 * Updates a candidate record in the database by its ID.
 *
 * @param {string} id - The unique ID of the candidate to update.
 * @param {Partial<IRecruitmentCreate>} payload - The fields to update in the candidate record. Only provided fields will be updated.
 * @returns {Promise<IRecruitment | null>} A promise that resolves to the updated candidate record, or null if no candidate was found.
 */
export const updateApplicantById = async (
  id: string,
  payload: Partial<IRecruitmentCreate>,
  tenantId: string,
  supervisorId: string,
): Promise<IRecruitment | null> => {
  return updateRecruitmentWithHistory(id, payload, tenantId, supervisorId);
};



/**
 * Updates a candidate record in the database by its ID.
 *
 * @param {string} id - The unique ID of the candidate to update.
 * @param {Partial<IRecruitmentCreate>} payload - The fields to update in the candidate record. Only provided fields will be updated.
 * @returns {Promise<IRecruitment | null>} A promise that resolves to the updated candidate record, or null if no candidate was found.
 */
export const updateApplicantByAdminId = async (
  id: string,
  payload: Partial<IRecruitmentAdminUpdate>
): Promise<IRecruitment | null> => {
  try {
    const approvalData = await RecruitModel.findOne({
      _id: new Types.ObjectId(id),
      ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
    }).lean();

    const canAdminReview =
      approvalData?.applicationStatus === applicationStatus.SHORTLISTED ||
      (approvalData?.applicationStatus === applicationStatus.APPROVED &&
        payload.applicationStatus === applicationStatus.APPROVED);
    const preferredWorkingHours =
      payload.preferedWorkingHours ?? approvalData?.preferedWorkingHours;
    if (
      canAdminReview &&
      payload.applicationStatus === applicationStatus.APPROVED &&
      typeof preferredWorkingHours === "string" &&
      preferredWorkingHours.trim()
    ) {
      try {
        parsePreferredWorkingHours(preferredWorkingHours);
      } catch (error) {
        throw new RecruitmentApprovalValidationError(
          error instanceof Error
            ? error.message
            : "Preferred working hours are invalid",
        );
      }
    }
    if (
      canAdminReview &&
      payload.applicationStatus === applicationStatus.APPROVED
    ) {
      const existingTeacher = await User.findOne({
        tenantId: payload.tenantId,
        userId: approvalData?.candidateId,
        role: "TEACHER",
      })
        .select("_id")
        .lean()
        .exec();
      const gender = payload.gender ?? approvalData?.gender;
      if (!existingTeacher && !(typeof gender === "string" && gender.trim())) {
        throw new RecruitmentApprovalValidationError(
          "Candidate gender is required to create the teacher account",
        );
      }
    }
    const approvedData = canAdminReview
      ? await updateRecruitmentWithHistory(id, payload, payload.tenantId)
      : null;

    if (!approvedData) {
      console.warn("No applicant record updated.", {
        applicantId: id,
        tenantId: payload.tenantId ?? null,
        applicantFound: Boolean(approvalData),
        currentApplicationStatus: approvalData?.applicationStatus ?? null,
        requestedApplicationStatus: payload.applicationStatus ?? null,
        tenantScoped: Boolean(payload.tenantId),
      });
      return null;
    }

    const updateData = approvedData as IRecruitment;

    if (updateData.applicationStatus === "APPROVED") {
      await createTeacherPortalPortal(updateData);
    }

    console.log("updateData", updateData);
    return updateData;
  } catch (error) {
    console.error("Error in updateApplicantByAdminId:", error);
    throw error;
  }
};

const updateRecruitmentWithHistory = async (
  id: string,
  payload: Partial<IRecruitmentCreate> & Partial<IRecruitmentAdminUpdate>,
  tenantId?: string,
  supervisorId?: string,
): Promise<IRecruitment | null> => {
  const updatedBy = payload.updatedBy?.trim();
  if (!updatedBy) {
    throw new Error("updatedBy is required to record recruitment changes");
  }

  const existing = await RecruitModel.findOne({
    _id: new Types.ObjectId(id),
    ...(tenantId ? { tenantId } : {}),
    ...(supervisorId ? { "supervisor.supervisorId": supervisorId } : {}),
  }).exec();
  if (!existing) {
    return null;
  }

  const changedAt = new Date();
  const previousApplicationStatus = existing.applicationStatus;
  const excludedFields = new Set([
    "tenantId",
    "createdBy",
    "createdByRole",
    "createdDate",
    "updatedBy",
    "updatedByRole",
    "updatedDate",
    "shortlistedBy",
    "shortlistedByRole",
    "shortlistedAt",
    "rejectedBy",
    "rejectedByRole",
    "rejectedAt",
    "approvedBy",
    "approvedByRole",
    "approvedAt",
  ]);
  const changes = Object.entries(payload).reduce<Record<string, unknown>>(
    (result, [field, value]) => {
      if (!excludedFields.has(field) && value !== undefined) {
        result[field] = value;
      }
      return result;
    },
    {}
  );

  const changeHistory: IRecruitmentFieldChange[] = [];
  for (const [field, newValue] of Object.entries(changes)) {
    const oldValue = existing.get(field);
    if (!isEqual(oldValue, newValue) && field === "applicationStatus") {
      changeHistory.push({
        field,
        oldValue,
        newValue,
        changedBy: updatedBy,
        changedByRole: payload.updatedByRole,
        changedAt,
      });
    }
    existing.set(field, newValue);
  }

  existing.updatedBy = updatedBy;
  existing.updatedByRole = payload.updatedByRole;
  existing.updatedDate = changedAt;
  if (
    payload.applicationStatus === applicationStatus.SHORTLISTED &&
    previousApplicationStatus !== applicationStatus.SHORTLISTED
  ) {
    existing.shortlistedBy = updatedBy;
    existing.shortlistedByRole = payload.updatedByRole;
    existing.shortlistedAt = changedAt;
  } else if (
    payload.applicationStatus === applicationStatus.REJECTED &&
    previousApplicationStatus !== applicationStatus.REJECTED
  ) {
    existing.rejectedBy = updatedBy;
    existing.rejectedByRole = payload.updatedByRole;
    existing.rejectedAt = changedAt;
  } else if (
    payload.applicationStatus === applicationStatus.APPROVED &&
    previousApplicationStatus !== applicationStatus.APPROVED
  ) {
    existing.approvedBy = updatedBy;
    existing.approvedByRole = payload.updatedByRole;
    existing.approvedAt = changedAt;
  }

  if (changeHistory.length > 0) {
    existing.changeHistory.push(...changeHistory);
  }

  return existing.save();
};

async function createTeacherPortalPortal(updateData: any) {
  const preferredWorkingHours =
    typeof updateData.preferedWorkingHours === "string"
      ? updateData.preferedWorkingHours.trim()
      : "";
  const shiftTimes = preferredWorkingHours
    ? parsePreferredWorkingHours(preferredWorkingHours)
    : null;
  let saveTeacher = await User.findOne({
    tenantId: updateData.tenantId,
    userId: updateData.candidateId,
    role: "TEACHER",
  }).exec();

  if (!saveTeacher) {
    const specialChars = "@#$%&*!";
    const randomNum = Math.floor(Math.random() * 1000);
    const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
    const firstThreeChars = updateData.candidateFirstName.substring(0, 3);
    const reversedUsername = updateData.candidateFirstName.split("").reverse().join("");
    const password = `${firstThreeChars}${randomSpecial}${randomNum}${reversedUsername}`;
    const hashedPassword = await hashPassword(password);

    saveTeacher = await User.create({
      tenantId: updateData.tenantId,
      userName: updateData.candidateFirstName,
      email: updateData.candidateEmail,
      password: hashedPassword,
      profileImage: null,
      userId: updateData.candidateId,
      role: "TEACHER",
      position: updateData.positionApplied,
      gender: updateData.gender,
      status: "Active",
      createdBy: "Admin",
      createdDate: new Date(),
      lastUpdatedBy: "Admin",
      updatedDate: new Date(),
    });

    const emailTemplate = await EmailTemplate.findOne({
      templateKey: "Teacher Portal",
    }).exec();

    if (emailTemplate) {
      const emailTo = [{ email: saveTeacher.email }];
      const subject = "Welcome To Our Team";
      const htmlPart = emailTemplate.templateContent
        .replace("<username>", saveTeacher.userName)
        .replace("<username>", saveTeacher.userName)
        .replace("<password>", password);
      sendEmailClient(emailTo, subject, htmlPart);
    }
  }

  const salaryRecords = [
    {
      tenantId: saveTeacher.tenantId,
      employeeName: saveTeacher.userName,
      employeeId: saveTeacher.userId,
      classType: {
        className: "TRAILCLASS",
        hoursMins: "1 day",
        rate: 2,
        currency: "$",
      },
      status: "Active",
      createdDate: new Date(),
      createdBy: "Admin",
      updatedDate: new Date(),
      updatedBy: "Admin",
    },
    {
      tenantId: saveTeacher.tenantId,
      employeeName: saveTeacher.userName,
      employeeId: saveTeacher.userId,
      classType: {
        className: "REGULARCLASS",
        hoursMins: "60 min",
        rate: 4,
        currency: "$",
      },
      status: "Active",
      createdDate: new Date(),
      createdBy: "Admin",
      updatedDate: new Date(),
      updatedBy: "Admin",
    },
    {
      tenantId: saveTeacher.tenantId,
      employeeName: saveTeacher.userName,
      employeeId: saveTeacher.userId,
      classType: {
        className: "GRUOPCLASS",
        hoursMins: "60 min",
        rate: 6,
        currency: "$",
      },
      status: "Active",
      createdDate: new Date(),
      createdBy: "Admin",
      updatedDate: new Date(),
      updatedBy: "Admin",
    },
  ];

  const existingSalaryRecords = await SalaryAndWages.find({
    tenantId: saveTeacher.tenantId,
    employeeId: saveTeacher.userId,
    "classType.className": {
      $in: salaryRecords.map(({ classType }) => classType.className),
    },
  })
    .select("classType.className")
    .lean()
    .exec();
  const existingClassNames = new Set(
    existingSalaryRecords.map((record) => record.classType.className)
  );
  const missingSalaryRecords = salaryRecords.filter(
    ({ classType }) => !existingClassNames.has(classType.className)
  );
  if (missingSalaryRecords.length > 0) {
    await SalaryAndWages.insertMany(missingSalaryRecords);
  }

  const shiftSchedule = shiftTimes
    ? await createShiftSchedule(saveTeacher, updateData, shiftTimes)
    : await ShiftSchedule.findOne({
        tenantId: saveTeacher.tenantId,
        teacherId: saveTeacher.userId,
        role: "TEACHER",
      }).exec();
  if (shiftSchedule) {
    await generateSlotsFromUserSchedule(shiftSchedule);
  }
  await academicAvailableTeachers({ event: 'create' });

  return saveTeacher;
}

const parsePreferredWorkingHours = (
  value: string
): { startTime: string; endTime: string } => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("A preferred working-hours range is required");
  }

  const range = value.trim().match(/^(.+?)\s*(?:-|–|—|\bto\b)\s*(.+)$/i);
  if (!range) {
    throw new Error(`Invalid preferred working-hours range: ${value}`);
  }

  const to24HourTime = (input: string): string | null => {
    const match = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2] ?? "0");
    const meridiem = match[3]?.toUpperCase();
    if (minutes > 59) {
      return null;
    }

    if (meridiem) {
      if (hours < 1 || hours > 12) {
        return null;
      }
      hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
    } else if (hours > 23) {
      return null;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const startTime = to24HourTime(range[1]);
  const endTime = to24HourTime(range[2]);
  if (!startTime || !endTime || startTime >= endTime) {
    throw new Error(`Invalid preferred working-hours range: ${value}`);
  }

  return { startTime, endTime };
};

async function createShiftSchedule(
  saveTeacher: any,
  updateData: any,
  shiftTimes: { startTime: string; endTime: string }
) {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 40);

  const existingSchedule = await ShiftSchedule.findOne({
    tenantId: saveTeacher.tenantId,
    teacherId: saveTeacher.userId,
    role: "TEACHER",
  }).exec();
  if (existingSchedule) {
    return existingSchedule;
  }

  return ShiftSchedule.create({
    tenantId: saveTeacher.tenantId,
    academicCoachId: null,
    teacherId: saveTeacher.userId,
    supervisorId: null,
    employeeId: null,
    name: saveTeacher.userName,
    email: saveTeacher.email,
    role: "TEACHER",
    position: saveTeacher.position,
    workhrs: updateData.preferedWorkingHours,
    startdate: startDate,
    enddate: endDate,
    fromtime: shiftTimes.startTime,
    totime: shiftTimes.endTime,
    createdDate: new Date(),
    createdBy: "Admin",
    lastUpdatedBy: "Admin",
  });
}





export const getTeacherCountriesCountDetails = async() =>{

  const teacherCountByCountry = await RecruitModel.aggregate([
    {
      $match: {
        status: "Active", // Optional filter
        applicationStatus: "APPROVED"
      },
    },
    {
      $group: {
        _id: "$candidateCountry",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 }, // Optional: sort descending
    },
  ]);
  
  const teacherCount = await RecruitModel.countDocuments({
     status: "Active", // Optional filter
    applicationStatus: "APPROVED"
  }).exec();
  
  const results: any[] = [];
  
  for (const teacherCountry of teacherCountByCountry) {
    let studentCountryPercentage = ((teacherCountry.count / teacherCount) * 100).toFixed(2);
    results.push({
      country: teacherCountry._id,
      count: teacherCountry.count,
      percentage: parseFloat(studentCountryPercentage),
    });
  }
  
  
  return { teacherCount, studentCountByCountry: results };

};


export const getApplicationStatusData = async (
  fromDate: string,
  toDate: string
): Promise<{ date: string; totalApplied: number; shortlisted: number }[]> => {
  const startDate: Date = new Date(fromDate);
  const endDate: Date = new Date(toDate);
  const mongoDateFormat = "%Y-%m-%d"; // Proper format for MongoDB $dateToString
  const outputFormat = "yyyy-MM-dd"; // Output date string format for chart/display

  console.log(`Fetching results from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const result = await RecruitModel.aggregate([
    {
      $match: {
        status: "Active",
        applicationDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: mongoDateFormat, date: "$applicationDate" } },
          status: "$applicationStatus",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Organize results by date
  const groupedResults: Record<string, { date: string; totalApplied: number; shortlisted: number }> = {};

  for (const { _id, count } of result) {
    const date = _id.date; // already formatted by MongoDB
    if (!groupedResults[date]) {
      groupedResults[date] = {
        date,
        totalApplied: 0,
        shortlisted: 0,
      };
    }
    groupedResults[date].totalApplied += count;
    if (_id.status === "SHORTLISTED") {
      groupedResults[date].shortlisted += count;
    }
  }

  // Ensure all dates in range are returned
  const allDates = eachDayOfInterval({ start: startDate, end: endDate }).map((d) => format(d, outputFormat));

  const finalResult = allDates.map((date: any) =>
    groupedResults[date] || { date, totalApplied: 0, shortlisted: 0 }
  );

  return finalResult;
};
export const getTeacherDetailsOverviewCount = async (
  teacherId: string
): Promise<{
  studentCount: number,
  absentDays: number;
  totalClasses: number;
  totalEarned: number;
  leave: number;
  rescheduled: number;
}> => {

  try{
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
    $addFields: {
      amountNumber: { $toDouble: "$amount" },
    },
  },
  {
    $group: {
      _id: "$teacher.teacherId",
      teacherId: { $first: "$teacher.teacherId" },
      teacherName: { $first: "$teacher.teacherName" },
      teacherEmail: { $first: "$teacher.teacherEmail" },
      uniqueStudents: {
        $addToSet: "$student.studentId",
      },
      totalClasses: { $sum: 1 },
      rescheduleCount: {
        $sum: {
          $cond: [{ $eq: ["$scheduleStatus", "Rescheduled"] }, 1, 0],
        },
      },
      totalEarnings: { $sum: "$amountNumber" },
      absentCount: {
        $sum: {
          $cond: [{ $eq: ["$teacherAttendee", "absent"] }, 1, 0],
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
      totalClasses: 1,
      rescheduleCount: 1,
      totalEarnings: 1,
      absentCount: 1,
    },
  },
]);


 const data = teachers[0];

    return {
      studentCount: data?.studentCount || 0,
      absentDays: data?.absentCount || 0, // map absentCount -> absentDays
      totalClasses: data?.totalClasses || 0,
      totalEarned: data?.totalEarnings || 0,
      leave: 0, // ➜ add real logic if you have it!
      rescheduled: data?.rescheduleCount || 0,
    };

  }catch(e){
    console.log("e>>>>",e );
      return {
    studentCount: 0,
    absentDays: 0,
    totalClasses: 0,
    totalEarned: 0,
    leave: 0,
    rescheduled: 0,
  };
  }

 
};




export const getAllTeacherRecords  = async( params: GetAllTeachersRecordsParams
) =>{
 const { teacherGroup, supervisorId } = params;

  // Construct query object based on filters
  const query: any = {};
if(teacherGroup){
  query.positionApplied = teacherGroup
}

const teacherQuery = await RecruitModel.find({
  'supervisor.supervisorId': supervisorId,
   applicationStatus: "APPROVED",
  ...query
}).exec();

const teachers = teacherQuery.map((teacherDetails) => ({
  teacherId: teacherDetails._id,
  teacherName: `${teacherDetails.candidateFirstName} ${teacherDetails.candidateLastName}`,
  teacherEmail: teacherDetails.candidateEmail
}));

  return  { teachers };
};



export const getTeacherListFemaleMale = async (params: GetAllTeachersRecordsParams) => {
  const preferredTeachers = await RecruitModel.aggregate([
    {
      $match: {
        status: "Active",
      },
    },
    {
      $group: {
        _id: {
          position: "$positionApplied",
          gender: "$gender",         },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    total: 0,
    subjects: {} as Record<
      string,
      {
        total: number;
        male: number;
        female: number;
      }
    >,
  };

  preferredTeachers.forEach(({ _id, count }) => {
    const position = _id.position || "Unknown";
    const gender = _id.gender?.toLowerCase();

    if (!summary.subjects[position]) {
      summary.subjects[position] = { total: 0, male: 0, female: 0 };
    }

    summary.subjects[position].total += count;
    summary.total += count;

    if (gender === "male") summary.subjects[position].male += count;
    else if (gender === "female") summary.subjects[position].female += count;
  });

  const subjectPercentages = Object.entries(summary.subjects).map(([subject, data]) => ({
    subject,
    total: data.total,
    percentage: ((data.total / summary.total) * 100).toFixed(2),
  }));

  const genderBreakdownBySubject = Object.entries(summary.subjects).map(([subject, data]) => {
    const total = data.total || 1;
    return {
      subject,
      male: data.male,
      female: data.female,
      malePercentage: ((data.male / total) * 100).toFixed(2),
      femalePercentage: ((data.female / total) * 100).toFixed(2),
    };
  });

  return {
    totalApplicants: summary.total,
    subjectPercentages,
    genderBreakdownBySubject,
  };
};
const getZoomAccessToken = async (): Promise<string> => {
  const credentials = Buffer.from(
    `${config.zoomConfig.zoom_client_id}:${config.zoomConfig.zoom_client_secret}`
  ).toString("base64");
  const response = await axios.post<{ access_token: string }>(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(config.zoomConfig.zoom_account_id)}`,
    null,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  if (!response.data.access_token) {
    throw new Error("Zoom OAuth response did not include an access token");
  }

  return response.data.access_token;
};

async function createZoomInterviewMeeting({
  candidateFirstName,
  interviewDate,
  interviewTime,
  timeZone,
}: {
  candidateFirstName: string;
  interviewDate: Date;
  interviewTime: string;
  timeZone: string;
}): Promise<string> {
  const accessToken = await getZoomAccessToken();
  const response = await axios.post<{ join_url?: string }>(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      topic: `Interview with ${candidateFirstName}`,
      type: 2,
      start_time: `${interviewDate.toISOString().slice(0, 10)}T${interviewTime}:00`,
      duration: 60,
      timezone: timeZone,
      settings: {
        join_before_host: true,
        participant_video: true,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.data.join_url) {
    throw new Error("Zoom meeting response did not include a join URL");
  }

  return response.data.join_url;
}

const createInterviewMeeting = async ({
  candidateFirstName,
  interviewDate,
  interviewTime,
  timeZone,
  interviewPlatform,
}: {
  candidateFirstName: string;
  interviewDate: Date;
  interviewTime: string;
  timeZone: string;
  interviewPlatform: RecruitmentInterviewPlatform;
}): Promise<string> => {
  switch (interviewPlatform) {
    case RecruitmentInterviewPlatform.GOOGLE_MEET:
      console.info("[InterviewSchedule] Google Meet selected; using browser meeting shortcut");
      return GOOGLE_MEET_BROWSER_SHORTCUT;
    case RecruitmentInterviewPlatform.ZOOM:
      return createZoomInterviewMeeting({
        candidateFirstName,
        interviewDate,
        interviewTime,
        timeZone,
      });
    default:
      throw new Error(`Unsupported interview platform: ${String(interviewPlatform)}`);
  }
};

