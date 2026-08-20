import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { calculateCheckout, sanitizeCheckoutItems } from "@/lib/checkout";
import { sendCustomerMessage } from "@/lib/customer-message";
import { isOwnerAuthenticated } from "@/lib/owner-auth";
import {
  createOrder,
  getOrder,
  getOrders,
  type CustomerProfile,
  type StoredOrder,
} from "@/lib/orders";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function sanitizeCustomer(value: unknown): CustomerProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const mobile = String(record.mobile ?? "").replace(/\D/g, "");
  const loginMethod = record.loginMethod === "google" ? "google" : "mobile";

  if (mobile.length !== 10) {
    return null;
  }

  return {
    loginMethod,
    name: String(record.name ?? "Campus Student").slice(0, 80),
    mobile,
  };
}

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");

  try {
    if (orderId) {
      const order = await getOrder(orderId);
      return NextResponse.json({
        order: {
          orderId: order.orderId,
          status: order.status,
          billMessage: order.billMessage,
          total: order.total,
        },
      });
    }

    if (!(await isOwnerAuthenticated())) {
      return NextResponse.json({ error: "Owner login required." }, { status: 401 });
    }

    return NextResponse.json({ orders: await getOrders() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load orders.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const customer = sanitizeCustomer(body?.customer);
  const items = sanitizeCheckoutItems(body?.items);
  const payment = {
    razorpay_order_id: String(body?.payment?.razorpay_order_id ?? ""),
    razorpay_payment_id: String(body?.payment?.razorpay_payment_id ?? ""),
    razorpay_signature: String(body?.payment?.razorpay_signature ?? ""),
  };

  if (!customer) {
    return NextResponse.json(
      { error: "A valid 10 digit mobile number is required." },
      { status: 400 },
    );
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Add at least one valid item before ordering." },
      { status: 400 },
    );
  }

  try {
    if (!verifyRazorpayPaymentSignature(payment)) {
      return NextResponse.json(
        { error: "Payment was not verified. Order was not placed." },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      { status: 500 },
    );
  }

  const totals = calculateCheckout(items);
  const orderId = crypto.randomUUID();
  const billMessage = `Payment successful. Bill ${orderId}: ${money(totals.total)} for ${items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )} item(s). Your order has been received. We will message again when it is dispatched.`;
  const smsStatus = await sendCustomerMessage({
    to: customer.mobile,
    message: billMessage,
  });
  const order: StoredOrder = {
    orderId,
    customer,
    items,
    paymentMethod: "Razorpay",
    paymentUpiId: payment.razorpay_payment_id,
    status: "sent_to_counter",
    subtotal: totals.subtotal,
    gst: totals.gst,
    platformFee: totals.platformFee,
    total: totals.total,
    createdAt: new Date().toISOString(),
    billMessage,
    smsStatus,
  };

  try {
    return NextResponse.json({ order: await createOrder(order) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save order.",
      },
      { status: 500 },
    );
  }
}
