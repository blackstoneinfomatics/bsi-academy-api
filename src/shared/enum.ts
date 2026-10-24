import { classStatus } from "../config/messages";

// Use an enum for better type safety
export enum Status {
  ACTIVE = "Active",
  IN_ACTIVE = "Inactive",
  DELETED ="Deleted",
  ARCHIVED = "Archived",
  NEW = "New",
  TRIAL = "Trial",
  COMPLETED = "Completed",
}

export enum RequestStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
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
  CUSTOM_SERVICE = "CUSTOM_SERVICE",
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

export enum RefundStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum RefundApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum PaymentGateway {
  STRIPE = "STRIPE",
  MANUAL = "MANUAL",
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

export enum FilterOptions {
  WEEKLY = "week",
  MONTHLY = "month",
  YEARLY = "year",
}

export enum PortalType {
  DEFAULT = "DEFAULT",
  CUSTOM = "CUSTOM",
}

export enum RoleType {
  ACADEMIC = "ACADEMIC",
  ADMINISTRATION = "ADMINISTRATION",
  FINANCE = "FINANCE",
  TRANSPORT = "TRANSPORT",
  HOSTEL = "HOSTEL",
}

export enum PortalStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum ChatRoomType {
  DIRECT = "DIRECT",
  GROUP = "GROUP",
  USER = "USER",
  TENANT = "TENANT",
  SEGMENT = "SEGMENT",
  GLOBAL = "GLOBAL",
}

export enum ChatGroupRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum ChatMessageType{
  TEXT ="TEXT",
  IMAGE ="IMAGE",
  FILE ="FILE"
}

export enum ChatRoomStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED"
}

export enum ChatSendAccess {
  EVERYONE = "EVERYONE",
  ADMIN_ONLY = "ADMIN_ONLY",
}

export enum ChatSource {
  TENANT = "TENANT",
  SUPER_ADMIN = "SUPER_ADMIN"
}


export enum PurchaseRequestStatus {
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAID = "PAID",
  SCHEDULED = "SCHEDULED",
  ACTIVATED = "ACTIVATED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  FAILED = "FAILED",
  DELETED ="DELETED"
}

export enum PurchaseActivationMode {
  IMMEDIATE = "IMMEDIATE",
  NEXT_PLAN = "NEXT_PLAN",
}

export enum PurchasePaymentStatus {
  NOT_REQUIRED = "NOT_REQUIRED",
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
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

export enum RevenuePeriod {
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export enum TenantGrowthPeriod {
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export enum PortalRequestType {
  ADD_PORTAL = "ADD_PORTAL",
  DISABLE_PORTAL = "DISABLE_PORTAL",
  ADD_FEATURE = "ADD_FEATURE",
  DISABLE_FEATURE = "DISABLE_FEATURE",
}

export enum TICKET_CATEGORIES {
  TECHNICAL_ISSUE = "TECHNICAL_ISSUE",
  STUDENT_MANAGEMENT = "STUDENT_MANAGEMENT",
  TEACHER_MANAGEMENT = "TEACHER_MANAGEMENT",
  ADMIN_MANAGEMENT = "ADMIN_MANAGEMENT",
  ATTENDANCE_MANAGEMENT = "ATTENDANCE_MANAGEMENT",
  PAYMENT_INVOICE = "PAYMENT_INVOICE",
  SUBSCRIPTION_PLAN = "SUBSCRIPTION_PLAN",
  FEATURE_REQUEST = "FEATURE_REQUEST",
  OTHERS = "OTHERS",
} 

export enum TICKET_PRIORITIES {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical",
}

export enum TICKET_STATUSES {
  OPEN = "Open",
  ACKNOWLEDGED = "Acknowledged",
  IN_PROGRESS = "InProgress",
  FORWARDED = "Forwarded",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
}




export default CustomEnumerator;
