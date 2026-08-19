import crypto from "crypto";

export type RazorpayPaymentFields = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export function hasRazorpayKeys() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export function verifyRazorpayPaymentSignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: RazorpayPaymentFields) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error("Razorpay secret is not configured.");
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (razorpay_signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpay_signature),
  );
}
