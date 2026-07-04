import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import { zodAlStudentInvoiceSchemaValidation, zodAlStudentPaymentSchemaValidation } from "../../shared/zod_schema_validation";
import getstudentInvoiceList, { getAllStudetnInVoiceList, getAllTotalInvoice, getInvoiceCounts, getInvoiceDueDateBuckets, getStudentAllRevenue, getStudentInvoicesByAlStudentId, getTotalAmountByCountry, getTotalAmountByCourse, sendInvoiceOperation } from "../../operations/invoice";
import { isNil } from "lodash";
import { notFound } from "@hapi/boom";
import { evaluationMessages } from "../../config/messages";
import { zodAlStudentInvoiceSchema } from "../../models/stinvoice";
import { getPaymentHistory } from "../../operations/payment_history";
import paymentDetails from "../../models/paymentDetails";
import { PaymentCryptographyData } from "aws-sdk";

const createInvoiceValidation = z.object({
  payload: z.object({
    student: zodAlStudentInvoiceSchema.shape.student,
    evaluationData: z.any().optional(), // <-- add this line
    ...zodAlStudentInvoiceSchema.pick({
      courseName: true,
      amount: true,
      invoiceStatus: true,
      packageType: true,
      itemDescription: true,
      duration: true,
      rate: true,
      description: true,
      attachFile: true,
      dueDate: true,
      status: true,
      createdBy: true,
      lastUpdatedBy: true,
    }).shape,
  }),
});

const geStudentListInputValidation = z.object({
  query: zodAlStudentInvoiceSchemaValidation.pick({
    sortBy: true,
    sortOrder: true,
    offset: true,
    limit: true,
    type: true,
    year: true,
  }),
});
const geStudentPaymentHistoryValidation = z.object({
  query: zodAlStudentPaymentSchemaValidation.pick({
  userId: true,
  userName: true,
  paymentStatus: true,
  paymentAmount: true,
  paymentDate: true,
  status: true,
  sortBy: true,
  sortOrder: true,
  offset: true,
  limit: true,
  searchText: true
  }),
});
  


export default {
  // Retrieve all the Evaluation list
  getAllStudetnInVoiceList(req: Request, h: ResponseToolkit) {
    const { query } = geStudentListInputValidation.parse({
      query: {
        ...req.query,
      },
    });
    return getAllStudetnInVoiceList(query);
  },

  async getStudentInvoicesByQuery(req: Request, h: ResponseToolkit) {
    const { studentId ,courseName } = req.query;

    if (!studentId && !courseName) {
      return h.response({ error: "studentId and courseName query param is required" }).code(400);
    }

    const invoices = await getStudentInvoicesByAlStudentId(studentId as string , courseName as string);

    return h.response({
      count: invoices.length,
      data: invoices,
    }).code(200);
  }


  ,


  async getAllStudentRevenue(req: Request, h: ResponseToolkit) {
    // Parse the query parameters from the request
    const { query } = geStudentListInputValidation.parse({
      query: {
        ...req.query,
      },
    });

    // Extract the 'type' or 'dateRange' and 'year' (as a date string) from the parsed query object
    const { type = "year", year = new Date().toISOString().split("T")[0] } = query; // Default to today's date as string

    // Call the getStudentAllRevenue function and pass the 'type' (dateRange) and 'year' (as date string)
    const revenueData = await getStudentAllRevenue(type, year);

    // Return the revenue data in the response
    return h.response({
      success: true,
      data: revenueData,
    });
  },

  async getTotalAmountByCountry(req: Request, h: ResponseToolkit) {
    const { query } = geStudentListInputValidation.parse({
      query: {
        ...req.query,
      },
    });

    return getTotalAmountByCountry(query.type); // ✅ Only pass `type`
  },

  async getTotalAmountByCourse(req: Request, h: ResponseToolkit) {
    const { query } = geStudentListInputValidation.parse({
      query: {
        ...req.query,
      },
    });

    return getTotalAmountByCourse(query.type); // ✅ Only pass `type`
  },

  async sendInvoice(req: Request, h: ResponseToolkit) {
    try {
      // Log incoming request data for debugging
      console.log("Incoming request payload:", req.payload);

      // Parse incoming data using Zod validation
      const parsed = createInvoiceValidation.safeParse({ payload: req.payload });

      if (!parsed.success) {
        console.log("Zod validation failed:", parsed.error.flatten().fieldErrors);
        return h
          .response({ success: false, error: parsed.error.flatten().fieldErrors })
          .code(400);
      }

      const payload = parsed.data.payload;

      const dueDate = payload.dueDate ? new Date(payload.dueDate).toISOString() : undefined;// Current date in ISO format
      const lastUpdatedDate = new Date().toISOString(); // Current date in ISO format

      let attachFileBuffer: Buffer | undefined;

      if (payload.attachFile) {
        if (typeof payload.attachFile === "string") {
          // If it's a base64 string, convert it
          attachFileBuffer = Buffer.from(payload.attachFile, 'base64');
        } else if (Buffer.isBuffer(payload.attachFile)) {
          // If it's already a Buffer, just use it
          attachFileBuffer = payload.attachFile;
        } else {
          console.log("Invalid file format for attachFile");
          return h
            .response({ success: false, error: "attachFile must be base64 string or Buffer" })
            .code(400);
        }
      }

      // Debugging: Log the parsed payload before passing it to the operation
      console.log("Parsed payload before sending invoice:", payload);

      const result = await sendInvoiceOperation({
        student: {
          studentId: payload.student?.studentId ?? "",
          studentName: payload.student?.studentName ?? "",
          studentEmail: payload.student?.studentEmail ?? "",
          studentPhone: payload.student?.studentPhone ?? "",
          country: payload.student?.country ?? "",
          city: payload.student?.city ?? "",
        },
        evaluationData: payload.evaluationData, // <-- FIXED
        courseName: payload.courseName ?? "",
        amount: payload.amount ?? 0,
        paymentDate:undefined,
        invoiceStatus: payload.invoiceStatus ?? "Pending",
        packageType: payload.packageType ?? "",
        itemDescription: payload.itemDescription ?? "",
        duration: payload.duration ?? "",
        rate: payload.rate ?? "",
        description: payload.description ?? "",
        attachFile: attachFileBuffer,
        dueDate: dueDate,  // validated and parsed
        status: payload.status ?? "Active",
        createdDate: new Date().toISOString(),  // always use current date for createdDate
        createdBy: payload.createdBy ?? "System",  // default to "System" if missing
        lastUpdatedDate: lastUpdatedDate,  // always use current date for lastUpdatedDate
        lastUpdatedBy: payload.lastUpdatedBy ?? "System",  // default to "System" if missing
      } as any);

      // Debugging: Log the result of the operation
      console.log("Result from sendInvoiceOperation:", result);

      // If an error occurs during the operation, return the error message
      if ("error" in result) {
        console.log("Error during sendInvoiceOperation:", result.error);
        return h.response({ success: false, error: result.error }).code(400);
      }

      // Return success message with created invoice data
      console.log("Invoice created successfully:", result.invoice);
      return h
        .response({
          success: true,
          message: "Invoice created successfully",
          data: result.invoice,
        })
        .code(201);
    } catch (error) {
      // Log any internal server errors
      console.error("Handler error in sendInvoice:", error);
      return h.response({ success: false, error: "Failed to send invoice" }).code(500);
    }
  },
  async getallstudentinvoiceList(req: Request, h: ResponseToolkit) {
    try {
      const result = await getstudentInvoiceList();  // No filters passed

      return h.response({
        status: 'success',
        data: result,
      }).code(200);
    } catch (error) {
      console.error(error);
      return h.response({ message: 'Internal Server Error' }).code(500);
    }
  },

  async getTotalInvoice(req: Request, h: ResponseToolkit) {
    // No query params, no input needed
    const revenueData = await getAllTotalInvoice();

    return h.response({
      success: true,
      data: revenueData,
    });
  },

  async getInvoiceCounts(req: Request, h: ResponseToolkit) {
    // No query params, no input needed
    const revenueData = await getInvoiceCounts();

    return h.response({
      success: true,
      data: revenueData,
    });
  },
  async getInvoiceDueDateBuckets(req: Request, h: ResponseToolkit) {
    // No query params, no input needed
    const revenueData = await getInvoiceDueDateBuckets();

    return h.response({
      success: true,
      data: revenueData,
    });
  },


 async getStudentPaymentHistory(req: Request, h: ResponseToolkit) {
  try {
    const userId = req.query.userId as string;
    const sortBy = (req.query.sortBy as string) || "createdDate";
    const sortOrder = (req.query.sortOrder as string) || "desc";
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    if (!userId) {
      return h.response({ message: "userId is required in query params" }).code(400);
    }

    const result = await getPaymentHistory({ userId, sortBy, sortOrder, offset, limit });

    return h.response(result).code(200);
  } catch (error) {
    console.error("❌ Error fetching payment history:", error);
    return h.response({ message: "Server error" }).code(500);
  }
}

}
  
  





