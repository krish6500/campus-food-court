import { NextRequest, NextResponse } from "next/server";
import { calculateCheckout, sanitizeCheckoutItems } from "@/lib/checkout";
import { isOwnerAuthenticated } from "@/lib/owner-auth";
import {
  createOrder,
  getOrder,
  getOrders,
  type CustomerProfile,
  type StoredOrder,
} from "@/lib/orders";
import { sendSms } from "@/lib/sms";

const UPI_ID = "9008799949@ybl";

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
  const paymentMethod = String(body?.paymentMethod ?? "UPI");

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

  const totals = calculateCheckout(items);
  const orderId = `CFC-${Date.now().toString().slice(-6)}`;
  const billMessage = `Bill ${orderId}: ${money(totals.total)} for ${items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )} item(s). Counter received your order.`;
  const smsStatus = await sendSms({
    to: customer.mobile,
    message: `${billMessage} We will message again when it is ready for pickup.`,
  });
  const order: StoredOrder = {
    orderId,
    customer,
    items,
    paymentMethod,
    paymentUpiId: paymentMethod === "UPI" ? UPI_ID : undefined,
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
