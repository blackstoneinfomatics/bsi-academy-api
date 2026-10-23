import { badRequest, conflict, forbidden, notFound } from "@hapi/boom";
import type { FilterQuery, UpdateQuery } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import type { ITicketAttachment } from "../../types/models.types";
import ClassScheduleModel from "../models/classShedule";
import AlStudentModel from "../models/alstudents";
import { Lookup } from "../models/lookup";
import RoleAccessModel from "../models/roleacces";
import StudentModel from "../models/student";
import TicketModel from "../models/tickets";
import type { ITicketDocument } from "../models/tickets";
import TrialMemberModel from "../models/trailmember";
import UserModel from "../models/users";
import { appStatus } from "../config/messages";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../shared/enum";
import AppLogger from "../helpers/logging";
import {
  NotificationAuthorizationError,
  sendNotification,
} from "./notification";

interface TicketAccount {
  userId: string;
  tenantId: string;
  userName: string;
  email: string;
  role: string[];
}

export interface TicketActor {
  accountId: string;
  userId: string;
  tenantId: string;
  userName: string;
  email: string;
  role: string[];
}

export interface CreateTicketInput {
  subject: string;
  category: TICKET_CATEGORIES;
  priority?: TICKET_PRIORITIES;
  relatedTo?: string;
  description: string;
  attachments?: ITicketAttachment[];
}

export interface TicketListInput {
  view: "received" | "raised";
  page: number;
  limit: number;
  sortBy: "createdAt" | "updatedAt" | "ticketNumber" | "priority" | "status";
  sortOrder: "asc" | "desc";
  status?: TICKET_STATUSES;
  category?: TICKET_CATEGORIES;
  priority?: TICKET_PRIORITIES;
}

const normalized = (role: string) =>
  role.trim().toUpperCase().replace(/[\s-]+/g, "_");

const getRecipientRole = (creatorRole: string): string => {
  switch (normalized(creatorRole)) {
    case "admin":
      return "SUPERADMIN";

    case "teacher":
      return "ADMIN";

    case "student":
      return "TEACHER";

    default:
      return "ADMIN";
  }
};

const findTicketRecipients = async (
  tenantId: string,
  recipientRole: string,
  creatorId: string,
): Promise<string[]> => {
  const rolePattern = new RegExp(
    `^${recipientRole.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i",
  );

  const query = {
    tenantId,
    status: appStatus.ACTIVE,
    role: { $in: [rolePattern] },
    userId: { $ne: creatorId },
  };

  const [users, trialMembers] = await Promise.all([
    UserModel.find(query).select("userId").lean(),
    TrialMemberModel.find(query).select("userId").lean(),
  ]);

  return [
    ...new Set(
      [...users, ...trialMembers]
        .map((user) => user.userId)
        .filter((id): id is string => Boolean(id?.trim())),
    ),
  ];
};

const hasTenantAdminAccess = (accessValue: unknown): boolean =>
  !!accessValue &&
  typeof accessValue === "object" &&
  (accessValue as { admin?: unknown }).admin === true;


const accountFromCredentials = async (
  credentials: unknown,


): Promise<{ actor: TicketActor; account: TicketAccount }> => {
  if (!credentials || typeof credentials !== "object") {
    console.warn("[tickets:identity] Credentials are missing or invalid");
    throw forbidden("Authenticated account is unavailable");
  }

  const claims = credentials as Record<string, unknown>;
  const { sub, tenantId } = claims;
  const hasCustomUserId =
    typeof claims.userId === "string" && !!claims.userId.trim();
  const accountId =
    typeof claims.userId === "string" && claims.userId.trim()
      ? claims.userId
      : sub;
  console.info("[tickets:identity] Credentials inspected", {
    hasSub: typeof sub === "string" && !!sub.trim(),
    hasCustomUserId,
    customUserId: hasCustomUserId ? claims.userId : undefined,
    tenantId,
  });
  console.info("[tickets:identity] Account lookup ID selected", {
    source: hasCustomUserId ? "credentials.userId" : "credentials.sub fallback",
    accountId,
  });
  if (
    typeof sub !== "string" ||
    typeof tenantId !== "string" ||
    typeof accountId !== "string" ||
    !sub.trim() ||
    !accountId.trim() ||
    !tenantId.trim()
  ) {
    console.warn("[tickets:identity] Required credential values are invalid", {
      subType: typeof sub,
      tenantIdType: typeof tenantId,
      accountIdType: typeof accountId,
    });
    throw forbidden("Authenticated account is unavailable");
  }

  const [user, trialMember, alStudent] = await Promise.all([
    UserModel.findOne({
      userId: accountId,
      tenantId,
      status: appStatus.ACTIVE,
    })
      .select("userId tenantId userName email role")
      .lean(),
    TrialMemberModel.findOne({
      userId: accountId,
      tenantId,
      status: appStatus.ACTIVE,
    })
      .select("userId tenantId userName email role")
      .lean(),
    AlStudentModel.findOne({
      "student.studentId": accountId,
      tenantId,
      status: appStatus.ACTIVE,
    })
      .select("tenantId username role student.studentId student.studentEmail")
      .lean(),
  ]);

  console.info("[tickets:identity] Account lookups completed", {
    userFound: !!user,
    userId: user?.userId,
    trialMemberFound: !!trialMember,
    trialMemberUserId: trialMember?.userId,
    studentFound: !!alStudent,
    studentId: alStudent?.student?.studentId,
  });

  const matchingAccounts = [user, trialMember, alStudent].filter(Boolean);
  if (matchingAccounts.length !== 1) {
    console.warn("[tickets:identity] Expected exactly one account match", {
      matches: matchingAccounts.length,
      userFound: !!user,
      trialMemberFound: !!trialMember,
      studentFound: !!alStudent,
      lookupId: accountId,
      tenantId,
    });
    throw forbidden("Authenticated account is unavailable");
  }

  if (alStudent) {
    const studentId = alStudent.student?.studentId;
    const studentEmail = alStudent.student?.studentEmail;
    if (
      typeof studentId !== "string" ||
      !studentId.trim() ||
      typeof alStudent.tenantId !== "string" ||
      typeof alStudent.username !== "string" ||
      typeof studentEmail !== "string" ||
      typeof alStudent.role !== "string" ||
      !alStudent.role.trim()
    ) {
      console.warn("[tickets:identity] Student account fields are incomplete", {
        hasStudentId: typeof studentId === "string" && !!studentId.trim(),
        hasTenantId: typeof alStudent.tenantId === "string",
        hasUserName: typeof alStudent.username === "string",
        hasEmail: typeof studentEmail === "string",
        hasRole: typeof alStudent.role === "string" && !!alStudent.role.trim(),
      });
      throw forbidden("Authenticated account is unavailable");
    }

    const account: TicketAccount = {
      userId: studentId,
      tenantId: alStudent.tenantId,
      userName: alStudent.username,
      email: studentEmail,
      role: [alStudent.role],
    };

    console.info("[tickets:identity] Resolved student custom ID", {
      studentId,
      tenantId: account.tenantId,
      roles: account.role,
    });
    return {
      account,
      actor: {
        accountId: studentId,
        userId: studentId,
        tenantId: account.tenantId,
        userName: account.userName,
        email: account.email,
        role: account.role,
      },
    };
  }

  const matchedAccount = user || trialMember;
  if (
    !matchedAccount ||
    typeof matchedAccount.userId !== "string" ||
    typeof matchedAccount.tenantId !== "string" ||
    typeof matchedAccount.userName !== "string" ||
    typeof matchedAccount.email !== "string" ||
    !Array.isArray(matchedAccount.role) ||
    matchedAccount.role.length === 0
  ) {
    console.warn("[tickets:identity] User account fields are incomplete", {
      accountFound: !!matchedAccount,
      hasUserId: typeof matchedAccount?.userId === "string",
      hasTenantId: typeof matchedAccount?.tenantId === "string",
      hasUserName: typeof matchedAccount?.userName === "string",
      hasEmail: typeof matchedAccount?.email === "string",
      hasRole: Array.isArray(matchedAccount?.role) && matchedAccount.role.length > 0,
    });
    throw forbidden("Authenticated account is unavailable");
  }

  const account: TicketAccount = {
    userId: matchedAccount.userId,
    tenantId: matchedAccount.tenantId,
    userName: matchedAccount.userName,
    email: matchedAccount.email,
    role: matchedAccount.role.filter(
      (role): role is string => typeof role === "string" && !!role.trim(),
    ),
  };
  if (account.role.length === 0) {
    throw forbidden("No role is configured for this account");
  }

  console.info("[tickets:identity] Resolved account custom user ID", {
    userId: account.userId,
    accountType: user ? "user" : "trialMember",
    tenantId: account.tenantId,
    roles: account.role,
  });
  return {
    account,
    actor: {
      accountId: account.userId,
      userId: account.userId,
      tenantId: account.tenantId,
      userName: account.userName,
      email: account.email,
      role: account.role,
    },
  };
};

const assertCanWriteTickets = async (
  actor: TicketActor,
): Promise<boolean> => {
  const [user, trialMember] = await Promise.all([
    UserModel.findOne({
      userId: actor.userId,
      tenantId: actor.tenantId,
      status: appStatus.ACTIVE,
    })
      .select("userId role")
      .lean(),
    TrialMemberModel.findOne({
      userId: actor.userId,
      tenantId: actor.tenantId,
      status: appStatus.ACTIVE,
    })
      .select("userId role")
      .lean(),
  ]);
  const account = user || trialMember;

  if (!account) {
    const student = await AlStudentModel.findOne({
      "student.studentId": actor.userId,
      tenantId: actor.tenantId,
      status: appStatus.ACTIVE,
    })
      .select("student.studentId role")
      .lean();

    if (student) {
      return false;
    }

    throw forbidden("Authenticated account is unavailable");
  }

  const roles = Array.isArray(account.role) ? account.role : [];

  if (roles.length === 0) {
    throw forbidden("No role is configured for this account");
  }

  const access = await RoleAccessModel.findOne({
    tenantId: actor.tenantId,
    employeeId: actor.accountId,
  })
    .select("roleAccess")
    .lean();

  return (
    hasTenantAdminAccess(access?.roleAccess) ||
    roles.some((role) => normalized(role) === "super_admin")
  );
};

const assignedRecipients = async (
  actor: TicketActor,
): Promise<{ role: string; userIds: string[] }> => {
  const actorRoles = actor.role.map(normalized);

  let recipientRole: string;

if (actorRoles.includes("ADMIN")) {
  recipientRole = "SUPERADMIN";
} else if (actorRoles.includes("TEACHER")) {
  recipientRole = "ADMIN";
} else if (actorRoles.includes("STUDENT")) {
  recipientRole = "TEACHER";
} else {
  throw forbidden("You are not allowed to create this ticket");
}

  const rolePattern = new RegExp(
    `^${recipientRole.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i",
  );

 const recipientQuery = {
  status: { $regex: /^active$/i },
  role: { $in: [rolePattern] },
  ...(recipientRole === "SUPERADMIN"
    ? {}
    : { tenantId: actor.tenantId }),
  userId: { $ne: actor.userId },
};

  const [users, trialMembers] = await Promise.all([
    UserModel.find(recipientQuery).select("userId role").lean(),
    TrialMemberModel.find(recipientQuery)
      .select("userId role")
      .lean(),
  ]);

  const recipientIds = [
    ...new Set(
      [...users, ...trialMembers]
        .filter(
          (recipient) =>
            Array.isArray(recipient.role) &&
            recipient.role.some(
              (role) =>
                typeof role === "string" &&
                normalized(role) === normalized(recipientRole),
            ),
        )
        .map((recipient) => recipient.userId)
        .filter(
          (id): id is string =>
            typeof id === "string" && !!id.trim(),
        ),
    ),
  ];

  if (recipientIds.length === 0) {
    throw conflict(`No active ${recipientRole} recipients found`);
  }

  return {
    role: recipientRole,
    userIds: recipientIds,
  };
};


const ticketFilterForId = (
  ticketId: string,
): FilterQuery<ITicketDocument> => ({ ticketNumber: ticketId });

const isTicketParticipant = (
  ticket: ITicketDocument,
  userId: string,
): boolean => {
  if (ticket.createdBy === userId) {
    return true;
  }

  const currentRecipients = ticket.currentAssignedTo?.length
    ? ticket.currentAssignedTo
    : ticket.recipientIds;
  if (currentRecipients.includes(userId)) {
    return true;
  }

  return (ticket.history || []).some(
    (event) =>
      event.fromUserId === userId || event.toUserIds?.includes(userId),
  );
};

const findAuthorizedTicket = async (
  actor: TicketActor,
  ticketId: string,
  canManageTickets = false,
): Promise<ITicketDocument> => {
  const ticket = await TicketModel.findOne({
    tenantId: actor.tenantId,
    ...ticketFilterForId(ticketId),
  });
  if (
    !ticket ||
    (!canManageTickets && !isTicketParticipant(ticket, actor.userId))
  ) {
    throw notFound("Ticket not found");
  }
  return ticket;
};

const sendTicketNotification = async (
  actor: TicketActor,
  receiverIds: string[],
  ticket: ITicketDocument,
  notificationType: string,
  message: string,
): Promise<boolean> => {
  const recipients = [...new Set(receiverIds)].filter(
    (receiverId) => receiverId !== actor.userId,
  );
  if (recipients.length === 0) {
    return true;
  }

  let notificationsSent: boolean;
  try {
    const result = await sendNotification({
      senderId: actor.userId,
      senderTenantId: actor.tenantId,
      senderName: actor.userName,
      senderEmail: actor.email,
      receiverId: recipients,
      notificationType,
      title: `Ticket ${ticket.ticketNumber}`,
      messages: message,
      actionUrl: `/tickets/${ticket.ticketNumber}`,
      requestId: ticket.ticketNumber,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket.ticketNumber,
      },
    });
    notificationsSent = result.success;
  } catch (error) {
    if (!(error instanceof NotificationAuthorizationError)) {
      throw error;
    }
    AppLogger.error(
      `Ticket notification authorization failed for ${ticket.ticketNumber}`,
    );
    return false;
  }

  if (!notificationsSent) {
    AppLogger.error(
      `Ticket notification delivery failed for ${ticket.ticketNumber}`,
    );
  }
  return notificationsSent;
};

const buildHistoryEvent = (
  action: string,
  actor: TicketActor,
  toRole: string,
  toUserIds: string[],
  message?: string,
) => ({
  action,
  fromUserId: actor.userId,
  fromRole: actor.role[0],
  toRole,
  toUserIds,
  ...(message ? { message } : {}),
  createdAt: new Date(),
});


export const createTicket = async (
  credentials: unknown,
  input: CreateTicketInput,
) => {
  const { actor } = await accountFromCredentials(credentials);

  // 1. Validate ticket creation permission
  await assertCanWriteTickets(actor);

  // 2. Automatically determine recipient role and users
  const assignment = await assignedRecipients(actor);

  const recipientIds = [
    ...new Set(assignment.userIds),
  ].filter((id) => id !== actor.userId);

  if (recipientIds.length === 0) {
    throw conflict(
      `No active ${assignment.role} recipients found`,
    );
  }

  // 3. Create ticket with automatic assignment
  let ticket: ITicketDocument | null = null;

  for (let attempt = 0; attempt < 3 && !ticket; attempt++) {
    try {
      ticket = await TicketModel.create({
      ticketNumber: `TKT-${uuidv4().slice(0, 6).toUpperCase()}`,
        tenantId: actor.tenantId,
        createdBy: actor.userId,
        createdByRole: actor.role[0],

        recipientRole: assignment.role,
        recipientIds,
        currentAssignedRole: assignment.role,
        currentAssignedTo: recipientIds,

        subject: input.subject,
        category: input.category,
        priority: input.priority,
        relatedTo: input.relatedTo,
        description: input.description,
        attachments: input.attachments ?? [],

        status: TICKET_STATUSES.OPEN,

        history: [
          buildHistoryEvent(
            "CREATED",
            actor,
            assignment.role,
            recipientIds,
            "Ticket created and automatically assigned",
          ),
        ],
      });
    } catch (error) {
      const mongoError = error as { code?: number };

      if (mongoError.code === 11000 && attempt < 2) {
        continue;
      }

      if (mongoError.code === 11000) {
        throw conflict(
          "Unable to generate a unique ticket number",
        );
      }

      throw error;
    }
  }

  if (!ticket) {
    throw conflict("Unable to create ticket");
  }

  // 4. Notify assigned users
  const notificationsSent = await sendTicketNotification(
    actor,
    recipientIds,
    ticket,
    "TICKET_CREATED",
    `A new ticket has been raised: ${ticket.subject}`,
  );

  return {
    ticket,
    notificationsSent,
  };
};


export const listTickets = async (
  credentials: unknown,
  input: TicketListInput,
) => {
  const { actor } = await accountFromCredentials(credentials);

  const roles = Array.isArray(actor.role)
    ? actor.role.map((role: string) => role.trim().toUpperCase())
    : [String(actor.role).trim().toUpperCase()];

  const isSuperAdmin = roles.includes("SUPERADMIN");

  const query: FilterQuery<ITicketDocument> = {};

  // Tenant users can only access their own tenant's tickets.
  // SUPERADMIN bypass is allowed only if globally authorized.
  if (!isSuperAdmin) {
    query.tenantId = actor.tenantId;
  }

  if (input.view === "raised") {
    query.createdBy = actor.userId;
  } else {
    query.currentAssignedTo = actor.userId;
    query.currentAssignedRole = { $in: roles };
  }

  if (input.status) query.status = input.status;
  if (input.category) query.category = input.category;
  if (input.priority) query.priority = input.priority;

  const [tickets, total] = await Promise.all([
    TicketModel.find(query)
      .sort({
        [input.sortBy]: input.sortOrder === "asc" ? 1 : -1,
      })
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .lean(),
    TicketModel.countDocuments(query),
  ]);

  return {
    tickets,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
};

export const getTicketDetails = async (
  credentials: unknown,
  ticketId: string,
) => {
  const { actor } = await accountFromCredentials(credentials);
  const canManageTickets = await assertCanWriteTickets(actor);
  return findAuthorizedTicket(actor, ticketId, canManageTickets);
};

export const forwardTicket = async (
  credentials: unknown,
  ticketId: string,
  input: { recipientRole: string; recipientIds: string[]; message?: string },
) => {
  const { actor } = await accountFromCredentials(credentials);
  await assertCanWriteTickets(actor);

  const ticket = await findAuthorizedTicket(actor, ticketId);

  const currentRecipients = ticket.currentAssignedTo?.length
    ? ticket.currentAssignedTo
    : ticket.recipientIds;

  if (!currentRecipients.includes(actor.userId)) {
    throw forbidden("Only a current ticket recipient may forward this ticket");
  }

  if (
    ticket.status === TICKET_STATUSES.RESOLVED ||
    ticket.status === TICKET_STATUSES.CLOSED
  ) {
    throw conflict("Resolved tickets cannot be forwarded");
  }

  const recipientIds = [...new Set(input.recipientIds)];

  if (
    recipientIds.length === 0 ||
    recipientIds.length !== input.recipientIds.length ||
    recipientIds.includes(actor.userId)
  ) {
    throw badRequest(
      "Recipients must be non-empty, unique, and cannot include the sender",
    );
  }

  const updated = await TicketModel.findOneAndUpdate(
    {
      ticketNumber: ticket.ticketNumber,
      tenantId: actor.tenantId,
      status: ticket.status,
      updatedAt: ticket.updatedAt,
    },
    {
      $set: {
        recipientRole: input.recipientRole,
        recipientIds,
        currentAssignedRole: input.recipientRole,
        currentAssignedTo: recipientIds,
        status: TICKET_STATUSES.FORWARDED,
      },
      $push: {
        history: buildHistoryEvent(
          "FORWARDED",
          actor,
          input.recipientRole,
          recipientIds,
          input.message,
        ),
      },
    },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw conflict("Ticket changed; reload and try again");
  }

  const notificationsSent = await sendTicketNotification(
    actor,
    recipientIds,
    updated,
    "TICKET_FORWARDED",
    input.message ||
      `Ticket ${updated.ticketNumber} was forwarded to you`,
  );

  return { ticket: updated, notificationsSent };
};

const updateTicketStatus = async (
  credentials: unknown,
  ticketId: string,
  action: "ACKNOWLEDGED" | "RESOLVED" | "REOPENED",
  message?: string,
) => {
  const { actor } = await accountFromCredentials(credentials);
  const canManageTickets = await assertCanWriteTickets(actor);
  const ticket = await findAuthorizedTicket(
    actor,
    ticketId,
    canManageTickets,
  );
  const currentRecipients = ticket.currentAssignedTo?.length
    ? ticket.currentAssignedTo
    : ticket.recipientIds;
  if (!canManageTickets && !currentRecipients.includes(actor.userId)) {
    throw forbidden("Only a currently assigned recipient may change ticket status");
  }

  let allowedStatuses: TICKET_STATUSES[];
  if (action === "REOPENED") {
    allowedStatuses = [TICKET_STATUSES.RESOLVED, TICKET_STATUSES.CLOSED];
  } else if (action === "ACKNOWLEDGED") {
    allowedStatuses = [TICKET_STATUSES.OPEN, TICKET_STATUSES.FORWARDED];
  } else {
    allowedStatuses = [
      TICKET_STATUSES.OPEN,
      TICKET_STATUSES.FORWARDED,
      TICKET_STATUSES.ACKNOWLEDGED,
      TICKET_STATUSES.IN_PROGRESS,
    ];
  }
  if (!allowedStatuses.includes(ticket.status)) {
    throw conflict("This ticket does not allow the requested status transition");
  }

  const nextStatus =
    action === "ACKNOWLEDGED"
      ? TICKET_STATUSES.ACKNOWLEDGED
      : action === "RESOLVED"
        ? TICKET_STATUSES.RESOLVED
        : TICKET_STATUSES.OPEN;
  const setFields: Partial<ITicketDocument> = { status: nextStatus };
  if (action === "ACKNOWLEDGED") {
    setFields.acknowledgedBy = actor.userId;
    setFields.acknowledgedAt = new Date();
    if (message) setFields.acknowledgementMessage = message;
  } else if (action === "RESOLVED") {
    setFields.resolvedBy = actor.userId;
    setFields.resolvedAt = new Date();
    if (message) setFields.resolutionNote = message;
  }
  const historyEvent = buildHistoryEvent(
    action,
    actor,
    ticket.currentAssignedRole || ticket.recipientRole,
    currentRecipients,
    message,
  );
  const update: UpdateQuery<ITicketDocument> = {
    $set: setFields,
    $push: { history: historyEvent },
    ...(action === "REOPENED"
      ? { $unset: { resolvedBy: 1, resolvedAt: 1, resolutionNote: 1 } }
      : {}),
  };

  const updated = await TicketModel.findOneAndUpdate(
    {
      ticketNumber: ticket.ticketNumber,
      tenantId: actor.tenantId,
      status: ticket.status,
      recipientIds: ticket.recipientIds,
      updatedAt: ticket.updatedAt,
    },
    update,
    { new: true, runValidators: true },
  );
  if (!updated) {
    throw conflict("Ticket status changed; reload and try again");
  }

  const notificationsSent = await sendTicketNotification(
    actor,
    [updated.createdBy, ...currentRecipients],
    updated,
    `TICKET_${action}`,
    message || `Ticket ${updated.ticketNumber} was ${action.toLowerCase()}`,
  );
  return { ticket: updated, notificationsSent };
};

export const acknowledgeTicket = (
  credentials: unknown,
  ticketId: string,
  message?: string,
) => updateTicketStatus(credentials, ticketId, "ACKNOWLEDGED", message);

export const resolveTicket = (
  credentials: unknown,
  ticketId: string,
  message?: string,
) => updateTicketStatus(credentials, ticketId, "RESOLVED", message);

export const reopenTicket = (
  credentials: unknown,
  ticketId: string,
  message?: string,
) => updateTicketStatus(credentials, ticketId, "REOPENED", message);

export const getTicketHistory = async (
  credentials: unknown,
  ticketId: string,
) => {
  const { actor } = await accountFromCredentials(credentials);
  const canManageTickets = await assertCanWriteTickets(actor);
  const ticket = await findAuthorizedTicket(
    actor,
    ticketId,
    canManageTickets,
  );
  return (ticket.history || [])
    .slice()
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
};