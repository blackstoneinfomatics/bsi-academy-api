import axios from "axios";

/**
 * SMS via Twilio's REST API (https://www.twilio.com/docs/sms/api/message-resource).
 * No provider was specified for this project yet, so Twilio was picked as the
 * default since it needs no new SDK dependency (plain REST + Basic Auth via axios).
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM in .env.
 * Swap this file out if a different provider is required.
 */
export const sendSmsClient = async (
  to: string,
  message: string,
): Promise<{ success: boolean; error?: string }> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;

  if (!accountSid || !authToken || !from) {
    console.log("Err>>>>> SMS not sent: Twilio credentials are not configured");
    return { success: false, error: "SMS provider is not configured" };
  }

  if (!to) {
    return { success: false, error: "Recipient phone number is missing" };
  }

  try {
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: message,
    });

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      body,
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return { success: true };
  } catch (err: any) {
    console.log("Err>>>>>", err?.response?.data ?? err.message);
    return {
      success: false,
      error: err?.response?.data?.message ?? err.message,
    };
  }
};
