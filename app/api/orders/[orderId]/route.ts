import { NextResponse } from "next/server";
import { sendCustomerMessage } from "@/lib/customer-message";
import { isOwnerAuthenticated } from "@/lib/owner-auth";
import { type OrderStatus, updateOrderStatus } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    value === "sent_to_counter" || value === "preparing" || value === "ready"
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const { orderId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!isOrderStatus(body?.status)) {
    return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  }

  try {
    const order = await updateOrderStatus(orderId, body.status);
    let smsStatus = order.smsStatus;

    if (body.status === "ready") {
      smsStatus = await sendCustomerMessage({
        to: order.customer.mobile,
        message: `Order ${order.orderId} is ready. Please pick it up from the counter.`,
      });
    }

    return NextResponse.json({ order: { ...order, smsStatus } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update order.",
      },
      { status: 500 },
    );
  }
}
