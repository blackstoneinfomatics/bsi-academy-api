import { badRequest, conflict, forbidden, notFound } from "@hapi/boom";
import { Types, type FilterQuery, type UpdateQuery } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import type { ITicketAttachment } from "../../types/models.types";
import ClassScheduleModel from "../models/classShedule";
import AlStudentModel from "../models/alstudents";
import { Lookup } from "../models/lookup";
import RoleAccessModel from "../models/roleacces";
import StudentModel from "../models/student";
import TenantModel from "../models/tenants";
import TicketModel from "../models/tickets";
import type { ITicketDocument } from "../models/tickets";
import TrialMemberModel from "../models/trailmember";
import UserModel from "../models/users";
import EmailTemplateModel from "../models/emailTemplate";
import { appStatus } from "../config/messages";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../shared/enum";
import AppLogger from "../helpers/logging";
import { sendEmailClient } from "../shared/email";
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
  view: "received" | "raised" | "all";
  role?: string;
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

const roleMatcher = (role: string): RegExp => {
  const escapedRole = normalized(role)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/_/g, "[_\\s-]+");
  return new RegExp(`^${escapedRole}$`, "i");
};

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
  const roles = Array.isArray(actor.role)
    ? actor.role
    : typeof actor.role === "string"
      ? [actor.role]
      : [];

  const isSuperAdmin = roles.some(
    (role) =>
      String(role).trim().toUpperCase().replace(/[_\s-]/g, "") ===
      "SUPERADMIN",
  );

  if (isSuperAdmin) {
    return true;
  }

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

    if (student) return false;

    throw forbidden("Authenticated account is unavailable");
  }

  return false;
};

const assignedRecipients = async (
  actor: TicketActor,
): Promise<{ role: string; userIds: string[] }> => {
  const actorRoles = actor.role.map(normalized);

  let recipientRole: string;

if (actorRoles.includes("STUDENT")) {
    recipientRole = "TEACHER";
  } else if (actorRoles.includes("TEACHER")) {
    recipientRole = "ADMIN";
  } else if (actorRoles.includes("ADMIN")) {
    recipientRole = "SUPERADMIN";
  } else if (actorRoles.includes("SUPERADMIN")) {
    throw forbidden("Super Admin cannot raise a ticket");
  } else {
    // Dynamic roles must be validated against configured tenant roles.
    recipientRole = "ADMIN";
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
): FilterQuery<ITicketDocument> => {
  if (Types.ObjectId.isValid(ticketId)) {
    return { _id: new Types.ObjectId(ticketId) };
  }

  return { ticketNumber: ticketId };
};

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
  const filter = {
    ...ticketFilterForId(ticketId),
    ...(canManageTickets ? {} : { tenantId: actor.tenantId }),
  };

  const ticket = await TicketModel.findOne(filter);

  if (
    !ticket ||
    (!canManageTickets &&
      !isTicketParticipant(ticket, actor.userId))
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

const sendTicketEmail = async (
  receiverIds: string[],
  ticket: ITicketDocument,
  action: "ACKNOWLEDGED" | "RESOLVED",
  message: string,
): Promise<boolean> => {
  const recipients = [...new Set(receiverIds)];
  console.info("[TicketEmail] Step 1: starting recipient lookup", {
    ticketNumber: ticket.ticketNumber,
    action,
    recipientCount: recipients.length,
  });
  if (recipients.length === 0) {
    console.warn("[TicketEmail] Skipped: there are no recipients", {
      ticketNumber: ticket.ticketNumber,
    });
    return false;
  }

  const [emailTemplate, users, trialMembers, alStudents] = await Promise.all([
    EmailTemplateModel.findOne({
      templateKey: "ticket-email",
      status: appStatus.ACTIVE,
    })
      .select("templateContent")
      .lean(),
    UserModel.find({ userId: { $in: recipients }, status: appStatus.ACTIVE })
      .select("userId email")
      .lean(),
    TrialMemberModel.find({
      userId: { $in: recipients },
      status: appStatus.ACTIVE,
    })
      .select("userId email")
      .lean(),
    AlStudentModel.find({
      "student.studentId": { $in: recipients },
      status: appStatus.ACTIVE,
    })
      .select("student.studentId student.studentEmail")
      .lean(),
  ]).catch((error: unknown) => {
    console.error("[TicketEmail] Step 2: database lookup failed", {
      ticketNumber: ticket.ticketNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  });
  console.info("[TicketEmail] Step 2: database lookup completed", {
    ticketNumber: ticket.ticketNumber,
    templateFound: Boolean(emailTemplate?.templateContent),
    activeUserCount: users.length,
    activeTrialMemberCount: trialMembers.length,
    activeStudentCount: alStudents.length,
  });

  if (!emailTemplate?.templateContent) {
    console.error("[TicketEmail] Stopped: active ticket-email template is missing or empty", {
      ticketNumber: ticket.ticketNumber,
    });
    AppLogger.error(
      `Ticket email template "ticket-email" not found or empty`,
    );
    return false;
  }

  const emails = new Map<string, string>();
  for (const account of [...users, ...trialMembers]) {
    if (account.userId && account.email?.trim()) {
      emails.set(account.userId, account.email.trim());
    }
  }
  for (const student of alStudents) {
    const userId = student.student?.studentId;
    const email = student.student?.studentEmail;
    if (userId && email?.trim()) emails.set(userId, email.trim());
  }

  const missingRecipients = recipients.filter((userId) => !emails.has(userId));
  if (missingRecipients.length > 0) {
    console.error("[TicketEmail] Stopped: recipient email address unavailable", {
      ticketNumber: ticket.ticketNumber,
      missingRecipientCount: missingRecipients.length,
      missingRecipientIds: missingRecipients,
    });
    AppLogger.error(
      `Ticket email delivery skipped for ${ticket.ticketNumber}; recipient email unavailable for ${missingRecipients.join(", ")}`,
    );
    return false;
  }
  console.info("[TicketEmail] Step 3: recipient email addresses resolved", {
    ticketNumber: ticket.ticketNumber,
    recipientCount: emails.size,
  });

  const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });

  const values: Record<string, { value: string; aliases: string[] }> = {
    ticketNumber: {
      value: ticket.ticketNumber,
      aliases: ["ticketNumber", "Ticket Number"],
    },
    subject: { value: ticket.subject, aliases: ["subject", "Ticket Subject"] },
    status: { value: ticket.status, aliases: ["status", "Ticket Status"] },
    action: { value: action.toLowerCase(), aliases: ["action", "Action"] },
    message: { value: message, aliases: ["message", "Message"] },
  };
  const html = Object.values(values).reduce((content, { value, aliases }) => {
    const escapedValue = escapeHtml(value);
    return aliases.reduce((result, alias) => {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return result
        .replace(new RegExp(`{{\\s*${escapedAlias}\\s*}}`, "gi"), escapedValue)
        .replace(new RegExp(`<${escapedAlias}>`, "gi"), escapedValue);
    }, content);
  }, emailTemplate.templateContent);
  const subject = `Ticket ${ticket.ticketNumber} ${action.toLowerCase()}`;

  try {
    console.info("[TicketEmail] Step 4: submitting email to provider", {
      ticketNumber: ticket.ticketNumber,
      recipientCount: recipients.length,
    });
    const result = await sendEmailClient(
      recipients.map((userId) => ({ email: emails.get(userId)! })),
      subject,
      html,
    );
    if (!result) {
      console.error("[TicketEmail] Step 5: provider returned an empty response", {
        ticketNumber: ticket.ticketNumber,
      });
      AppLogger.error(`Ticket email delivery failed for ${ticket.ticketNumber}`);
      return false;
    }
    console.info("[TicketEmail] Step 5: provider accepted email request", {
      ticketNumber: ticket.ticketNumber,
    });
    return true;
  } catch (error) {
    console.error("[TicketEmail] Step 5: provider request failed", {
      ticketNumber: ticket.ticketNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    AppLogger.error(
      `Ticket email delivery failed for ${ticket.ticketNumber}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
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

  const roles = actor.role.map(normalized);
  const isSuperAdmin = roles.some(
    (role) => role.replace(/_/g, "") === "SUPERADMIN",
  );
  if (input.view === "all" && !isSuperAdmin) {
    throw forbidden("Only Super Admin can list all tickets");
  }
  if (
    input.role &&
    !isSuperAdmin &&
    !roles.includes(normalized(input.role))
  ) {
    throw forbidden("Cannot list tickets for another role");
  }

  const query: FilterQuery<ITicketDocument> = {};
  const roleFilter = input.role ? roleMatcher(input.role) : undefined;

  // Tenant users can access only their own tenant's tickets.
  if (!isSuperAdmin) {
    query.tenantId = actor.tenantId;
  }

  if (input.view === "raised") {
    query.createdBy = actor.userId;
    if (roleFilter) query.createdByRole = roleFilter;
  } else if (input.view === "received") {
    const receivedRoles = roleFilter ? [roleFilter] : roles.map(roleMatcher);
    query.$or = [
      {
        currentAssignedTo: actor.userId,
        currentAssignedRole: { $in: receivedRoles },
      },
      {
        history: {
          $elemMatch: {
            toUserIds: actor.userId,
            toRole: { $in: receivedRoles },
          },
        },
      },
    ];
  } else if (roleFilter) {
    query.$or = [
      { createdByRole: roleFilter },
      { currentAssignedRole: roleFilter },
      { recipientRole: roleFilter },
    ];
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

  const tenantIds = [
    ...new Set(tickets.map((ticket) => ticket.tenantId)),
  ];
  const accountIds = [
    ...new Set(
      tickets.flatMap((ticket) => [
        ticket.createdBy,
        ...(ticket.currentAssignedTo ?? []),
        ...ticket.recipientIds,
        ...(ticket.history ?? []).map((event) => event.fromUserId),
      ]),
    ),
  ];

  const [users, trialMembers, alStudents] =
    tenantIds.length && accountIds.length
      ? await Promise.all([
          UserModel.find({
            tenantId: { $in: tenantIds },
            userId: { $in: accountIds },
          })
            .select("tenantId userId userName")
            .lean(),
          TrialMemberModel.find({
            tenantId: { $in: tenantIds },
            userId: { $in: accountIds },
          })
            .select("tenantId userId userName")
            .lean(),
          AlStudentModel.find({
            tenantId: { $in: tenantIds },
            "student.studentId": { $in: accountIds },
          })
            .select("tenantId username student.studentId")
            .lean(),
        ])
      : [[], [], []];

  const accountNames = new Map<string, string>();
  const setAccountName = (
    tenantId: string,
    userId: string,
    userName: string,
  ) => {
    accountNames.set(`${tenantId}:${userId}`, userName);
  };

  for (const account of [...users, ...trialMembers]) {
    if (account.tenantId && account.userId && account.userName) {
      setAccountName(account.tenantId, account.userId, account.userName);
    }
  }

  for (const student of alStudents) {
    const studentId = student.student?.studentId;
    if (studentId && student.username) {
      setAccountName(student.tenantId, studentId, student.username);
    }
  }

  const tenants = tenantIds.length
    ? await TenantModel.find({
        tenantCode: { $in: tenantIds },
      })
        .select("tenantCode tenantName")
        .lean()
    : [];

  const tenantNames = new Map(
    tenants.map((tenant) => [
      tenant.tenantCode,
      tenant.tenantName,
    ]),
  );

  return {
    tickets: tickets.map((ticket) => {
      const latestAssignment = [...(ticket.history ?? [])]
        .reverse()
        .find(
          (event) =>
            event.action === "FORWARDED" || event.action === "CREATED",
        );
      const assignedById = latestAssignment?.fromUserId ?? ticket.createdBy;
      const assignedToIds = ticket.currentAssignedTo?.length
        ? ticket.currentAssignedTo
        : ticket.recipientIds;

      return {
        ...ticket,
        assignedByName:
          accountNames.get(`${ticket.tenantId}:${assignedById}`) ?? null,
        assignedToName: assignedToIds.map(
          (userId) =>
            accountNames.get(`${ticket.tenantId}:${userId}`) ?? null,
        ),
        tenantName: tenantNames.get(ticket.tenantId) ?? null,
        resolvedAt: ticket.resolvedAt ?? null,
      };
    }),

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

  return findAuthorizedTicket(
    actor,
    ticketId,
    canManageTickets,
  );
};




export const getTicketDashboardCards = async (
  credentials: unknown,
) => {
  const { actor } = await accountFromCredentials(credentials);

  const roles = Array.isArray(actor.role)
    ? actor.role.map((role: string) => role.trim().toUpperCase())
    : [String(actor.role).trim().toUpperCase()];

  const isSuperAdmin = roles.includes("SUPERADMIN");

  const now = new Date();

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const nextMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  );

  const previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );

  // SUPERADMIN: all tenants
  // Other users: their own tenant only
  const baseFilter = isSuperAdmin
    ? {}
    : { tenantId: actor.tenantId };

  const currentMonthFilter = {
    ...baseFilter,
    createdAt: {
      $gte: currentMonthStart,
      $lt: nextMonthStart,
    },
  };

  const previousMonthFilter = {
    ...baseFilter,
    createdAt: {
      $gte: previousMonthStart,
      $lt: currentMonthStart,
    },
  };

  const [
    totalCurrent,
    totalPrevious,
    openCurrent,
    openPrevious,
    inProgressCurrent,
    inProgressPrevious,
    resolvedCurrent,
    resolvedPrevious,
  ] = await Promise.all([
    TicketModel.countDocuments(currentMonthFilter),
    TicketModel.countDocuments(previousMonthFilter),

    TicketModel.countDocuments({
      ...currentMonthFilter,
      status: TICKET_STATUSES.OPEN,
    }),
    TicketModel.countDocuments({
      ...previousMonthFilter,
      status: TICKET_STATUSES.OPEN,
    }),

    TicketModel.countDocuments({
      ...currentMonthFilter,
      status: TICKET_STATUSES.IN_PROGRESS,
    }),
    TicketModel.countDocuments({
      ...previousMonthFilter,
      status: TICKET_STATUSES.IN_PROGRESS,
    }),

    TicketModel.countDocuments({
      ...currentMonthFilter,
      status: TICKET_STATUSES.RESOLVED,
    }),
    TicketModel.countDocuments({
      ...previousMonthFilter,
      status: TICKET_STATUSES.RESOLVED,
    }),
  ]);

  const getPercentage = (
    current: number,
    previous: number,
  ): number => {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    return Number(
      (((current - previous) / previous) * 100).toFixed(2),
    );
  };

  const getTrend = (
    current: number,
    previous: number,
  ): "up" | "down" | "same" => {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
  };

  const buildCard = (
    currentCount: number,
    previousMonthCount: number,
  ) => ({
    currentCount,
    previousMonthCount,
    percentage: getPercentage(currentCount, previousMonthCount),
    trend: getTrend(currentCount, previousMonthCount),
  });

  return {
    totalTickets: buildCard(totalCurrent, totalPrevious),
    openTickets: buildCard(openCurrent, openPrevious),
    inProgressTickets: buildCard(
      inProgressCurrent,
      inProgressPrevious,
    ),
    resolvedTickets: buildCard(resolvedCurrent, resolvedPrevious),
  };
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
  options: {
    message?: string;
    sendEmail?: boolean;
    sendNotification?: boolean;
  } = {},
) => {
  const { message, sendEmail = false, sendNotification: notify = true } =
    options;
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

  const filter: FilterQuery<ITicketDocument> = {
  _id: ticket._id,
  status: ticket.status,
  updatedAt: ticket.updatedAt,
};

// Super Admin has authorized global access.
// Tenant users must remain restricted to their own tenant.
if (!canManageTickets) {
  filter.tenantId = actor.tenantId;
}

const updated = await TicketModel.findOneAndUpdate(
  filter,
  update,
  {
    new: true,
    runValidators: true,
  },
);

if (!updated) {
  throw conflict("Ticket status changed; reload and try again");
}

  const notificationRecipients = [updated.createdBy, ...currentRecipients];
  const notificationMessage =
    message || `Ticket ${updated.ticketNumber} was ${action.toLowerCase()}`;
  const notificationsSent =
    action === "REOPENED" || notify
      ? await sendTicketNotification(
          actor,
          notificationRecipients,
          updated,
          `TICKET_${action}`,
          notificationMessage,
        )
      : false;
  const emailSent =
    action !== "REOPENED" && sendEmail
      ? await sendTicketEmail(
          notificationRecipients.filter(
            (recipientId) => recipientId !== actor.userId,
          ),
          updated,
          action,
          notificationMessage,
        )
      : false;
  return { ticket: updated, notificationsSent, emailSent };
};

export const acknowledgeTicket = (
  credentials: unknown,
  ticketId: string,
  options: {
    message?: string;
    sendEmail?: boolean;
    sendNotification?: boolean;
  },
) => {
  console.log("[tickets:acknowledge] Started", { ticketId });
  return updateTicketStatus(credentials, ticketId, "ACKNOWLEDGED", options).then(
    (result) => {
      console.log("[tickets:acknowledge] Completed", { ticketId });
      return result;
    },
  );
};

export const resolveTicket = (
  credentials: unknown,
  ticketId: string,
  options: {
    message?: string;
    sendEmail?: boolean;
    sendNotification?: boolean;
  },
) => {
  console.log("[tickets:resolve] Started", { ticketId });
  return updateTicketStatus(credentials, ticketId, "RESOLVED", options).then(
    (result) => {
      console.log("[tickets:resolve] Completed", { ticketId });
      return result;
    },
  );
};

export const reopenTicket = (
  credentials: unknown,
  ticketId: string,
  message?: string,
) =>
  updateTicketStatus(credentials, ticketId, "REOPENED", {
    message,
  });

export const getTicketHistory = async (
  credentials: unknown,
  ticketId: string,
) => {
  console.log("[tickets:history] Started", { ticketId });

  const { actor } = await accountFromCredentials(credentials);

  console.log("[tickets:history] Actor resolved", {
    userId: actor.userId,
    tenantId: actor.tenantId,
    role: actor.role,
  });

  const canManageTickets = await assertCanWriteTickets(actor);

  console.log("[tickets:history] Permission checked", {
    canManageTickets,
  });

  const ticket = await findAuthorizedTicket(
    actor,
    ticketId,
    canManageTickets,
  );
  const tenant = await TenantModel.findOne({ tenantCode: ticket.tenantId })
    .select("tenantName plan")
    .lean();

  console.log("[tickets:history] Ticket found", {
    ticketNumber: ticket.ticketNumber,
    historyCount: ticket.history?.length ?? 0,
  });

  return {
    ...ticket.toObject(),
    ticketId: String(ticket._id),
    tenantName: tenant?.tenantName ?? null,
    plan: tenant?.plan ?? null,
    history: (ticket.history || []).slice().sort(
      (first, second) =>
        new Date(first.createdAt).getTime() -
        new Date(second.createdAt).getTime(),
    ),
  };
};