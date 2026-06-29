import { Server, ServerRoute } from "@hapi/hapi";
import { ClassSchedulesMessages, evaluationMessages } from "../../config/messages";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
    // Register all routes for this unit
    const routes: ServerRoute[] = [
     
      // {
      //   method: "PUT",
      //   path: "/createclassschedule/{studentId}",
      //   options: {
      //    handler: handler.createandUpdateSchedule,
      //    description: evaluationMessages.UPDATE,
      //    tags: ["api", "evaluation"],
      // },
      // },
      
      {
        method: "GET",
        path: "/classShedule",
        options: {
         handler: handler.getAllClassShedule,
         description: ClassSchedulesMessages.LIST,
         tags: ["api", "classShedule"],
      },
      },

      {
        method: "GET",
        path: "/classShedule/{classSheduleId}",
        options: {
         handler: handler.getAllClassSheduleById,
         description: ClassSchedulesMessages.BYID,
         tags: ["api", "classShedule"],
         auth: {
          strategies: ["jwt"],
        }, },
      },

      {
        method: "PUT",
        path: "/classShedule/requestReshedule",
        options: {
         handler: handler.requestReschedule,
         description: evaluationMessages.UPDATE,
         tags: ["api", "classShedule"],
         auth: {
          strategies: ["jwt"],
        }, 
      },  
      },

      {
        method: "GET",
        path: "/classShedule/students",
        options: {
          handler: handler.getClassesForStudent,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          },  },
      },

      {
        method: "GET",
        path: "/classShedule/teacher",
        options: {
          handler: handler.getClassesForTeacher,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          }, },
      },

      {
        method: "GET",
        path: "/teacher-student-count",
        options: {
        handler: handler.getTeacherStudentCount,
        description: ClassSchedulesMessages.LIST,
        tags: ["api", "classShedule"],
        auth: {
          strategies: ["jwt"],
        },
       }
      },
      {
        method: "PUT",
        path: "/classShedule/{classSheduleId}",
        options: {
         handler: handler.updateClassSheduleById,
         description: evaluationMessages.UPDATE,
         tags: ["api", "classShedule"],
         auth: {
          strategies: ["jwt"],
        }, },  
      },

      {
        method: "GET",
        path: "/classShedule/totalhours",
        options: {
         handler: handler.totalhours,
         description: evaluationMessages.GET,
         tags: ["api", "classShedule"],
         auth: {
          strategies: ["jwt"],
        }, },  
      },
      {
        method: "GET",
        path: "/classShedule/activity",
        options: {
         handler: handler.teachingActivity,
         description: evaluationMessages.GET,
         tags: ["api", "classShedule"],
         auth: {
          strategies: ["jwt"],
        },  },  
      },
      {
        method: "PUT",
        path: "/classShedule/teacherreschedule/{classSheduleId}",
        options: {
         handler: handler.updateteacherreschedule,
         description: evaluationMessages.UPDATE,
         tags: ["api", "classShedule"],
         auth: {
          strategies: ["jwt"],
        }, },  
      },
      {
        method: "GET",
        path: "/classShedule/studentsclasscount",
        options: {
          handler: handler.getStudentClassesCount,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          },  },
      },

      {
        method: "GET",
        path: "/classShedule/totalclasses",
        options: {
          handler: handler.getTotalClassess,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          }, },
      },

      {
        method: "GET",
        path: "/classShedule/classstatuscount",
        options: {
          handler: handler.getClassesStatusCount,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          }, },
      },
      {
        method: "GET",
        path: "/classShedule/classwisecount",
        options: {
          handler: handler.getClassesWiseCount,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          }, },
      },
      {
        method: "GET",
        path: "/classShedule/teacher/list",
        options: {
          handler: handler.getTeacherStudentList,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          }, },
      },
  {
        method: "GET",
        path: "/classstudentsattendancecounts",
        options: {
          handler: handler.getStudentsAttendanceCounts,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          }, },
      },

      {
  method: "GET",
  path: "/studentattendanceperformance",
  options: {
    handler: handler.getStudentAttendancePerformance,
    description: "Get student attendance & performance summary",
    tags: ["api", "classShedule"],
    auth: {
      strategies: ["jwt"],
    },
  },
},


        {
        method: "GET",
        path: "/analyticscardcount",
        options: {
          handler: handler.getAnalyticscardcount,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          },
         },
      },
      
        {
        method: "POST",
        path: "/groupclassschedule/bulkcreate",
        options: {
         handler: handler.bulkcreateandSchedule,
         description: evaluationMessages.UPDATE,
         tags: ["api", "evaluation"],
      },
      },

        {
        method: "PUT",
        path: "/classShedule/attendanceupdate/{classSheduleId}",
        options: {
         handler: handler.updateClassAttendanceById,
         description: evaluationMessages.UPDATE,
         tags: ["api", "classShedule"],
         auth: {
          strategies: ["jwt"],
        },
       },  
      },
        {
        method: "GET",
        path: "/teacher/earnings",
        options: {
          handler: handler.getTeacherEarnings,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          },
         },
      },

         {
        method: "GET",
        path: "/classShedule/teacher/count",
        options: {
          handler: handler.getClassesCountForTeacher,
          description: ClassSchedulesMessages.LIST,
          tags: ["api", "classShedule"],
          auth: {
            strategies: ["jwt"],
          },
         },
      },

         {
        method: "PUT",
        path: "/groupclassschedule/bulkupdate/{classId}",
        options: {
         handler: handler.bulkUpdateandSchedule,
         description: evaluationMessages.UPDATE,
         tags: ["api", "evaluation"],
      },
      },

      //         {
      //   method: "GET",
      //   path: "/classShedule/teacher/levelgrowth",
      //   options: {
      //     handler: handler.geteacherclassLevelGrowth,
      //     description: ClassSchedulesMessages.LIST,
      //     tags: ["api", "classShedule"],
      //     // auth: {
      //     //   strategies: ["jwt"],
      //     // },
      //    },
      // },

    ];
    server.route(routes);
  };
  export = {
    name: "api-classShedule",
    register,
  };