import axios from "axios";

/**
 * WhatsApp via Meta's WhatsApp Business Cloud API
 * (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages).
 * No provider was specified for this project yet, so Meta's official Cloud API
 * was picked as the default since it needs no new SDK dependency (plain REST via axios).
 * Requires WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN in .env.
 * Swap this file out if a different provider (Twilio WhatsApp, Gupshup, etc.) is required.
 */
export const sendWhatsappClient = async (
  to: string,
  message: string,
): Promise<{ success: boolean; error?: string }> => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.log("Err>>>>> WhatsApp not sent: Meta Cloud API credentials are not configured");
    return { success: false, error: "WhatsApp provider is not configured" };
  }

  if (!to) {
    return { success: false, error: "Recipient phone number is missing" };
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    return { success: true };
  } catch (err: any) {
    console.log("Err>>>>>", err?.response?.data ?? err.message);
    return {
      success: false,
      error: err?.response?.data?.error?.message ?? err.message,
    };
  }
};
