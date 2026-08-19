import { NextResponse } from "next/server";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const verified = verifyRazorpayPaymentSignature({
    razorpay_order_id: String(body?.razorpay_order_id ?? ""),
    razorpay_payment_id: String(body?.razorpay_payment_id ?? ""),
    razorpay_signature: String(body?.razorpay_signature ?? ""),
  });

  return verified
    ? NextResponse.json({ verified: true, mode: "razorpay" })
    : NextResponse.json(
        { error: "Payment signature verification failed." },
        { status: 400 },
      );
}
