import AuditLog from "../models/auditlog";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface IAuditLogQuery {
  page: number;
  limit: number;
  logType?: string;
  action?: string;
  userId?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  sortOrder: "asc" | "desc";
}

export const getAuditLogsByTenantService = async (tenantId: string, query: IAuditLogQuery) => {
  const { page, limit, logType, action, search, fromDate, toDate, sortOrder } = query;

  const match: Record<string, any> = { tenantId };

  if (logType) match.logType = logType;
  if (action) match.action = action;

  if (fromDate || toDate) {
    match.createdDate = {};
    if (fromDate) match.createdDate.$gte = fromDate;
    if (toDate) match.createdDate.$lte = toDate;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    match.$or = [{ route: regex }, { description: regex }, { errorMessage: regex }];
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;

  const [records, total] = await Promise.all([
    AuditLog.find(match)
      .select("-stack -meta.headers")
      .sort({ createdDate: sortDir, _id: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(match),
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
