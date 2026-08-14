export async function sendSms({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    return "SMS not sent. Add Twilio environment variables in Vercel.";
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
        To: formattedMobile,
      }),
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return data?.message ?? "SMS provider rejected the message.";
  }

  return "SMS sent.";
}
