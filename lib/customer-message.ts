import { sendSms } from "@/lib/sms";

type CustomerMessage = {
  to: string;
  message: string;
};

async function sendMetaWhatsapp({ to, message }: CustomerMessage) {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return null;
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.startsWith("91") ? to : `91${to}`,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return data?.error?.message ?? "WhatsApp Cloud API rejected the message.";
  }

  return "WhatsApp message sent.";
}

async function sendTwilioWhatsapp({ to, message }: CustomerMessage) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    return null;
  }

  const formattedMobile = to.startsWith("+") ? to : `+91${to}`;
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${accountSid}:${authToken}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        Body: message,
        From: from,
        To: `whatsapp:${formattedMobile}`,
      }),
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return data?.message ?? "Twilio WhatsApp rejected the message.";
  }

  return "WhatsApp message sent.";
}

export async function sendCustomerMessage(message: CustomerMessage) {
  const metaWhatsapp = await sendMetaWhatsapp(message);

  if (metaWhatsapp) {
    return metaWhatsapp;
  }

  const twilioWhatsapp = await sendTwilioWhatsapp(message);

  if (twilioWhatsapp) {
    return twilioWhatsapp;
  }

  return sendSms(message);
}
