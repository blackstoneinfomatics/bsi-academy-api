import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodRecruitmentSchema } from "../../models/recruitment";
import { createRecruitment, getAllApplicantsRecords, getAllTeacherRecords, getApplicantRecordById, getApplicationStatusData, getTeacherCountriesCountDetails, getTeacherDetailsOverviewCount, getTeacherListFemaleMale, updateApplicantByAdminId, updateApplicantById } from "../../operations/recruitment";
import { Readable } from "stream";
import { zodGetAllApplicantsRecordsQuerySchema, zodGetAllRecordsQuerySchema, zodGetAllTeachersRecordsQuerySchema } from "../../shared/zod_schema_validation";
import { notFound } from "@hapi/boom";
import { recruitmentMessages } from "../../config/messages";
import pdfParse from "pdf-parse";
import { isNil } from "lodash";
import { supervisorCardCount, supervisorRecruitmentList, supervisorTeacherList } from "../../kafka/producers/supervisorProducer";
import { sendNotification } from "../../operations/notification";
import { uploadFileToSharePoint } from "../../shared/sharepoint";
import users from "../../models/users";



const createInputValidation = z.object({
  payload: zodRecruitmentSchema.pick({
    supervisor: true,
    candidateFirstName: true,
    candidateLastName: true,
    gender: true,
    applicationDate: true,
    candidateEmail: true,
    candidatePhoneNumber: true,
    candidateCountry: true,
    candidateCity: true,
    positionApplied: true,
    currency: true,
    expectedSalary: true,
    preferedWorkingHours: true,
    comments: true,
    applicationStatus: true,
    level: true,
    quranReading: true,
    tajweed: true,
    arabicWriting: true,
    arabicSpeaking: true,
    englishSpeaking: true,
    preferedWorkingDays: true,
    overallRating: true,
    skills: true,
    status: true,
    createdDate: true,
    createdBy: true,
    updatedDate: true,
  }),
});

 const updateInputValidation = z.object({
  payload: zodRecruitmentSchema.pick({
    supervisor: true,
    comments: true,
    applicationStatus: true,
    level: true,
    quranReading: true,
    tajweed: true,
    arabicWriting: true,
    arabicSpeaking: true,
    englishSpeaking: true,
    preferedWorkingDays: true,
    overallRating: true,
    status:true,
    updatedDate: true,
  }),
 })

 const updateAdminInputValidation = z.object({
  payload: zodRecruitmentSchema.pick({
    supervisor: true,
    applicationStatus: true,
    status:true,
    updatedDate: true,
  }),
 })

const getApplicantsInputValidation = z.object({
  query: zodGetAllApplicantsRecordsQuerySchema.pick({
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    filterValues: true
  }),
});


const getTeacherInputValidation = z.object({
  query: zodGetAllTeachersRecordsQuerySchema.pick({
    teacherGroup: true,
    supervisorId: true
  }),
});


export default{
  async createRecruitement(req: Request, h: ResponseToolkit) {
  try {
    const { payload } = createInputValidation.parse({
      payload: req.payload,
    });

    const rawPayload = req.payload as any;

    const uploadFileBuffer = rawPayload.uploadResume
      ? await streamToBuffer(rawPayload.uploadResume)
      : null;

    const experience = rawPayload.uploadResume
      ? await extractResumeDetails(uploadFileBuffer)
      : null;

//save the resume in sharepoint
        // derive filename from the upload object (hapi or generic) or fallback
        const fileName =
          (rawPayload.uploadResume &&
            (rawPayload.uploadResume.hapi?.filename || rawPayload.uploadResume.filename)) ||
          "resume.pdf";


        // uploadFileToSharePoint expects (accessToken, siteId, driveId, fileName, fileContent)
        const shareLink = await uploadFileToSharePoint(
          uploadFileBuffer as Buffer,
          fileName
        );

        console.log("File uploaded to SharePoint. Link:", shareLink.fileId);
const generateTeacherId = generateAFTCode("AFT");
   const supervisor = await users.find({role: "SUPERVISOR" , status: "Active" }).exec();
    const result = await createRecruitment({
      candidateId: generateTeacherId,
      supervisor: {
        supervisorId: supervisor[0]?._id.toString() || "",
        supervisorName: supervisor[0]?.userName || "Supervisor",
        supervisorEmail:  supervisor[0]?.email || "supervisor@gmail.com",
        supervisorRole:  "SUPERVISOR",
      },
      candidateFirstName: payload.candidateFirstName,
      candidateLastName: payload.candidateLastName,
      gender: payload.gender || undefined,
      applicationDate: payload.applicationDate || new Date(),
      candidateEmail: payload.candidateEmail,
      candidatePhoneNumber: payload.candidatePhoneNumber,
      candidateCountry: payload.candidateCountry,
      candidateCity: payload.candidateCity,
      positionApplied: payload.positionApplied,
      currency: payload.currency,
      expectedSalary: payload.expectedSalary,
      preferedWorkingHours: payload.preferedWorkingHours,
      uploadResume: shareLink.fileId || "",
      comments: payload.comments || "",
      applicationStatus: payload.applicationStatus,
      level: payload.level,
      quranReading: payload.quranReading,
      tajweed: payload.tajweed,
      arabicWriting: payload.arabicWriting,
      arabicSpeaking: payload.arabicSpeaking,
      englishSpeaking: payload.englishSpeaking,
      preferedWorkingDays: payload.preferedWorkingDays,
      overallRating: payload.overallRating,
      professionalExperience: JSON.parse(rawPayload.professionalExperience),
      skills: payload.skills || " ",
      status: payload.status,
      createdDate: payload.createdDate || new Date(),
      createdBy: payload.createdBy || payload.candidateFirstName,
      updatedDate: payload.updatedDate,
    });

    // ✅ Check if result has an error before proceeding
    if ("error" in result) {
      return h.response({ message: "Recruitment creation failed", error: result.error }).code(400);
    }
    if(result){
    await supervisorRecruitmentList({event :"create", data : result});
    }
    return h.response(result).code(201);

  } catch (error) {
    console.error("Recruitment creation error:", error);
    return h.response({ message: "Internal Server Error", error }).code(500);
  }
},


 async getAllApplicants(req: Request, h: ResponseToolkit) {
  // Parse filterValues from either a JSON string or flat query params
  let filterValues: any = {};

  if (typeof req.query.filterValues === "string") {
    try {
      filterValues = JSON.parse(req.query.filterValues);
    } catch {
      filterValues = {};
    }
  } else {
    filterValues = {
      applicationStatus: req.query.applicationStatus,
      positionApplied: req.query.positionApplied,
      dateRange:
        req.query["dateRange.from"] && req.query["dateRange.to"]
          ? {
              from: req.query["dateRange.from"],
              to: req.query["dateRange.to"],
            }
          : undefined,
    };
  }

  // Build the full query object for validation
  const input = {
    query: {
      ...req.query,
      filterValues,
    },
  };

  // Validate and normalize query
  const { query } = getApplicantsInputValidation.parse(input);

  // ---- Fix: Convert offset and limit to string or null ----
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

  // Call your service function
  return getAllApplicantsRecords(queryForService);
},



    async getApplicantRecordById(req: Request, h: ResponseToolkit){
      const result = await getApplicantRecordById(String(req.params.applicantId));

      if (isNil(result)) {
           return notFound(recruitmentMessages.USER_NOT_FOUND);
           }

  return result;
    },

    async updateApplicantRecordById(req: Request, h: ResponseToolkit) {

      const { payload } = updateInputValidation.parse({
        payload: req.payload
      });
   
      const result = await updateApplicantById(String(req.params.applicantId), payload);
      if (isNil(result)) {
        return notFound(recruitmentMessages.USER_NOT_FOUND);
      }
      if(result){
       const supervisorId = result.supervisor.supervisorId;
      await supervisorCardCount({supervisorId});
      await supervisorRecruitmentList({event : "update", data : result});
      }
      return result;
    },

    async updateAdminApplicantRecordById(req: Request, h: ResponseToolkit) {
try{
      const { payload } = updateAdminInputValidation.parse({
        payload: req.payload
      });
   console.log(">>>>>",payload.applicationStatus);
      const result = await updateApplicantByAdminId(String(req.params.id), payload);
      if (isNil(result)) {
        return notFound(recruitmentMessages.USER_NOT_FOUND);
      }
       if(result.applicationStatus === "APPROVED"){
           const supervisorId = result.supervisor.supervisorId;
          await supervisorTeacherList({data: result});
          await supervisorCardCount({supervisorId});
          await sendNotification({
            messages: `Admin gaves Approval to ${result.candidateFirstName} teacher !.`,
            senderId: req.params.id.toString(),
            senderName: result.candidateFirstName,
            senderEmail: result.candidateEmail,
            isRead : false,
            receiverId: [result.supervisor.supervisorId],
            receiverName: [result.supervisor.supervisorName],
            receiverEmail: [result.supervisor.supervisorEmail],
          
            notificationType: "TEACHER_ADDED",
            notificationStatus: "Unseen",
            status: "active",
            createdBy: "system",
            updatedBy: "system",
          });
          await supervisorRecruitmentList({event : "update", data : result});
        }else {
         const supervisorId = result.supervisor.supervisorId;
         await supervisorCardCount({supervisorId});
         await sendNotification({
            messages: `Admin added ${result.candidateFirstName} teacher in your team !.`,
            senderId: req.params.id.toString(),
            senderName: result.candidateFirstName,
            senderEmail: result.candidateEmail,
            isRead : false,
            receiverId: [result.supervisor.supervisorId],
            receiverName: [result.supervisor.supervisorName],
            receiverEmail: [result.supervisor.supervisorEmail],
            notificationType: "TEACHER_ADDED",
            notificationStatus: "Unseen",
            status: "active",
            createdBy: "system",
            updatedBy: "system",
          });
           await supervisorRecruitmentList({event : "update", data : result});
            }

      return result;
          }catch (error) {
      console.error("Error updating applicant record:", error);       
    }
  },

  async getTeacherList (req: Request, h: ResponseToolkit){
      const { query } = getTeacherInputValidation.parse({
      query: {
      ...req.query,
      },
  });
  return getAllTeacherRecords(query);
    },
    

  async getTeacherListFemaleMale(req: Request, h: ResponseToolkit) {
  const { query } = getTeacherInputValidation.parse({ query: req.query });
  return await getTeacherListFemaleMale(query);
}
,

  async getTeacherCountriesCount(req: Request, h: ResponseToolkit){
      return await getTeacherCountriesCountDetails();
    },

   async getApplicationData(req: Request, h: ResponseToolkit){
     const fromDate = Array.isArray(req.query.fromDate) ? req.query.fromDate[0] : req.query.fromDate;
     const toDate = Array.isArray(req.query.toDate) ? req.query.toDate[0] : req.query.toDate;
     return await getApplicationStatusData(fromDate ?? "", toDate ?? "");
   },

  async getTeacherDetailsOverview(req: Request, h: ResponseToolkit){
     const teacherId = Array.isArray(req.query.teacherId) ? req.query.teacherId[0] : req.query.teacherId;
     return await getTeacherDetailsOverviewCount(teacherId ?? "");
   },

};




async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on("error", (err: any) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}



const extractResumeDetails = async (fileStream: any) => {
  try {
    // Convert stream to buffer
   // const dataBuffer = await streamToBuffer(fileStream);

    // Extract text using pdf-parse
    const data = await pdfParse(fileStream);
    const text = data.text;

    
    // // Extract Skills
    // const skillsMatch = text.match(/Skills([\s\S]*?)(?=(Education|Experience|Projects|$))/i);
    // const skills = skillsMatch ? skillsMatch[1].trim() : 'Not found';

    // Extract Work Experience
    const workExpMatch = text.match(/EXPERIENCE([\s\S]*?)(?=(Education|Skills|Projects|$))/i);
    const workExperience = workExpMatch ? workExpMatch[1].trim() : 'Not found';


    return {
      workExperience,
    };
  } catch (error) {
    console.error('Error extracting resume details:', error);
    throw error;
  }
  
   
};

  function generateAFTCode(preName: string) {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${preName}${num}`;
}