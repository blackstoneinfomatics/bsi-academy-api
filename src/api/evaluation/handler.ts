import { ResponseToolkit,Request } from "@hapi/hapi";
import  { zodEvaluationSchema } from "../../models/evaluation";
import { z } from "zod";
import { createEvaluationRecord,getAllEvaluationRecords,getCountriesCount,getEvaluationRecordById, getPreferedTeacherPercentage, getStudentCourseCount, getTeacherStatusCount, getTotalTrialClassRequestCount, getTrialbyTeacherCount, getTrialClassCount, getTrialClassRecordById, updateStudentEvaluation, updateStudentInvoice} from "../../operations/evaluation";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { evaluationMessages } from "../../config/messages";
import { isNil, result } from "lodash";
import { notFound } from "@hapi/boom";
import { academicDashboardCard, academicDashboardTeachersStudentCount, academicStudentList, academicTeacherStudentList } from "../../kafka/producers/academicProducer";
import { teacherDashboardCardCount } from "../../kafka/producers/teacherProducer";




const createInputValidation = z.object({
    payload: zodEvaluationSchema.pick({
    academicCoachId: true,
    student:true,
    classType: true,
    teacher: true,
    joiningDate: true,
    classDay: true,
    weeklySlots:true,
    startTime:true,
    endTime:true,
    subscription:true,
    planTotalPrice: true,
    isLanguageLevel:true,
    languageLevel:true,
    isReadingLevel:true,
    readingLevel:true,
    isGrammarLevel:true,
    grammarLevel:true,
    hours:true, 
    classStartDate:true,
    classEndDate:true,
    classStartTime:true,
    classEndTime:true,
    gardianName:true,
    gardianEmail:true,
    gardianPhone:true,
    gardianCity:true,
    gardianCountry:true,
    gardianTimeZone:true,
    gardianLanguage:true,
    assignedTeacher: true,
    accomplishmentTime: true,
    studentRate: true,
    studentStatus: true,
    classStatus: true,
    comments: true,
    trialClassStatus: true,
    invoiceStatus: true,
    paymentLink: true,
    paymentStatus: true,
    teacherStatus: true,
    status:true,
    preferredTrialDate : true,
    preferredTrialFromTime : true,
    preferredTrialToTime : true,
    createdBy:true,
    createdDate:true,  
    updatedBy:true
    }).partial()
  });


  export const zodUpdateEvaluationSchema = z.object({
    invoiceStatus: z.string().optional(),
    paymentStatus: z.string().optional(),
  
  })

  const invoiceValidation = z.object({
    payload: zodUpdateEvaluationSchema.pick({
      invoiceStatus: true,
      paymentStatus: true,
    
    }).partial()
    
  })

  const getEvaluationListInputValidation = z.object({
    query: zodGetAllRecordsQuerySchema.pick({
      academicCoachId: true,
      searchText: true,
      sortBy: true,
      sortOrder: true,
      offset: true,
      limit: true,
      trialClassStatus: true,
      filterValues: true
    }),
  });


export default {
    async createEvaluation(req: Request, h: ResponseToolkit) {
        const { payload } = createInputValidation.parse({
            payload: req.payload,
        });
        const rawPayload = req.payload as any;
        const classDayValues = payload.classDay?.map((day: { value: string; label: string }) => day.value);
        const startTimeValues = payload.startTime?.map((time: { value: string; label: string }) => time.value);
        const endTimeValues = payload.endTime?.map((time: { value: string; label: string }) => time.value);
   
        const generateTrialId = generateAFTCode("AFTC");

        const result = await createEvaluationRecord({
          trialId: generateTrialId,
          academicCoachId: payload.academicCoachId ?? "",

            student: { // Ensure studentId is included
                studentId: payload.student?.studentId ?? "", 
                studentRegisterId: payload?.student?.studentRegisterId??"",
                studentFirstName: payload.student?.studentFirstName ?? "",
                studentLastName: payload.student?.studentLastName ?? "",
                studentEmail: payload.student?.studentEmail ?? "",
                studentGender: payload.student?.studentGender ?? "",
                studentPhone: payload.student?.studentPhone ?? 0,
                studentCity: payload.student?.studentCity ?? " ",
                studentCountry: payload.student?.studentCountry ?? "",
                studentCountryCode: payload.student?.studentCountryCode ?? "",
                learningInterest: payload.student?.learningInterest,
                numberOfStudents: payload.student?.numberOfStudents ?? 1,
                preferredTeacher: payload.student?.preferredTeacher ?? "defaultPreferredTeacher",
                preferredFromTime: payload.student?.preferredFromTime,
                preferredToTime: payload.student?.preferredToTime,
                timeZone: payload.student?.timeZone ?? "",
                referralSource: payload.student?.referralSource ?? "",
                preferredDate: payload.student?.preferredDate,
                evaluationStatus: payload.classStatus || "PENDING",
                status: payload.student?.status ?? "defaultStatus",
                createdDate: new Date(),
                createdBy: payload.student?.createdBy ?? "",
            },
            classType: payload.classType,
            teacher:{
              teacherId: payload.teacher?.teacherId  ?? "Not Assigned",
              teacherName: payload.teacher?.teacherName ?? "Not Assigned",
              teacherEmail: payload.teacher?.teacherEmail ?? "Not Assigned",
            },
            joiningDate: payload.joiningDate ?? new Date() ,
            weeklySlots:payload.classType == "REGULARCLASS"? payload.weeklySlots : undefined,
            classDay : payload.classType == "REGULARCLASS"? classDayValues : undefined,
            startTime:payload.classType == "REGULARCLASS"? startTimeValues : undefined ,
            endTime: payload.classType == "REGULARCLASS"? endTimeValues: undefined,
            isLanguageLevel: payload.isLanguageLevel ?? false,
            languageLevel: payload.languageLevel ?? "",
            isReadingLevel: payload.isReadingLevel ?? false,
            readingLevel: payload.readingLevel ?? "",
            isGrammarLevel: payload.isGrammarLevel ?? false,
            grammarLevel: payload.grammarLevel ?? "",
            hours: payload.hours ?? 0,
            subscription:{
                subscriptionName: payload.subscription?.subscriptionName ?? "",
            } ,
            planTotalPrice: payload.planTotalPrice  ?? 0,
            classStartDate: payload.classStartDate ?? new Date(),
            classEndDate: payload.classEndDate ?? new Date(),
            classStartTime: payload.classStartTime ?? "defaultStartTime",
            classEndTime: payload.classEndTime ?? "defaultEndTime",
            gardianName: payload.gardianName ?? "",
            gardianEmail: payload.gardianEmail ?? "",
            gardianPhone: payload.gardianPhone ?? "",
            gardianCity: payload.gardianCity ?? "",
            gardianCountry: payload.gardianCountry ?? "defaultCountry", // Add default value
            gardianTimeZone: payload.gardianTimeZone ?? "defaultTimeZone", // Add default value
            gardianLanguage: payload.gardianLanguage ?? "",
           assignedTeacher:payload.assignedTeacher ?? "",
           accomplishmentTime: payload.accomplishmentTime,
           studentRate: payload.studentRate ?? 0,
           studentStatus: payload.studentStatus ?? "",
           classStatus: payload.classStatus ?? "",
           comments: payload.comments ?? "",
           trialClassStatus: payload.trialClassStatus ?? "",
           invoiceStatus: payload.invoiceStatus ?? "Pending",
           paymentLink: payload.paymentLink ?? "",
           paymentStatus: payload.paymentStatus ?? "Pending",
           teacherStatus: payload.teacher?.teacherId ? "Assigned" : "Not Assigned",
          preferredTrialFromTime:rawPayload.preferredTrialFromTime,
          preferredTrialToTime:rawPayload.preferredTrialToTime,
          preferredTrialDate : rawPayload.preferredTrialDate,
           amount: "0.00",
           currency: "$",
           status: payload.status,
            createdDate: new Date(),
            createdBy: payload.createdBy,
            updatedDate: new Date(),
           updatedBy: "Admin",
        });
        if(result){
          const academicCoachId = payload.academicCoachId;
          const classType = payload.classType;
           await academicDashboardCard({academicCoachId});
            await academicStudentList({event : "update", data : result ,sender : payload.academicCoachId});
            await academicDashboardTeachersStudentCount({classType});
            await academicTeacherStudentList({data : result});
            if(payload.teacher?.teacherId){
               await teacherDashboardCardCount({sender : payload.teacher?.teacherId });
            }
        }
        return result;
    },

 // Update a new Evaluation
 async updateEvaluation(req: Request, h: ResponseToolkit) {
  const { payload } = createInputValidation.parse({
    payload: req.payload,
 });

  const result = await updateStudentEvaluation(String(req.params.evaluationId),{   
    student: { // Ensure studentId is included
      studentId: payload.student?.studentId ?? "", 
      studentRegisterId: payload?.student?.studentRegisterId??"",
      studentFirstName: payload.student?.studentFirstName ?? "",
      studentLastName: payload.student?.studentLastName ?? "",
      studentEmail: payload.student?.studentEmail ?? "",
      studentGender: payload.student?.studentGender ?? "",
      studentPhone: payload.student?.studentPhone?? 0,
      studentCity: payload.student?.studentCity ?? " ",
      studentCountry: payload.student?.studentCountry ?? "",
      studentCountryCode: payload.student?.studentCountryCode ?? "",
      learningInterest: payload.student?.learningInterest,
      numberOfStudents: payload.student?.numberOfStudents ?? 1,
      preferredTeacher: payload.student?.preferredTeacher ?? "defaultPreferredTeacher",
      preferredFromTime: payload.student?.preferredFromTime,
      preferredToTime: payload.student?.preferredToTime,
      timeZone: payload.student?.timeZone ?? "",
      referralSource: payload.student?.referralSource ?? "",
      preferredDate: payload.student?.preferredDate,
      evaluationStatus: payload.student?.evaluationStatus ?? "defaultStatus",
      status: payload.student?.status ?? "defaultStatus",
      createdDate: new Date(),
      createdBy: payload.student?.createdBy ?? "",
  },
  teacher:{
    teacherId: payload.teacher?.teacherId  ?? "Not Assigned",
    teacherName: payload.teacher?.teacherName ?? "Not Assigned",
    teacherEmail: payload.teacher?.teacherEmail ?? "Not Assigned",
  },
  preferredTrialDate : payload.preferredTrialDate,
  preferredTrialFromTime : payload.preferredTrialFromTime,  
  preferredTrialToTime : payload.preferredTrialToTime,
  isLanguageLevel: payload.isLanguageLevel ?? false,
  languageLevel: payload.languageLevel ?? "",
  isReadingLevel: payload.isReadingLevel ?? false,
  readingLevel: payload.readingLevel ?? "",
  isGrammarLevel: payload.isGrammarLevel ?? false,
  grammarLevel: payload.grammarLevel ?? "",
  hours: payload.hours ?? 0,
  subscription:{
      subscriptionName: payload.subscription?.subscriptionName ?? "",
  } ,
  classStartDate: payload.classStartDate ?? new Date(),
  classEndDate: payload.classEndDate ?? new Date(),
  classStartTime: payload.classStartTime ?? "defaultStartTime",
  classEndTime: payload.classEndTime ?? "defaultEndTime",
  gardianName: payload.gardianName ?? "",
  gardianEmail: payload.gardianEmail ?? "",
  gardianPhone: payload.gardianPhone ?? "",
  gardianCity: payload.gardianCity ?? "",
  gardianCountry: payload.gardianCountry ?? "defaultCountry", // Add default value
  gardianTimeZone: payload.gardianTimeZone ?? "defaultTimeZone", // Add default value
  gardianLanguage: payload.gardianLanguage ?? "",
 assignedTeacher:payload.assignedTeacher ?? "",
 studentStatus: payload.studentStatus ?? "",
 classStatus: payload.classStatus ?? "",
 comments: payload.comments ?? "",
 trialClassStatus: payload.trialClassStatus ?? "",
 invoiceStatus: payload.invoiceStatus ?? "Pending",
 paymentLink: payload.paymentLink ?? "",
 paymentStatus: payload.paymentStatus ?? "Pending",
 teacherStatus: payload.teacherStatus ?? "Not Assigned",
  status: payload.status,
  createdDate: new Date(),
  createdBy: payload.createdBy,
  updatedDate: new Date(),
 updatedBy: "Admin"
});
if(result){
  const academicCoachId = result.academicCoachId;
  await academicDashboardCard({academicCoachId});
  await academicStudentList({event : "update", data : result , sender : result.academicCoachId});
}
 return result;
},

// Retrieve all the Evaluation list
 getAllEvaluationList(req: Request, h: ResponseToolkit) {
    const { query } = getEvaluationListInputValidation.parse({
      query: {
        ...req.query,
        filterValues: req.query?.filterValues ? JSON.parse(String(req.query.filterValues)) : {},
      },
    });
    return getAllEvaluationRecords(query);
  },
  


    // Retrieve student details by studentId
  async getEvaluationRecordById(req: Request, h: ResponseToolkit) {
    const result = await getEvaluationRecordById(req.params.evaluationId);
  
    if (isNil(result)) {
      return notFound(evaluationMessages.EVALUATIONS_NOT_FOUND);
    }
  
    return result;
  },

  //update the invoice
  async updateInvoice(req: Request, h: ResponseToolkit){
    const { payload } = invoiceValidation.parse({
      payload: req.payload,
   });

   return await updateStudentInvoice(String(req.params.evaluationId),{   
    invoiceStatus: payload.invoiceStatus,
    paymentStatus: payload.paymentStatus
     });
  },
 
  async getTotaltrialClassCount(req: Request, h: ResponseToolkit){
    return await getTotalTrialClassRequestCount();
  },
  
  async getAssignedTeacherCount(req: Request, h: ResponseToolkit){
  return await getTeacherStatusCount();
  },

  async getPreferedTeacher(req: Request, h: ResponseToolkit){
    return await getPreferedTeacherPercentage();
    },

  async getStudentCourse(req: Request, h: ResponseToolkit){
    return await getStudentCourseCount();
    },

    async getCountries(req: Request, h: ResponseToolkit){
      return await getCountriesCount();
    },

    async getTrialbyTeacher(req: Request, h: ResponseToolkit){
      return await getTrialbyTeacherCount();
    },

    async getTrialClass(req: Request, h: ResponseToolkit){

      const { query } = getEvaluationListInputValidation.parse({
        query: {
          ...req.query,
          filterValues: req.query?.filterValues ? JSON.parse(String(req.query.filterValues)) : {},
        },
      });
      return getTrialClassCount(query);

    },

   async getTrialClassByTeacher(req: Request, h: ResponseToolkit){
      console.log("Id>>>>>", req.query.teacherId);
    const teacherId = Array.isArray(req.query.teacherId) ? req.query.teacherId[0] : req.query.teacherId;
    const result = await getTrialClassRecordById(teacherId ?? "");

    if (isNil(result)) {
      return notFound(evaluationMessages.EVALUATIONS_NOT_FOUND);
    }
  
    return result;
    }
  }


  function generateAFTCode(preName: string) {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${preName}${num}`;
}

//   const useNumber  = 0;
// function trialIdGenerator(trialprefix: string) {

// // auto reset 
// if(useNumber > 99999){
//     throw new Error("All 5-digit trial IDs have been used!");

// }
//   const formattedNum = useNumber.toString().padStart(5, "0");
//   return `${trialprefix}${formattedNum}`;

// }

