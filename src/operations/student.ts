import { IStudentCreate, IStudents } from "../../types/models.types";
import StudentModel from "../models/student";
import { commonMessages, studentMessages } from "../config/messages";
import { badRequest } from "@hapi/boom";
import { isNil } from "lodash";
import EmailTemplate from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";
import axios from "axios";
import { config } from "../config/env";
import MeetingSchedule from "../models/calendar";
import Course from "../models/course";
import { GetAllRecordsParams } from "../shared/enum";
import AppLogger from "../helpers/logging";
import { Types } from "mongoose";
import { sendNotification } from "./notification";
import UserModel from "../models/users";
import { generateRollNo } from "./rollcounter";
import users from "../models/users";




export interface StudentFilter {
  id?: string;
  status?: string;
  country?: string;
  course?: string;
  teacher?: string;
  offset?: string | null;  // added offset
  limit?: string | null;   // added limit
}



/**
 * Creates a new user.
 *
 * @param {IStudentCreate} payload - The data of the user to be created.
 * @returns {Promise<Omit<IUser, 'password'>>} - A promise that resolves to the created user document.
 */
export const createStudent = async (
    payload: IStudentCreate
): Promise<IStudents | { error: any }> => {
    const newUser = new StudentModel(payload);
    if (newUser.startDate?.toDateString() === new Date().toDateString()) {
        return {
            error: badRequest('Evaluation class is not allowed to current date. Select another date'),
        };
    }
 //rollNo
     const rollNo = await generateRollNo('ALFST', 3);

    const academicCoach = await UserModel.findOne({
      userId : payload.academicCoach.academicCoachId 
    });

      console.log("academicCoach>>>>", academicCoach);
      newUser.studentId = rollNo;
    newUser.academicCoach = {
        academicCoachId: academicCoach?._id.toString() || " ", // Provide a default value if undefined
        name: academicCoach?.userName || " ",                       // Provide a default value if undefined
        role: academicCoach?.role[0] || " ", // Provide a default value if undefined
        email: academicCoach?.email || " " // Provide a default value if undefined
    };
    const savedUser = await newUser.save(); 
          const admin = await users.find({role: "ADMIN" , status: "ACTIVE" }).exec();
    
    await sendNotification({
      messages: `${savedUser.firstName}! has been joined in our academic team !.`,
      senderId: savedUser._id.toString(),
      senderName: savedUser.firstName,
      senderEmail: savedUser.email,
      isRead : false,
      receiverId: [savedUser.academicCoach.academicCoachId.toString(),admin[0]?._id.toString()],
      receiverName: [savedUser.academicCoach.name,"Admin"],
      receiverEmail: [savedUser.academicCoach.email,"rahul.blackstoneinfomatics@gmail.com"],
    
      notificationType: "STUDENT_NOTIFICATION",
      notificationStatus: "Unseen",
      status: "active",
      createdBy: "system",
      updatedBy: "system",
    });
  
    const emailTemplate = await EmailTemplate.findOne({
        templateKey: 'welcome_email',
    }).exec();
    if(emailTemplate){
        const emailTo = [
            { email: payload.email }
        ];
        const subject = "Welcome To Blackstone Infomatics";
        const htmlPart = emailTemplate.templateContent.replace('<username>', payload.firstName + ' ' + payload.lastName);
        //const htmlPart = "<html><body><p>Hello World</p></body></html>";
        sendEmailClient(emailTo, subject,htmlPart);
    }

    const meetingDetails = await zoomMeetingInvite(savedUser);
    const zoomMailTemplate = await EmailTemplate.findOne({
      templateKey: 'evaluation',
  }).exec();
   
        const course = await Course.findOne({
          courseName: payload.learningInterest,
        });
        const CreatemeetingDetails = await MeetingSchedule.create(
          {
            academicCoach: {
            academicCoachId: savedUser?.academicCoach.academicCoachId,
            name: savedUser?.academicCoach.name,
            role: savedUser?.academicCoach.role,
            email:savedUser?.academicCoach.email
            },
          teacher: {
            teacherId: null,
            name: null,
            email: null,
          },
          student: {
            studentId: savedUser._id,
            name: savedUser.firstName + ' ' + savedUser.lastName,
            email: savedUser.email

          },
          subject: "Student Evaluation",
          meetingLocation: 'Zoom',
          course: {
            courseId: course?._id,
            courseName: course?.courseName,
          },
          classType: 'Evaluation',
          meetingType: 'Online',
          meetingLink: meetingDetails.join_url,
          isScheduledMeeting: true,
          scheduledStartDate: savedUser.startDate,
          scheduledEndDate: savedUser.startDate,
          scheduledFrom: savedUser.preferredFromTime,
          scheduledTo: savedUser.preferredToTime,
          timeZone: savedUser.timeZone,
          description: 'Test Description',
          meetingStatus: 'Scheduled',
          studentResponse: 'Pending',
          status: 'Active',
          createdDate: new Date(),
          createdBy: savedUser.firstName + ' ' + savedUser.lastName,
          lastUpdatedDate: new Date(),
          lastUpdatedBy: savedUser.firstName + ' ' + savedUser.lastName,
    });

    const subject = 'Evaluation Zoom Meeting';
    const htmlPart = zoomMailTemplate?.templateContent.replace('<username>', payload.firstName + ' ' + payload.lastName).replace('<date>', payload.startDate.toDateString()).replace('<meetingtime>', payload.preferredFromTime).replace('<zoomlink>', CreatemeetingDetails.meetingLink);
    const emailTo = [
      { email: payload.email }, { email: savedUser.academicCoach.email }
  ];

  
    if(htmlPart){
       sendEmailClient(emailTo, subject,htmlPart);
    }
    const userObject = savedUser.toObject();
    await CreatemeetingDetails.save();
    return userObject;
};


async function zoomMeetingInvite(savedUser: import("mongoose").Document<unknown, {}, IStudents> & IStudents & { _id: import("mongoose").Types.ObjectId; }) {
    const token = await getZoomAccessToken();
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: 'Evaluation Meeting',
        type: 2,
        start_time: savedUser.preferredFromTime, // Start in 10 minutes
        duration: 60,
        timezone: 'Asia/Kolkata',
        settings: {
          join_before_host: true,
          participant_video: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
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
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
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
  console.log(">>>>",accessToken);
    // Token is valid for 1 hour, so you may want to set up caching accordingly
    setTimeout(() => { accessToken = null; }, response.data.expires_in * 1000);
  
    return accessToken;
}



export const getAllStudentsRecords = async (
  params: GetAllRecordsParams
): Promise<{ totalCount: number; students: IStudents[] }> => {
  const {academicCoachId, searchText,  sortBy,
    sortOrder,offset, limit, filterValues } = params;

  // Construct query object based on filters
  const query: any = {};

  if (academicCoachId) {
    query["academicCoach.academicCoachId"] = academicCoachId;
  }


  // Add searchText to the query if provided
  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: "i" } }, // Search by name
      { email: { $regex: searchText, $options: "i" } }, // Search by email (if applicable)
    ];
  }

  // Add filters to the query
  if (filterValues) {
    console.log("Filter Values:", filterValues); // Log filter values
    if (filterValues.course) {
      query.course = { $in: filterValues.course }; // Filter by course
    }
    if (filterValues.country) {
      query.country = { $in: filterValues.country }; // Filter by country
    }
    if (filterValues.teacher) {
      query.teacher = { $in: filterValues.teacher }; // Filter by teacher IDs
    }
    if (filterValues.status) {
      query.status = { $in: filterValues.status }; // Filter by status
    }
  }
  
  console.log("Constructed Query:", JSON.stringify(query, null, 2)); // Log the constructed query

  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const studentQuery = StudentModel.find(query).sort(sortOptions);

  
  if (!isNil(offset) && !isNil(limit)) {
    const skip = Math.max(
      0,
      ((Number(offset) ?? Number(commonMessages.OFFSET)) - 1) *
      (Number(limit) ?? Number(commonMessages.LIMIT))
    );
    studentQuery
      .skip(skip)
      .limit(Number(limit) ?? Number(commonMessages.LIMIT));
  }

  // Use Promise.all to perform both query and count operations concurrently
  const [students, totalCount] = await Promise.all([
    // Fetch students with pagination
    studentQuery.exec(),
    // Count total records for the query
    StudentModel.countDocuments(query).exec(),
  ]);

  // Log successful retrieval
  AppLogger.info(studentMessages.GET_ALL_LIST_SUCCESS, {
    totalCount: totalCount,
  });

  // Return total count and fetched students
  return { totalCount, students };
};




export const getStudentRecordById = async (
  id: string
): Promise<IStudents | null> => {
  return StudentModel.findOne({
    _id: new Types.ObjectId(id),
  }).lean() as unknown as IStudents | null;
};

export const getStudentRecordByData = async (
  filters: StudentFilter
): Promise<IStudents | null> => {
  const query: any = {};

 // Add filters to the query
if (!isNil(filters.teacher)) {
  query.teacher = filters.teacher; // Filter by teacher
}

if (!isNil(filters.course)) {
  query.course = filters.course; // Filter by course
}
if (!isNil(filters.country)) {
  query.country = filters.country; // Filter by country
}

// Handle _id filter if needed
if (!isNil(filters.id)) {
  query._id = new Types.ObjectId(String(filters.id));
}
  return StudentModel.findOne(query).lean() as unknown as IStudents | null;
};


export const getAllStudentVisitor = async (
  filters: StudentFilter
): Promise<
  {
    name: string;
    Friend: number;
    SocialMedia: number;
    Email: number;
    Google: number;
    Other: number;
  }[]
> => {
  const match: any = {};

  if (!isNil(filters.teacher)) match.teacher = filters.teacher;
  if (!isNil(filters.course)) match.course = filters.course;
  if (!isNil(filters.country)) match.country = filters.country;
  if (!isNil(filters.id)) match._id = new Types.ObjectId(String(filters.id));

  const result = await StudentModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }, // group by date
          },
          referralSource: "$referralSource",
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.date": 1 } // sort chronologically
    }
  ]);

  const groupedMap: Record<
    string,
    {
      name: string;
      Friend: number;
      SocialMedia: number;
      Email: number;
      Google: number;
      Other: number;
    }
  > = {};

  result.forEach((item) => {
    const date = item._id.date;
    const rawKey = item._id.referralSource?.replace(/\s+/g, '') ?? 'Other';
    const key = rawKey.toLowerCase();

    if (!groupedMap[date]) {
      groupedMap[date] = {
        name: date,
        Friend: 0,
        SocialMedia: 0,
        Email: 0,
        Google: 0,
        Other: 0,
      };
    }

    switch (key) {
      case 'friend':
        groupedMap[date].Friend += item.count;
        break;
      case 'socialmedia':
        groupedMap[date].SocialMedia += item.count;
        break;
      case 'email':
      case 'e-mail':
        groupedMap[date].Email += item.count;
        break;
      case 'google':
        groupedMap[date].Google += item.count;
        break;
      default:
        groupedMap[date].Other += item.count;
        break;
    }
  });

  // Convert map to sorted array
  return Object.values(groupedMap).sort((a, b) => a.name.localeCompare(b.name));
};

