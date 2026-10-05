import { sendEmailClient } from "../shared/email";
import emailTemplates from "../models/emailTemplate";
import UserModel from "../models/users";
import SubscriptionTrial from "../models/subcriptionTrial";
import CustomEnumerator, { SubscriptionTrialStatus } from "../shared/enum";
import { hashPassword } from "../shared/common";
import TrialMemberModel from "../models/trailmember";

export const generateTrialPassword = (tenantCode: string): string => {
  return `Trial_${tenantCode}`;
};

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

export const createTrialMember = async (tenantDetails: any) => {
  const plainPassword = generateTrialPassword(tenantDetails.tenantCode);

  const hashedPassword = await hashPassword(plainPassword);

  const trialMember = new TrialMemberModel({
    tenantId: tenantDetails.tenantCode,
    userName: tenantDetails.tenantCode,
    email: tenantDetails.emailId,
    password: hashedPassword,
    role: ["TRIAL_TENANT"],
    status: CustomEnumerator.Status.ACTIVE,
    createdBy: tenantDetails.createdBy || "System",
    lastUpdatedBy: tenantDetails.createdBy || "System",
  });

  const savedMember = await trialMember.save();

  return {
    ...savedMember.toObject(),
    plainPassword,
  };
};

export async function TenantWelcomeMail(
  tenantDetails: any,
  trialMember: any,
) {
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

    const trialStartDate = new Date(tenantDetails.createdDate);

    const trialEndDate = new Date(trialStartDate);
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const htmlPart = emailTemplate.templateContent
      .replace(/<tenantName>/g, tenantName)
      .replace(/<planName>/g, tenantDetails.plan || "Trial")
      .replace(/<trialEndDate>/g, trialEndDate.toDateString())
      .replace(/<username>/g, trialMember.userName || "Admin")
      .replace(/<password>/g, trialMember.plainPassword || "")
      .replace(
        /<loginLink>/g,
        "https://blackstoneinfomaticstech.com/modules/users/admin-main/ui/login",
      )
      .replace(
        /<supportEmail>/g,
        "support@yourdomain.com",
      );

    const mailResponse = await sendEmailClient(
      emailTo,
      subject,
      htmlPart,
    );

    if (!mailResponse) {
      console.log("❌ Tenant welcome mail not sent");
      return;
    }

    console.log("✅ Tenant welcome mail sent");

    await SubscriptionTrial.findOneAndUpdate(
      {
        tenantId: tenantDetails.tenantCode,
        deletedAt: null,
      },
      {
        $setOnInsert: {
          tenantId: tenantDetails.tenantCode,
          trialStartDate,
          trialEndDate,
          status: SubscriptionTrialStatus.ACTIVE,
          isConverted: false,
          convertedAt: null,
          createdBy: tenantDetails.createdBy || "System",
          updatedBy: null,
          deletedAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    console.log("✅ Subscription trial recorded");
  } catch (error) {
    console.error("❌ Tenant welcome mail failed", error);
  }
}

