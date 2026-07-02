import CustomEnumerator, { AssignmentStatus } from "../src/shared/enum";

enum Status {
  ACTIVE = 'Active',
  IN_ACTIVE = 'Inactive',
  NEW = 'New'
}

enum LearningInterest {
  QURAN = 'Quran',
  ISLAMIC = 'Islamic Studies',
  ARANIC = 'Arabic',
}
enum notificationStatus{
  SEEN = "Seen",
  UN_SEEN = "Unseen",
}
enum NumberOfStudents {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}
enum PreferredTeacher {
  TEACHER_1 = 'Male',
  TEACHER_2 = 'Female',
  TEACHER_3 = 'Either',
}

enum ReferalResource{
  FRIENDS='Friend',
  SOCIALMEDIA='Social Media',
  EMAIL='E-Mail',
  GOOGLE='Google',
  OTHER='Other'
}
enum EvaluationStatus{
  PENDING='PENDING',
  INPROGRESS='INPROGRESS',
  COMPLETED='COMPLETED'
}

export interface IUser extends Document {
  tenantId?: string;
  userId?: string;
  userName: string;
  gender: string;
  email: string;
  password: string;
  role: string[];
  position: string,
  profileImage?: string | null;
  lastLoginDate?: Date;
  country?: string;
  status: Status;
  createdDate?: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy: string;
}

export interface IUserCreate {
  tenantId?: string;
  userId?: string;
  userName: string;
  gender: string;
  email: string;
  password: string;
  role: string[];
  profileImage?: string | null;
  lastLoginDate?: Date;
  country?: string;
  status: Status;
  createdDate?: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy: string;
}


export interface IStudents extends Document {
  tenantId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  academicCoach: {
    academicCoachId: string;
    name: string;
    role: string;
    email: string;
};

  email: string;
  gender: string;
  phoneNumber: number;
  city?: string;
  country: string;
  countryCode: string;
  learningInterest: LearningInterest;
  numberOfStudents: NumberOfStudents;
  preferredTeacher: PreferredTeacher;
  preferredFromTime: string;
  preferredToTime: string;
  timeZone: string;
  referralSource: ReferalResource;
  startDate : Date;
  evaluationStatus: EvaluationStatus;
  refernceId?: string,
  referredBy?:string,
  status: Status;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy: string;
}

export interface IStudentCreate {
  firstName: string;
  lastName: string;
  academicCoach: {
    academicCoachId: string;
  };
  profilepic?: Buffer;

  email: string;
  gender: string;
  phoneNumber: number;
  city?: string;
  country: string;
  countryCode: string;
  learningInterest: LearningInterest;
  numberOfStudents: NumberOfStudents;
  preferredTeacher: PreferredTeacher;
  preferredFromTime: string;
  preferredToTime: string;
  timeZone: string;
  referralSource: ReferalResource;
  startDate : Date;
  evaluationStatus: EvaluationStatus;
  refernceId?: string;
  referredBy?:string;
  status: Status;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy: string;
}

export interface IUsershiftschedule extends Document{
  tenantId: string;
  academicCoachId: string;
  teacherId: string;
  supervisorId: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  position: string;
  workhrs: string;
  startdate: Date;
  enddate: Date;
  fromtime: string;
  totime: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string
}

export interface IUsershiftscheduleCreate{
  academicCoachId: string;
  teacherId: string;
  supervisorId: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  workhrs: string;
  startdate: Date;
  enddate: Date;
  fromtime: string;
  totime: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string
}

export interface IMeetingSchedule extends Document {
  tenantId: string;
  academicCoach: {
    academicCoachId: string;
    name: string;
    email: string;
  };  
  teacher: {
    teacherId: string;
    name: string;
    email: string;
  };   
  student: {
    studentId: string;
    name: string;
    email: string;
    city: string;
    country: string;
    phonenumber: string;
  };
  trialId: string;
  classStatus: string;
  subject: string;
  meetingLocation: string;
  course: {
    courseId: string;
    courseName: string;
  };
  classType: string; 
  meetingType: string;
  meetingLink: string;
  isScheduledMeeting: boolean;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  scheduledFrom: string;
  scheduledTo: string;
  timeZone: string;
  remainderInMinutes: number;
  description: string;
  meetingStatus: string;
  studentResponse: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string;
}

export interface IMeetingScheduleCreate {
  academicCoach: {
    academicCoachId: string;
    name: string;
    email: string;
  };  
  teacher: {
    teacherId: string;
    name: string;
    email: string;
  };   
  student: {
    studentId: string;
    name: string;
    email: string;
    city: string;
    country: string;
    phonenumber: string;

  };
  trialId: string;
  classStatus: string;
  subject: string;
  meetingLocation: string;
  course: {
    courseId: string;
    courseName: string;
  };
  classType: string; 
  meetingType: string;
  meetingLink: string;
  isScheduledMeeting: boolean;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  scheduledFrom: string;
  scheduledTo: string;
  timeZone: string;
  remainderInMinutes: number;
  description: string;
  meetingStatus: string;
  candidateResponse: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string;
}

export interface ICourse extends Document {
  tenantId: string;
  course: {
    courseId?: string;
    courseTitle: string;
    courseDuration: string;
    courseDescription: string;
    courseLevel: string;
  };
  level:string;
  courseName: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string;
}

export interface ILevel extends Document{
  tenantId: string;
  courseId: string;
  level:string;
  duration:string;
  description:Buffer;
  createdDate: Date;
  createdBy: string;
}

export interface ILevelCreate {
courseId: string;
  level:string;
  duration:Buffer;
  description:string;
  createdDate: Date;
  createdBy: string;
}
 
export interface ICourseCreate {
  course: {
    courseId?: string;
    courseTitle:string;
    courseDuration:string;
    courseDescription:string;
    courseLevel:string;
  };
  level :string;
  courseName: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string;
}


export interface IEvaluation extends Document {
  tenantId: string;
  trialId?: string;
academicCoachId: string;
student: {
  studentId: string;
  studentRegisterId: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  studentGender: string;
  studentPhone: number;
  studentCity?: string;
  studentCountry: string;
  studentCountryCode: string;
  learningInterest: LearningInterest;
  numberOfStudents: number;
  preferredTeacher: PreferredTeacher;
  preferredFromTime: string;
  preferredToTime: string;
  timeZone: string;
  referralSource: ReferalResource;
  preferredDate: Date;
  evaluationStatus: EvaluationStatus;
  amount?: string;
  currency?: string;
  status: Status;
  createdDate: Date;
  createdBy: string;
};
classType: string;
teacher:{
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
},
joiningDate: Date;
classDay: any;
startTime: any;
endTime: any;
isLanguageLevel: boolean;
languageLevel: string;
isReadingLevel: boolean;
readingLevel?: string;
isGrammarLevel: boolean;
grammarLevel: string;
hours: number;
subscription: {
    subscriptionId: string;
    subscriptionName: string;
    subscriptionPricePerHr: number;
    subscriptionDays: number;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
};
planTotalPrice: number
classStartDate: Date;
 weeklySlots?: {
    [day: string]: {
      from: string;
      to: string;
    }[];
  };
classEndDate: Date;
classStartTime: string;
classEndTime: string;
accomplishmentTime?: string;
studentRate: number;
expectedFinishingDate: number;
gardianName: string;
gardianEmail: string;
gardianPhone: string;
gardianCity: string;
gardianCountry: string;
gardianTimeZone: string;
gardianLanguage: string;
assignedTeacher: string;
assignedTeacherId:string;
assignedTeacherEmail:string;
studentStatus: string;
classStatus: string;
comments?: string;
trialClassStatus?: string;
invoiceStatus?: string;
paymentLink: string;
paymentStatus?: string;
teacherStatus?: string;
amount?: string;
currency?: string;
status?: string;
createdDate: Date;
createdBy?: string;
updatedDate?: Date;
updatedBy?: string;
  
} 


export interface IEvaluationCreate{
  trialId?: string;
  academicCoachId: string;
  student: {
  studentId?: string;
  familyId?: string;
  studentRegisterId?: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  studentGender: string;
  studentPhone: number;
  studentCity?: string;
  studentCountry: string;
  studentCountryCode: string;
  learningInterest: LearningInterest;
  numberOfStudents: number;
  preferredTeacher: PreferredTeacher;
  preferredFromTime?: string;
  preferredToTime?: string;
  timeZone: string;
  referralSource: ReferalResource;
  preferredDate?: Date;
  evaluationStatus: any;
  status: Status;
  createdDate: Date;
  createdBy?: string;
};
classType: string;
teacher:{
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
},
joiningDate?: Date;
classDay?: string[];
startTime?: string[];
endTime?: string[];
isLanguageLevel: boolean;
languageLevel: string;
isReadingLevel: boolean;
readingLevel?: string;
isGrammarLevel: boolean;
grammarLevel: string;
hours: number;
subscription: {
    subscriptionName: string;
};
planTotalPrice: number
classStartDate: Date;
classEndDate: Date;
classStartTime: string;
weeklySlots?: {
    [day: string]: {
      from: string;
      to: string;
    }[];
  };
classEndTime: string;
gardianName: string;
gardianEmail: string;
gardianPhone: string;
gardianCity: string;
gardianCountry: string;
gardianTimeZone: string;
gardianLanguage: string;
assignedTeacher: string;
accomplishmentTime?: string;
studentRate: number;
studentStatus: string;
classStatus: string;
comments?: string;
trialClassStatus?:string;
invoiceStatus?: string;
paymentLink?: string;
paymentStatus?: string;
teacherStatus?: string;
amount?: string;
currency?: string;
preferredTrialFromTime?:string;
preferredTrialToTime?:string;
preferredTrialDate? : Date;
status?: string;
createdDate: Date;
createdBy?: string;
updatedDate?: Date;
updatedBy?: string;  
}


export interface ISubscritions extends Document{
  tenantId: string;
  subscriptionName: string,
  subscriptionPricePerHr: number,
  subscriptionDays: number,
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  status: string,
  createdDate: Date,
  createdBy: string,
  updatedDate: Date,
  updatedBy: string
}

export interface IClassSchedule extends Document{
  tenantId: string;
  classId?: string;
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

  },
  teacher:{
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    teacherSessionStart: any;
    teacherSessionEnd: any;
  },
  classDay: any;
  package: string;
  preferedTeacher: string;
  course: string;
  totalHourse: number;
  classhour:string;
  amount:string;
  currency:string;
  sessionClassType:string;
  sessionStarttime:string;
  sessionsEndtime:string;
  sessionStatus:string;
  startDate: Date;
  endDate: Date;
  startTime: any;
  endTime: any;
  scheduleStatus: string,
  scheduledStartDate: Date,
  classStatus:string,
  classType: string,
  classLink: string,
  isScheduledMeeting: boolean,
  timeZone: string,
  remainderInMinutes: number,
  description: string,
  meetingStatus: string,
  studentResponse: string,
  status: string,
  createdDate: Date,
  createdBy: string,
  lastUpdatedDate: Date,
  lastUpdatedBy: string
  teacherAttendee: string;
  studentAttendee: string;
  earnings?: number;
  isSalaryProcessed?: boolean;

}
export type QuestionType = "quiz" | "writing" | "reading" | "image" | "wordmatch";
export type ContentType = "text" | "audio" | "image";
export type AnswerType = "choose" | "trueorfalse" | "nooption"
export interface IAdminAssignmentCreate {
  levelId: string;
  levelName: string;
  courseId: string;
  courseName: string;
  assignmentName: string;
  questions: 
  {
  assignmentType: QuestionType;       
  questionName: string;            
  question: 
  {
  contentType: ContentType;                         
  question: string | string[] | Buffer; 
  answerType : AnswerType;
  options?: string[];              
  correctAnswer: string | string[];      
  }
  }[];
}
export interface IAdminAssignment extends Document{
  tenantId: string;
  levelId: string;
  levelName: string;
  courseId: string;
  courseName: string;
   assignmentId: string;
   assignmentName: string;
   assignmentType:string;
   questionName: string;
   chooseType?: boolean;
  trueorfalseType?: boolean;
  question?: string;
   options?: string[];
  audioFile?: Buffer;
  uploadFile?: Buffer;
  answerValidation: string;
   createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
} 
export interface IClassScheduleCreate{
  classId?: string;
  student: {
    id: string;
    studentId?: string;
    studentFirstName: string;
    studentLastName: string;
    studentEmail: string;
    gender: string;
    level: string;
    studnetSessionStart: any;
    studnetSessionEnd: any;
  },
  teacher:{
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    teacherSessionStart: any;
    teacherSessionEnd: any;
  },
  classhour:string;
  amount:string;
  currency:string;
  weeklySlots: {
    [day: string]: {
      from: string;
      to: string;
    }[];
  };
  sessionClassType:string;
  sessionStarttime:string;
  sessionsEndtime:string;
  sessionStatus:string;
  classDay: string[];
  classLink: string;
  classStatus:string;
  package: string;
  preferedTeacher: string;
  course: string;
  totalHourse: number;
  startDate: Date;
  endDate: Date;
  startTime: string[];
  endTime: string[];
  scheduleStatus: string,
  teacherAttendee: string;
  studentAttendee: string;
}

export interface IActiveSession extends Document {
  tenantId: string;
  userId: string;
  loginDate: Date;
  isActive: boolean;
  refreshToken?: string;
  accessToken: string;
}




export interface IErrorDetail {
  fileName: string;
  jobId: string;
  email: string;
  error: string;
}


export interface IEmailTemplate {
  tenantId: string;
  templateKey: string;
  templateContent: string;
  status?: keyof typeof CustomEnumerator.Status;
  createdDate?: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy?: string;
}

export interface MeetingSchedulePayload {
  tenantId: string;
  organizer: { userId: string; name: string; email: string };
  candidates: { id: string; candidateId: number; candidateName: string; jobProfilingCandidateDataId?: string; email: string }[];
  users?: { userId?: string; userName?: string; email?: string }[];
  subject: string;
  jobId: string;
  jobName: string;
  meetingLocation?: string;
  tenantSettingId?: string;
  externalSourceType?: string;
  externalMeetingReferenceId?: string;
  applicationStatus: string;
  isInterviewScheduled: boolean;
  interviewRoundType?: string,
  isAssessment: boolean,
  assessmentType?: string,
  assessmentTenantSettingId?: string,
  assessmentLink?: string,
  isAiVideoEnabled: boolean,
  keyFocusedArea?: string[],
  additionalDetails?: string,
  isScheduledMeeting: boolean;
  meetingStatus?: string;
  candidateResponse?: string;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  scheduledFrom?: string;
  scheduledTo?: string;
  timeZone?: string;
  remainderInMinutes?: number;
  status: string;
  description?: string;
  meetingLink?: string | null;
  createdBy?: string;
  lastUpdatedBy?: string;
  referenceId?: string;
  referenceType: string;
  remarks?: string;
}


export interface IAlStudents extends Document{
  tenantId: string;
  student:{
    studentId: string;
    studentEmail: string;
    studentPhone: number;
    gender: string;
    course: string;
    package: string;
    city:string;
    country: string;
  };
profilepic?: Buffer;
referredBy?:string;
  refernceId?:string;
  level?: string;
  username: string,
  password: string;
  role: string;
  sessionClassType:string;
  startDate: Date;
  endDate:Date;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
}


export interface IAlStudentCreate{
  student:{
    studentId: string;
    studentEmail: string;
    studentPhone: number;
    gender: string;
  };
  profilepic?: Buffer;
  level?: string;
  username: string,
  role: string;
}

export interface IPaymentDetails extends Document{
  tenantId: string;
  userId: string;
  userName: string;
  paymentStatus: string;
  paymentAmount: string;
  paymentResponse: JSON;
  paymentResponseId: string;
  paymentDate?: Date;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string
}

export interface CreatePaymentDetails{
  userId: string;
  userName: string;
  paymentStatus: string;
  paymentAmount: string;
  paymentResponse: JSON;
  paymentResponseId: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string
}

export interface IAssignment extends Document {
  tenantId: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  sessionClassType?: string;
  questionName?: string;
  questionType?: string;
  typeofQuestion?: string;
  title: string;   
  course?: string;  
  groupId?: string;                    
  assignmentName: string;
  assignedTeacher: string;
  assignedTeacherId: string;
  assignmentType: {
    type: "quiz" | "writing" | "reading" | "image identification" | "word match" | "reading comprehension";
    name?: string;
  };
  chooseType?: boolean;
  trueorfalseType?: boolean;
  question?: string;
  hasOptions?: boolean;
  options?: {
    optionOne?: string;
    optionTwo?: string;
    optionThree?: string;
    optionFour?: string;
  };
  audioFile?: Buffer;
  uploadFile?: Buffer;
  status: Status;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
  level?: string;
  assignedDate: Date;
  dueDate: Date;
  answer: string;
  answerValidation?: string;
  assignmentStatus: AssignmentStatus;
  commends?: string;
  score: number; 
  rating: string; 
}
export interface IallAssignment {
  studentId: string;
  studentName :string;
  title:string;
groupId?: string;
    sessionClassType?:string;
    questionName?:string;
    questionType?:string;
     typeofQuestion?:string;
  assignmentName: string;
  assignedTeacher: string;
  assignedTeacherId: string;
assignmentType: {
    type: "quiz" | "writing" | "reading" | "image identification" | "word match" | "reading comprehension";
    name?: string;
  };
  chooseType: boolean;
  trueorfalseType: boolean;
  question?: string;
  hasOptions: boolean;
  options: {
    optionOne?: string;
    optionTwo?: string;
    optionThree?: string;
    optionFour?: string;
  };
  audioFile?: Buffer;
  uploadFile?: Buffer;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
  level: string;
  courses: string;
  assignedDate: Date;
  dueDate: Date;
  assignmentStatus: string;
    commends?: string;
  score: number; 
  rating: string;

}
export interface IAssignmentCreate {
  studentId?: string;
  studentName :string;
    sessionClassType:string;
    questionName?:string;
    questionType?:string;
     typeofQuestion?:string;
     title:string;
     groupId?: string;
  assignmentName: string;
  assignedTeacher?: string;
 assignmentType: {
    type: "quiz" | "writing" | "reading" | "image identification" | "word match";
    name?: string;
  };
  chooseType: boolean;
  trueorfalseType: boolean;
  question?: string;
  hasOptions: boolean;
  options: {
    optionOne?: string;
    optionTwo?: string;
    optionThree?: string;
    optionFour?: string;
  };
  audioFile?: Buffer;
  uploadFile?: Buffer;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
  level: string;
  courses: string;
  assignedDate?: Date;
  dueDate?: Date;
  answer: string;
  answerValidation?: string;
  assignmentStatus: string;
    commends?: string;
  score: number; 
  rating: string;
}
export interface IStudentInvoice extends Document {
  tenantId: string;
  student: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    country: string;
    city: string;
  };
  evaluationData: any,
  paymentDate?: Date; 
  courseName: string;
  amount: number; 
  packageType:string;
  itemDescription:string;
  duration:string;
  rate:string;
  description:string;
  attachFile?:Buffer;
  dueDate?:string;
  invoiceStatus: string;
    paymentStatus: string;

  status: string;
  createdDate?: string;
  createdBy: string;
  lastUpdatedDate?: string;
  lastUpdatedBy: string;
  invoiceNumber?: number; // <-- Added this line
}


export interface IMessageCreate {
  sender: string;
  receiver: string;
  roomId: string;
  student?: { // <-- Made student optional
    studentId: string;
    studentFirstName: string;
    studentLastName: string;
    studentEmail: string;
  };
  supervisor?: {
    supervisorId: string;
    supervisorFirstName: string;
    supervisorLastName: string;
    supervisorEmail: string;
  };
  teacher: {
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
  };
  timeZone: string;
  status: string;
  message: string;
  assigments?: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
  attachmentsType: {
    fileName: string;
    fileType: string;
    fileUrl: string;
  }[]; 
  group: {
    groupId: string;
    groupName: string;
    members: {
      userId: string;
      userName: string;
    }[];
  }[];
}

export interface IMessage extends Document {
  tenantId: string;
  roomId: string; // Identifier for the chat room
  student: {
    studentId: string; // Unique identifier for the student
    studentFirstName: string; // Student's first name
    studentLastName: string; // Student's last name
    studentEmail: string; // Student's email address
  };
  supervisor: {
    supervisorId: string; // Unique identifier for the student
    supervisorFirstName: string; // Student's first name
    supervisorLastName: string; // Student's last name
    supervisorEmail: string; // Student's email address
  };
  teacher: {
    teacherId: string; // Unique identifier for the teacher
    teacherName: string; // Teacher's full name
    teacherEmail: string; // Teacher's email address
  };
  message: string; // The content of the message
  attachmentsType: {
    fileName: string;
    fileType: string;
    fileUrl: string;
  }[]; 
  sender:string;
   status: string;
  timeZone: string;
  receiver:string;
  createdDate: Date; // Timestamp when the message was created
  createdBy: string; // Identifier of the user who created the message
  updatedDate: Date; // Timestamp when the message was last updated
  updatedBy: string; // Identifier of the user who last updated the message
  group: {
    groupId: string;
    groupName: string;
    members: {
      userId: string;
      userName: string;
    }[];
  }[];
}

export interface IFeedbackCreate {
  sessionId?:string;
  student?: {
    studentId?: string;
    studentFirstName?: string;
    studentLastName?: string;
    studentEmail?: string;
  };
  supervisor?: {
    supervisorId?: string;
    supervisorFirstName?: string;
    supervisorLastName?: string;
    supervisorEmail?: string;
  };
  teacher?: {
    teacherId?: string;
    teacherName?: string;
    teacherEmail?: string;
  };
  classDay?: string;
  preferedTeacher?: string;
  feedbackmessage?: string;
  
  course?: {
    courseId?: string;  // Ensure a valid course ID
    courseName?: string;
  };

  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;

  level?: number;

  teacherRatings?: {  // ✅ Made optional
    listeningAbility?: number;
    readingAbility?: number;
    overallPerformance?: number;
    communicationConcentration?: number;
  };

  studentsRating?: {  // ✅ Made optional
    classUnderstanding?: number;
    engagement?: number;
    homeworkCompletion?: number;
  };

  supervisorRating?: {  // ✅ Made optional
    knowledgeofstudentsandcontent?: number;
    assessmentofstudents?: number;
    communicationandcollaboration?: number;
    professionalism?: number;
  };

  createdDate?: Date;  // ✅ Made optional if handled in backend
  createdBy?: string;  // ✅ Made optional if handled in backend
  lastUpdatedDate?: Date;  // ✅ Made optional
  lastUpdatedBy?: string;
}



export interface IFeedback  extends Document{
  tenantId: string;
  sessionId?:string;
  student?: {
    studentId?: string;
    studentFirstName?: string;
    studentLastName?: string;
    studentEmail?: string;
  };
   supervisor?: {
    supervisorId?: string;
    supervisorFirstName?: string;
    supervisorLastName?: string;
    supervisorEmail?: string;
  };
  supervisorRating?: {
    knowledgeofstudentsandcontent?:number;
    assessmentofstudents?: number;
    professionalism?: number;
    communicationandcollaboration?: number;
  },
  teacher?: {
    teacherId?: string;
    teacherName?: string;
    teacherEmail?: string;
  };
  classDay?: string[];
  preferedTeacher: string;
  feedbackmessage?: string;
  
  course: {
    courseId?: string;
    courseName: string;
  };

  startDate: Date;
  endDate: Date;
  startTime?: string[];
  endTime?: string[];

  // ✅ NEW: Student Level
  level: number;

  // ✅ NEW: Ratings for Teacher Assessment
  teacherRatings: {
    listeningAbility?: number;
    readingAbility? : number;
    overallPerformance?: number;
        communicationConcentration?: number;

  };

  // ✅ NEW: Student-Specific Ratings
  studentsRating: {
    classUnderstanding?: number;
    engagement?: number;
    homeworkCompletion?: number;
  };

  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy?: string;
}



export interface ISupervisorFeedbackCreate {
  sessionId?:string;
  student?: {
    studentId?: string;
    studentFirstName?: string;
    studentLastName?: string;
    studentEmail?: string;
  };
  supervisor?: {
    supervisorId?: string;
    supervisorFirstName?: string;
    supervisorLastName?: string;
    supervisorEmail?: string;
  };
  teacher?: {
    teacherId?: string;
    teacherName?: string;
    teacherEmail?: string;
  };
  classDay?: string;
  preferedTeacher?: string;
  feedbackmessage?: string;
  
  course?: {
    courseId?: string;  // Ensure a valid course ID
    courseName?: string;
  };

  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;

  level?: number;

  teacherRatings?: {  // ✅ Made optional
    listeningAbility?: number;
    readingAbility?: number;
    overallPerformance?: number;
    communicationConcentration?: number;  // ✅ Added new field

  };

  studentsRating?: {  // ✅ Made optional
    classUnderstanding?: number;
    engagement?: number;
    homeworkCompletion?: number;
  };

  supervisorRating?: {  // ✅ Made optional
    knowledgeofstudentsandcontent?: number;
    assessmentofstudents?: number;
    communicationandcollaboration?: number;
    professionalism?: number;
  };

  createdDate?: Date;  // ✅ Made optional if handled in backend
  createdBy?: string;  // ✅ Made optional if handled in backend
  lastUpdatedDate?: Date;  // ✅ Made optional
  lastUpdatedBy?: string;
}



export interface ISuperviosrFeedback  extends Document{
  tenantId: string;
  sessionId?:string;
  student?: {
    studentId?: string;
    studentFirstName?: string;
    studentLastName?: string;
    studentEmail?: string;
  };
  supervisorRating?: {
    knowledgeofstudentsandcontent?:number;
    assessmentofstudents?: number;
    communicationandcollaboration?: number;
    professionalism?: number;
  },
  teacher?: {
    teacherId?: string;
    teacherName?: string;
    teacherEmail?: string;
  };
  classDay?: string[];
  preferedTeacher: string;
  feedbackmessage?: string;
  
  course: {
    courseId?: string;
    courseName: string;
  };

  startDate: Date;
  endDate: Date;
  startTime?: string[];
  endTime?: string[];

  // ✅ NEW: Student Level
  level: number;

  // ✅ NEW: Ratings for Teacher Assessment
  teacherRatings: {
    listeningAbility?: number;
    readingAbility? : number;
    overallPerformance?: number;
    communicationConcentration?: number;
  };

  // ✅ NEW: Student-Specific Ratings
  studentsRating: {
    classUnderstanding?: number;
    engagement?: number;
    homeworkCompletion?: number;
  };

  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy?: string;
}

export interface IRecruitment extends Document{
  tenantId: string;
  candidateId: string;
  candidateFirstName: string;
  candidateLastName : string;
  supervisor:{
    supervisorId: string;
    supervisorName: string;
    supervisorEmail: string;
    supervisorRole: string;
  };
  gender?: string;
  applicationDate : Date;
  candidateEmail : string;
  candidatePhoneNumber : number;
  candidateCountry : string;
  candidateCity : string;
  positionApplied : string;
  currency: string;
  expectedSalary : number;
  preferedWorkingHours: string;
  uploadResume?: Buffer;
  comments: string;
  applicationStatus?: string;
  level?: string;
  quranReading? : string;
  tajweed? : string;
  arabicWriting?: string;
  arabicSpeaking?: string;
  englishSpeaking?: string;
  preferedWorkingDays?: string;
  overallRating?: number;
 professionalExperience:{
    jobRole?: string;
    organizationName?: string;
    jobLocation?: string;
    fromDate?: Date;
    toDate?: Date;
    jobDescription?: string;
  }[];
  skills?: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}

export interface IRecruitmentCreate{
  candidateId: string;
  supervisor:{
    supervisorId?: string,
    supervisorName?: string,
    supervisorEmail?: string,
    supervisorRole?: string
  }  ,
  candidateFirstName: string;
  candidateLastName : string;
  gender?:  string;
  applicationDate : Date;
  candidateEmail : string;
  candidatePhoneNumber : number;
  candidateCountry : string;
  candidateCity : string;
  positionApplied : string;
  currency: string;
  expectedSalary : number;
  preferedWorkingHours: string;
  uploadResume?: any;
  comments?: string;
  applicationStatus: string;
  level? : string;
  quranReading? : string;
  tajweed? : string;
  arabicWriting?: string;
  arabicSpeaking?: string;
  englishSpeaking?: string;
  preferedWorkingDays?: string;
  overallRating?: number;
  professionalExperience:{
    jobRole?: string;
    organizationName?: string;
    jobLocation?: string;
    fromDate?: Date;
    toDate?: Date;
    jobDescription?: string;
  };
  skills?: string;
  status?: string;
  createdDate: Date;
  createdBy: string;
  updatedDate?: Date;
}

export interface ITeacher {
  teacherId?: string;
  teacherName?: string;
  teacherEmail?: string;
  attendee?: string;
}
export interface IStudentMeeting {
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  attendee?: string;
}
export interface IAdminMeet {
  adminId?: string;
 adminName?: string;
  adminEmail?: string;
  attendee?: string;
}
export interface IOrganizer {
  organizerId?: string;
  organizerName?: string;
  organizerEmail?: string;
  role?: "teacher" | "student" | "admin" | "supervisor" | "academiccoach";
}
// ✅ New unified participant interface
export interface IParticipant {
  participantId?: string;
  participantName?: string;
  participantEmail?: string;
  role: "teacher" | "student" | "admin" | "supervisor"|"academiccoach";
  attendee?: string;
}

export interface IMeetingCreate {
  meetingName: string;
  meetingId: string;
  selectedDate: Date;
  startTime: string;
  endTime: string;
  organizer?: IOrganizer;
  participants?: IParticipant[];
  description: string;
  meetingminutes?: string;
  duration?: string;
  status: string;
  meetingStatus: string;
  createdDate: Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}

export interface IMeeting extends Document {
  tenantId: string;
  meetingName: string;
  meetingId: string;
  teacher: ITeacher[];
  organizer?: IOrganizer;
  selectedDate: Date;
  startTime: string;
  endTime: string;
  participants?: IParticipant[];
  description: string;
  status: string;
  meetingStatus: string;
  meetingminutes?: string;
  duration?: string;
  createdDate: Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}

export interface INotification{
    messages ?: string;
    isRead ?: boolean;
    senderId : string;
    senderName : string;
    senderEmail : string;
    receiverId : string;
    receiverName : string;
    receiverEmail : string;
    notificationType ?: string;
    notificationStatus ?: string;
    status: string;
    createdDate: Date;
    createdBy: string;
    updatedDate?: Date;
    updatedBy?: string;
}

export interface INotification extends Document{
  tenantId: string;
  messages ?: string;
  isRead ?: boolean;
  senderId : string;
  senderName : string;
  senderEmail : string;
  receiverId : string;
  receiverName : string;
  receiverEmail : string;
  notificationType ?: string;
  notificationStatus ?: string;
  status : string;
  createdDate : Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}

export interface IOtherEmployee extends Document{
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: number;
  nationality: string;
  country: string ;
  city: string;
  dateOfBirth: string;
  gender: string;
  residentialAddress: string;
  higherQualification: string;
  universityName: string;
  previousJob: string;
  experience: string;
  bankName: string;
  accountNumber: number;
  bankCode: string;
  passportNumber: string;
  languagesKnown: string;
  emergencyContactNumber: number;
  relationshipWithEmployee: string
  address: string;
  designation: string;
  department: string;
  preferedWorkingHours: number;
  preferedShiftFrom : string;
  preferedShiftTo: string;
  comments: string;
  profileImage: string;
  applicationDate: Date;
  currency: string;
  expectedSalary: number;
  applicationStatus: string;
  preferedWorkingDays: string;
  resume: any;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
}


export interface IOtherEmployeeCreate{
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: number;
  nationality: string;
  country: string ;
  city: string;
  dateOfBirth: string;
  gender: string;
  residentialAddress: string;
  higherQualification: string;
  universityName: string;
  previousJob: string;
  experience: number;
  bankName: string;
  accountNumber: number;
  bankCode: string;
  passportNumber: string;
  languagesKnown: string;
  emergencyContactNumber: number;
  relationshipWithEmployee: string
  address: string;
  designation: string;
  department: string;
  preferedWorkingHours: number;
  preferedShiftFrom : string;
  preferedShiftTo: string;
  comments: string;
  profileImage: string;
  applicationDate: Date;
  currency: string;
  expectedSalary: number;
  applicationStatus: string;
  preferedWorkingDays?: string;
  resume: any;
  status: string;
}



export interface IAdminMeetingCreate {
  meetingName: string;
  meetingId?: string;
  admin?: {
    adminId?: string;
    adminName?: string;
    adminEmail?: string;
    adminRole?: string;
  };
  selectedDate: Date;
  startTime: string;
  endTime: string;
  teacher: {
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
  }[]; // <-- ✅ MUST be an array of teacher objects
  description: string;
  status: string;
  meetingStatus?: string;
  createdDate?: Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}



export interface IAdminMeeting extends Document{
  tenantId: string;
  meetingName: string;
  meetingId: string;
   admin:{
    adminId?: string;
    adminName?: string;
    adminEmail?: string;
    adminRole?: string;
  };
  selectedDate: Date;
  startTime: any;
  endTime: any;
  teacher:  string[];
  description: string;
  status: string;
  meetingStatus: string;
  createdDate: Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}
export interface RealTimeMessageCreate{
  messages : string;
  isRead : boolean;
  senderId : string;
  senderName : string;
  senderEmail ?: string;
  receiverId : string;
  receiverName : string;
  receiverEmail ?: string;
  notificationStatus : notificationStatus;
  status?: string;
  createdDate?: Date;
  createdBy?: string;
  updatedDate?: Date;
  updatedBy?: string;
}

export interface RealTimeMessage extends Document{
  tenantId: string;
  messages : string;
isRead : boolean;
senderId : string;
senderName : string;
senderEmail ?: string;
receiverId : string;
receiverName : string;
receiverEmail ?: string;
notificationStatus : notificationStatus;
status ?: string;
createdDate ?: Date;
createdBy?: string;
updatedDate?: Date;
updatedBy?: string;
}

export interface IEmpwages extends Document{
  tenantId: string;
  employeeId: string,
  employeeName: string,
  classType:{
    className: string,
    hoursMins: string,
    rate: string,
    currency: string
  },
  status: string,
  createdDate: Date,
  createdBy: string,
  updatedDate: Date,
  updatedBy: string
}

export interface IEmpwagesCreate{
  employeeId: string,
  employeeName: string,
  classType:{
    className: string,
    hoursMins: string,
    rate: string,
    currency: string
  },
  status: string,
  createdDate: Date,
  createdBy: string,
  updatedDate: Date,
  updatedBy: string
}


export interface IExpense extends Document{
  tenantId: string;
  paymentDate: string,
  expenseType: string,
  amount:string,
  category:string,
  paymentMethod:string,
  status: string,
  createdDate: Date,
  createdBy: string,
  updatedDate: Date,
  updatedBy: string
}

export interface IExpenseCreate{
  employeeId: string,
  employeeName: string,
  classType:{
    className: string,
    hoursMins: string,
    rate: string,
    currency: string
  },
  status: string,
  createdDate: Date,
  createdBy: string,
  updatedDate: Date,
  updatedBy: string
}

export interface IKnowledgeBase extends Document{
  tenantId: string;
  courseName: string,
  subjectTitle: string;
  uploadedFormat: string,
  uploadedFile: String,
  status: string,
  createdDate: Date,
  createdBy: string,
  updatedDate: Date,
  updatedBy: string
}

export interface IKnowledgeBaseCreate{
  courseName: string,
  subjectTitle: string;
  uploadedFormat: string,
  uploadedFile: any,
  status: string,
  createdDate: Date,
  createdBy: string,
  updatedDate: Date,
  updatedBy: string
}

export interface IAccessModel {
  employeeId: string;
  employeeName: string;
  contact: string;
  designation: string[];
  dateOfJoining?: Date; // Format: 'DD/MM/YYYY'
  roleAccess?: {
    admin?: boolean;
    adminmodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      evaluation?: { read?: boolean, write?: boolean, delete?: boolean },
      students?: { read?: boolean, write?: boolean, delete?: boolean },
      employees?: { read?: boolean, write?: boolean, delete?: boolean },
      courses?: { read?: boolean, write?: boolean, delete?: boolean },
            meetings?: { read?: boolean, write?: boolean, delete?: boolean },

      classes?: { read?: boolean, write?: boolean, delete?: boolean },
      finance?: { read?: boolean, write?: boolean, delete?: boolean },
      analytics?: { read?: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      settings?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    academicCoach?: boolean;
    academicmodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      trialmanagement?: { read?: boolean, write?: boolean, delete?: boolean },
      schedule?: { read?: boolean, write?: boolean, delete?: boolean },
      managestudents?: { read?: boolean, write?: boolean, delete?: boolean },
      manageteachers?: { read?: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    supervisor?: boolean;
    supervisormodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      recruitment?: { read?: boolean, write?: boolean, delete?: boolean },
      meetingandtraining?: { read?: boolean, write?: boolean, delete?: boolean },
      teachers?: { read: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    student?: boolean;
    studentmodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      classes?: { read?: boolean, write?: boolean, delete?: boolean },
      assignments?: { read: boolean, write?: boolean, delete?: boolean },
      payments?: { read?: boolean, write?: boolean, delete?: boolean },
      knowledgebase?: { read?: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    teacher?: boolean;
    teachermodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      meeting?: { read?: boolean, write?: boolean, delete?: boolean },
      schedule?: { read?: boolean, write?: boolean, delete?: boolean },
      liveclass?: { read?: boolean, write?: boolean, delete?: boolean },
      assignment?: { read?: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      analytics?: { read?: boolean, write?: boolean, delete?: boolean },
      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
  };
  
  
}


export interface IAccessModel extends Document{
  tenantId: string;
  employeeId: string;
  employeeName: string;
  contact: string;
  designation: string[];
  dateOfJoining?: Date; // Format: 'DD/MM/YYYY'
  roleAccess?: {
    admin?: boolean;
    adminmodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      evaluation?: { read?: boolean, write?: boolean, delete?: boolean },
      students?: { read?: boolean, write?: boolean, delete?: boolean },
      employees?: { read?: boolean, write?: boolean, delete?: boolean },
      courses?: { read?: boolean, write?: boolean, delete?: boolean },
      meetings?: { read?: boolean, write?: boolean, delete?: boolean },
      classes?: { read?: boolean, write?: boolean, delete?: boolean },
      finance?: { read?: boolean, write?: boolean, delete?: boolean },
      analytics?: { read?: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      settings?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    academicCoach?: boolean;
    academicmodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      trialmanagement?: { read?: boolean, write?: boolean, delete?: boolean },
      schedule?: { read?: boolean, write?: boolean, delete?: boolean },
      managestudents?: { read?: boolean, write?: boolean, delete?: boolean },
      manageteachers?: { read?: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    supervisor?: boolean;
    supervisormodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      recruitment?: { read?: boolean, write?: boolean, delete?: boolean },
      meetingandtraining?: { read?: boolean, write?: boolean, delete?: boolean },
      teachers?: { read: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    student?: boolean;
    studentmodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      classes?: { read?: boolean, write?: boolean, delete?: boolean },
      assignments?: { read: boolean, write?: boolean, delete?: boolean },
      payments?: { read?: boolean, write?: boolean, delete?: boolean },
      knowledgebase?: { read?: boolean, write?: boolean, delete?: boolean },     
       messages?: { read?: boolean, write?: boolean, delete?: boolean },

      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
    teacher?: boolean;
    teachermodules?: {
      dashboard?: { read?: boolean, write?: boolean, delete?: boolean },
      meeting?: { read?: boolean, write?: boolean, delete?: boolean },
      schedule?: { read?: boolean, write?: boolean, delete?: boolean },
      liveclass?: { read?: boolean, write?: boolean, delete?: boolean },
      assignment?: { read?: boolean, write?: boolean, delete?: boolean },
      messages?: { read?: boolean, write?: boolean, delete?: boolean },
      analytics?: { read?: boolean, write?: boolean, delete?: boolean },
      support?: { read?: boolean, write?: boolean, delete?: boolean },
    },
  };
  
    status: string;
    createdDate: Date;
    createdBy: string;
    updatedDate?: Date;
    updatedBy?: string;
}



export interface ISalarywages extends Document {
  tenantId: string;
  employeeId: string;
  employeeName: string;
  employeeMail: string;
  phone: number;
  designation: string;
  salaryAmount: number;
  deductionAmount: number;
  balanceAmount: number;
  paymentDate: Date;
  paymentStatus: string;
  commands?: string;
  description?: string;
  paymentMethod: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
  isSalaryProcessed?: boolean;
}

export interface ISalarywagesCreate {
  employeeId: string;
  employeeName: string;
  employeeMail: string;
  phone: number;
  designation: string;
  salaryAmount: number;
  deductionAmount: number;
  balanceAmount: number;
  paymentDate: Date;
  paymentStatus: string;
  commands?: string;
  description?: string;
  paymentMethod: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
}



export interface IPackage extends Document {
  tenantId: string;
  packageName: string;
  costPerHour: string;
  categories: {
    [category: string]: string[]; // Key: "Academics", Value: ["E-certificate", ...]
  };
  descriptionPoint: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
}

export interface IPackageCreate {
  packageName: string;
  costPerHour: string;
  categories: {
    [category: string]: string[];
  };
  descriptionPoint: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
}
export interface ILeaveRequestCreate {
  employeeId: string,
  name: string,
  role:string,
  fromDate: Date,
  toDate: Date,
  leaveType: string,
  leaveStatus: string,
   deductionDays?: number;
  approvedDays: number;
  approvedId: string,
  approvedName: string,
  reason: string,
  updatedLeave?: string,
    sickLeaveCount:number,
  casualLeaveCount:number,
  paidLeaveCount:number,
  status?: string,
  createdDate?: Date,
  createdBy?: string,
  updatedDate?: Date,
  updatedBy?: string,
}


export interface ILeaveRequest extends Document {
  tenantId: string;
  employeeId: string;
  name: string,
  role:string,
  fromDate: Date,
  toDate: Date,
  leaveType: string,
  leaveStatus: string,
  deductionDays?: number;
  approvedDays: number;
  approvedId: string,
  approvedName: string,
  reason: string,
  updatedLeave?: string,
  sickLeaveCount:number,
  casualLeaveCount:number,
  paidLeaveCount:number,
  status?: string,
  createdDate?: Date,
  createdBy?: string,
  updatedDate?: Date,
  updatedBy?: string,

}

export interface IleaveSummary {
  name: string,
  role:string,
  fromDate: Date,
  toDate: Date,
  leaveType: string,
  leaveStatus: string,
  leavesTaken: string,
  remainingLeaves: string,
  approvedId: string,
  approvedName: string,
  reason: string,
  updatedLeave?: string,
  status?: string,
  createdDate?: Date,
  createdBy?: string,
  updatedDate?: Date,
  updatedBy?: string,
   approvedDays: number;
   deductionDays: number;
}


export interface IleaveSummary  extends Document {
  tenantId: string;
  employeeId: any;
  name: string,
  role:string,
  fromDate: Date,
  toDate: Date,
  leaveType: string,
  leaveStatus: string,
  leavesTaken: string,
  remainingLeaves: string,
  approvedId: string,
  approvedName: string,
  reason: string,
  updatedLeave?: string,
  status?: string,
  createdDate?: Date,
  createdBy?: string,
  updatedDate?: Date,
  updatedBy?: string,
 approvedDays: number;
 deductionDays:number;
}

export interface TeacherTimeSlots {
  name : string,
  from : string,
  to : string,
  isStatus : boolean,
}

export interface TeacherAvaliableSlots extends Document {
   tenantId: string,
   date: string,
   teacherId : string,
   position : string,
   name : string,
   from : string,
   to : string,
   isStatus : boolean,
   createdDate? : Date,
}


export interface IParticipants {
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
}


export interface TeacherMeetingCreate {
  meetingId: string;
  meetingName: string;
  participants: IParticipants[]; // ✅ Keep object array
  teacher: {
    teacherId?: string;
    teacherName?: string;
    teacherEmail?: string;
  };
  selectedDate: Date;
  startTime: string;
  endTime: string;
  description: string;
  meetingStatus: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
}



export interface TeacherMeeting extends Document {
  tenantId: string;
  meetingId: string;
  meetingName: string;
  participants: IParticipants[]; // ✅ Changed from string[] to object[]
  teacher: {
    teacherId?: string;
    teacherName?: string;
    teacherEmail?: string;
  };
  selectedDate: Date;
  startTime: string;
  endTime: string;
  description: string;
  meetingStatus: string;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate: Date;
  updatedBy: string;
}

export interface LogDocument extends Document {
  tenantId: string;
  userId: string;
  logType: 'SUCCESS' | 'REDIRECT' | 'ERROR' | 'INFO';
  action?: string;       
  description?: string;   
  route?: string;        
  errorMessage?: string;  
  stack?: string;         
  ip?: string;
  meta?: any;
  createdDate: Date;
}

export interface IRollCounter extends Document {
   tenantId: string,
   prefix: String;
    sequence: String;
}

// Define the ITenant interface
export interface ITenant extends Document {
  tenantId?: string;
  tenantCode: string;
  tenantName: string;
  tenantLogo: string;
  mobileNumber: string;
  organizationName: string;
  phoneNumber?: string;
  address?: string;
  country?: string;
  companyRegistrationCertificate: string;
  gstCertificate: string;
  addressProof: string;
  emailId: string;
  faxNo?: string;
  state: string;
  city: string;
  street: string;
  gstNo?: string;
  panNo?: string;
  postalCode?: string;
  tenantJobCode: string;
  website?: string;
  status?: string;
  activeLicense?: object;
  plan?: string;
  timeZone: string;
  currency: string;
  settings?: any[];
  createdDate: Date;
  createdBy: string;
  lastUpdatedDate: Date;
  lastUpdatedBy: string;
}

export interface ITenantCreate {
  tenantName: string;
  tenantLogo: string;
  mobileNumber: string;
  organizationName: string;
  phoneNumber?: string;
  state: string;
  city: string;
  street: string;
  country?: string;
  companyRegistrationCertificate?: string;
  addressProof?: string;
  plan?: string;
  activeLicense?: object;
  timeZone?: string;
  currency?: string;
  emailId: string;
  faxNo?: string;
  gstNo?: string;
  panNo?: string;
  postalCode?: string;
  tenantJobCode: string;
  website?: string;
  status?: string;
  settings?: any[];
  createdDate?: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy: string;

}

// Define the ITenantSettings interface
export interface ITenantSettings extends Document {
  tenantId: string;
  keyName: string;
  keyValue: any;
  aiModel?:string;
  apiKey?:string;
  module: string;
  isConnected: boolean;
  status: keyof typeof CustomEnumerator.Status;
  createdDate?: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy?: string;
}
export interface ITenantSettingsPayload {
  tenantId: string;
  keyName: string;
  keyValue: any;
  module: string;
  isConnected: boolean;
  status: keyof typeof CustomEnumerator.Status;
  createdDate?: Date;
  createdBy: string;
  lastUpdatedDate?: Date;
  lastUpdatedBy?: string;
}
export interface Plans extends Document {
  planName: string;
  features: string[];
  price: number;
  tenantId: string;
  planId: string;
  trialDays: number;
  maxUsers: number;
  allowedRoles: string[];
  canCreateCustomRoles: boolean;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'LIFETIME' | 'QUARTERLY' | 'HALF_YEARLY';
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}

export interface Subscription extends Document {
  tenantId: string;
  planId: string;
  planName: string;
  subscriptionId: string;
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED'| 'TRIALS';
  startDate: Date;
  isTrialUsed: boolean;
  endDate: Date;
  status: string;
  createdDate: Date;
  createdBy: string;
  updatedDate?: Date;
  updatedBy?: string;
}