import BillingModel from "../models/billing";
import { CreateBillingPayload } from "../models/billing";

export interface GetBillingsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  paymentMethod?: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: "paymentDate" | "billingName" | "amount" | "createdAt";
  sortOrder?: "asc" | "desc";
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// CREATE BILLING
export const createBilling = async (payload: CreateBillingPayload) => {
  const newBilling = new BillingModel(payload);

  return await newBilling.save();
};

// GET BILLING LIST
export const getBillings = async (query: GetBillingsQuery = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    category,
    paymentMethod,
    fromDate,
    toDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  const filter: Record<string, unknown> = {
    deletedAt: null,
  };

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  if (fromDate || toDate) {
    filter.paymentDate = {
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    };
  }

  if (search) {
    const escapedSearch = escapeRegex(search.trim());

    filter.$or = [
      { billingName: { $regex: escapedSearch, $options: "i" } },
      { category: { $regex: escapedSearch, $options: "i" } },
      { paymentMethod: { $regex: escapedSearch, $options: "i" } },
      { addedBy: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const [items, totalRecords] = await Promise.all([
    BillingModel.find(filter)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean()
      .exec(),
    BillingModel.countDocuments(filter),
  ]);
  const totalCount = await BillingModel.countDocuments(filter);
  return {
    items,
    pagination: {
      totalCount,
      page: normalizedPage,
      limit: normalizedLimit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / normalizedLimit),
      hasNextPage: normalizedPage * normalizedLimit < totalRecords,
      hasPreviousPage: normalizedPage > 1,
    },
  };
};

// GET BILLING BY ID
export const getBillingById = async (id: string) => {
  const totalCount = await BillingModel.countDocuments({ _id: id, deletedAt: null });
  return await BillingModel.findOne({
    _id: id,
    deletedAt: null,
     totalCount,
  }).lean();
};


