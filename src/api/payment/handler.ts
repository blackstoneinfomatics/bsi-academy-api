import { Request, ResponseToolkit } from "@hapi/hapi";
import Stripe from "stripe";
import { config } from "../../config/env";
import EvaluationModel from "../../models/evaluation";
import { Types } from "mongoose";
import PaymentDetailsModel from "../../models/paymentDetails";
import StudentPortModel from "../../models/alstudents";
import InvoiceModel from "../../models/stinvoice";
import { IClassSchedule } from "../../../types/models.types";
import UserModel from "../../models/users";
import ClassScheduleModel from "../../models/classShedule";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import Course from "../../models/course";
import { sendInvoiceEvent } from "../../kafka/producers/adminProducer";
import {
  academicDashboardCard,
  academicStudentList,
  academicStudentProfile,
} from "../../kafka/producers/academicProducer";
import { sendEmailClient } from "../../shared/email";
import EmailTemplate from "../../models/emailTemplate";

export const createPaymentIntent = async (
  request: Request,
  h: ResponseToolkit
) => {
  console.log("Received request payload:", request.payload);

  const { amount, currency, evaluationId, paymentIntentResponse }: any =
    request.payload;
  const stripe = new Stripe(config.stripeKey.stripesecretkey);

  try {
    console.log("Finding evaluation details for evaluationId:", evaluationId);

    let evaluationDetails = await EvaluationModel.findOne({
      _id: evaluationId,
    });

    console.log("Evaluation Details:", evaluationDetails);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });
    if (paymentIntentResponse) {
      const savePaymentDetails = PaymentDetailsModel.create({
        userId: evaluationDetails?.student.studentId,
        userName: evaluationDetails?.student.studentFirstName,
        paymentStatus: paymentIntentResponse
          ? paymentIntentResponse.status
          : "Pending",
        paymentAmount: paymentIntent.amount,
        paymentResponse: paymentIntentResponse,
        paymentResponseId: paymentIntent.client_secret,
        paymentDate: new Date(),
        status: "Active",
        createdBy: "System",
      });
      (await savePaymentDetails).save();

      const studentpaymentstatus = paymentIntentResponse.status == "succeeded" ? "PAID" : "FAILED";
      const invoicePayload = InvoiceModel.create({
        student: {
          studentId: evaluationDetails?.student?.studentId || "",
          studentName: `${evaluationDetails?.student?.studentFirstName ?? ""} ${evaluationDetails?.student?.studentLastName ?? ""
            }`,
          studentEmail: evaluationDetails?.student?.studentEmail,
          studentPhone: evaluationDetails?.student?.studentPhone,
          country: evaluationDetails?.student?.studentCountry,
          city: evaluationDetails?.student?.studentCity,
        },
        courseName: evaluationDetails?.student?.learningInterest,
        amount: evaluationDetails?.planTotalPrice || 0,
        invoiceStatus: studentpaymentstatus || "",
        paymentStatus: studentpaymentstatus || "",
        status: "Active",
        createdBy: "System",
        lastUpdatedBy: evaluationDetails?.updatedBy || "System",
      });

      const result = (await invoicePayload).save();
      await sendInvoiceEvent(result);
      console.log(result);
    }

    const updateEvaluationDetails = await EvaluationModel.findByIdAndUpdate(
      evaluationDetails?._id,
      {
        paymentStatus:
          paymentIntentResponse.status == "succeeded" ? "PAID" : "FAILED",
      },
      { new: true }
    );
    console.log("updateEvaluationDetails>>", updateEvaluationDetails);
    if (
      paymentIntentResponse.status == "succeeded" &&
      evaluationDetails &&
      evaluationDetails.studentStatus == "JOINED" &&
      evaluationDetails.classStatus == "COMPLETED"
    ) {
      const result = await createStudentPortal(updateEvaluationDetails);
      const academicCoachId = updateEvaluationDetails?.academicCoachId;
      await academicDashboardCard({ academicCoachId });
      await academicStudentList({
        event: "update",
        data: updateEvaluationDetails,
        sender: academicCoachId,
      });
      await academicStudentProfile({ data: result, sender: academicCoachId });
    }

    return h.response({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Error in createPaymentIntent:", err);
    return h.response({ error: err }).code(400);
  }
};

interface WeeklySlot {
  from: string;
  to: string;
}

type WeeklySlots = Record<string, WeeklySlot[]>;
async function createStudentPortal(updatedEvaluation: any) {
  try {
    const specialChars = "@#$%&*!";
    const randomNum = Math.floor(Math.random() * 1000); // Random number between 0-999
    const randomSpecial =
      specialChars[Math.floor(Math.random() * specialChars.length)]; // Random special character

    // Generate password
    const firstThreeChars =
      updatedEvaluation.student.studentFirstName.substring(0, 3); // First 3 characters of the first name
    const reversedUsername = updatedEvaluation.student.studentFirstName
      .split("")
      .reverse()
      .join(""); // Reverse the first name

    const password = `${firstThreeChars}${randomSpecial}${randomNum}${reversedUsername}`;

    const courseDetails = await Course.findOne({
      courseName: updatedEvaluation.student.learningInterest,
    }).exec();
    // Create student portal entry
    const studentPortal = await StudentPortModel.create({
      student: {
        studentName: `${updatedEvaluation.student.studentFirstName} ${updatedEvaluation.student.studentLastName}`,
        studentId: updatedEvaluation.student.studentId,
        studentEmail: updatedEvaluation.student.studentEmail,
        studentPhone: updatedEvaluation.student.studentPhone,
        course: updatedEvaluation.student.learningInterest,
        package: updatedEvaluation.subscription.subscriptionName,
        city: updatedEvaluation.student.studentCity,
        country: updatedEvaluation.student.studentCountry,
        gender: updatedEvaluation.student.studentGender,
      },
      username: `${updatedEvaluation.student.studentFirstName} ${updatedEvaluation.student.studentLastName}`,
      sessionClassType: updatedEvaluation.classType,
      level: "1",
      password: password,
      role: "Student",
      status: "Active",
      createdDate: new Date(),
      createdBy: updatedEvaluation.createdBy,
      updatedDate: new Date(),
    });

    console.log("Student portal created:", studentPortal);

    // Validate payload
    //const classDay, startTime, endTime, startDate, endDate }  = classSchedule;
    if (updatedEvaluation.classType == "REGULARCLASS") {
      const weeklySlotsRaw = updatedEvaluation.weeklySlots;

      const weeklySlots: WeeklySlots =
        weeklySlotsRaw instanceof Map
          ? Object.fromEntries(weeklySlotsRaw.entries())
          : weeklySlotsRaw;

      const results: (IClassSchedule | { error: any })[] = [];

      // ✅ Loop over days
      for (const [day, slots] of Object.entries(weeklySlots)) {
        console.log("Processing day:", day);
        console.log("Slots:", slots);

        for (const slot of slots) {
          const start = slot.from;
          const end = slot.to;
          try {
            // Student & teacher lookup
            const studentDetails = await StudentPortModel.findById(
              studentPortal._id
            ).exec();

            if (!studentDetails) throw new Error("Student details not found");

            const teacherDetails = await UserModel.findOne({
              role: "TEACHER",
              userId: updatedEvaluation.teacher.teacherId,
            }).exec();

            // Day to numeric index
            const dayIndex = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].indexOf(day);

            if (dayIndex === -1) {
              throw new Error(`Invalid classDay: ${day}`);
            }

            // Get all dates for this weekday in range
            const classDates = getDatesForWeekdays(
              new Date(updatedEvaluation.classStartDate),
              new Date(updatedEvaluation.classEndDate),
              dayIndex
            );

            const meetingId = `RC-${studentDetails.student.studentId}`;

            for (const classDate of classDates) {
              const generateClassId = generateAFTCode("AFCL");
              const newClassSchedule = new ClassScheduleModel({
                classId: generateClassId,
                student: {
                  id: studentDetails._id,
                  studentId: studentDetails.student.studentId,
                  studentFirstName: studentDetails.username,
                  studentLastName: studentDetails.username,
                  studentEmail: studentDetails.student.studentEmail,
                  gender: studentDetails.student.gender,
                  package: updatedEvaluation.subscription?.subscriptionName,
                  studnetSessionStart: null,
                  studnetSessionEnd: null,
                  level: studentDetails.level,
                },
                teacher: {
                  teacherId: teacherDetails?.userId,
                  teacherName: teacherDetails?.userName,
                  teacherEmail: teacherDetails?.email,
                  teacherSessionStart: null,
                  teacherSessionEnd: null
                },
                classhour: 0,
                amount: 0,
                currency: "$",
                sessionClassType: updatedEvaluation.classType,
                sessionStarttime: "",
                sessionsEndtime: "",
                teacherAttendee: "",
                studentAttendee: "",
                sessionStatus: "NotCompleted",
                classLink: meetingId,
                classDay: day,
                startTime: start,
                endTime: end,
                course: {
                  courseId: courseDetails?._id,
                  courseName: courseDetails?.courseName,
                },
                package: studentDetails.student.package,
                totalHourse: updatedEvaluation.hours,
                startDate: classDate,
                endDate: classDate,
                createdBy: updatedEvaluation.createdBy,
                status: "Active",
                scheduleStatus: "Scheduled",
                totalHours: updatedEvaluation.accomplishmentTime,
                preferredTeacher: updatedEvaluation.student?.preferredTeacher,
              });

              const saved = await newClassSchedule.save();
              await createEvent(saved);
              results.push(saved);

            }
          } catch (error) {
            results.push({ error });
          }
        }
      }

    }
    await StudentPortalMail(studentPortal);
    return {
      studentdetails: studentPortal,
      teacherId: updatedEvaluation.teacher.teacherId,
      teacherName: updatedEvaluation.teacher.teacherName,
    };
  } catch (error) {
    console.error("Error in createStudentPortal:", error);
    throw error;
  }
}

async function StudentPortalMail(studentPortal: any) {
  try {
    const emailTemplate = await EmailTemplate.findOne({
      templateKey: "Student Portal",
    }).exec();
    if (emailTemplate) {
      const emailTo = [{ email: studentPortal.student.studentEmail }];
      const subject = "Welcome To Blackstone Infomatics";
      const htmlPart = emailTemplate.templateContent
        .replace("<username>", studentPortal.username)
        .replace("<username>", studentPortal.username)
        .replace("<password>", studentPortal.password)
        .replace("<course>", studentPortal.student.course)
        .replace("<package>", studentPortal.student.package)
        .replace("<refernceId>", studentPortal.classDay)
        .replace("<portalLink>", "https://blackstoneinfomaticstech.com/student/ui/sign");
      console.log("emailTemplate>>>>", emailTemplate);
      sendEmailClient(emailTo, subject, htmlPart);
    }
  } catch (error) {
    console.error("Mail not sented to the Student");
    throw error;
  }
}

export const createStudentPaymentIntent = async (
  request: Request,
  h: ResponseToolkit
) => {
  console.log("Received request payload:", request.payload);

  const { amount, currency, invoiceId, paymentIntentResponse }: any =
    request.payload;
  const stripe = new Stripe(config.stripeKey.stripesecretkey);
  try {
    console.log("Finding invoice details for invoiceId:", invoiceId);

    let InvoiceDetails = await InvoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
    });


    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });


    if (paymentIntentResponse) {
      console.log("Saving payment details...");

      const savePaymentDetails = await PaymentDetailsModel.create({
        userId: InvoiceDetails?.student.studentId,
        userName: InvoiceDetails?.student.studentName,
        paymentStatus: paymentIntentResponse
          ? paymentIntentResponse.status
          : "Pending",
        paymentAmount: paymentIntent.amount,
        paymentResponse: paymentIntentResponse,
        paymentResponseId: paymentIntent.client_secret,
        paymentDate: "",
        createdDate: new Date(),
        status: "Active",
        createdBy: "System",
      });

      console.log("Saved Payment Details:", savePaymentDetails);

      console.log("Updating invoice status...");

      const updateInvoice = await InvoiceModel.findByIdAndUpdate(
        invoiceId,

        {
          invoiceStatus:
            paymentIntentResponse.status === "succeeded" ? "Paid" : "Completed",
          ...(paymentIntentResponse.status === "succeeded" && {
            paymentDate: new Date(paymentIntentResponse.created * 1000),
          }),
        },
        { new: true }
      );

      console.log("Updated Invoice Status:", updateInvoice);
    }

    console.log("Returning clientSecret to frontend...");

    return h.response({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Error in createStudentPaymentIntent:", err);
    return h.response({ error: err }).code(400);
  }
};

// Helper function to get dates for specific weekdays between two dates
const getDatesForWeekdays = (
  startDate: Date,
  endDate: Date,
  targetDay: number
): Date[] => {
  console.log("startDate", startDate);
  console.log("endDate", endDate);
  console.log("targetDay", targetDay);
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (currentDate.getDay() === targetDay) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

// Initialize Microsoft Graph Client
const client = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async (): Promise<string> => {
      const tokenResponse = await credential.getToken(
        "https://graph.microsoft.com/.default"
      );
      return tokenResponse.token;
    },
  },
});
const {
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_TENANT_ID,
}: any = process.env;

const credential = new ClientSecretCredential(
  MICROSOFT_TENANT_ID,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET
);

async function createEvent(newClassSchedule: any): Promise<void> {
  console.log("newClassSchedule>>>>", newClassSchedule);
  const event = {
    subject: "Team Meeting",
    body: {
      contentType: "HTML",
      content: "Discuss project updates and next steps.",
    },
    start: {
      dateTime: new Date(newClassSchedule.startDate).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: new Date(newClassSchedule.endDate).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    location: {
      displayName: "Conference Room 1",
    },
    attendees: [
      {
        emailAddress: {
          address: newClassSchedule.student.studentEmail,
          name: newClassSchedule.studentFirstName,
        },
        type: "required",
      },
      {
        emailAddress: {
          address: newClassSchedule.teacher.teacherEmail,
          name: newClassSchedule.teacher.teacherEmail,
        },
        type: "required",
      },
    ],
    allowNewTimeProposals: true,
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
  };

  try {
    const userId = "tech@alfurqan.academy";
    const response = await client
      .api(`/users/${userId}/calendar/events`)
      .post(event);
    console.log("Event created successfully:", response.id);

    console.log("Event created successfully:", response.id);
  } catch (error: any) {
    console.error("Error creating event:", error);
    if (error) {
      console.error("Response body:", error);
      console.error("Response headers:", error);
    } else {
      console.error("Error message:", error);
    }
  }

}
function generateAFTCode(preName: string) {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${preName}${num}`;
}
