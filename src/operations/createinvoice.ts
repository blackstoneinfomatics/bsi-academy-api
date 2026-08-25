import CustomServiceInvoiceModel, {
  CreateCustomServiceInvoicePayload,
  InvoiceItemInput,
} from "../models/finance_invoice";
import Tenants from "../models/tenants";
import TenantSubscription from "../models/tenantsubscription";
import "../models/plan-model";
import PaymentTransactionModel from "../models/paymenttransaction";
import EmailTemplate from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";
import { PaymentType } from "../shared/enum";
import { throwError } from "../helpers/throwError";
import { customServiceInvoiceMessages } from "../config/messages";

const calculateItemAmounts = (item: InvoiceItemInput) => {
  const taxAmount = Number(((item.unitPrice * item.taxRate) / 100).toFixed(2));
  const amount = Number((item.unitPrice + taxAmount).toFixed(2));

  return { ...item, taxAmount, amount };
};

const calculateInvoiceTotals = (
  items: ReturnType<typeof calculateItemAmounts>[],
) => {
  const subTotal = items.reduce((sum, item) => sum + item.unitPrice, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = subTotal + totalTax;

  return {
    subTotal: Number(subTotal.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};

type BillingPeriod = {
  duration: number;
  billingPeriod: string;
};

type SendCustomServiceInvoicePayload = {
  paymentLink?: string;
};

const getPaymentLink = (invoiceId: unknown) =>
  `${ process.env.FRONTEND_URL ?? "http://localhost:3000"}/custom-service-invoices/${invoiceId}/payment`;

const getBillingCycle = (
  billingPeriods: BillingPeriod[] | undefined,
  duration: number,
) => billingPeriods?.find((period) => period.duration === duration)?.billingPeriod ?? null;

export const createCustomServiceInvoice = async (
  payload: CreateCustomServiceInvoicePayload,
) => {
  const tenant = await Tenants.findOne({
    tenantCode: payload.tenantId,
    status: "Active",
  });

  if (!tenant) {
    throwError(customServiceInvoiceMessages.TENANT_NOT_FOUND, 404);
  }

  const subscription = await TenantSubscription.findOne({
    _id: payload.subscriptionId,
    tenantId: payload.tenantId,
    deletedAt: null,
  });

  if (!subscription) {
    throwError(customServiceInvoiceMessages.SUBSCRIPTION_NOT_FOUND, 404);
    return;
  }

  const duplicateInvoice = await CustomServiceInvoiceModel.findOne({
    invoiceNumber: payload.invoiceNumber,
  });

  if (duplicateInvoice) {
    throwError(customServiceInvoiceMessages.DUPLICATE_INVOICE, 409);
  }

  if (payload.attachments?.some((url) => !url.startsWith("https://"))) {
    throwError(customServiceInvoiceMessages.INVALID_ATTACHMENT_URL, 400);
  }

  const items = payload.items.map(calculateItemAmounts);
  const totals = calculateInvoiceTotals(items);

  const newInvoice = new CustomServiceInvoiceModel({
    ...payload,
    planId: subscription.planId,
    items,
    ...totals,
  });

  await newInvoice.save();
  newInvoice.paymentLink = getPaymentLink(newInvoice._id);
  await newInvoice.save();
  await newInvoice.populate({
    path: "planId",
    select: "planId planName billingPeriods",
  });

  const plan = newInvoice.planId as unknown as {
    planName?: string;
    billingPeriods?: BillingPeriod[];
  };

  let email: { sent: boolean; recipient: string | null; error: string | null } = {
    sent: false,
    recipient: null,
    error: null,
  };

  try {
    const mailResult = await sendCustomServiceInvoice(newInvoice._id.toString(), {
      paymentLink: newInvoice.paymentLink ?? undefined,
    });
    email = { sent: true, recipient: mailResult?.recipient ?? null, error: null };
  } catch (err: any) {
    console.error("Failed to send custom service invoice email:", err);
    email = {
      sent: false,
      recipient: null,
      error: err.message || "Failed to send invoice email",
    };
  }

  return {
    invoice: {
      ...newInvoice.toObject(),
      planName: plan?.planName ?? null,
      billingCycle: getBillingCycle(plan?.billingPeriods, subscription.duration),
      paymentLink: newInvoice.paymentLink,
    },
    email,
  };
};

export const getCustomServiceInvoiceById = async (invoiceId: string) => {
  const invoice = await CustomServiceInvoiceModel.findOne({
    _id: invoiceId,
    deletedAt: null,
  })
    .populate({
      path: "subscriptionId",
      select:
        "subscriptionCode status paymentStatus duration startDate endDate nextRenewalDate autoRenew",
    })
    .populate({
      path: "planId",
      select: "planId planName billingPeriods",
    });

  if (!invoice) {
    throwError(customServiceInvoiceMessages.INVOICE_NOT_FOUND, 404);
    return;
  }

  const tenant = await Tenants.findOne({ tenantCode: invoice.tenantId });
  const payment = await PaymentTransactionModel.findOne({
    invoiceId: invoice._id,
    paymentType: PaymentType.CUSTOM_SERVICE,
  }).sort({ createdAt: -1 });

  const subscription = invoice.subscriptionId as unknown as {
    _id: unknown;
    subscriptionCode?: string;
    status?: string;
    paymentStatus?: string;
    duration?: number;
    startDate?: Date;
    endDate?: Date;
    nextRenewalDate?: Date;
    autoRenew?: boolean;
  };
  const plan = invoice.planId as unknown as {
    _id: unknown;
    planId?: string;
    planName?: string;
    billingPeriods?: BillingPeriod[];
  };

  return {
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    planId: plan?._id ?? invoice.planId,
    planCode: plan?.planId ?? null,
    planName: plan?.planName ?? null,
    billingCycle: getBillingCycle(plan?.billingPeriods, subscription?.duration ?? 0),
    paymentTerms: invoice.paymentTerms,
    items: invoice.items,
    subTotal: invoice.subTotal,
    totalTax: invoice.totalTax,
    totalAmount: invoice.totalAmount,
    paymentLink: invoice.paymentLink,
    customerNotes: invoice.customerNotes,
    attachments: invoice.attachments,
    invoiceStatus: invoice.invoiceStatus,
    paymentStatus: invoice.paymentStatus,
    tenant: tenant
      ? {
          _id: tenant._id,
          tenantId: tenant.tenantCode,
          tenantName: tenant.tenantName,
          email: tenant.emailId,
          phoneNumber: tenant.phoneNumber,
          domainName: tenant.domainName,
          status: tenant.status,
        }
      : null,
    subscription: subscription
      ? {
          subscriptionId: subscription._id,
          subscriptionCode: subscription.subscriptionCode,
          status: subscription.status,
          paymentStatus: subscription.paymentStatus,
          duration: subscription.duration,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          nextRenewalDate: subscription.nextRenewalDate,
          autoRenew: subscription.autoRenew,
        }
      : null,
    payment: payment
      ? {
          transactionId: payment._id,
          paymentNumber: payment.paymentNumber,
          gateway: payment.gateway,
          paymentStatus: payment.paymentStatus,
          amount: payment.amount,
          currency: payment.currency,
          stripePaymentIntentId: payment.stripePaymentIntentId,
          transactionReference: payment.transactionReference,
          paymentMethod: payment.paymentMethod,
          failureReason: payment.failureReason,
          paymentDate: payment.paymentDate,
        }
      : null,
    createdBy: invoice.createdBy,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
};

export const sendCustomServiceInvoice = async (
  invoiceId: string,
  payload: SendCustomServiceInvoicePayload,
) => {
  console.log("sendCustomServiceInvoice >> start", invoiceId);

  const invoice = await CustomServiceInvoiceModel.findOne({
    _id: invoiceId,
    deletedAt: null,
  })
    .populate({ path: "subscriptionId", select: "subscriptionCode duration" })
    .populate({ path: "planId", select: "planId planName billingPeriods" });

  if (!invoice) {
    console.log("sendCustomServiceInvoice >> invoice not found", invoiceId);
    throwError(customServiceInvoiceMessages.INVOICE_NOT_FOUND, 404);
    return;
  }

  const tenant = await Tenants.findOne({ tenantCode: invoice.tenantId });
  console.log(
    "sendCustomServiceInvoice >> tenant",
    invoice.tenantId,
    "found:", Boolean(tenant),
    "emailId:", tenant?.emailId,
  );
  if (!tenant?.emailId) {
    throwError(customServiceInvoiceMessages.TENANT_EMAIL_NOT_FOUND, 404);
  }
  const tenantEmail = tenant!.emailId;

  const template = await EmailTemplate.findOne({
    templateKey: "Custom_Service_Invoice",
    status: "Active",
  }).lean();

  console.log(
    "sendCustomServiceInvoice >> template lookup (templateKey='Custom_Service_Invoice', status='Active') found:",
    Boolean(template),
  );

  if (!template) {
    throwError(customServiceInvoiceMessages.EMAIL_TEMPLATE_NOT_FOUND, 404);
  }

  const subscription = invoice.subscriptionId as unknown as { duration?: number };
  const plan = invoice.planId as unknown as {
    planId?: string;
    planName?: string;
  };
  const paymentLink = payload.paymentLink ?? getPaymentLink(invoice._id);
  if (invoice.paymentLink !== paymentLink) {
    invoice.paymentLink = paymentLink;
    await invoice.save();
  }
  const values: Record<string, unknown> = {
    INVOICE_ID: invoice._id,
    INVOICE_NUMBER: invoice.invoiceNumber,
    TENANT_ID: invoice.tenantId,
    ORG_NAME: tenant!.tenantName,
    ADMIN_EMAIL: tenantEmail,
    PLAN_ID: plan?.planId,
    PLAN_NAME: plan?.planName,
    BILLING_CYCLE: subscription?.duration,
    INVOICE_DATE: invoice.invoiceDate.toDateString(),
    DUE_DATE: invoice.dueDate.toDateString(),
    SUBTOTAL: invoice.subTotal,
    GST_AMOUNT: invoice.totalTax,
    TOTAL_TAX: invoice.totalTax,
    TOTAL_AMOUNT: invoice.totalAmount,
    PAYMENT_LINK: paymentLink,
    INVOICE_LINK: paymentLink,
  };

  let html = template!.templateContent;
  for (const [key, value] of Object.entries(values)) {
    html = html.replace(
      new RegExp(`{{${key}}}`, "g"),
      String(value ?? "-"),
    );
  }

  console.log("sendCustomServiceInvoice >> calling sendEmailClient for", tenantEmail);

  const mailResponse = await sendEmailClient(
    [{ email: tenantEmail }],
    `Custom Service Invoice ${invoice.invoiceNumber}`,
    html,
  );

  console.log("sendCustomServiceInvoice >> mailResponse", JSON.stringify(mailResponse));

  if (!mailResponse) {
    throwError(customServiceInvoiceMessages.EMAIL_SEND_FAILED, 502);
  }

  return {
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    recipient: tenantEmail,
    messageId: mailResponse?.messageId ?? null,
  };
};
