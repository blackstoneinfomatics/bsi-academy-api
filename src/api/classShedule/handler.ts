import { ResponseToolkit,Request } from "@hapi/hapi";
import classShedule, { zodClassScheduleSchema } from "../../models/classShedule";
import { z } from "zod";
import { ClassSchedulesMessages } from "../../config/messages";
import { isNil } from "lodash";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { notFound } from "@hapi/boom";
import { getAllClassShedule, getAllClassSheduleById, updateClassscheduleById, updateStudentClassSchedule,getClassesForStudent,getClassesForTeacher, getStudentClassHours, teachingActivity, updateteacherreschedule, getStudentClassCount, getTotalClassesCount, getClassesStatusCount, getClassesWiseCount, getStudentList, getTeacherAttendanceSummary, teacherStudentCount, getgetAnalyticscardCalculation, requestReschedule, updateClassAttendanceById, getTeacherTotalEarnings, classesCountForTeacher, teacherClassLevelGrowth, IClassScheduleUpdate, bulkupdateClassAttendanceByClassLink, getStudentAttendanceSummary, getUniqueTeachers} from "../../operations/classschedule";
import { academicAvailableTeachers, academicDashboardTeachersStudentCount, academicStudentReSchedule, academicTeacherStudentList } from "../../kafka/producers/academicProducer";
import AlStudentModule from "../../models/alstudents"
import Evaluation from "../../models/evaluation";
import { Types } from "mongoose";
import { evaluationTeacherSlotBook } from "../../redis/handler/teacherSlotHander";
import { teacherDashboardCardCount } from "../../kafka/producers/teacherProducer";
import alstudents from "../../models/alstudents";
import ClassScheduleModel from "../../models/classShedule"
import moment from "moment";

const createInputValidation = z.object({
    payload: zodClassScheduleSchema.pick({
        teacher: true,
        classDay: true,
        package: true,
        preferedTeacher: true,
        course: true,
        totalHourse: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        scheduleStatus: true,
        studentAttendee:true,
        teacherAttendee: true,
        sessionClassType:true,
        sessionsEndtime:true,
        sessionStarttime:true,
        teacherreschedule:true,
    }).partial()
  });

const getAllClassSheduleInput = z.object({
  query: zodGetAllRecordsQuerySchema.pick({
    id: true,
    studentId:true,
    teacherId:true,
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    filterValues: true,
  }),
});

const updateClassScheduleInputValidation = z.object({
  payload: zodClassScheduleSchema.pick({
    student: true,
    teacher: true,
    classDay: true,
    package: true,
    preferedTeacher: true,
    // course: true,
    totalHourse: true,
    startDate: true,
    endDate: true,
    startTime: true,
    endTime: true,
    scheduleStatus: true,
    sessionClassType:true,
    sessionStarttime:true,
    sessionsEndtime:true,
}).partial()
})

const updateClassAttendanceInputValidation = z.object({
    payload: zodClassScheduleSchema.pick({
    student: true,
    teacher: true,
    totalHourse: true,
    scheduleStatus: true,
    sessionClassType:true,
    sessionStarttime:true,
    sessionsEndtime:true,
    sessionStatus : true,
    lastUpdatedDate:true,
    studentAttendee: true,
    teacherAttendee: true,
    }).partial()
    })

export default {
// async createandUpdateSchedule(req: Request, h: ResponseToolkit){
//     console.log("Raw Request Payload:", req.payload);
//     const { payload } = createInputValidation.parse({
//       payload: req.payload,
//    });
//    console.log("Parsed Payload:", payload);

//    const classDayValues = payload.classDay?.map((day: { value: string; label: string }) => day.value);
//    const startTimeValues = payload.startTime?.map((time: { value: string; label: string }) => time.value);
//    const endTimeValues = payload.endTime?.map((time: { value: string; label: string }) => time.value);

//    return await updateStudentClassSchedule(String(req.params.studentId),{ 
//     teacher :{
//       teacherId: payload.teacher?.teacherId ?? "",
//       teacherName: payload.teacher?.teacherName ?? "",
//       teacherEmail: payload.teacher?.teacherEmail ?? ""
//     } ,
//     classDay :classDayValues,
//     package: payload.package,
//     preferedTeacher: payload.preferedTeacher,
//     // course:payload.course,
//      sessionClassType: payload.sessionClassType || "",
//      sessionStarttime: payload.sessionStarttime || "",
//      sessionsEndtime: payload?.sessionsEndtime || "",
//      sessionStatus:"NotCompleted",
//      totalHourse: payload.totalHourse,
//     startDate: payload.startDate,
//     endDate: payload.endDate,
//     startTime: startTimeValues,
//     endTime: endTimeValues,
//     scheduleStatus: payload.scheduleStatus,
//     studentAttendee: payload.studentAttendee,
//     teacherAttendee:payload.teacherAttendee,
   
//      }
//     );


//   }
// ,


async getClassesForStudent(req: Request, h: ResponseToolkit) {
  try {
    // Parse and validate the query object
    const { query } = getAllClassSheduleInput.parse({
      query: {
        ...req.query,
        filterValues: req.query?.filterValues
          ? JSON.parse(req.query.filterValues as string)
          : {},
      },
    });

    return getClassesForStudent(query); // Ensure a valid return statement in the try block
  } catch (error) {
    // Handle the error appropriately
    console.error("Error in getClassesForStudent handler:", error);
    throw error; // Re-throw the error or handle it based on your application's requirement
  }
}
,




async getClassesForTeacher(req: Request, h: ResponseToolkit) {
  try {
    // Parse and validate the query object
    const { query } = getAllClassSheduleInput.parse({
      query: {
        ...req.query,
        filterValues: req.query?.filterValues
          ? JSON.parse(req.query.filterValues as string)
          : {},
      },
    });

    // ✅ Correctly call the database function (not the handler itself)
    return await getClassesForTeacher(query); // Call the actual function fetching data
  } catch (error) {
    console.error("Error in getClassesForTeacher handler:", error);
    throw error; // Handle the error appropriately
  }
}
,

async getAllClassShedule(req: Request, h: ResponseToolkit) {
  let filterValues: any = {};

  // 1. Parse filterValues from query if present as a string
  if (typeof req.query.filterValues === "string") {
    try {
      filterValues = JSON.parse(req.query.filterValues);
    } catch {
      filterValues = {};
    }
  } else {
    filterValues = {};

    // --- Normalize course filter ---
    if (req.query.course) {
      filterValues.course = {
        courseName: Array.isArray(req.query.course)
          ? req.query.course
          : [req.query.course]
      };
    }

    // --- Normalize sessionClassType filter ---
    if (req.query.sessionClassType) {
      filterValues.sessionClassType = Array.isArray(req.query.sessionClassType)
        ? req.query.sessionClassType
        : [req.query.sessionClassType];
    }

    // --- Normalize scheduleStatus filter ---
    if (req.query.scheduleStatus) {
      filterValues.scheduleStatus = Array.isArray(req.query.scheduleStatus)
        ? req.query.scheduleStatus
        : [req.query.scheduleStatus];
    }

    // --- Normalize startTime filter ---
    if (req.query.startTime) {
      filterValues.startTime = Array.isArray(req.query.startTime)
        ? req.query.startTime
        : [req.query.startTime];
    }

    // --- Normalize dateRange filter ---
    if (req.query["dateRange.from"] && req.query["dateRange.to"]) {
      filterValues.dateRange = {
        from: req.query["dateRange.from"],
        to: req.query["dateRange.to"]
      };
    }
  }

  // 3. Build the full query object for validation
  const queryObj = {
    ...req.query,
    filterValues,
  };

  // 4. Validate the query parameters using Zod
  const { query } = getAllClassSheduleInput.parse({ query: queryObj });

  // 5. Ensure offset and limit are strings or null
  const queryForService = {
    ...query,
    offset:
      query.offset !== null && query.offset !== undefined
        ? String(query.offset)
        : null,
    limit:
      query.limit !== null && query.limit !== undefined
        ? String(query.limit)
        : null,
  };

  // 6. Call the service with the normalized and validated query
  return getAllClassShedule(queryForService);
},  // Handler for getting student by ID
  async getAllClassSheduleById(req: Request, h: ResponseToolkit) {
    try {
      // Fetch the student by ID
      const result = await getAllClassSheduleById(String(req.params.classSheduleId));

      // Handle not found case
      if (isNil(result)) {
        return h
          .response({ message: ClassSchedulesMessages.NOT_FOUND })
          .code(404);
      }

      // const getLevel = await alstudents
      //   .findOne({ _id: result.student.studentId })
      //   .exec();

      // const response = { result, level: getLevel?.level };
      // Return the found student
      // Return the found student
      return h.response(result).code(200);
    } catch (error) {
      // Handle errors (unexpected or other)
      return h
        .response({ error })
        .code(500);
    }
  },

  async updateClassSheduleById(req: Request, h: ResponseToolkit){

    const { payload } = updateClassScheduleInputValidation.parse({
      payload: req.payload
    });

    const classSchedule = await ClassScheduleModel.findById(req.params.classSheduleId).lean();
if (!classSchedule) {
  return notFound(ClassSchedulesMessages.CANDIDATE_NOT_FOUND);
}
    // 🧩 2. Read existing session start/end arrays (or make empty array)
let existingStart = [];
let existingEnd = [];
    const rawPayload = req.payload  as any;
try {
 existingStart = JSON.parse(classSchedule.student?.studnetSessionStart || "[]");
 existingEnd = JSON.parse(classSchedule.student?.studnetSessionEnd || "[]");
} catch (e) {
  existingStart = [];
  existingEnd = [];
}

existingStart.push(rawPayload.student.studnetSessionStart);
existingEnd.push(rawPayload.student.studnetSessionEnd);


    console.log("Payload received:", req.payload);
    const classDayValues = payload.classDay?.map((day: { value: string; label: string }) => day.value);
    const startTimeValues = payload.startTime?.map((time: { value: string; label: string }) => time.value);
    const endTimeValues = payload.endTime?.map((time: { value: string; label: string }) => time.value);
    
    const result = await updateClassscheduleById(String(req.params.classSheduleId), {
      student: {
        id: payload.student?.id?? "",
        studentId: payload.student?.studentId ?? "",
        studentFirstName: payload.student?.studentFirstName ?? "",
        studentLastName: payload.student?.studentLastName ?? "",
        studentEmail: payload.student?.studentEmail ?? "",
        gender: payload.student?.gender ?? "",
        level: payload.student?.level ?? "",
       studnetSessionStart: JSON.stringify(existingStart),
       studnetSessionEnd: JSON.stringify(existingEnd),
      },
      teacher: {
        teacherId: payload.teacher?.teacherId ?? "",
        teacherName: payload.teacher?.teacherName ?? "",
        teacherEmail: payload.teacher?.teacherEmail ?? "",
       teacherSessionStart: rawPayload.teacher?.teacherSessionStart,
       teacherSessionEnd: rawPayload.teacher?.teacherSessionEnd
      },
      classDay: classDayValues,
      package: payload.package,
      preferedTeacher: payload.preferedTeacher,
      totalHourse: payload.totalHourse,
      startDate: payload.startDate,
      endDate: payload.endDate,
      startTime: startTimeValues,
      endTime: endTimeValues,
      scheduleStatus: payload.scheduleStatus,
    
      // ✅ Add these:
      sessionStarttime: "",
      sessionsEndtime: "",
      sessionClassType: payload.sessionClassType,
      sessionStatus:"NotCompleted"

    });
    
    if (isNil(result)) {
      return notFound(ClassSchedulesMessages.CANDIDATE_NOT_FOUND);
    }
    if(result){
      await academicStudentReSchedule({data : result});
       await academicAvailableTeachers({ event : "update" , data :{ date :payload.startDate , teacherId :payload.teacher?.teacherId , from  : startTimeValues , to : endTimeValues}}); 
        if(payload.teacher?.teacherId){
               await teacherDashboardCardCount({sender : payload.teacher?.teacherId });
            }
      }

    return result;
   },

async getTeacherStudentCount(req: Request, h: ResponseToolkit) {
  try {
    console.log("Query parameters received:", req.query);


    

    // STEP 1: get aggregated teacher list (your existing aggregation)
    const teachers = await getUniqueTeachers();

    // STEP 2: For each teacher -> fetch individual trial & joined students
    const enrichedTeachers = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherId = teacher.teacherId;

  
        const trialCount = await Evaluation.countDocuments({
          "teacher.teacherId": teacherId,
        });

        // Joined students
        const joinedCount = await Evaluation.countDocuments({
          "teacher.teacherId": teacherId,
          trialClassStatus: "COMPLETED",
        });

        return {
          ...teacher,
          trialClassCount: trialCount,
          joinedStudentsCount: joinedCount,
        };
      })
    );

    return h.response({
      success: true,
      data: enrichedTeachers,
    }).code(200);

  } catch (error) {
    console.error("Error fetching teacher-student count:", error);
    return h.response({ success: false, message: "Internal Server Error" }).code(500);
  }
},


async totalhours(req: Request, h: ResponseToolkit) {
  try {
    // Parse and validate request query
    const parsedQuery = getAllClassSheduleInput.parse({
      query: {
        ...((req as any).query), // Casting req.query to 'any' for flexibility
        filterValues: (() => {
          try {
            return req.query?.filterValues
              ? JSON.parse(req.query.filterValues as string)
              : {};
          } catch {
            throw new Error("Invalid filterValues JSON format.");
          }
        })(),
      },
    });

    const { id } = parsedQuery.query;

    if (!id) {
      throw new Error("Student ID is required.");
    }

    // Fetch student class schedule and calculate percentages
    const result = await getStudentClassHours(id);

    // Return the response
    return h.response(result).code(200);
  } catch (error) {
    console.error("Error in totalhours:", error);

    // Handle errors properly
    return h.response({ error }).code(400);
  }
},


async teachingActivity(req: Request, h: ResponseToolkit) {
  try {
    // Parse and validate request query
    const parsedQuery = getAllClassSheduleInput.parse({
      query: {
        ...((req as any).query), // Casting req.query to 'any' for flexibility
        filterValues: (() => {
          try {
            return req.query?.filterValues
              ? JSON.parse(req.query.filterValues as string)
              : {};
          } catch {
            throw new Error("Invalid filterValues JSON format.");
          }
        })(),
      },
    });

    const { id } = parsedQuery.query;

    if (!id) {
      throw new Error("Student ID is required.");
    }

    // Fetch student class schedule and calculate percentages
    const result = await teachingActivity(id);

    // Return the response
    return h.response(result).code(200);
  } catch (error) {
    console.error("Error in totalhours:", error);

    // Handle errors properly
    return h.response({ error }).code(400);
  }
},

async updateteacherreschedule(req: Request, h: ResponseToolkit){
  console.log("Raw Request Payload:", req.payload);
  const { payload } = createInputValidation.parse({
    payload: req.payload,
 });
 console.log("Parsed Payload:", payload);
    const rawPayload = req.payload  as any;

 const classDayValues = payload.classDay?.map((day: { value: string; label: string }) => day.value);
 const startTimeValues = payload.startTime?.map((time: { value: string; label: string }) => time.value);
 const endTimeValues = payload.endTime?.map((time: { value: string; label: string }) => time.value);


 const classReschudle = await updateteacherreschedule(String(req.params.classSheduleId),{ 
  teacher :{
    teacherId: payload.teacher?.teacherId ?? "",
    teacherName: payload.teacher?.teacherName ?? "",
    teacherEmail: payload.teacher?.teacherEmail ?? "",
   teacherSessionStart: rawPayload.teacher?.teacherSessionStart,
   teacherSessionEnd: rawPayload.teacher?.teacherSessionEnd
  } ,
  classDay :classDayValues,
  package: payload.package,
  preferedTeacher: payload.preferedTeacher,
  // course:payload.course,
   sessionClassType: payload.sessionClassType || "",
   sessionStarttime: payload.sessionStarttime || "",
   sessionsEndtime: payload?.sessionsEndtime || "",
   totalHourse: payload.totalHourse,
  startDate: payload.startDate,
  endDate: payload.endDate,
  startTime: startTimeValues,
  endTime: endTimeValues,
  scheduleStatus: "Reschedule",
  studentAttendee: payload.studentAttendee,
  teacherAttendee:payload.teacherAttendee,
 
   }
  );
  if(classReschudle){
    await academicAvailableTeachers({ event : "update" , data :{ date :payload.startDate , teacherId :payload.teacher?.teacherId , from  : startTimeValues , to : endTimeValues}});
    await academicStudentReSchedule({ data: classReschudle });
  }
  return classReschudle;
  
},

async getStudentClassesCount (req: Request, h: ResponseToolkit){
  return await getStudentClassCount(req.query.studentId);
},

async getTotalClassess(req: Request, h: ResponseToolkit){
    return await getTotalClassesCount(req.query.dateRange as string);
  },

   async getClassesStatusCount(req: Request, h: ResponseToolkit){
      return await getClassesStatusCount();
    },

    async getClassesWiseCount(req: Request, h: ResponseToolkit){
      return await getClassesWiseCount();
    },


    async getTeacherStudentList(req: Request, h: ResponseToolkit) {
      try {
        // Parse and validate the query object
      
        // ✅ Correctly call the database function (not the handler itself)
        return await getStudentList(req.query.teacherId); // Call the actual function fetching data
      } catch (error) {
        console.error("Error in getClassesForTeacher handler:", error);
        throw error; // Handle the error appropriately
      }
    },
    
async getStudentsAttendanceCounts(req: Request, h: ResponseToolkit) {
  try {
    const teacherId = req.query.teacherId as string;

    if (!teacherId) {
      return h.response({ message: "Missing teacherId in query" }).code(400);
    }

    const data = await getTeacherAttendanceSummary(teacherId);
    return h.response(data).code(200);
  } catch (error) {
    console.error("Error in getStudentsAttendanceCounts handler:", error);
    return h.response({ message: "Internal Server Error" }).code(500);
  }
},

//student class level growth

async getStudentAttendancePerformance(req: Request, h: ResponseToolkit) {
  try {
    // 🔹 Expecting alstudent._id as studentId in query
    const studentId = req.query.studentId as string;
    console.log("alstudent._id received:", studentId);

    if (!studentId) {
      return h.response({ message: "Missing studentId in query" }).code(400);
    }

    const data = await getStudentAttendanceSummary(studentId);
    return h.response(data).code(200);
  } catch (error) {
    console.error("Error in getStudentAttendancePerformance handler:", error);
    return h.response({ message: "Internal Server Error" }).code(500);
  }
},


//analytics card count

async getAnalyticscardcount(req: Request, h: ResponseToolkit) {
  try {
    const teacherId = req.query.teacherId as string;

    if (!teacherId) {
      return h.response({ message: "Missing teacherId in query" }).code(400);
    }

    const data = await getgetAnalyticscardCalculation(teacherId);
    return h.response(data).code(200);
  } catch (error) {
    console.error("Error in getStudentsAttendanceCounts handler:", error);
    return h.response({ message: "Internal Server Error" }).code(500);
  }
},


async bulkcreateandSchedule(req: Request, h: ResponseToolkit) {
  try {
    console.log("Raw Request Payload:", req.payload);

    const { payload } = createInputValidation.parse({
      payload: req.payload,
    });

       const rawPayload = req.payload as any;

    console.log("Parsed Payload:", payload);
     const randomFourDigitStr = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      const meetingId = `AFGC-${randomFourDigitStr}`;

 const students:any = rawPayload.students || []; 
 const alfurqanStudents = await AlStudentModule.findOne({_id:new Types.ObjectId(students[0].id)} ).exec();   // 🧠 Extract reference values from the first student
 const evaluation = await Evaluation.findOne({ ["student.studentId"]: alfurqanStudents?.student.studentId }).exec();
 const refCourse = alfurqanStudents?.student?.course ;
  const refPackage = alfurqanStudents?.student?.package;
  const refTotalHourse = evaluation?.hours;
 
  // ✅ Validate that all students match the same course, package, and hours
  for (const student of students) {
    const alfurqanStudent = await AlStudentModule.findOne({_id: new Types.ObjectId(student.id)} ).exec()  // 🧠 Extract reference values from the first student
 const evaluation = await Evaluation.findOne({ ["student.studentId"]: alfurqanStudents?.student.studentId }).exec();
    if (
     alfurqanStudent?.student.course !== refCourse,
      alfurqanStudent?.student.package !== refPackage ,
      evaluation?.hours !== refTotalHourse
    ) {
     return h.response({
      status: "error",
      message: `All students must have the same course, package, and total hours. Mismatch found in student ${student.studentId || student.studentEmail}`
    }).code(400);
    }
  }

    // Extract mapped values from dropdowns
    const classDayValues = payload.classDay?.map((day: { value: string; label: string }) => day.value);
    const startTimeValues = payload.startTime?.map((time: { value: string; label: string }) => time.value);
    const endTimeValues = payload.endTime?.map((time: { value: string; label: string }) => time.value);
    const generateClassId = generateAFTCode("AFCL");
    // Prepare common scheduling details
    const commonScheduleData = {
        classId: generateClassId,
        teacher: {
        teacherId: payload.teacher?.teacherId ?? "",
        teacherName: payload.teacher?.teacherName ?? "",
        teacherEmail: payload.teacher?.teacherEmail ?? "",
        teacherSessionStart: rawPayload.teacher?.teacherSessionStart,
        teacherSessionEnd: rawPayload.teacher?.teacherSessionEnd
      },
      classLink: meetingId,
      classDay: classDayValues,
      package: alfurqanStudents?.student.package,
      course: alfurqanStudents?.student.course,
      preferedTeacher: payload.preferedTeacher,
      weeklySlots:rawPayload.weeklySlots,
      sessionClassType: payload.sessionClassType || "",
      sessionStarttime: payload.sessionStarttime || "",
      sessionsEndtime: payload.sessionsEndtime || "",
      sessionStatus: "NotCompleted",
      totalHourse: Number(evaluation?.accomplishmentTime) ,
      startDate: payload.startDate,
      endDate: payload.endDate,
      startTime: startTimeValues,
      endTime: endTimeValues,
      scheduleStatus: payload.scheduleStatus,
      studentAttendee: payload.studentAttendee,
      teacherAttendee: payload.teacherAttendee
    };

      if (
  payload.startDate instanceof Date &&
  !isNaN(payload.startDate.getTime()) &&
  rawPayload.weeklySlots &&
  Object.keys(rawPayload.weeklySlots).length > 0 &&
  typeof payload.teacher?.teacherId === "string" &&
  payload.teacher.teacherId.trim() !== ""
) {
  await evaluationTeacherSlotBook(
    payload.startDate.toISOString(),
    rawPayload.weeklySlots,
    payload.teacher.teacherId.trim()
  );
}


    const allResults = [];
    if(rawPayload.students){
  for (const student of rawPayload.students) {
    console.log("student>>>", student)
      const result = await updateStudentClassSchedule(student.id || "", {
        ...commonScheduleData,
        student 
      });
      if(result){
        const classType = payload?.sessionClassType
        await academicTeacherStudentList({data : {assignedTeacherId : payload.teacher?.teacherId }});
        await academicDashboardTeachersStudentCount({classType});
        if(payload.teacher?.teacherId){
               await teacherDashboardCardCount({sender : payload.teacher?.teacherId });
          }
      }
       
      allResults.push({
        studentId: student.id,
        result
      });
    }
    }
    return h.response({
      status: "success",
      message: "Class schedule created for all students.",
      data: allResults
    }).code(200);

  } catch (error: any) {
    console.error("Bulk scheduling error:", error);
    return h.response({
      status: "error",
      message: error?.message || "Something went wrong while scheduling classes."
    }).code(500);
  }
},

async requestReschedule (req : Request , h :ResponseToolkit){
   try {
    const payload = req.payload;
    console.log("Parsed Payload:", payload);
    const result = await requestReschedule(payload);
    return h.response(result).code(result.success ? 200 : 400);
  } catch (err: any) {
    console.error("Error in requestRescheduleHandler:", err.message);
    return h.response({
      success: false,
      message: "Internal server error",
    }).code(500);
  }
} ,

async updateClassAttendanceById(req : Request , h :ResponseToolkit){

try{
    const classSchedule = await ClassScheduleModel.findById(req.params.classSheduleId).lean();
if (!classSchedule) {
  return notFound(ClassSchedulesMessages.CANDIDATE_NOT_FOUND);
}
    const rawPayload = req.payload as any;

   // 🧩 1. Existing student session arrays
   
    // ✅ If they are real arrays, use them directly.
    const existingStart: string[] = classSchedule.student?.studnetSessionStart || [];
    const existingEnd: string[] = classSchedule.student?.studnetSessionEnd || [];

    const teacherStart: string[] = classSchedule.teacher?.teacherSessionStart || [];
    const teacherEnd: string[] = classSchedule.teacher?.teacherSessionEnd || [];

    if (rawPayload.student?.studnetSessionStart) {
      existingStart.push(rawPayload.student.studnetSessionStart);
    }
    if (rawPayload.student?.studnetSessionEnd) {
      existingEnd.push(rawPayload.student.studnetSessionEnd);
    }

    if (rawPayload.teacher?.teacherSessionStart) {
      teacherStart.push(rawPayload.teacher.teacherSessionStart);
    }
    if (rawPayload.teacher?.teacherSessionEnd) {
      teacherEnd.push(rawPayload.teacher.teacherSessionEnd);
    }

    const result = await updateClassAttendanceById(String(req.params.classSheduleId), {
      student: {
        id: classSchedule.student.id,
       studentId: classSchedule.student.studentId,
       studentFirstName: classSchedule.student.studentFirstName,
       studentLastName: classSchedule.student.studentLastName,
       studentEmail: classSchedule.student.studentEmail,
       gender: classSchedule.student.gender,
       level: classSchedule.student.level,
       studnetSessionStart: existingStart,
      studnetSessionEnd: existingEnd ,
      },
      teacher: {
        teacherId: classSchedule.teacher.teacherId,
        teacherName: classSchedule.teacher.teacherName,
        teacherEmail: classSchedule.teacher.teacherEmail,
       teacherSessionStart: teacherStart,
       teacherSessionEnd: teacherEnd
      },

    });
    


    return result;
  }catch(e){
    console.log("Error>>", e)
  }
},

async getTeacherEarnings(req : Request , h :ResponseToolkit){
   return await getTeacherTotalEarnings( req.query.teacherId, req.query.dateRange );
},

async getClassesCountForTeacher(req : Request , h :ResponseToolkit){
return await classesCountForTeacher( req.query.teacherId );
},

async bulkUpdateandSchedule(req: Request, h: ResponseToolkit) {
  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];
    const startOfDayIST = `${formattedDate}T00:00:00.000+00:00`;
    const endOfDayIST = `${formattedDate}T23:59:59.999+00:00`;
    const currentTime = moment().format("HH:mm");

    console.log("currentTime:", currentTime);

    // Step 1: Get class schedules matching the classLink and time filters
    const classScheduleList = await ClassScheduleModel.find({
      classLink: req.params.classId,
      startDate: {
        $gte: new Date(startOfDayIST),
        $lte: new Date(endOfDayIST),
      },
      startTime: { $lte: currentTime },
      endTime: { $gte: currentTime },
    }).lean();

    if (!classScheduleList || classScheduleList.length === 0) {
      return h.response({ message: "No active class at this time" }).code(404);
    }

    const rawPayload = req.payload as any;

    // Step 2: Take first matching schedule to extract base teacher info
    const baseSchedule = classScheduleList[0];

let teacherStart: string[] = (baseSchedule.teacher?.teacherSessionStart || []).flat();
let teacherEnd: string[] = (baseSchedule.teacher?.teacherSessionEnd || []).flat();

// Push new entries (ensure they are strings)
if (rawPayload.teacher?.teacherSessionStart) {
  teacherStart.push(String(rawPayload.teacher.teacherSessionStart));
}
if (rawPayload.teacher?.teacherSessionEnd) {
  teacherEnd.push(String(rawPayload.teacher.teacherSessionEnd));
}
teacherStart = [...new Set(teacherStart)];
teacherEnd = [...new Set(teacherEnd)];
    // Step 3: Create final update payload
    const updatePayload: Partial<IClassScheduleUpdate> = {
      teacher: {
        teacherId: baseSchedule.teacher.teacherId,
        teacherName: baseSchedule.teacher.teacherName,
        teacherEmail: baseSchedule.teacher.teacherEmail,
        teacherSessionStart: teacherStart,
        teacherSessionEnd: teacherEnd,
      },
    };

    // Step 4: Only one update needed
    const result = await bulkupdateClassAttendanceByClassLink(baseSchedule.classLink, updatePayload);

    return result;
  } catch (e) {
    console.error("Error in bulkUpdateandSchedule >>", e);
    return h.response({ error: "Internal Server Error" }).code(500);
  }
}
}

 function generateAFTCode(preName: string) {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${preName}${num}`;
 }
