import { classStatus } from "../config/messages";

// Use an enum for better type safety
export enum Status {
  ACTIVE = "Active",
  IN_ACTIVE = "Inactive",
  DELETED ="Deleted",
  ARCHIVED = "Archived",
  NEW = "New"
}

export enum AssignmentStatus {
  ASSIGNED = "Assigned",
  PENDING = "Pending",
  COMPLETED = "Completed",
  NOTASSIGNED = "Not Assigned",
  NOTCOMPLETED = "Not Completed",
}
export enum LearningInterest {
  QURAN ="Quran",
  ISLAMIC= "Islamic Studies",
  ARABIC = "Arabic",
}

export enum NumberOfStudents {

  ONE = 1,
  TWo = 2,
  THREE = 3,
  FOUR= 4,
  FIVE= 5,
}

export enum PreferredTeacher {
  TEACHER_1 = "Male",
  TEACHER_2 = "Female",
  TEACHER_3 = "Other",
}

export enum EvaluationStatus {
  PENDING = "PENDING",
  INPROGRESS = "INPROGRESS",
  COMPLETED = "COMPLETED",
}

export enum EventType {
  MEETING_SCHEDULED = "MEETING_SCHEDULED",
  MEETING_CANCELLED = "MEETING_CANCELLED",
  MEETING_UPDATED = "MEETING_UPDATED",
}

export enum ReferralSource {
  FRIEND ="Friend",
  SOCIALMEDIA = "Social Media", // Keep as string
  EMAIL = "E-Mail", 
  GOOGLE = "Google",
  OTHER = "Other"  // Keep as string
}

export enum SubscriptionInvoiceStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_PAID = "PARTIALLY_PAID",
}

export enum SubscriptionStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum BillingCycle {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
  HALF_YEARLY = "HALF_YEARLY",
}

export enum PaymentType {
  SUBSCRIPTION = "SUBSCRIPTION",
  RENEWAL = "RENEWAL",
  REFUND = "REFUND",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  PAID = "PAID",
}

export enum PaymentGateway {
  STRIPE = "STRIPE",
}

export enum SubscriptionTrialStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CANCELLED = "CANCELLED",
  CONVERTED = "CONVERTED",
  EXPIRED = "EXPIRED",
  COMPLETED = "COMPLETED",
  EXPIRING_SOON = "EXPIRING_SOON",
}

export enum BillingStatus {
  PAID = "PAID",
  PENDING = "PENDING",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export class CustomEnumerator {
  static readonly classStatus = classStatus;
  static readonly Status = Status;
  static readonly EventType = EventType;
  static readonly LearningInterest = LearningInterest;
  static readonly NumberOfStudents = NumberOfStudents;
  static readonly PreferredTeacher = PreferredTeacher;
  static readonly EvaluationStatus = EvaluationStatus;
  static readonly ReferralSource = ReferralSource;
}

export interface GetAllRecordsParams {
  tenantId?: string;
  modules?: string[];
  keyNames?: string[];
  groupId?: string;
  roomId?: string;
  supervisorId?: string;
  teacherId?: string;
  studentId?: string;
  academicCoachId?: string;
  searchText?: string;
  sortBy: string;
  sortOrder?: "asc" | "desc";
  offset?: string | null;
  limit?: string | null;
  role?: string;
  classDay?: any;
  trialClassStatus?: any;
  userid?: any;
  filterValues?: {
  meetingStatus?: string | string[],
      studentId?: string;
    course?: {
      courseName?: string | string[]; // ✅ Fix: course is now an object
    };
    
   country?: string;
    teacher?: string;
    status?: string;
    sessionClassType?: string | string[];
    scheduleStatus?: string | string[];
    startTime?: string | string[];
    timing?: string;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}



export interface GetAllApplicationsRecordsParams {
  searchText?: string;
  sortBy: string;
  sortOrder?: "asc" | "desc";
  offset?: string | null;
  limit?: string | null;
  filterValues?: {
    applicationStatus?: string[];       // Array of statuses (e.g., ["Pending", "Approved"])
    positionApplied?: string[];         // Array of positions (e.g., ["Teacher", "Admin"])
    dateRange?: {
      from: string;                     // Start date (e.g., "2024-01-01")
      to: string;                       // End date (e.g., "2024-12-31")
    };
  };
}



export interface GetAlluserRecordsParams {
  date?: string;
  role?: string;
  studentId?:string;

}

export interface GetAllTeachersRecordsParams {
  teacherGroup?: string;
  supervisorId?: string;
}

export interface GetAllAssignmentRecordsParams {
  studentId?: string;
  assignmentId?: string;
};

export interface GetPaymentDetailsRecordsParams {

  userId: string,
  studentId?: string,
  _id?: string,
  userName?: string,
  paymentStatus?: string,
  paymentAmount?: any,
  paymentDate?: string,
  filterValues?: {
    status?: string;
    paymentType?: string;
    startDate?: string;
    endDate?: string;
  };
  status?: string,
  sortBy?: any,
  sortOrder?: any,
  offset?: any,
  limit?: any,
  searchText?: string
}

export default CustomEnumerator;
