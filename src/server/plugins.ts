
import systemLifeCycle from "../life_cycle/index";
import usersAPI from "../api/users/router";
import authAPI from "../api/auth/router"; 
import studentAPI from "../api/student/router"
import shiftScheduleAPI from "../api/shiftSchedule/router"
import errorHandler from "../errors";
import JWTAuth from "../plugins/jwt_auth";
import evaluationAPI from "../api/evaluation/router";
import subscriptionAPI from "../api/subscriptions/router";
import meetingScheduleAPI from "../api/meetingSchedule/router";
import dashboardAPI from "../api/dashboard/router";
import paymentAPI from "../api/payment/router";
import classScheduleAPI from "../api/classShedule/router";
import alstudentsAPI from "../api/alstudents/router"
import assignmentAPI from "../api/assignment/router";
import studentInvoiceAPI from "../api/invoice/router"
import messageAPI from "../api/message/router";
import feedbackAPI  from "../api/feedback/router";
import recruitmentAPI from "../api/recruitment/router";
import addMeetingAPI from "../api/addMeeting/router";
import supervisorfeedbackAPI from "../api/supervisorfeedback/router";
import notificationAPI from "../api/notification/router";
import roleAccessAPI from "../api/roleAccess/router";
import otheremployeeAPI from "../api/otherEmployee/router"
import adminMeeting from "../api/adminMeeting/router"
import realtimemessageAPI from "../api/realtimemessage/router";
import courseAPI from "../api/course/router";
import employeeWagesAPI from "../api/empwege/router";
import expenseAPI from "../api/expenses/router";
import KnowledgeBaseAPI from "../api/knowledgebase/router";
import salaryandwagesAPI from "../api/salarywages/router";
import packageAPI from "../api/package/router"
import leaveRequestAPI from "../api/leaveRequest/router";
import TeachermeetingAPI from "../api/teacherMeeting/router"
import Level from "../api/level/router"; 
import AdminAssignment from "../api/adminAssignment/router";
import fileUplocadAPI from "../api/fileUpload/router";
import  teanantAPI  from "../api/tenant/router";
import subscriptionSAASAPI from "../api/subscription_SAAS/router";
import plansAPI from "../api/plan/router";


export const appPlugins = [
  {
    plugin: systemLifeCycle,
  },
  {
    plugin: errorHandler,
  },
  {
    plugin: JWTAuth,
  },
    {
    plugin: authAPI,
  },
  {
    plugin: usersAPI,
  },
  {
    plugin: studentAPI,
  },
  {
    plugin: evaluationAPI,
  },
  {
    plugin: shiftScheduleAPI,
  },
  {
    plugin: subscriptionAPI,
  },
  {
    plugin: meetingScheduleAPI,
  },
  {
    plugin: dashboardAPI,
  },
  {
    plugin: paymentAPI,
  },
  {
    plugin: classScheduleAPI,
  },
  {
    plugin: alstudentsAPI,
  },
  {
    plugin: assignmentAPI,
  },
  {
    plugin: studentInvoiceAPI,

  },
{
    plugin: messageAPI,
  },
  {
    plugin: feedbackAPI,
  },
  {
    plugin: recruitmentAPI,
  },
  {
    plugin: addMeetingAPI,
  },
  {
    plugin: supervisorfeedbackAPI,
  },
  {
    plugin: notificationAPI,
  },
  {
    plugin: roleAccessAPI,
  },
  {
    plugin: otheremployeeAPI,
  },
  {
    plugin: adminMeeting,
  },
  {
    plugin:realtimemessageAPI,
  },
  {
    plugin:courseAPI ,
  },
  {
    plugin:employeeWagesAPI,
  },
  {
    plugin:expenseAPI,
  },
  
  {
    plugin:KnowledgeBaseAPI,
  },
  {
    plugin:salaryandwagesAPI,
  },
  {
    plugin:packageAPI,
  },
  {
   plugin:leaveRequestAPI,
  },
  {
    plugin:TeachermeetingAPI,
  },
  {
    plugin:Level,
  },
  {
    plugin:AdminAssignment,
  },
   {
    plugin:fileUplocadAPI,
  },
   {
    plugin: teanantAPI,
  },
  {
    plugin:subscriptionSAASAPI,
  },
  {
    plugin:plansAPI,
  }
];
