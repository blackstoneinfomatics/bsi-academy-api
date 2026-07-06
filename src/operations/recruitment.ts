


import { IRecruitment, IRecruitmentCreate } from "../../types/models.types";
import RecruitModel from "../models/recruitment"
import { GetAllApplicationsRecordsParams, GetAllTeachersRecordsParams } from "../shared/enum";
import { applicationStatus } from "../config/messages";
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

export const getAllApplicantsRecords = async (
  params: GetAllApplicationsRecordsParams
): Promise<{ totalCount: number; applicants: IRecruitment[] }> => {
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

const totalCount = applicants.length;

  return {
    totalCount,
    applicants: applicants as unknown as IRecruitment[]
  };
};


export const getApplicantRecordById = async (
  id: string
): Promise<IRecruitment | null> => {
  return RecruitModel.findOne({
    _id: new Types.ObjectId(id),
  }).lean() as unknown as IRecruitment | null;
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
  ).lean() as unknown as IRecruitment | null;
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
    const getSupervisor = await User.findOne({
      _id: payload.supervisor?.supervisorId,
    }).exec();

    const approvalData = await RecruitModel.findOne({
      _id: new Types.ObjectId(id),
    }).lean();

    let approvedData;

    if (
      getSupervisor &&
      approvalData &&
      approvalData.applicationStatus === applicationStatus.NEWAPPLICATION
    ) {
      const updatedApprovalData = {
        ...approvalData,
        supervisor: {
          supervisorId: getSupervisor._id.toString(),
          supervisorName: getSupervisor.userName,
          supervisorEmail: getSupervisor.email,
          supervisorRole: getSupervisor.role[0],
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

    const updateData = approvedData as unknown as IRecruitment;

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

  const createTeacherPortal = await User.create({
    userName: updateData.candidateFirstName,
    email: updateData.candidateEmail,
    password: password,
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
      .replace('<password>', createTeacherPortal.password);
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
