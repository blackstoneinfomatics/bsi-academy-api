import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodRecruitmentSchema } from "../../models/recruitment";
import {
  createRecruitment,
  getAllApplicantsRecords,
  getAllTeacherRecords,
  getApplicantRecordById,
  getApplicationStatusData,
  getTeacherCountriesCountDetails,
  getTeacherDetailsOverviewCount,
  getTeacherListFemaleMale,
  updateApplicantByAdminId,
  updateApplicantById,
} from "../../operations/recruitment";
import { Readable } from "stream";
import {
  zodGetAllApplicantsRecordsQuerySchema,
  zodGetAllRecordsQuerySchema,
  zodGetAllTeachersRecordsQuerySchema,
} from "../../shared/zod_schema_validation";
import { forbidden, notFound } from "@hapi/boom";
import { Types } from "mongoose";
import { applicationStatus, recruitmentMessages } from "../../config/messages";
import pdfParse from "pdf-parse";
import { isNil } from "lodash";
import {
  supervisorCardCount,
  supervisorRecruitmentList,
  supervisorTeacherList,
} from "../../kafka/producers/supervisorProducer";
import { sendNotification } from "../../operations/notification";
import { uploadFileToSharePoint } from "../../shared/sharepoint";
import users from "../../models/users";
import {
  zodRecruitmentInterviewIdSchema,
  zodRecruitmentInterviewRescheduleSchema,
  zodRecruitmentInterviewScheduleSchema,
} from "../../models/recruitmentInterviewSchedule";
import {
  createRecruitmentInterviewSchedule,
  RecruitmentApprovalValidationError,
  rescheduleRecruitmentInterview,
} from "../../operations/recruitment";

const getAuthenticatedIdentity = (
  credentials: unknown,
): { subject: string; tenantId?: string } | null => {
  if (!credentials || typeof credentials !== "object") {
    return null;
  }

  const outer = credentials as Record<string, unknown>;
  const claims =
    outer.credentials && typeof outer.credentials === "object"
      ? (outer.credentials as Record<string, unknown>)
      : outer;
  const subject = [claims.sub, claims.userId, claims.id].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  if (!subject) {
    return null;
  }

  const tenantId =
    typeof claims.tenantId === "string" && claims.tenantId.trim()
      ? claims.tenantId
      : undefined;
  return { subject: subject.trim(), tenantId };
};

const getAuthenticatedIdentityDiagnostics = (credentials: unknown) => {
  if (!credentials || typeof credentials !== "object") {
    return { credentialsType: typeof credentials };
  }

  const outer = credentials as Record<string, unknown>;
  const hasNestedCredentials =
    !!outer.credentials && typeof outer.credentials === "object";
  const claims = hasNestedCredentials
    ? (outer.credentials as Record<string, unknown>)
    : outer;

  return {
    credentialKeys: Object.keys(outer),
    hasNestedCredentials,
    nestedCredentialKeys: hasNestedCredentials
      ? Object.keys(claims)
      : undefined,
    subType: typeof claims.sub,
    userIdType: typeof claims.userId,
    idType: typeof claims.id,
    tenantIdType: typeof claims.tenantId,
  };
};

const userIdentityFilter = (subject: string) =>
  Types.ObjectId.isValid(subject) ? { _id: subject } : { userId: subject };

const createInputValidation = z.object({
  payload: zodRecruitmentSchema
    .pick({
      candidateFirstName: true,
      candidateLastName: true,
      gender: true,
      dateOfBirth: true,
      address: true,
      highestQualification: true,
      specialization: true,
      university: true,
      completionYear: true,
      experienceType: true,
      teachingExperience: true,
      previousInstitutionName: true,
      previousDesignation: true,
      technicalSkills: true,
      teachingSkills: true,
      languages: true,
      employmentType: true,
      teachingMode: true,
      availableWorkingDays: true,
      currentSalary: true,
      joiningAvailability: true,
      applicationDate: true,
      candidateEmail: true,
      candidatePhoneNumber: true,
      candidateCountry: true,
      candidateCity: true,
      position: true,
      currency: true,
      expectedSalary: true,
    })
    .extend({
      preferedWorkingHours: z.string().optional(),
    }),
});

const updateInputValidation = z.object({
  payload: zodRecruitmentSchema
    .partial()
    .omit({
      tenantId: true,
      supervisor: true,
      status: true,
      createdBy: true,
      createdDate: true,
      updatedBy: true,
      updatedDate: true,
    })
    .extend({
      applicationStatus: z
        .enum(["SHORTLISTED", "REJECTED", "WAITING"])
        .optional(),
    }),
});

const updateAdminInputValidation = z.object({
  payload: zodRecruitmentSchema
    .pick({
      applicationStatus: true,
    })
    .extend({
      applicationStatus: z.enum(["APPROVED", "REJECTED"]),
      gender: z.string().optional(),
      preferedWorkingHours: z.string().optional(),
    }),
});

const getApplicantsInputValidation = z.object({
  query: zodGetAllApplicantsRecordsQuerySchema.pick({
    searchText: true,
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    filterValues: true,
  }),
});

const getTeacherInputValidation = z.object({
  query: zodGetAllTeachersRecordsQuerySchema.pick({
    teacherGroup: true,
    supervisorId: true,
  }),
});

export default {
  async createInterviewSchedule(req: Request, h: ResponseToolkit) {
    try {
      const payload = zodRecruitmentInterviewScheduleSchema.parse(req.payload);
      const schedule = await createRecruitmentInterviewSchedule(
        payload._id,
        payload.interviewDate,
        payload.interviewTime,
        payload.interviewPlatform,
        payload.interviewMode,
      );

      if (!schedule) {
        return h
          .response({ message: "Recruitment record not found" })
          .code(404);
      }

      if ("duplicate" in schedule && schedule.duplicate === "recruitment") {
        return h
          .response({
            message:
              "An interview schedule already exists for this recruitment record",
          })
          .code(409);
      }

      if ("duplicate" in schedule && schedule.duplicate === "slot") {
        return h
          .response({
            message: "This interview date and time slot is already booked",
          })
          .code(409);
      }

      return h.response(schedule).code(201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return h
          .response({
            message: "Invalid interview schedule payload",
            errors: error.issues,
          })
          .code(400);
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        const keyPattern =
          "keyPattern" in error &&
          typeof error.keyPattern === "object" &&
          error.keyPattern !== null
            ? error.keyPattern
            : null;
        const slotConflict =
          keyPattern !== null &&
          "interviewDate" in keyPattern &&
          "interviewTime" in keyPattern;

        return h
          .response({
            message: slotConflict
              ? "This interview date and time slot is already booked"
              : "An interview schedule already exists for this recruitment record",
          })
          .code(409);
      }

      console.error("Interview schedule creation error:", error);
      return h.response({ message: "Internal Server Error" }).code(500);
    }
  },

  async rescheduleInterview(req: Request, h: ResponseToolkit) {
    try {
      const recruitmentId = zodRecruitmentInterviewIdSchema.parse(
        String(req.params.recruitmentId),
      );
      const payload = zodRecruitmentInterviewRescheduleSchema.parse(
        req.payload,
      );
      const schedule = await rescheduleRecruitmentInterview(
        recruitmentId,
        payload.interviewDate,
        payload.interviewTime,
        payload.interviewPlatform,
        payload.interviewMode,
      );

      if (!schedule) {
        return h
          .response({
            message: "Recruitment record or interview schedule not found",
          })
          .code(404);
      }

      if ("duplicate" in schedule) {
        return h
          .response({
            message:
              "This interview date, time, and platform are already booked",
          })
          .code(409);
      }

      return h.response(schedule).code(200);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return h
          .response({
            message: "Invalid interview reschedule payload",
            errors: error.issues,
          })
          .code(400);
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        return h
          .response({
            message:
              "This interview date, time, and platform are already booked",
          })
          .code(409);
      }

      console.error("Interview reschedule error:", error);
      return h.response({ message: "Internal Server Error" }).code(500);
    }
  },

  async createRecruitement(req: Request, h: ResponseToolkit) {
    try {
      let rawPayload = req.payload as any;
      const contentType = String(
        req.headers["content-type"] || "",
      ).toLowerCase();

      // With payload.output set to "stream", Hapi returns JSON bodies as a
      // readable stream. Multipart requests are already parsed into fields/files.
      if (
        contentType.includes("application/json") &&
        rawPayload instanceof Readable
      ) {
        const jsonBuffer = await streamToBuffer(rawPayload);
        rawPayload = JSON.parse(jsonBuffer.toString("utf8"));
      }

      const { payload } = createInputValidation.parse({
        payload: rawPayload,
      });

      const identity = getAuthenticatedIdentity(req.auth.credentials);
      if (!identity) {
        console.warn(
          "[recruitment:createRecruitement] Authenticated identity claims are missing or invalid",
          {
            isAuthenticated: req.auth.isAuthenticated,
            ...getAuthenticatedIdentityDiagnostics(req.auth.credentials),
          },
        );
        return forbidden("Authenticated user identity is missing or invalid");
      }

      const supervisor = await users
        .findOne({
          ...userIdentityFilter(identity.subject),
          ...(identity.tenantId ? { tenantId: identity.tenantId } : {}),
          role: "SUPERVISOR",
          status: "Active",
        })
        .select("_id tenantId userName email role")
        .lean()
        .exec();
      if (!supervisor || typeof supervisor.tenantId !== "string") {
        return forbidden("Only active supervisors can create recruitment applicants");
      }

      const uploadFileBuffer = rawPayload.uploadResume
        ? await streamToBuffer(rawPayload.uploadResume)
        : null;

      const fileName =
        rawPayload.uploadResume?.hapi?.filename ||
        rawPayload.uploadResume?.filename ||
        "resume.pdf";
      const shareLink = uploadFileBuffer
        ? await uploadFileToSharePoint(uploadFileBuffer as Buffer, fileName)
        : null;

      const generateTeacherId = generateAFTCode("BA");
      const result = await createRecruitment({
        tenantId: supervisor.tenantId,
        applicationStatus: applicationStatus.NEWAPPLICATION,
        candidateId: generateTeacherId,
        supervisor: {
          supervisorId: String(supervisor._id),
          supervisorName: supervisor.userName,
          supervisorEmail: supervisor.email,
          supervisorRole: "SUPERVISOR",
        },
        candidateFirstName: payload.candidateFirstName,
        candidateLastName: payload.candidateLastName,
        gender: payload.gender || undefined,
        dateOfBirth: payload.dateOfBirth,
        address: payload.address,
        highestQualification: payload.highestQualification,
        specialization: payload.specialization,
        university: payload.university,
        completionYear: payload.completionYear,
        experienceType: payload.experienceType,
        teachingExperience: payload.teachingExperience,
        previousInstitutionName: payload.previousInstitutionName,
        previousDesignation: payload.previousDesignation,
        technicalSkills: payload.technicalSkills,
        teachingSkills: payload.teachingSkills,
        languages: payload.languages,
        employmentType: payload.employmentType,
        teachingMode: payload.teachingMode,
        availableWorkingDays: payload.availableWorkingDays,
        currentSalary: payload.currentSalary,
        joiningAvailability: payload.joiningAvailability,
        applicationDate: payload.applicationDate || new Date(),
        candidateEmail: payload.candidateEmail,
        candidatePhoneNumber: payload.candidatePhoneNumber,
        candidateCountry: payload.candidateCountry,
        candidateCity: payload.candidateCity,
        position: payload.position,
        currency: payload.currency,
        expectedSalary: payload.expectedSalary,
        preferedWorkingHours: payload.preferedWorkingHours,
        uploadResume: shareLink?.fileId || "",
        createdDate: new Date(),
        createdBy: supervisor.userName,
        createdByRole: supervisor.role,
      });

      // ✅ Check if result has an error before proceeding
      if ("error" in result) {
        return h
          .response({
            message: "Recruitment creation failed",
            error: result.error,
          })
          .code(400);
      }
      if (result) {
        await supervisorRecruitmentList({ event: "create", data: result });
      }
      return h.response(result).code(201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return h
          .response({
            message: "Invalid recruitment payload",
            errors: error.issues,
          })
          .code(400);
      }
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

  async getApplicantRecordById(req: Request, h: ResponseToolkit) {
    const applicantId = z
      .string()
      .regex(/^[a-f\d]{24}$/i, "A valid applicantId is required")
      .safeParse(req.params.applicantId);

    if (!applicantId.success) {
      return h
        .response({
          message: "Invalid applicantId",
          errors: applicantId.error.issues,
        })
        .code(400);
    }

    const result = await getApplicantRecordById(applicantId.data);
    if (isNil(result)) {
      return notFound(recruitmentMessages.USER_NOT_FOUND);
    }

    return result;
  },

  async updateApplicantRecordById(req: Request, h: ResponseToolkit) {
    const validation = updateInputValidation.safeParse({
      payload: req.payload,
    });

    if (!validation.success) {
      return h
        .response({
          message: "Invalid applicant update payload",
          errors: validation.error.issues,
        })
        .code(400);
    }

    const { payload } = validation.data;
    const identity = getAuthenticatedIdentity(req.auth.credentials);
    if (!identity) {
      console.warn(
        "[recruitment:updateApplicantRecordById] Authenticated identity claims are missing or invalid",
        {
          isAuthenticated: req.auth.isAuthenticated,
          ...getAuthenticatedIdentityDiagnostics(req.auth.credentials),
        },
      );
      return forbidden("Authenticated user identity is missing or invalid");
    }

    const supervisor = await users
      .findOne({
        ...userIdentityFilter(identity.subject),
        ...(identity.tenantId ? { tenantId: identity.tenantId } : {}),
        role: "SUPERVISOR",
        status: "Active",
      })
      .select("_id tenantId userName role")
      .lean()
      .exec();
    if (!supervisor || typeof supervisor.tenantId !== "string") {
      return forbidden(
        "Only active supervisors can update recruitment applicants",
      );
    }

    const result = await updateApplicantById(
      String(req.params.applicantId),
      {
        ...payload,
        updatedBy: supervisor.userName,
        updatedByRole: supervisor.role,
      },
      supervisor.tenantId,
      String(supervisor._id),
    );
    if (isNil(result)) {
      return notFound(recruitmentMessages.USER_NOT_FOUND);
    }
    if (result) {
      const supervisorId = result.supervisor.supervisorId;
      await supervisorCardCount({ supervisorId });
      await supervisorRecruitmentList({ event: "update", data: result });
    }
    return result;
  },

  async updateAdminApplicantRecordById(req: Request, h: ResponseToolkit) {
    try {
      const validation = updateAdminInputValidation.safeParse({
        payload: req.payload,
      });
      if (!validation.success) {
        return h
          .response({
            message: "Invalid applicant update payload",
            errors: validation.error.issues,
          })
          .code(400);
      }
      const { payload } = validation.data;
      const identity = getAuthenticatedIdentity(req.auth.credentials);
      if (!identity) {
        console.warn(
          "[recruitment:updateAdminApplicantRecordById] Authenticated identity claims are missing or invalid",
          {
            isAuthenticated: req.auth.isAuthenticated,
            ...getAuthenticatedIdentityDiagnostics(req.auth.credentials),
          },
        );
        return forbidden("Authenticated user identity is missing or invalid");
      }

      const authenticatedUser = await users
        .findOne({
          ...userIdentityFilter(identity.subject),
          ...(identity.tenantId ? { tenantId: identity.tenantId } : {}),
          status: "Active",
        })
        .select("_id tenantId userName email role")
        .lean()
        .exec();
      if (
        !authenticatedUser ||
        typeof authenticatedUser.tenantId !== "string"
      ) {
        return forbidden("Authenticated user is not active in this tenant");
      }

      if (!authenticatedUser.role.includes("ADMIN")) {
        return forbidden("Only admins can approve or reject applicants");
      }

      const result = await updateApplicantByAdminId(String(req.params.id), {
        ...payload,
        tenantId: authenticatedUser.tenantId,
        updatedBy: authenticatedUser.userName,
        updatedByRole: authenticatedUser.role,
      });
      if (isNil(result)) {
        return notFound(recruitmentMessages.USER_NOT_FOUND);
      }
      const supervisorId = result.supervisor.supervisorId;
      if (result.applicationStatus === applicationStatus.REJECTED) {
        if (supervisorId) {
          await supervisorCardCount({ supervisorId });
          await supervisorRecruitmentList({ event: "update", data: result });
        }
        return result;
      }

      const supervisor = await users
        .findById(supervisorId)
        .select("userId")
        .lean()
        .exec();
      if (!supervisor?.userId) {
        throw new Error(
          `Unable to resolve supervisor userId for recruitment ${req.params.id}`
        );
      }

      if (result.applicationStatus === "APPROVED") {
        await supervisorTeacherList({ data: result });
        await supervisorCardCount({ supervisorId });
        await sendNotification({
          messages: `Admin gaves Approval to ${result.candidateFirstName} teacher !.`,
          senderId: req.params.id.toString(),
          senderName: result.candidateFirstName,
          senderEmail: result.candidateEmail,
          isRead: false,
          receiverId: [supervisor.userId],
          receiverName: [result.supervisor.supervisorName],
          receiverEmail: [result.supervisor.supervisorEmail],

          notificationType: "TEACHER_ADDED",
          notificationStatus: "Unseen",
          status: "active",
          createdBy: "system",
          updatedBy: "system",
        });
        await supervisorRecruitmentList({ event: "update", data: result });
      }

      return result;
    } catch (error) {
      if (error instanceof RecruitmentApprovalValidationError) {
        return h.response({ message: error.message }).code(400);
      }
      console.error("Error updating applicant record:", error);
      return h.response({ message: "Internal Server Error" }).code(500);
    }
  },

  async getTeacherList(req: Request, h: ResponseToolkit) {
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
  },
  async getTeacherCountriesCount(req: Request, h: ResponseToolkit) {
    return await getTeacherCountriesCountDetails();
  },

  async getApplicationData(req: Request, h: ResponseToolkit) {
    return await getApplicationStatusData(req.query.fromDate, req.query.toDate);
  },

  async getTeacherDetailsOverview(req: Request, h: ResponseToolkit) {
    return await getTeacherDetailsOverviewCount(req.query.teacherId);
  },
};

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
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
    const workExpMatch = text.match(
      /EXPERIENCE([\s\S]*?)(?=(Education|Skills|Projects|$))/i,
    );
    const workExperience = workExpMatch ? workExpMatch[1].trim() : "Not found";

    return {
      workExperience,
    };
  } catch (error) {
    console.error("Error extracting resume details:", error);
    throw error;
  }
};

function generateAFTCode(preName: string) {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${preName}${num}`;
}
