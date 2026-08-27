import { sendEmailClient } from "../shared/email";
import emailTemplates from "../models/emailTemplate";
import UserModel from "../models/users";

export async function TrialExpiredMail(tenantDetails: any) {
  try {
    const emailTemplate = await emailTemplates
      .findOne({
        templateKey: "subscription-trial-expired",

        status: "Active",
      })
      .exec();

    if (!emailTemplate) {
      console.log("❌ Email template not found");

      return;
    }
console.log(
  "📨 Mail Triggered"
);

    const emailTo = [
      {
        email:tenantDetails.emailId,
      },
    ];

    const subject = "Your Trial Subscription Has Expired";

    const tenantName =
      tenantDetails.organizationName ||
      tenantDetails.tenantCode ||
      tenantDetails.tenantName ||
      "Customer";

    const htmlPart = emailTemplate.templateContent
      .replace(/<tenantName>/g, tenantName)
      .replace(/<planName>/g, tenantDetails.planName)
      .replace(
        /<trialEndDate>/g,
        new Date(tenantDetails.endDate).toDateString(),
      )
      .replace(/<upgradeLink>/g, "https://yourdomain.com/upgrade")
      .replace(/<supportEmail>/g, "support@yourdomain.com");

    await sendEmailClient(emailTo, subject, htmlPart);
console.log(
  "Sending mail to:",
  tenantDetails.emailId
);
    console.log("✅ Trial expired mail sent");
  } catch (error) {
    console.error("❌ Trial expired mail failed", error);
  }
}

export async function TenantWelcomeMail(tenantDetails: any) {
  try {
    const emailTemplate = await emailTemplates
      .findOne({
        templateKey: "tenant-trial-started",

        status: "Active",
      })
      .exec();

    if (!emailTemplate) {
      console.log("❌ Email template not found");

      return;
    }

    const emailTo = [
      {
        email: tenantDetails.emailId,
      },
    ];

    const subject = "Welcome! Your Trial Has Started";

    const tenantName =
      tenantDetails.organizationName ||
      tenantDetails.tenantCode ||
      tenantDetails.tenantName ||
      "Customer";

    const trialEndDate = new Date(tenantDetails.createdDate);
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // tenantId on tenantUsers is the owning Tenant's tenantCode (same
    // convention as TenantSubscription.tenantId), not a Mongo _id.
    const adminUser = await UserModel.findOne({
      tenantId: tenantDetails.tenantCode,
      role: "ADMIN",
    }).lean();

    console.log(
      `[TenantWelcomeMail] admin user lookup tenantCode=${tenantDetails.tenantCode} found=${!!adminUser}`,
    );

    const htmlPart = emailTemplate.templateContent
      .replace(/<tenantName>/g, tenantName)
      .replace(/<planName>/g, tenantDetails.plan || "Trial")
      .replace(/<trialEndDate>/g, trialEndDate.toDateString())
      .replace(/<username>/g, adminUser?.userName || "Admin")
      .replace(/<password>/g, adminUser?.password || "Admin#123")
      .replace(/<loginLink>/g, "https://blackstoneinfomaticstech.com/admin-main/ui/login")
      .replace(/<supportEmail>/g, "support@yourdomain.com");

    await sendEmailClient(emailTo, subject, htmlPart);

    console.log("✅ Tenant welcome mail sent");
  } catch (error) {
    console.error("❌ Tenant welcome mail failed", error);
  }
}

