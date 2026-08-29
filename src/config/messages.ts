export const studentMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all the users list",
  BYID: "Retrieve user details by userId",
  CREATE: "Create a new student",
  UPDATE: "Update a existing user",
  DELETE: "Delete user by userId",
  BULK_DELETE: "Bulk Delete users by userIds",
  USER_NOT_FOUND: "Your account is not found or active, contact admin",
  ENCRYPT_PASSWORD_ERROR: "Password must be an encrypted value",
  USER_PROFILE_INVALID_FILE_TYPE:
    "Invalid file type. Only .png , .jpg or jpeg files are allowed.",
});

export const evaluationMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all the users list",
  BYID: "Retrieve user details by userId",
  CREATE: "Create a new student",
  UPDATE: "Update a existing user",
  DELETE: "Delete user by userId",
  BULK_DELETE: "Bulk Delete users by userIds",
  USER_NOT_FOUND: "Your account is not found or active, contact admin",
  ENCRYPT_PASSWORD_ERROR: "Password must be an encrypted value",
  USER_PROFILE_INVALID_FILE_TYPE:
    "Invalid file type. Only .png , .jpg or jpeg files are allowed.",
});

export const userMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all the users list",
  BYID: "Retrieve user details by userId",
  CREATE: "Create a new user",
  UPDATE: "Update a existing user",
  DELETE: "Delete user by userId",
  BULK_DELETE: "Bulk Delete users by userIds",
  USER_NOT_FOUND: "Your account is not found or active, contact admin",
  ENCRYPT_PASSWORD_ERROR: "Password must be an encrypted value",
  USER_PROFILE_INVALID_FILE_TYPE:
    "Invalid file type. Only .png , .jpg or jpeg files are allowed.",
  ACTIVE_USER_NOT_FOUND: "Active user not found with the provided credentials",
});

export const authMessages: Record<string, string> = Object.freeze({
  CHANGE_PASSWORD: "Update users password",
  SIGN_IN: "Sign In user by username and password",
  SIGN_OUT: "Sign out user by token",
  INCORRECT_PASSWORD: "Password is incorrect, please retry again",
  NO_TOKEN_PROVIDED: "No token provided",
  INVALID_TOKEN: "Invalid token provided",
  SIGNOUT_SUCCESS: "You are signed out of your account",
  SIGNOUT_UNSUCCESS: "Unable to sign out",
  TOKEN_NO_LONGER_VALID: "Token is no longer valid",
});

export const recruitmentMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all the candidate list",
  BYID: "Retrieve candidate details by userId",
  CREATE: "Create a new candidate",
  UPDATE: "Update a existing candidate",
  DELETE: "Delete candidates by candidateId",
  BULK_DELETE: "Bulk Delete candidates by candidateIds",
  USER_NOT_FOUND: "Your account is not found or active, contact admin",
  ENCRYPT_PASSWORD_ERROR: "Password must be an encrypted value",
  USER_PROFILE_INVALID_FILE_TYPE:
    "Invalid file type. Only .png , .jpg or jpeg files are allowed.",
});

export const addMeetingMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all meetings",
  BYID: "Retrieve meeting details by meetingId",
  CREATE: "Create a new meeting",
  UPDATE: "Update an existing meeting",
  DELETE: "Delete a meeting by meetingId",
  BULK_DELETE: "Bulk delete meetings by meetingIds",
  USER_NOT_FOUND: "User not found or inactive, contact admin",
  INVALID_DATE_FORMAT: "Invalid date format. Please provide a valid date.",
  INVALID_TIME_FORMAT: "Invalid time format. Please use HH:MM format.",
  MEETING_TITLE_REQUIRED: "Meeting title is required",
  MEETING_DATE_REQUIRED: "Meeting date is required",
  MEETING_TIME_REQUIRED: "Meeting start and end time are required",
  TEACHER_REQUIRED: "At least one teacher must be assigned",
  INVALID_STATUS: "Invalid meeting status",
});

export const attendeeStatus: Record<string, any> = Object.freeze({
  PRESENT: "present",
  ABSENT: "absent",
});

export const appStatus: Record<string, any> = Object.freeze({
  ACTIVE: "Active",
  IN_ACTIVE: "Inactive",
  DELETED: "Deleted",
  ARCHIVED: "Archived",
  NEW: "New",
});

export const teacherStatus: Record<string, any> = Object.freeze({
  ACTIVE: "Active",
  IN_ACTIVE: "Inactive",
  DELETED: "Deleted",
  ARCHIVED: "Archived",
  NEW: "New",
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Re-Scheduled",
});

export const classType: Record<string, any> = Object.freeze({
  REGULARCLASS: "REGULARCLASS",
  GROUPCLASS: "GROUPCLASS",
  TRIALCLASS: "TRIALCLASS",
  EVALUATIONCLASS: "EVALUATIONCLASS",
});

export const classStatus: Record<string, any> = Object.freeze({
  COMPLETED: "completed",
  PENDING: "pending",
});

export const learningInterest: Record<string, any> = Object.freeze({
  QURAN: "Quran",
  ISLAMIC: "Islamic Studies",
  ARABIC: "Arabic",
});
export const numberOfStudents: Record<string, number> = Object.freeze({
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
});
export const preferredTeacher: Record<string, any> = Object.freeze({
  TEACHER_1: "Male",
  TEACHER_2: "Female",
  TEACHER_3: "Either",
});

export const referenceSource: Record<string, any> = Object.freeze({
  FRIEND: "Friend",
  SOCIALMEDIA: "Social Media", // Keep as string
  EMAIL: "E-Mail",
  GOOGLE: "Google",
  OTHER: "Other",
});

export const appPlatforms: Record<string, any> = Object.freeze({
  WEB: "Web",
  ONLINE: "Online",
});

export const evaluationStatus: Record<string, any> = Object.freeze({
  PENDING: "PENDING",
  INPROGRESS: "INPROGRESS",
  COMPLETED: "COMPLETED",
});

export const role: Record<string, string> = Object.freeze({
  ACADEMICCOACH: "ACADEMICCOACH",
  TEACHER: "Teacher",
});

export const applicationStatus: Record<string, any> = Object.freeze({
  NEWAPPLICATION: "NEWAPPLICATION",
  SHORTLISTED: "SHORTLISTED",
  REJECTED: "REJECTED",
  WAITING: "WAITING",
  SENDAPPROVAL: "SENDAPPROVAL",
  APPROVED: "APPROVED",
});

export const eventType: Record<string, string> = Object.freeze({
  MEETING_SCHEDULED: "MEETING_SCHEDULED",
  MEETING_CANCELLED: "MEETING_CANCELLED",
  MEETING_UPDATED: "MEETING_UPDATED",
});
export const appRegexPatterns = Object.freeze({
  OBJECT_ID: /^[a-fA-F0-9]{24}$/,
  NUMBER: /^\d+$/,
});

export const teacherPosition: Record<string, any> = Object.freeze({
  QURANTEACHER: "Quran Teacher",
  ISLAMICTEACHER: "Islamic Teacher",
  ARABICTEACHER: "Arabic Teacher",
});

export const planMessages: Record<string, string> = Object.freeze({
  INVALID_GST_AND_TAX: "Invalid gstAndTax value. Use number or percentage format like 18%.",
  VALIDATION_FAILED: "Validation Failed",
  PLAN_CREATED_SUCCESS: "Plan created successfully",
  PLAN_NOT_FOUND: "Plan not found",
  PLAN_DELETED_SUCCESS: "Plan deleted successfully",
  BILLING_PERIOD_ADDED_SUCCESS: "Billing period added successfully",
  BILLING_PERIOD_ALREADY_EXISTS: "Billing period already exists on this Plan.",
  BILLING_PERIOD_NOT_FOUND: "Billing period not found",
  PLAN_DASHBOARD_FETCHED_SUCCESS: "Plan dashboard fetched successfully.",
  PLAN_ANALYTICS_FETCHED_SUCCESS: "Plan analytics fetched successfully.",
  FAILED_TO_CREATE_PLAN: "Failed to create plan",
  FAILED_TO_FETCH_PLANS: "Failed to fetch plans.",
  FAILED_TO_UPDATE_PLAN: "Failed to update plan.",
  FAILED_TO_ADD_BILLING_PERIOD: "Failed to add billing period.",
  FAILED_TO_UPDATE_BILLING_PERIOD: "Failed to update billing period.",
  FAILED_TO_FETCH_PLAN_DASHBOARD: "Failed to fetch plan dashboard.",
  FAILED_TO_FETCH_PLAN_ANALYTICS: "Failed to fetch plan analytics.",
  CUSTOM_DOMAIN_NOT_AVAILABLE: "Custom Domain feature is not available for your current subscription.",
  BACKUP_NOT_AVAILABLE: "Backup feature is not available for your current subscription.",
  CUSTOM_DOMAIN_REQUIRED: "Please provide the tenant custom domain.",
  DEFAULT_DOMAIN_REQUIRED: "Please provide the default running domain.",
});

export const financeMessages: Record<string, string> = Object.freeze({
  DASHBOARD_COUNT_FETCHED: "Finance dashboard count fetched successfully",
  REVENUE_GRAPH_FETCHED: "Finance revenue graph fetched successfully",
  DASHBOARD_SUMMARY_FETCHED: "Revenue dashboard summary fetched successfully",
  REVENUE_GROWTH_FETCHED: "Revenue growth fetched successfully",
  TRANSACTIONS_FETCHED: "Finance transactions fetched successfully",
  TRANSACTION_CARD_COUNT_FETCHED: "Finance transaction card count fetched successfully",
  TODAY_ACTIVITIES_FETCHED: "Today's finance activities fetched successfully",
  TODAY_ACTIVITIES_FETCH_FAILED: "Failed to fetch today's finance activities",
});

export const commonMessages: Record<string, any> = Object.freeze({
  SERVER_HEALTH: "Service Health Check",
  SERVER_HEALTH_NOTES: "Return the current status of the API",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  BAD_REQUEST_ERROR: "Bad Request",
  VALIDATION_ERROR: "Validation error",
  DUPLICATE_RECORD_FOUND: "Duplicate record found",
  DUPLICATE_RECORD_ERROR: "E11000 duplicate key error collection",
  MALFORMED_RECORD_ERROR: "Malformed UTF-8 data",
  MALFORMED_RECORD_FOUND: "Password must be an valid encrypted value",
  INVALID_DATE_FORMAT: "Invalid date format",
  INVALID_OBJECT_ID: "Invalid ObjectId",
  NOT_FOUND: " not found",
  RECORD_NOT_FOUND: "Record Not Found",
  TENANT_NOT_FOUND: "Tenant not found",
  EMAIL_TEMPLATE_NOT_FOUND: "Email template not found",
  GREETINGS: "Greetings to all",
  LIMIT: "10",
  OFFSET: "0",
  INVALID_TYPE: "Invalid type",
  PROFILE_UPLOAD_FILE_TYPES: ["image/jpeg", "image/jpg", "image/png"],
});

export const appStatusCodes: number[] = [200];

export const appDateTime: string[] = [
  "YYYY-MM-DD HH:mm:ss",
  "DD MMM YYYY",
  "YYYY-MM-DDTHH:mm:ss",
];

export const appDataTypes = Object.freeze({
  TEXT: "text",
  LIST: "list",
  DATE: "date",
  CHIPS: "chip",
});

export const meetingSchedulesMessages: Record<string, any> = Object.freeze({
  LIST: "Retrieve all the meeting schedules list",
  BYID: "Retrieve meeting schedules details by meetingScheduleId",
  INTERVIEW_LIST: "Retrieve all the interview scheduled meeting",
  INTERVIEW_LIST_CANDIDATE:
    "Retrieve all the interview scheduled meeting for candidate",
  MEETING_SCHEDULE_NOT_FOUND: "Meeting schedule not found",
  GET_ALL_LIST_START: "getAllMeetingSchedulesRecords - Start",
  GET_ALL_LIST_SUCCESS: "getAllMeetingSchedulesRecords - Success",
  MEETING_STATUS: ["Pending", "Completed", "Cancelled"],
  CANDIDATE_RESPONSE: ["ACCEPTED", "NOT RESPONDED", "DECLINED"],
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
  DATE_FORMAT_INVALID: "Date must be in the format YYYY-MM-DD",
  CREATE: "Create a new meeting schedules",
  UPDATE: "Update meeting schedule details by meetingScheduleId",
  DELETE: "Delete meeting schedule details by meetingScheduleId",
  INVALID_APPLICATION_STATUS: "Meeting schedule is already ",
  MEETING_NOT_SCHEDULED: "Meeting is not scheduled",
  MEETING_SCHEDULED_CANCELLED: "Meeting schedule has been cancelled",
  UPDATE_FAILED: "Failed to update the meeting schedule",
  DELETE_FAILED: "Failed to delete the meeting schedule",
  REFERENCE_TYPE: ["MEETING_SCHEDULED"],
  INVALID_ID: "Invalid ID",
  INVALID_DATE_RANGE:
    "The date range is invalid because the start date is greater than the end date.",
  MISSING_DATE_PAIR: "Both the start date and end date are required.",
  TEAMS_FOR_BUSINESS: "teamsForBusiness",
  REQUIRED: "required",
  OPTIONAL: "optional",
  HTML: "HTML",
  VERIFY_INTEGRATION: "Verify the integration for",
  FAILED_TO_CONNECT: "Failed to connect",
  CHECK_INTEGRATION: ". Kindly check the integration",
  INVALID_CREDENTIAL: "Invalid credentials provided for tenant configuration.",
  UNAUTHORIZED_ACCESS:
    "Unauthorized access. Please check the tenant credentials.",
  FORBIDDEN_ACCESS:
    "Forbidden access. You do not have permission to perform this action.",
  FAILED_ACCESS_TOKEN: `Failed to retrieve access token for schedule meeting. Kindly verfiy the clander integration`,
  EMAIL_NOT_FOUND: "The requested resource or user email was not found",
  UNKNOWN_ERROR: "An unknown error occurred while creating the event:",
  NORESPONSE: "No response received from the server while creating the event.",
  FAILED_TO_CREATE_EVENT: "Failed to create calendar event.",
  FAILED_TO_UPDATE_EVENT: "Failed to update calendar event",
  UNKNOWN_ERROR_UPDATE_EVENT:
    "An unexpected error occurred while updating the event.",
  INVALID_REFERENCE_ID: "Invalid referenceId",
  FAILED_ASSESSMENT:
    "Failed to connect Assessment. Please check the integration.",
});

export const ClassSchedulesMessages: Record<string, any> = Object.freeze({
  LIST: "Retrieve all the meeting schedules list",
  BYID: "Retrieve meeting schedules details by meetingScheduleId",
  INTERVIEW_LIST: "Retrieve all the interview scheduled meeting",
  INTERVIEW_LIST_CANDIDATE:
    "Retrieve all the interview scheduled meeting for candidate",
  MEETING_SCHEDULE_NOT_FOUND: "Meeting schedule not found",
  GET_ALL_LIST_START: "getAllMeetingSchedulesRecords - Start",
  GET_ALL_LIST_SUCCESS: "getAllMeetingSchedulesRecords - Success",
  MEETING_STATUS: ["Pending", "Completed", "Cancelled"],
  CANDIDATE_RESPONSE: ["ACCEPTED", "NOT RESPONDED", "DECLINED"],
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
  DATE_FORMAT_INVALID: "Date must be in the format YYYY-MM-DD",
  CREATE: "Create a new meeting schedules",
  UPDATE: "Update meeting schedule details by meetingScheduleId",
  DELETE: "Delete meeting schedule details by meetingScheduleId",
  INVALID_APPLICATION_STATUS: "Meeting schedule is already ",
  MEETING_NOT_SCHEDULED: "Meeting is not scheduled",
  MEETING_SCHEDULED_CANCELLED: "Meeting schedule has been cancelled",
  UPDATE_FAILED: "Failed to update the meeting schedule",
  DELETE_FAILED: "Failed to delete the meeting schedule",
  REFERENCE_TYPE: ["MEETING_SCHEDULED"],
  INVALID_ID: "Invalid ID",
  INVALID_DATE_RANGE:
    "The date range is invalid because the start date is greater than the end date.",
  MISSING_DATE_PAIR: "Both the start date and end date are required.",
  TEAMS_FOR_BUSINESS: "teamsForBusiness",
  REQUIRED: "required",
  OPTIONAL: "optional",
  HTML: "HTML",
  VERIFY_INTEGRATION: "Verify the integration for",
  FAILED_TO_CONNECT: "Failed to connect",
  CHECK_INTEGRATION: ". Kindly check the integration",
  INVALID_CREDENTIAL: "Invalid credentials provided for tenant configuration.",
  UNAUTHORIZED_ACCESS:
    "Unauthorized access. Please check the tenant credentials.",
  FORBIDDEN_ACCESS:
    "Forbidden access. You do not have permission to perform this action.",
  FAILED_ACCESS_TOKEN: `Failed to retrieve access token for schedule meeting. Kindly verfiy the clander integration`,
  EMAIL_NOT_FOUND: "The requested resource or user email was not found",
  UNKNOWN_ERROR: "An unknown error occurred while creating the event:",
  NORESPONSE: "No response received from the server while creating the event.",
  FAILED_TO_CREATE_EVENT: "Failed to create calendar event.",
  FAILED_TO_UPDATE_EVENT: "Failed to update calendar event",
  UNKNOWN_ERROR_UPDATE_EVENT:
    "An unexpected error occurred while updating the event.",
  INVALID_REFERENCE_ID: "Invalid referenceId",
  FAILED_ASSESSMENT:
    "Failed to connect Assessment. Please check the integration.",
});

export const socketEventNames: Record<string, any> = Object.freeze({
  USERS: "users",
  DASHBOARD: "dashboard",
  WEB_NOTIFICATION: "web-notification",
});

export const fileMessages: Record<string, any> = Object.freeze({
  MAX_FILE_SIZE: 20971520,
});

export const tenantsMessages: Record<string, any> = Object.freeze({
  LIST: "Retrieve all the tenant settings list",
  CREATE: "Create a new tenant settings",
  UPDATE: "Update a existing tenant settings",
  UPDATE_PLAN :"Update Tenant Plan",
  TENANT_SETTINGS_NOT_FOUND: "Tenant settings not found",
  TENANT_SETTINGS_ALREADY_EXIST: "Tenant settings is already exists",
  KEY_ALREADY_EXIST: "Key is already exists",
  MODULE_TYPES: ["Integration", "General", "Preference"],
  KEYNAMES: [
    "ATS_ZOHO_CONFIG",
    "CALENDAR_GOOGLE_CONFIG",
    "CALENDAR_TEAMS_CONFIG",
    "MAIL_GOOGLE_CONFIG",
    "MAIL_OUTLOOK_CONFIG",
    "DATE_FORMAT",
    "TIME_ZONE",
    "AI_MODEL",
    "CUSTOM_DOMAIN",
    "BACKUP",
  ],
  GET_ALL_LIST_START: "getAllTenantSettingsRecords - Start",
  GET_ALL_LIST_SUCCESS: "getAllTenantSettingsRecords - Success",
  UPDATE_FAILED: "Failed to update the tenant settings",
  BYID: "Get Tenant details by Tenant Code",
  TENANT_NOT_FOUND: "Tenant not found",

  PLAN_NOT_FOUND: "Plan not found",

  SUBSCRIPTION_NOT_FOUND: "Tenant subscription not found",

  ACTIVE_PLAN_EXISTS: "Active plan exists. Cannot change until expiry",

  PLAN_UPDATED_SUCCESS: "Tenant plan updated successfully",

  PLAN_CREATED_SUCCESS: "Tenant subscription created successfully",

  INVALID_TENANT_ID: "Invalid tenant id",

  INVALID_PLAN_ID: "Invalid plan id",

  INTERNAL_SERVER_ERROR: "Internal server error"
});

export const dashboardMessages: Record<string, any> = Object.freeze({
  WIDGET_COUNT: "Get dashboard widget counts",
  // ... any other dashboard-related messages
});

export const alstudentsMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all the users list",
  BYID: "Retrieve user details by userId",
  CREATE: "Create a new user",
  UPDATE: "Update a existing user",
  DELETE: "Delete user by userId",
  BULK_DELETE: "Bulk Delete users by userIds",
  USER_NOT_FOUND: "Your account is not found or active, contact admin",
  ENCRYPT_PASSWORD_ERROR: "Password must be an encrypted value",
  USER_PROFILE_INVALID_FILE_TYPE:
    "Invalid file type. Only .png , .jpg or jpeg files are allowed.",
});

export const assignemntMessages: Record<string, any> = Object.freeze({
  ASSIGNMENT_CREATED: "Assignment has been successfully created.",
  ASSIGNMENT_UPDATED: "Assignment has been successfully updated.",
  ASSIGNMENT_DELETED: "Assignment has been successfully deleted.",
  ASSIGNMENT_NOT_FOUND: "The requested assignment could not be found.",
  INVALID_ASSIGNMENT_NAME: "Assignment name cannot be empty or null.",
  INVALID_ASSIGNMENT_TYPE:
    "At least one assignment type must be selected and not empty.",
  INVALID_DATE_RANGE: "The due date must be later than the assigned date.",
  SERVER_ERROR: "An unexpected server error occurred. Please try again later.",
});

export const assigmentType: Record<string, any> = Object.freeze({
  QUIZ: "quiz",
  WRITING: "writing",
  READING: "reading",
  IMAGE_IDENTIFICATION: "image identification",
  WORD_MATCHING: "word match",
  READING_COMPREHENSION: "reading comprehension",
});

export const notificationsMessages: Record<string, any> = Object.freeze({
  LIST: "Retrieve all the notifications list",
  BULK_UPDATE: "Update all the notifications list by userId",
  NEXT_EVALUATION: "Next EvaluationClass scheduled",
  UPCOMING_CLASSES: "Upcoming classes scheduled",
  ADD_STUDENT: "New Student Added",
  ADD_STUDENT_TRAIL: "Student Added on Trailclass",
  SCHEDULE_CLASS: "Schedule Class",
  RESCHEDULE_REQUEST: "Reschedule Requested",
  ADD_TEACHER: "New Teacher Added",
  TEACHER_RESCHEDULE: "Teacher reschedule requestedx`",
  RESCHEDULE_REASON: "Reason for Reschedule",
  LIVE_CLASS: "Live class Updated",
  SUBMIT_FEEDBACK: "FeedBack Submitted",
  ASSIGN_ASSIGNMENT: "Assignment Assigned",
  ASSIGNMENT_COMPLETED: "Assignment Completed",
  PAYMENT_ALERT: "Payment Status Updated",
  UPCOMING_TASK: "Upcoming Task Alert",
  TRAILCLASS_STATUS: "Trailclass status Updated",
  LIVE_CLASS_FEEDBACK: "Live class Feedback Updated",
  ADD_APPLICANT: "New Applicant Added",
  APPLICATION_STATUS: "Application Status updated",
  ADD_MEETING: "New Meeting Added",
  WEEKLY_MEETING: "Weekely Meeting",
  ADD_TEACHER_FOR_MEETING: "New Teacher added on Meeting",
  ADD_TRAILCLASS_REQUEST: "Trailclass Request Added",
  PAUSE_CLASS: "Class paused",
  RESUME_CLASS: "Class Resumed",
  ADD_STAFF: "New staffaddded",
  ADD_COURSE: "New course added",
  ADD_KNOWLEDGEBASE: "New knowledgebase Added",
  ADD_ASSIGNMENT: "New Assignment Added",
  ADD_PACKAGE: "New Package Added",
  ADD_MEETING_TRAINING: "New Meeting and Training Added",
  NEW_INVOICE: "New Invoice Added",
  ROLE_ACCESS: "Roll access",
});

export const notificationStatus: Record<string, any> = Object.freeze({
  SEEN: "Seen",
  UN_SEEN: "Unseen",
});

export const roleAccess: Record<string, string> = Object.freeze({
  LIST: "Retrieve all the users list",
  BYID: "Retrieve user details by userId",
  CREATE: "Create a new user",
  UPDATE: "Update a existing user",
  DELETE: "Delete user by userId",
  BULK_DELETE: "Bulk Delete users by userIds",
  USER_NOT_FOUND: "Your account is not found or active, contact admin",
  ENCRYPT_PASSWORD_ERROR: "Password must be an encrypted value",
  USER_PROFILE_INVALID_FILE_TYPE:
    "Invalid file type. Only .png , .jpg or jpeg files are allowed.",
});

export const otherEmployeesMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all the employee list",
  BYID: "Retrieve employee details by employeeId",
  CREATE: "Create a new employee",
  UPDATE: "Update a existing employee",
  DELETE: "Delete employee by employeeId",
  BULK_DELETE: "Bulk Delete employee by employeeIds",
  USER_NOT_FOUND: "Your account is not found or active, contact admin",
  ENCRYPT_PASSWORD_ERROR: "Password must be an encrypted value",
  USER_PROFILE_INVALID_FILE_TYPE:
    "Invalid file type. Only .png , .jpg or jpeg files are allowed.",
});
export const addAminMeetingMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all meetings",
  BYID: "Retrieve meeting details by meetingId",
  CREATE: "Create a new meeting",
  UPDATE: "Update an existing meeting",
  DELETE: "Delete a meeting by meetingId",
  BULK_DELETE: "Bulk delete meetings by meetingIds",
  USER_NOT_FOUND: "User not found or inactive, contact admin",
  INVALID_DATE_FORMAT: "Invalid date format. Please provide a valid date.",
  INVALID_TIME_FORMAT: "Invalid time format. Please use HH:MM format.",
  MEETING_TITLE_REQUIRED: "Meeting title is required",
  MEETING_DATE_REQUIRED: "Meeting date is required",
  MEETING_TIME_REQUIRED: "Meeting start and end time are required",
  TEACHER_REQUIRED: "At least one teacher must be assigned",
  INVALID_STATUS: "Invalid meeting status",
});

export const addKnowledgeBaseMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all meetings",
  BYID: "Retrieve meeting details by meetingId",
  CREATE: "Create a new meeting",
  UPDATE: "Update an existing meeting",
  DELETE: "Delete a meeting by meetingId",
  BULK_DELETE: "Bulk delete meetings by meetingIds",
  USER_NOT_FOUND: "User not found or inactive, contact admin",
  INVALID_DATE_FORMAT: "Invalid date format. Please provide a valid date.",
  INVALID_TIME_FORMAT: "Invalid time format. Please use HH:MM format.",
  COURSE_TITLE_REQUIRED: "Course title is required",
});

export const uploadedFormat: Record<string, any> = Object.freeze({
  PDF: "Pdf",
  VIDEO: "Video",
});

export const leaveStatus: Record<string, any> = Object.freeze({
  PAID: "PAID",
  CASUAL: "CASUAL",
  SICK: "SICK",
});

export const leave: Record<string, any> = Object.freeze({
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WAITINGLIST: "WAITINGLIST",
});

export const leaveRequestMessages: Record<string, string> = Object.freeze({
  LIST: "Retrieve all leave requests",
  BYID: "Retrieve leave request details by request ID",
  CREATE: "Create a new leave request",
  UPDATE: "Update an existing leave request",
  DELETE: "Delete a leave request by ID",
  BULK_DELETE: "Bulk delete leave requests by IDs",
  APPROVE: "Approve a leave request",
  REJECT: "Reject a leave request",
  USER_NOT_FOUND: "Employee not found or inactive. Please contact admin",
  ADMIN_NOT_FOUND: "Admin not found or unauthorized to approve",
  INVALID_DATE_FORMAT: "Invalid date format. Please use YYYY-MM-DD",
  INVALID_LEAVE_TYPE:
    "Invalid leave type. Accepted values are PAID, CASUAL, or SICK",
  INSUFFICIENT_LEAVE_BALANCE:
    "Insufficient leave balance for the requested period",
  LEAVE_QUOTA_EXCEEDED: "Monthly leave quota exceeded",
  FROM_DATE_REQUIRED: "From date is required",
  TO_DATE_REQUIRED: "To date is required",
  REASON_REQUIRED: "Reason for leave is required",
});
export const syncJob: Record<string, any> = Object.freeze({
  ZOHO_RECRUIT: "Please connect to the Zoho Recruit",
  SYNC_JOB: "Sync jobs from the ATS integrations",
  AUTHORIZATION_CODE: "authorization_code",
  REFRESH_TOKEN: "refresh_token",
  JOB_OPENING_STATUS: [
    "In-progress",
    "On-Hold",
    "Filled",
    "Cancelled",
    "Declined",
    "Inactive",
    "Waiting for approval",
    "Submitted by client",
  ],
  ADDITIONAL_DETAILS: ["workExperience", "salary", "requiredskills"],
  JOB_SYNCED: "Job synced Successfully",
  UPDATED: "job updated from Other Applications- Zoho Recurit.",
  CREATED: "job imported from Other Applications- Zoho Recruit.",
  INVALID_ACCESS_TOKEN: "Invalid access token",
  ENDPOINT_NOT_FOUND: "Endpoint not found",
  API_REQUEST_FAILED: "API request failed:",
  UNEXPECTED_ERROR: "An unexpected error occurred",
  CONTENT_TYPE: [
    "Bearer",
    "application/json",
    "application/x-www-form-urlencoded",
  ],
});

export const subscriptionInvoiceMessages = {
  // Actions
  CREATE: "Create Subscription Invoice",
  GET_ALL: "Get Subscription Invoices",
  GET_BY_ID: "Get Subscription Invoice By Id",
  UPDATE: "Update Subscription Invoice",
  DELETE: "Delete Subscription Invoice",
  GET_DASHBOARD_COUNT: "Get Subscription Invoice Dashboard Count",

  // Success Responses
  CREATE_SUCCESS: "Subscription Invoice created successfully.",
  UPDATE_SUCCESS: "Subscription Invoice updated successfully.",
  DELETE_SUCCESS: "Subscription Invoice deleted successfully.",
  FETCH_SUCCESS: "Subscription Invoice fetched successfully.",
  FETCH_ALL_SUCCESS: "Subscription Invoices fetched successfully.",
  FETCH_DASHBOARD_COUNT_SUCCESS:
    "Subscription Invoice dashboard statistics fetched successfully.",

  // Errors
  TENANT_NOT_FOUND: "Tenant not found.",
  INVOICE_NOT_FOUND: "Subscription Invoice not found.",
  SUBSCRIPTION_PLAN_NOT_FOUND: "Subscription Plan not found.",
  INVALID_DUE_DATE: "Due Date should be greater than or equal to Invoice Date.",
  INVALID_PAYMENT_TERMS: "Payment Terms should be a non-negative number.",
  INVALID_REMINDER_DATE:
    "Next Reminder Date should be greater than or equal to Invoice Date and Due Date.",
  TENANT_SUBSCRIPTION_NOT_FOUND: "Tenant Subscription not found.",
  DUPLICATE_INVOICE: "Invoice number already exists.",
  INVALID_ATTACHMENT_URL: "Invalid Attachment URL.",
  BILLING_PERIOD_NOT_FOUND: "Billing Period not found.",
};

export const customServiceInvoiceMessages = {
  // Actions
  CREATE: "Create Custom Service Invoice",
  GET_BY_ID: "Get Custom Service Invoice By Id",
  CREATE_PAYMENT: "Create Custom Service Invoice Payment",
  SEND: "Send Custom Service Invoice",

  // Success Responses
  CREATE_SUCCESS: "Custom Service Invoice created successfully.",
  FETCH_SUCCESS: "Custom Service Invoice fetched successfully.",
  CREATE_PAYMENT_INTENT_SUCCESS: "Payment Intent created successfully.",
  CONFIRM_PAYMENT_SUCCESS: "Payment confirmed successfully.",
  SEND_SUCCESS: "Custom Service Invoice sent successfully.",

  // Errors
  TENANT_NOT_FOUND: "Tenant not found.",
  SUBSCRIPTION_NOT_FOUND: "Tenant Subscription not found.",
  INVOICE_NOT_FOUND: "Custom Service Invoice not found.",
  DUPLICATE_INVOICE: "Invoice number already exists.",
  INVALID_DUE_DATE: "Due Date should be greater than or equal to Invoice Date.",
  INVALID_ATTACHMENT_URL: "Invalid Attachment URL.",
  INVOICE_ALREADY_PAID: "Invoice has already been paid.",
  PAYMENT_NOT_FOUND: "Payment not found.",
  EMAIL_TEMPLATE_NOT_FOUND: "Custom Service Invoice email template not found.",
  TENANT_EMAIL_NOT_FOUND: "Tenant email not found.",
  EMAIL_SEND_FAILED: "Failed to send Custom Service Invoice email.",
  VALIDATION_FAILED: "Validation Failed",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
};

export const subscriptionTrialMessages = {
  // Actions
  CREATE: "Create Subscription Trial",
  GET_ALL: "Get Subscription Trials",
  GET_BY_ID: "Get Subscription Trial By Id",
  UPDATE: "Update Subscription Trial",
  DELETE: "Delete Subscription Trial",
  GET_DASHBOARD_COUNT: "Get Subscription Trial Dashboard Count",

  // Success Responses
  CREATE_SUCCESS: "Subscription Trial created successfully.",
  UPDATE_SUCCESS: "Subscription Trial updated successfully.",
  DELETE_SUCCESS: "Subscription Trial deleted successfully.",
  FETCH_SUCCESS: "Subscription Trial fetched successfully.",
  FETCH_ALL_SUCCESS: "Subscription Trials fetched successfully.",
  GET_DASHBOARD_COUNT_SUCCESS:
    "Subscription Trial dashboard statistics fetched successfully.",

  // Errors
  TRIAL_NOT_FOUND: "Subscription Trial not found.",
    TENANT_NOT_FOUND: "Tenant not found.",
  INVALID_DATE_FORMAT: "Invalid date format. Please provide a valid date.",
  VALIDATION_FAILED: "Validation failed. Please check the input data.",
  STATUS_UNCHANGED: "Status is unchanged. Please provide a different status.",
  INVALID_DATE_LOGIC:
    "Invalid date logic. Trial End Date should be greater than or equal to Trial Start Date.",
};

export const paymentMessages = {
  // Actions
  CREATE_SUBSCRIPTION_INVOICE_PAYMENT: "Create Subscription Invoice Payment",
  CONFIRM_PAYMENT: "Confirm Payment",
  GET_FINANCE_TRANSACTIONS: "Get Finance Transactions",

  // Success Responses
  CREATE_PAYMENT_INTENT_SUCCESS: "Payment Intent created successfully.",
  CONFIRM_PAYMENT_SUCCESS: "Payment confirmed successfully.",
  GET_FINANCE_TRANSACTIONS_SUCCESS:
    "Finance transactions fetched successfully.",

  // Errors
  PAYMENT_INTENT_CREATION_FAILED: "Failed to create payment intent.",
  PAYMENT_CONFIRMATION_FAILED: "Failed to confirm payment.",
  FINANCE_TRANSACTIONS_FETCH_FAILED: "Failed to fetch finance transactions.",
   INVOICE_NOT_FOUND: "Subscription Invoice not found.",
  INVOICE_ALREADY_PAID: "Invoice has already been paid.",
  SUBSCRIPTION_NOT_FOUND: "Tenant Subscription not found.",
  PAYMENT_NOT_FOUND: "Payment not found.",
  VALIDATION_FAILED: "Validation Failed",
  PAYMENT_FAILED: "Payment failed",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  INVALID_BILLING_CYCLE: "Invalid billing cycle",
};


export const billingMessages = {
  // Actions
  CREATE: "Create Billing",
  GET_ALL: "Get Billing List",
  GET_BY_ID: "Get Billing By Id",
  GET_COUNT: "Get Billing Count",

  // Success Responses
  CREATE_SUCCESS: "Billing created successfully",
  GET_ALL_SUCCESS: "Billing list fetched successfully",
  GET_BY_ID_SUCCESS: "Billing details fetched successfully",
  GET_COUNT_SUCCESS: "Billing count fetched successfully",

  // Errors
  BILLING_NOT_FOUND: "Billing record not found",
  INVALID_DATE_FORMAT: "Invalid date format. Please provide a valid date.",
  VALIDATION_FAILED: "Validation Failed",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
};

export const tenantSubscriptionMessages = {
  // Success Responses
  DASHBOARD_FETCH_SUCCESS: "Tenant subscription dashboard fetched successfully.",
  ANALYTICS_CARD_FETCH_SUCCESS:
    "Tenant subscription analytics card fetched successfully.",
  ACTIVITIES_FETCH_SUCCESS:
    "Tenant subscription activities fetched successfully.",
  GROWTH_ANALYTICS_FETCH_SUCCESS:
    "Tenant subscription growth analytics fetched successfully.",

  // Errors
  VALIDATION_FAILED: "Validation Failed",
  DASHBOARD_FETCH_FAILED: "Failed to fetch tenant subscription dashboard.",
  ANALYTICS_CARD_FETCH_FAILED:
    "Failed to fetch tenant subscription analytics card.",
  ACTIVITIES_FETCH_FAILED:
    "Failed to fetch tenant subscription activities.",
  GROWTH_ANALYTICS_FETCH_FAILED:
    "Failed to fetch tenant subscription growth analytics.",
};

export const refundMessages = {
  // Actions
  CREATE_REFUND: "Create Refund Transaction",
  UPDATE_REFUND: "Update Refund Transaction",
  GET_REFUND_TRANSACTIONS: "Get Refund Transactions",
  GET_REFUND_BY_ID: "Get Refund Transaction By Id",
  PROCESS_STRIPE_REFUND: "Process Stripe Refund",
  PROCESS_MANUAL_REFUND: "Process Manual Refund",
  DASHBOARD_CARD_COUNT_FETCH: "Get Refund Dashboard Card Count",

  // Success Responses
  CREATE_REFUND_SUCCESS: "Refund transaction created successfully.",
  UPDATE_REFUND_SUCCESS: "Refund transaction updated successfully.",
  GET_REFUND_TRANSACTIONS_SUCCESS:
    "Refund transactions fetched successfully.",
  GET_REFUND_BY_ID_SUCCESS:
    "Refund transaction details fetched successfully.",
  STRIPE_REFUND_SUCCESS: "Stripe refund processed successfully.",
  MANUAL_REFUND_SUCCESS: "Manual refund processed successfully.",
  DASHBOARD_CARD_COUNT_FETCH_SUCCESS:
    "Refund dashboard card count fetched successfully.",

  // Errors
  REFUND_NOT_FOUND: "Refund transaction not found.",
  REFUND_ALREADY_PROCESSED: "Refund has already been processed.",
  REFUND_CREATION_FAILED: "Failed to create refund transaction.",
  REFUND_UPDATE_FAILED: "Failed to update refund transaction.",
  REFUND_FETCH_FAILED: "Failed to fetch refund transactions.",
  STRIPE_REFUND_FAILED: "Stripe refund failed.",
  MANUAL_REFUND_FAILED: "Manual refund failed.",
  REFUND_REJECTED_BY_ADMIN: "Refund request has been rejected by admin.",
  REFUND_ALREADY_REJECTED: "Refund request has already been rejected.",
  REFUND_ALREADY_SUCCESSFUL: "Refund request has already been approved.",

  INVALID_REFUND_ID: "Invalid Refund Id",
  INVALID_REFUND_STATUS: "Invalid refund status",
  INVALID_REFUND_REQUEST: "Invalid refund request",

  PAYMENT_NOT_FOUND: "Payment not found for this refund.",
  INVOICE_NOT_FOUND: "Invoice not found for this refund.",
  SUBSCRIPTION_NOT_FOUND: "Subscription not found for this refund.",
  PLAN_NOT_FOUND: "Plan not found for this refund.",
  TRANSACTION_NOT_FOUND: "Transaction not found for this refund.",

  VALIDATION_FAILED: "Validation Failed",
  UNAUTHORIZED: "Unauthorized",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
};
