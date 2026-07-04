/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodStudentSchema } from "../../models/student";
import { createStudent, getAllStudentsRecords,getAllStudentVisitor,getStudentRecordById, StudentFilter } from "../../operations/student";
import { EvaluationStatus ,NumberOfStudents } from "../../shared/enum";  
import {  studentMessages } from "../../config/messages"
import { notFound } from "@hapi/boom";
import { isNil } from "lodash";
import { zodGetAllRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { academicDashboardCard, academicStudentList } from "../../kafka/producers/academicProducer";


// Input Validation for Create a User
const createInputValidation = z.object({
  payload: zodStudentSchema.pick({
    firstName: true,
    lastName: true,
    academicCoach: true,
    email: true,
    gender:true,
    phoneNumber: true,
    city: true,
    country: true,
    countryCode: true,
    learningInterest: true,
    numberOfStudents: true,
    preferredTeacher: true,
    preferredFromTime: true,
    preferredToTime: true,
    timeZone: true,
    referralSource: true,
    startDate: true,
    evaluationStatus: true,
    refernceId:true,
    referredBy:true,
    status: true,
    createdBy: true,
    lastUpdatedBy: true,
  }),
});


// Input Validations for student list
const getStudentsListInputValidation = z.object({
  query: zodGetAllRecordsQuerySchema.pick({
    studentId:true,
    academicCoachId: true,
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    filterValues: true
  }),
});



export default {
  // Create a new student
  async createStudent(req: Request, h: ResponseToolkit) {
    const { payload } = createInputValidation.parse({
      payload: req.payload,
    });
    const result = await createStudent({     
  firstName: payload.firstName,
  lastName: payload.lastName,
  academicCoach: {
    academicCoachId: payload.academicCoach.academicCoachId
   },
  email: payload.email,
  gender: payload.gender,
  phoneNumber: payload.phoneNumber,
  city: payload.city,
  country: payload.country,
  countryCode: payload.countryCode,
  learningInterest: payload.learningInterest ?? "defaultLearningInterest" ,
  numberOfStudents: Number(payload.numberOfStudents),
  preferredTeacher: payload.preferredTeacher ?? "defaultPreferredTeacher", 
  preferredFromTime: payload.preferredFromTime,
  preferredToTime: payload.preferredToTime,
  timeZone: payload.timeZone,
  referralSource: payload.referralSource ?? "defaultReferralSource", 
  startDate: payload.startDate ?? new Date(), // Provide a default value for startDate
  evaluationStatus: payload.evaluationStatus ?? EvaluationStatus.PENDING, // Use a valid EvaluationStatus value
  refernceId: payload.refernceId ?? " ",
  referredBy:payload.referredBy ?? " ",
  status: payload.status ?? "defaultStatus", // Provide a default value for status
  createdDate: new Date(),
  createdBy: payload.createdBy,
  lastUpdatedBy: payload.lastUpdatedBy
  })
  if(result){
    const academicCoachId = payload.academicCoach.academicCoachId;
    await academicDashboardCard({academicCoachId});
    await academicStudentList({event : "create", data : result , sender : academicCoachId});
  }
  return result;
},

// Retrieve all the students list
async getAllStudents(req: Request, h: ResponseToolkit) {
  const { query } = getStudentsListInputValidation.parse({
    query: {
      ...req.query,
      filterValues: req.query?.filterValues ? JSON.parse(req.query.filterValues) : {},
    },
  });
  return getAllStudentsRecords(query);
},


  // Retrieve student details by studentId
async getStudentRecordById(req: Request, h: ResponseToolkit) {
  const result = await getStudentRecordById(String(req.params.studentId));

  if (isNil(result)) {
    return notFound(studentMessages.STUDENTS_NOT_FOUND);
  }

  return result;
},

async getStudentVisitor(req: Request, h: ResponseToolkit) {
  const { query } = getStudentsListInputValidation.parse({
    query: {
      ...req.query,
      filterValues: req.query?.filterValues
        ? JSON.parse(req.query.filterValues as string)
        : {},
    },
  });

  const finalQuery: StudentFilter = {
    ...query,
    offset: query.offset !== undefined && query.offset !== null ? String(query.offset) : null,
    limit: query.limit !== undefined && query.limit !== null ? String(query.limit) : null,
  };
  

  return await getAllStudentVisitor (finalQuery); // Assuming this is your DB call
}


}
 
