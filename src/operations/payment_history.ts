import { isNil } from "lodash";
import { Types } from "mongoose";
import { IPaymentDetails } from "../../types/models.types";
import AppLogger from "../helpers/logging";
import { GetPaymentDetailsRecordsParams } from "../shared/enum";
import { commonMessages, evaluationMessages } from "../config/messages";
import PaymentDetailsModel from "../models/paymentDetails";
import alstudents from "../models/alstudents";
import EvaluationModel from "../models/evaluation";

export const getPaymentHistory = async (
  params: GetPaymentDetailsRecordsParams
): Promise<{ totalCount: number; paymentDetails: IPaymentDetails[] }> => {
  const { userId, sortBy = "createdDate", sortOrder = "desc", offset, limit } = params;

  console.log("🔍 Incoming userId from query params:", userId);

  if (!userId) {
    return { totalCount: 0, paymentDetails: [] };
  }

  // Find the student by studentId
  let alStudent;
  try {
    alStudent = await alstudents.findOne({ "student.studentId": userId }).lean();
    console.log("🎯 Matched alstudent by studentId:", alStudent);

    if (!alStudent) {
      AppLogger.warn("AlStudent not found for given student ID", { studentId: userId });
      return { totalCount: 0, paymentDetails: [] };
    }
  } catch (err) {
    AppLogger.error("Error fetching alstudent", { userId, error: err });
    return { totalCount: 0, paymentDetails: [] };
  }

  // Build payment query
  let query: any = { userId: alStudent.student.studentId };
  const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const applyPagination = (q: any) => {
    if (!isNil(offset) && !isNil(limit)) {
      const skip = Math.max(
        0,
        ((Number(offset) ?? Number(commonMessages.OFFSET)) - 1) *
          (Number(limit) ?? Number(commonMessages.LIMIT))
      );
      q.skip(skip).limit(Number(limit) ?? Number(commonMessages.LIMIT));
    }
    return q;
  };

  let paymentQuery = applyPagination(PaymentDetailsModel.find(query).sort(sortOptions));

  let [paymentDetails, totalCount] = await Promise.all([
    paymentQuery.exec(),
    PaymentDetailsModel.countDocuments(query).exec(),
  ]);

  console.log("📦 Fetched payment details (by studentId):", paymentDetails.length);
  console.log("🔢 Total count:", totalCount);

  // Fallback to evaluation IDs if no payments found
  if (totalCount === 0) {
    console.log("⚠️ No payments found by studentId, trying by evaluations...");

    const evaluations = await EvaluationModel.find({
      "student.studentId": alStudent.student.studentId,
    }).select("_id");

    const evaluationIds = evaluations.map(e => e._id);
    if (evaluationIds.length === 0) {
      console.log("⚠️ No evaluations found for this student");
      return { totalCount: 0, paymentDetails: [] };
    }

    query = { userId: { $in: evaluationIds } };
    const fallbackPaymentQuery = applyPagination(PaymentDetailsModel.find(query).sort(sortOptions));

    [paymentDetails, totalCount] = await Promise.all([
      fallbackPaymentQuery.exec(),
      PaymentDetailsModel.countDocuments(query).exec(),
    ]);

    // Map userId back to studentId for consistency
    paymentDetails = paymentDetails.map((payment: { toObject: () => any; }) => ({
      ...payment.toObject(), // convert Mongoose doc to plain object
      userId: alStudent.student.studentId,
    }));

    console.log("📦 Fetched payment details (by evaluation IDs):", paymentDetails.length);
    console.log("🔢 Total count:", totalCount);
  }

  // Add course info to each payment
  const course = alStudent.student.course || "N/A";
  const updatedPaymentDetails: IPaymentDetails[] = paymentDetails.map((payment: any) => ({
    ...payment,
    course,
  }));

  AppLogger.info(evaluationMessages.GET_ALL_LIST_SUCCESS, { totalCount });

  return {
    totalCount,
    paymentDetails: updatedPaymentDetails,
  };
};
;

