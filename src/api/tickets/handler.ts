import { badRequest } from "@hapi/boom";
import type { Request, ResponseToolkit } from "@hapi/hapi";
import { z } from "zod";
import {
  acknowledgeTicket,
  createTicket,
  forwardTicket,
  getTicketDashboardCards,
  getTicketDetails,
  getTicketHistory,
  listTickets,
  reopenTicket,
  resolveTicket,
} from "../../operations/tickets";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../../shared/enum";

const attachmentSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    fileUrl: z
      .string()
      .trim()
      .regex(
        /^\/files\/view\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/,
        "Attachments must use the SharePoint file-view route",
      ),
    mimeType: z.string().trim().regex(/^[\w.+-]+\/[\w.+-]+$/).max(100),
  })
  .strict();

const createSchema = z
  .object({
    subject: z.string().trim().min(1).max(150),
    category: z.nativeEnum(TICKET_CATEGORIES),
    priority: z.nativeEnum(TICKET_PRIORITIES).optional(),
    relatedTo: z.string().trim().max(100).optional(),
    description: z.string().trim().min(1).max(5000),
    attachments: z.array(attachmentSchema).max(10).optional(),
  })
  .strict();

const listSchema = z
  .object({
    view: z.enum(["received", "raised"]).default("received"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z
      .enum(["createdAt", "updatedAt", "ticketNumber", "priority", "status"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    status: z.nativeEnum(TICKET_STATUSES).optional(),
    category: z.nativeEnum(TICKET_CATEGORIES).optional(),
    priority: z.nativeEnum(TICKET_PRIORITIES).optional(),
  })
  .strict();

const idSchema = z.object({ ticketId: z.string().trim().min(1).max(100) });
const forwardSchema = z
  .object({
    recipientRole: z.string().trim().min(1).max(100),
    recipientIds: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
    message: z.string().trim().max(2000).optional(),
  })
  .strict();
const statusSchema = z
  .object({
    message: z.string().trim().max(2000).optional(),
    resolutionNote: z.string().trim().max(2000).optional(),
    acknowledgementMessage: z.string().trim().max(2000).optional(),
  })
  .strict();

const parse = <S extends z.ZodTypeAny>(
  schema: S,
  value: unknown,
): z.output<S> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message || "Invalid request");
  }
  return result.data;
};

const credentials = (req: Request): unknown => req.auth.credentials;
const ticketId = (req: Request): string => parse(idSchema, req.params).ticketId;

export default {
  async create(req: Request, h: ResponseToolkit) {
    const input = parse(createSchema, req.payload);
    const result = await createTicket(credentials(req), input);
    return h
      .response({
        success: true,
        message: "Ticket created successfully",
        data: result.ticket,
      })
      .code(201);
  },

  async list(req: Request, h: ResponseToolkit) {
    const input = parse(listSchema, req.query);
    const result = await listTickets(credentials(req), input);
    return h
      .response({
        success: true,
        message: "Tickets retrieved successfully",
        data: result,
      })
      .code(200);
  },

  async details(req: Request, h: ResponseToolkit) {
    const result = await getTicketDetails(credentials(req), ticketId(req));
    return h
      .response({
        success: true,
        message: "Ticket retrieved successfully",
        data: result,
      })
      .code(200);
  },

  async history(req: Request, h: ResponseToolkit) {
    const result = await getTicketHistory(credentials(req), ticketId(req));
    return h
      .response({
        success: true,
        message: "Ticket history retrieved successfully",
        data: result,
      })
      .code(200);
  },


async dashboardCards(req: Request, h: ResponseToolkit) {
  const result = await getTicketDashboardCards(credentials(req));

  return h
    .response({
      success: true,
      message: "Ticket dashboard cards retrieved successfully",
      data: result,
    })
    .code(200);
},

  async forward(req: Request, h: ResponseToolkit) {
    const input = parse(forwardSchema, req.payload);
    const result = await forwardTicket(credentials(req), ticketId(req), input);
    return h
      .response({
        success: true,
        message: "Ticket forwarded successfully",
        data: result.ticket,
        notificationsSent: result.notificationsSent,
      })
      .code(200);
  },

  async acknowledge(req: Request, h: ResponseToolkit) {
    const input = parse(statusSchema, req.payload || {});
    const result = await acknowledgeTicket(
      credentials(req),
      ticketId(req),
      input.acknowledgementMessage || input.message,
    );
    return h
      .response({
        success: true,
        message: "Ticket acknowledged successfully",
        data: result.ticket,
        notificationsSent: result.notificationsSent,
      })
      .code(200);
  },

  async resolve(req: Request, h: ResponseToolkit) {
    const input = parse(statusSchema, req.payload || {});
    const result = await resolveTicket(
      credentials(req),
      ticketId(req),
      input.resolutionNote || input.message,
    );
    return h
      .response({
        success: true,
        message: "Ticket resolved successfully",
        data: result.ticket,
        notificationsSent: result.notificationsSent,
      })
      .code(200);
  },

  async reopen(req: Request, h: ResponseToolkit) {
    const input = parse(statusSchema, req.payload || {});
    const result = await reopenTicket(credentials(req), ticketId(req), input.message);
    return h
      .response({
        success: true,
        message: "Ticket reopened successfully",
        data: result.ticket,
        notificationsSent: result.notificationsSent,
      })
      .code(200);
  },
};