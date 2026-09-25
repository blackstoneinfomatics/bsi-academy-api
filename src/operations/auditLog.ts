import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import AuditLog from "../models/auditlog";
import { auditLogMessages } from "../config/messages";
import { ensureTenantExists, resolveTenantTimeZone } from "./tenants";

dayjs.extend(utc);
dayjs.extend(timezone);

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

// ---------------------------------------------------------------------------
// Tenant Active Logs dashboard (summary cards, status donut, logs table)
// ---------------------------------------------------------------------------

export interface ITenantActivityStatusItem {
  name: string;
  count: number;
  percentage: number;
}

export interface ITenantActivitySummary {
  activityStatus: {
    total: number;
    items: ITenantActivityStatusItem[];
  };
  summary: {
    successful: number;
    warning: number;
    failed: number;
    totalActivities: number;
    uniqueUsers: number;
    todayActivities: number;
  };
}

export interface ITenantActivityRow {
  user: string | null;
  role: string | null;
  category: string | null;
  date: Date;
  ipAddress: string | null;
  details: string | null;
  status: string | null;
  dateTime: Date;
  action: string | null;
}

export interface ITenantActivityTable {
  activities: ITenantActivityRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const TECHNICAL_HTTP_METHODS = ["options", "OPTIONS", "head", "HEAD"];
const ANONYMOUS_USER_ID = "anonymous";

// Shared by the summary and the table so both report the same records.
// Leads with tenantId so it can use a { tenantId, createdDate } index.
const buildTenantActivityMatch = (tenantId: string) => ({
  tenantId,
  "meta.method": { $nin: TECHNICAL_HTTP_METHODS },
});

const LOG_STATUS_LABELS: Record<string, string> = {
  SUCCESS: auditLogMessages.LOG_STATUS_SUCCESS,
  ERROR: auditLogMessages.LOG_STATUS_FAILED,
  REDIRECT: auditLogMessages.LOG_STATUS_REDIRECT,
  INFO: auditLogMessages.LOG_STATUS_INFO,
};

// Only for route segments whose display name differs from their title-cased form.
const ROUTE_SEGMENT_CATEGORY_OVERRIDES: Record<string, string> = {
  "live-class": "Live Classes",
};

const toTitleCase = (segment: string): string =>
  segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// Prefers the module recorded in meta.module, else the first route segment
// (/finance/transactions -> Finance).
export const resolveAuditLogCategory = (
  route?: string | null,
  meta?: { module?: unknown } | null,
): string | null => {
  if (typeof meta?.module === "string" && meta.module.trim()) {
    return meta.module.trim();
  }

  const segment = route
    ?.split("/")
    .find((part) => part && !part.startsWith("{"))
    ?.toLowerCase();

  if (!segment) return null;

  return ROUTE_SEGMENT_CATEGORY_OVERRIDES[segment] ?? toTitleCase(segment);
};

const toPercentage = (count: number, total: number): number =>
  total > 0 ? Math.round((count / total) * 10000) / 100 : 0;

export const getTenantActivitySummaryService = async (
  tenantId: string,
): Promise<ITenantActivitySummary> => {
  const tenant = await ensureTenantExists(tenantId);
  const timeZone = resolveTenantTimeZone(tenant.timeZone);
  const startOfToday = dayjs().tz(timeZone).startOf("day");

  const [result] = await AuditLog.aggregate<{
    byLogType: { _id: string; count: number }[];
    uniqueUsers: { count: number }[];
    today: { count: number }[];
  }>([
    { $match: buildTenantActivityMatch(tenantId) },
    {
      $facet: {
        byLogType: [{ $group: { _id: "$logType", count: { $sum: 1 } } }],
        uniqueUsers: [
          { $match: { userId: { $nin: [ANONYMOUS_USER_ID, null, ""] } } },
          { $group: { _id: "$userId" } },
          { $count: "count" },
        ],
        today: [
          {
            $match: {
              createdDate: {
                $gte: startOfToday.toDate(),
                $lt: startOfToday.add(1, "day").toDate(),
              },
            },
          },
          { $count: "count" },
        ],
      },
    },
  ]);

  const countByLogType = new Map(
    (result?.byLogType ?? []).map(({ _id, count }) => [_id, count]),
  );
  const totalActivities = [...countByLogType.values()].reduce((sum, count) => sum + count, 0);
  const successful = countByLogType.get("SUCCESS") ?? 0;
  const failed = countByLogType.get("ERROR") ?? 0;
  // AuditLog.logType has no WARNING value and nothing in the project maps another type to one.
  const warning = 0;

  return {
    activityStatus: {
      total: totalActivities,
      items: [
        { name: auditLogMessages.ACTIVITY_STATUS_SUCCESSFUL, count: successful },
        { name: auditLogMessages.ACTIVITY_STATUS_WARNING, count: warning },
        { name: auditLogMessages.ACTIVITY_STATUS_FAILED, count: failed },
      ].map((item) => ({ ...item, percentage: toPercentage(item.count, totalActivities) })),
    },
    summary: {
      successful,
      warning,
      failed,
      totalActivities,
      uniqueUsers: result?.uniqueUsers[0]?.count ?? 0,
      todayActivities: result?.today[0]?.count ?? 0,
    },
  };
};

export const getTenantActivityTableService = async (
  tenantId: string,
  page: number,
  limit: number,
): Promise<ITenantActivityTable> => {
  await ensureTenantExists(tenantId);

  const match = buildTenantActivityMatch(tenantId);

  const [logs, total] = await Promise.all([
    AuditLog.find(match)
      .select("userId role route meta.module ip description logType action createdDate")
      .sort({ createdDate: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(match),
  ]);

  const activities: ITenantActivityRow[] = logs.map((log) => ({
    user: log.userId ?? null,
    role: log.role ?? null,
    category: resolveAuditLogCategory(log.route, log.meta),
    date: log.createdDate,
    ipAddress: log.ip ?? null,
    details: log.description ?? null,
    status: LOG_STATUS_LABELS[log.logType] ?? log.logType ?? null,
    dateTime: log.createdDate,
    action: log.action ?? null,
  }));

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
