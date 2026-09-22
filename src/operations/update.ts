import UpdateModel from "../models/update";
import { CreateUpdateInput } from "../models/update";
import Tenants from "../models/tenants";
import TenantSubscription from "../models/tenantsubscription";
import emailTemplates from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );

const sendUpdateEmail = async (
  payload: CreateUpdateInput,
): Promise<void> => {
  const selectedTenantCodes = (payload.selectedTenants || [])
    .map((tenantCode) => tenantCode.trim())
    .filter(Boolean);

  console.log(
    "sendUpdateEmail >> start",
    JSON.stringify({
      emailNotificationEnabled: payload.sendNotification?.email,
      selectedTenants: selectedTenantCodes,
    }),
  );

  if (
    !payload.sendNotification?.email ||
    selectedTenantCodes.length === 0
  ) {
    console.log(
      "sendUpdateEmail >> skipped: notification disabled or no tenants selected",
    );

    return;
  }

  const emailTemplate = await emailTemplates
    .findOne({
      templateKey: "Publich_Update",
      status: "Active",
    })
    .exec();

  if (!emailTemplate) {
    console.log(
      "❌ sendUpdateEmail >> Email template not found",
    );

    return;
  }

  console.log(
    "✅ sendUpdateEmail >> Email template found",
    emailTemplate.templateKey,
  );

  const subscriptions = await TenantSubscription.find({
    tenantId: { $in: selectedTenantCodes },
    deletedAt: null,
  })
    .select({
      tenantId: 1,
      _id: 0,
    })
    .lean();

  console.log(
    "sendUpdateEmail >> subscriptions found",
    JSON.stringify(subscriptions),
  );

  const tenantCodes =
    subscriptions.length > 0
      ? subscriptions.map(
          (subscription) => subscription.tenantId,
        )
      : selectedTenantCodes;

  const tenants = await Tenants.find({
    tenantCode: { $in: tenantCodes },
  })
    .select({
      tenantCode: 1,
      emailId: 1,
    })
    .lean();

  console.log(
    "sendUpdateEmail >> tenants found",
    JSON.stringify(tenants),
  );

  const recipients = tenants
    .filter((tenant) => tenant.emailId)
    .map((tenant) => ({
      email: tenant.emailId,
    }));

  console.log(
    "sendUpdateEmail >> recipients",
    JSON.stringify(recipients),
  );

  if (recipients.length === 0) {
    console.log(
      "sendUpdateEmail >> skipped: no recipients resolved",
    );

    return;
  }

  const title = escapeHtml(payload.title);

  const description = escapeHtml(
    payload.description,
  ).replace(/\n/g, "<br />");

  const category = escapeHtml(payload.category);

  const priority = escapeHtml(payload.priority || "");

  const publishDate = new Date(
    payload.publishDate,
  ).toDateString();

  const attachments = (payload.attachments || [])
    .map((attachment) => escapeHtml(attachment))
    .join(", ");

  const htmlPart = emailTemplate.templateContent
    .replace(/<title>/g, title)
    .replace(/<description>/g, description)
    .replace(/<category>/g, category)
    .replace(/<priority>/g, priority)
    .replace(/<publishDate>/g, publishDate)
    .replace(/<attachments>/g, attachments);

  console.log(
    "sendUpdateEmail >> template prepared",
  );

  const subject = payload.title;

  console.log(
    "📨 Sending update email to:",
    JSON.stringify(recipients),
  );

  await sendEmailClient(
    recipients,
    subject,
    htmlPart,
  );

  console.log(
    "✅ sendUpdateEmail >> Update email sent successfully",
  );
};

export const createUpdate = async (payload: CreateUpdateInput) => {

  const update = await UpdateModel.create({
    title: payload.title,

    category: payload.category,

    audience: payload.audience,

    selectedTenants: payload.selectedTenants || [],

    description: payload.description,

    publishDate: payload.publishDate,

    releaseDate: payload.releaseDate,

    priority: payload.priority,

    attachments: payload.attachments || [],

    sendNotification: {
      email: payload.sendNotification?.email || false,
      inApp: payload.sendNotification?.inApp || false,
    },

    email: payload.email,

    recipientEmail: payload.recipientEmail,

    recipientEmails: payload.recipientEmails || [],

    purchaseTenant: payload.purchaseTenant || 0,

    status: payload.status || "Scheduled",

    views: 0,
  });

  try {
    await sendUpdateEmail(payload);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.log("sendUpdateEmail >> FAILED", error?.message || err);
  }

  return update;
};