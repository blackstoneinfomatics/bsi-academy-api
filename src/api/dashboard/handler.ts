/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResponseToolkit, Request } from "@hapi/hapi"
import {
  acUpcomingClassList,
  dashboardCardCount,
  dashboardWidgetCounts,
  dashboardWidgetStudentCounts,
  dashboardWidgetSupervisorCounts,
  dashboardWidgetTeacherCounts,
  getTeacherAttendanceGet,
  totalClassCount,
  totalTrialRequestCount,
} from "../../operations/dashboard"

export default {
  // Get widget counts for academic coach
  async getWidgetsCount(req: Request, h: ResponseToolkit) {
    try {
      const widgetCounts = await dashboardWidgetCounts(req.query.academicCoachId as string)
      return h.response(widgetCounts).code(200)
    } catch (error) {
      console.error("Error in getWidgetsCount:", error)
      return h.response({ error: "Failed to fetch widget counts." }).code(500)
    }
  },

  // Teacher dashboard counts endpoint
  async getTeacherDashboardCounts(req: Request, h: ResponseToolkit) {
    try {
      const teacherId = req.query.teacherId as string
      if (!teacherId) {
        return h.response({ error: "Teacher ID is required" }).code(400)
      }

      const result = await dashboardWidgetTeacherCounts(teacherId)
      return h.response(result).code(200)
    } catch (error) {
      console.error("Error in getTeacherDashboardCounts:", error)
      return h.response({ error: "Failed to fetch teacher dashboard data" }).code(500)
    }
  },

  // Get widget counts for students
  async getWidgetStudentCount(req: Request, h: ResponseToolkit) {
    try {
          const { studentId, courseName } = req.query;
      const studentCounts = await dashboardWidgetStudentCounts(studentId as string,
      courseName as string)
      return h.response(studentCounts).code(200)
    } catch (error) {
      console.error("Error in getWidgetStudentCount:", error)
      return h.response({ error: "Failed to fetch student widget counts." }).code(500)
    }
  },

  // Alternative teacher widget counts endpoint
  async getWidgetTeacherCount(req: Request, h: ResponseToolkit) {
    try {
      const teacherId = req.headers["teacher"] || req.query.teacherId
      if (!teacherId) {
        return h.response({ error: "Teacher ID is required" }).code(400)
      }
      const teacherCounts = await dashboardWidgetTeacherCounts(teacherId as string)
      return h.response(teacherCounts).code(200)
    } catch (error) {
      console.error("Error in getWidgetTeacherCount:", error)
      return h.response({ error: "Failed to fetch teacher widget counts." }).code(500)
    }
  },

  async getWidgetSupervisorCount(req: Request, h: ResponseToolkit) {
    try {
      const supervisorCounts = await dashboardWidgetSupervisorCounts()
      return h.response(supervisorCounts).code(200)
    } catch (error) {
      console.error("Error in getWidgetStudentCount:", error)
      return h.response({ error: "Failed to fetch student widget counts." }).code(500)
    }
  },

  async getAdminCount(req: Request, h: ResponseToolkit) {
    return await dashboardCardCount()
  },

  async getTotalTrialRequest(req: Request, h: ResponseToolkit) {
    return await totalTrialRequestCount()
  },

  async getTotalClass(req: Request, h: ResponseToolkit) {
    return await totalClassCount(req.query.dateRange as string)
  },

  async getAcUpcomingClass(req: Request, h: ResponseToolkit) {
    return await acUpcomingClassList(req.query.academicCoachId as string)
  },

  async getTeacherAttendance(req: Request){
 return await getTeacherAttendanceGet()
  }
}
