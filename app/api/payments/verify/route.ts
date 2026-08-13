import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const body = await request.json().catch(() => null);

  if (body?.mode === "demo") {
    return NextResponse.json({ verified: true, mode: "demo" });
  }

  if (!keySecret) {
    return NextResponse.json(
      { error: "Razorpay secret is not configured." },
      { status: 500 },
    );
  }

  const orderId = String(body?.razorpay_order_id ?? "");
  const paymentId = String(body?.razorpay_payment_id ?? "");
  const signature = String(body?.razorpay_signature ?? "");

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json(
      { error: "Missing payment verification fields." },
      { status: 400 },
    );
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return NextResponse.json(
      { error: "Payment signature verification failed." },
      { status: 400 },
    );
  }

  const verified = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature),
  );

  if (!verified) {
    return NextResponse.json(
      { error: "Payment signature verification failed." },
      { status: 400 },
    );
  }

  return NextResponse.json({ verified: true, mode: "razorpay" });
}
