


import { IRecruitment, IRecruitmentCreate } from "../../types/models.types";
import RecruitModel from "../models/recruitment"
import RecruitmentInterviewScheduleModel from "../models/recruitmentInterviewSchedule";
import { GetAllApplicationsRecordsParams, GetAllTeachersRecordsParams } from "../shared/enum";
import { appStatus, applicationStatus } from "../config/messages";
import AppLogger from "../helpers/logging";
import { Types } from "mongoose";
import User from "../models/users";
import EmailTemplate from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";
import { eachDayOfInterval, eachMonthOfInterval, format } from "date-fns";
import ShiftSchedule from "../models/usershiftschedule"
import { generateSlotsFromUserSchedule } from "../redis/handler/teacherSlotHander";
import { academicAvailableTeachers } from "../kafka/producers/academicProducer";
import SalaryAndWages from "../models/empwages";
import classShedule from "../models/classShedule"
import { RecruitmentInterviewPlatform } from "../shared/enum";
import { IRecruitmentInterviewSchedule } from "../../types/models.types";
import { hashPassword } from "../shared/common";
import axios from "axios";
import { config } from "../config/env";
import TenantModel from "../models/tenants";
import TenantSettingsModel from "../models/tenant_setting";
import { google } from "googleapis";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export interface IRecruitmentUpdate{
  supervisor:{
    supervisorId?: string;
  };
comments?: string,
applicationStatus: any,
level?: string,
quranReading?: string,
tajweed?: string,
arabicWriting?: string,
arabicSpeaking?: string,
englishSpeaking?: string,
preferedWorkingDays?: string,
overallRating?: number,
status: string,
updatedDate?: Date,
}


export interface IRecruitmentAdminUpdate{
  supervisor:{
    supervisorId?: string;
  };
    applicationStatus: string,
    status:string,
    updatedDate?: Date
 }

/**
 * Creates a new user.
 *
 * @param {IRecruitmentCreate} payload - The data of the user to be created.
 */
export const createRecruitment = async (  payload: IRecruitmentCreate
): Promise<IRecruitment | { error: any }> => {

     const newRecruit = new RecruitModel(payload);

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

const GOOGLE_MEET_CONFIG_KEY = "CALENDAR_GOOGLE_CONFIG";
const GOOGLE_MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
const GOOGLE_OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

export class GoogleMeetOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleMeetOAuthError";
  }
}

export class GoogleMeetNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleMeetNotConnectedError";
  }
}

const getGoogleOAuthClient = () => {
  const { google_client_id, google_client_secret, google_redirect_uri } =
    config.googleMeetConfig;
  if (!google_client_id || !google_client_secret || !google_redirect_uri) {
    throw new Error(
      "Google Meet OAuth requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI"
    );
  }

  return new google.auth.OAuth2(
    google_client_id,
    google_client_secret,
    google_redirect_uri
  );
};

const encodeOAuthStatePart = (value: string): string =>
  Buffer.from(value).toString("base64url");

const signGoogleOAuthState = (payload: {
  tenantId: string;
  issuedAt: number;
  nonce: string;
}): string => {
  const encodedPayload = encodeOAuthStatePart(JSON.stringify(payload));
  const signature = createHmac(
    "sha256",
    config.googleMeetConfig.google_client_secret
  )
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
};

const verifyGoogleOAuthState = (state: string): { tenantId: string } | null => {
  const [encodedPayload, providedSignature, ...extraParts] = state.split(".");
  if (!encodedPayload || !providedSignature || extraParts.length > 0) {
    return null;
  }

  const expectedSignature = createHmac(
    "sha256",
    config.googleMeetConfig.google_client_secret
  )
    .update(encodedPayload)
    .digest();
  const actualSignature = Buffer.from(providedSignature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(
      Uint8Array.from(actualSignature),
      Uint8Array.from(expectedSignature)
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as { tenantId?: unknown; issuedAt?: unknown; nonce?: unknown };
    const validTimestamp =
      typeof payload.issuedAt === "number" &&
      Date.now() - payload.issuedAt >= 0 &&
      Date.now() - payload.issuedAt <= GOOGLE_OAUTH_STATE_MAX_AGE_MS;

    if (
      typeof payload.tenantId !== "string" ||
      !payload.tenantId ||
      typeof payload.nonce !== "string" ||
      !payload.nonce ||
      !validTimestamp
    ) {
      return null;
    }

    return { tenantId: payload.tenantId };
  } catch {
    return null;
  }
};

export const getGoogleMeetAuthorizationUrl = (tenantId: string): string => {
  const oauthClient = getGoogleOAuthClient();
  const state = signGoogleOAuthState({
    tenantId,
    issuedAt: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  });

  return oauthClient.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [GOOGLE_MEET_SCOPE],
    state,
  });
};

export const connectGoogleMeet = async (
  code: string,
  state: string
): Promise<string> => {
  const verifiedState = verifyGoogleOAuthState(state);
  if (!verifiedState) {
    throw new GoogleMeetOAuthError(
      "Google Meet authorization state is invalid or expired"
    );
  }

  const oauthClient = getGoogleOAuthClient();
  const { tokens } = await oauthClient.getToken(code);
  const existingSetting = await TenantSettingsModel.findOne({
    tenantId: verifiedState.tenantId,
    keyName: GOOGLE_MEET_CONFIG_KEY,
  }).exec();
  const existingRefreshToken =
    existingSetting?.keyValue &&
    typeof existingSetting.keyValue.refreshToken === "string"
      ? existingSetting.keyValue.refreshToken
      : undefined;
  const refreshToken = tokens.refresh_token || existingRefreshToken;

  if (!refreshToken) {
    throw new GoogleMeetOAuthError(
      "Google did not return a refresh token; reconnect and grant offline access"
    );
  }

  const now = new Date();
  if (existingSetting) {
    const existingKeyValue =
      existingSetting.keyValue &&
      typeof existingSetting.keyValue === "object" &&
      !Array.isArray(existingSetting.keyValue)
        ? existingSetting.keyValue
        : {};
    existingSetting.keyValue = {
      ...existingKeyValue,
      refreshToken,
    };
    existingSetting.isConnected = true;
    existingSetting.status = appStatus.ACTIVE;
    existingSetting.lastUpdatedDate = now;
    existingSetting.lastUpdatedBy = "google-oauth";
    await existingSetting.save();
  } else {
    await new TenantSettingsModel({
      tenantId: verifiedState.tenantId,
      keyName: GOOGLE_MEET_CONFIG_KEY,
      keyValue: { refreshToken },
      module: "Integration",
      isConnected: true,
      status: appStatus.ACTIVE,
      createdDate: now,
      createdBy: "google-oauth",
      lastUpdatedDate: now,
      lastUpdatedBy: "google-oauth",
    }).save();
  }

  return verifiedState.tenantId;
};

const createGoogleMeetSpace = async (tenantId: string): Promise<string> => {
  const setting = await TenantSettingsModel.findOne({
    tenantId,
    keyName: GOOGLE_MEET_CONFIG_KEY,
    status: appStatus.ACTIVE,
  })
    .lean()
    .exec();
  const refreshToken =
    setting?.keyValue &&
    typeof setting.keyValue.refreshToken === "string"
      ? setting.keyValue.refreshToken
      : null;

  if (!refreshToken) {
    throw new GoogleMeetNotConnectedError(
      `Google Meet is not connected for tenant ${tenantId}; complete the Google OAuth flow first`
    );
  }

  const oauthClient = getGoogleOAuthClient();
  oauthClient.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauthClient.getAccessToken();
  if (!token) {
    throw new Error("Google OAuth did not return an access token");
  }

  const headers = { Authorization: `Bearer ${token}` };
  const createResponse = await axios.post<{
    name?: string;
    meetingUri?: string;
  }>("https://meet.googleapis.com/v2/spaces", {}, { headers });
  const spaceName = createResponse.data.name;
  if (!spaceName || !spaceName.startsWith("spaces/")) {
    throw new Error("Google Meet response did not include a valid space name");
  }

  const spaceId = spaceName.slice("spaces/".length);
  const updateResponse = await axios.patch<{
    meetingUri?: string;
  }>(
    `https://meet.googleapis.com/v2/spaces/${encodeURIComponent(spaceId)}`,
    {
      config: {
        accessType: "RESTRICTED",
        entryPointAccess: "ALL",
      },
    },
    {
      headers,
      params: {
        updateMask: "config.accessType,config.entryPointAccess",
      },
    }
  );
  const meetingUri =
    updateResponse.data.meetingUri || createResponse.data.meetingUri;
  if (!meetingUri) {
    throw new Error("Google Meet response did not include a meeting URI");
  }

  return meetingUri;
};

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
  interviewPlatform: RecruitmentInterviewPlatform,
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
    meetingplatform: interviewPlatform,
    zoomlink: interviewMeetingLink,
    interviewdate: formattedInterviewDate,
    interviewtime: interviewTime,
    interviewplatform: interviewPlatform,
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
  interviewPlatform: RecruitmentInterviewPlatform
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
  const interviewMeetingLink = await createInterviewMeeting({
    tenantId: recruitment.tenantId,
    candidateFirstName: recruitment.candidateFirstName,
    interviewDate: interviewDay,
    interviewTime,
    timeZone,
    interviewPlatform,
  });

  const schedule = new RecruitmentInterviewScheduleModel({
    recruitmentId: recruitment._id,
    tenantId: recruitment.tenantId,
    candidateFirstName: recruitment.candidateFirstName,
    position: recruitment.position,
    teachingExperience: recruitment.teachingExperience,
    interviewDate: interviewDay,
    interviewTime,
    interviewPlatform,
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
    interviewPlatform,
    interviewMeetingLink
  );

  return savedSchedule;
};

export const rescheduleRecruitmentInterview = async (
  recruitmentId: string,
  interviewDate: Date,
  interviewTime: string,
  interviewPlatform: RecruitmentInterviewPlatform
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

  if (schedule.interviewPlatform !== interviewPlatform) {
    const tenant = await TenantModel.findOne({ tenantCode: recruitment.tenantId })
      .select("timeZone")
      .lean();
    schedule.interviewmeetinglink = await createInterviewMeeting({
      tenantId: recruitment.tenantId,
      candidateFirstName: recruitment.candidateFirstName,
      interviewDate: interviewDay,
      interviewTime,
      timeZone: tenant?.timeZone || "UTC",
      interviewPlatform,
    });
  }

  schedule.previousInterviewDate = schedule.interviewDate;
  schedule.previousInterviewTime = schedule.interviewTime;
  schedule.interviewDate = interviewDay;
  schedule.interviewTime = interviewTime;
  schedule.interviewPlatform = interviewPlatform;
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
  applicants: Array<IRecruitment & { interviewSchedule: IRecruitmentInterviewSchedule | null }>;
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
      interviewSchedule:
        interviewSchedulesByRecruitmentId.get(String(applicant._id)) ?? null,
    })) as Array<
      IRecruitment & { interviewSchedule: IRecruitmentInterviewSchedule | null }
    >,
  };
};


export const getApplicantRecordById = async (
  id: string
): Promise<IRecruitment | null> => {
  return RecruitModel.findOne({
    _id: new Types.ObjectId(id),
  }).lean();
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
  payload: Partial<IRecruitmentUpdate>
): Promise<IRecruitment | null> => {

  return RecruitModel.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    { $set: payload },
    { new: true }
  ).lean();
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
    const getSupervisor = (await User.findOne({
      _id: payload.supervisor?.supervisorId,
    }).exec()) as | {
      _id: Types.ObjectId | string;
      userName?: string;
      email?: string;
      role?: string[];
    }
      | null;

    const approvalData = await RecruitModel.findOne({
      _id: new Types.ObjectId(id),
    }).lean();

    let approvedData;

    if (
      getSupervisor &&
      approvalData &&
      approvalData.applicationStatus === applicationStatus.NEWAPPLICATION
    ) {
      const supervisorRole = getSupervisor.role?.[0] ?? "";

      const updatedApprovalData = {
        ...approvalData,
        supervisor: {
          supervisorId: getSupervisor._id.toString(),
          supervisorName: getSupervisor.userName,
          supervisorEmail: getSupervisor.email,
          supervisorRole,
        },
        status: "Active",
      };

      approvedData = await RecruitModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $set: updatedApprovalData },
        { new: true }
      ).lean();
    } else if (
      approvalData &&
      (approvalData.applicationStatus === applicationStatus.SHORTLISTED ||
        approvalData.applicationStatus === applicationStatus.SENDAPPROVAL)
    ) {
      approvedData = await RecruitModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $set: payload },
        { new: true }
      ).lean();
    }

    if (!approvedData) {
      console.warn("No applicant record updated.");
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

async function createTeacherPortalPortal(updateData: any) {
  console.log("Creating teacher portal for:", updateData);

  const specialChars = '@#$%&*!';
  const randomNum = Math.floor(Math.random() * 1000);
  const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
  const firstThreeChars = updateData.candidateFirstName.substring(0, 3);
  const reversedUsername = updateData.candidateFirstName.split('').reverse().join('');
  const password = `${firstThreeChars}${randomSpecial}${randomNum}${reversedUsername}`;
  const hashedPassword = await hashPassword(password);

  const createTeacherPortal = await User.create({
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
    templateKey: 'Teacher Portal',
  }).exec();

  if (emailTemplate) {
    const emailTo = [{ email: createTeacherPortal.email }];
    const subject = "Welcome To Alfurqan Team";
    const htmlPart = emailTemplate.templateContent
      .replace('<username>', createTeacherPortal.userName)
      .replace('<username>', createTeacherPortal.userName)
      .replace('<password>', password);
    sendEmailClient(emailTo, subject, htmlPart);
  }

  const saveTeacher = await createTeacherPortal.save();
console.log("Teacher portal created:", saveTeacher);
  // Add salary and wage records with error handling
  const salaryRecords = [
    {
      employeeName: saveTeacher.userName,
      employeeId: saveTeacher.userId,
       classType:{
            className: "TRAILCLASS",
            hoursMins: "1 day",
            rate: 2,
            currency: "$",
        },
       status:"Active",
       createdDate:  new Date(),
       createdBy: "Admin",
       updatedDate:  new Date(),
       updatedBy:  "Admin"
    },
    {
      employeeName: saveTeacher.userName,
      employeeId: saveTeacher.userId,
             classType:{
            className: "REGULARCLASS",
            hoursMins: "60 min",
            rate: 4,
            currency: "$",
        },
       status:"Active",
       createdDate:  new Date(),
       createdBy: "Admin",
       updatedDate:  new Date(),
       updatedBy:  "Admin"
    },
    
    {
      employeeName: saveTeacher.userName,
      employeeId: saveTeacher.userId,
             classType:{
            className: "GRUOPCLASS",
            hoursMins: "60 min",
            rate: 6,
            currency: "$",
        },
       status:"Active",
       createdDate:  new Date(),
       createdBy: "Admin",
       updatedDate:  new Date(),
       updatedBy:  "Admin"
    },
    
  ];

  try {
  const resuit =  await SalaryAndWages.insertMany(salaryRecords);
  console.log(">>>>>>>>>>>>>>>>:", resuit);


    console.log("Salary and wage records inserted successfully.");
  } catch (error) {
    console.error("Error inserting salary and wage records:", error);
    // Optionally, throw or handle error based on your application flow
  }

  const result = await createShiftSchedule(saveTeacher, updateData);
  await generateSlotsFromUserSchedule(result);
  await academicAvailableTeachers({ event: 'create' });

  console.log("Teacher portal created:", saveTeacher);
  return saveTeacher;
}


async function createShiftSchedule(saveTeacher: any, updateData: any) {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 40);

  const workhrs = updateData.preferedWorkingHours;
  const [startTime, endTime] = workhrs.split(" - ");

  const createShift = await ShiftSchedule.create({
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
    fromtime: startTime,
    totime: endTime,
    createdDate: new Date(),
    createdBy: "Admin",
    lastUpdatedBy: "Admin",
  });

  console.log("Shift schedule created:", createShift);
  return createShift;
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
  tenantId,
  candidateFirstName,
  interviewDate,
  interviewTime,
  timeZone,
  interviewPlatform,
}: {
  tenantId: string;
  candidateFirstName: string;
  interviewDate: Date;
  interviewTime: string;
  timeZone: string;
  interviewPlatform: RecruitmentInterviewPlatform;
}): Promise<string> => {
  if (interviewPlatform === RecruitmentInterviewPlatform.GOOGLE_MEET) {
    return createGoogleMeetSpace(tenantId);
  }

  return createZoomInterviewMeeting({
    candidateFirstName,
    interviewDate,
    interviewTime,
    timeZone,
  });
};

