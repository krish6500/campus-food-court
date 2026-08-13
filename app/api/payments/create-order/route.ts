import { NextResponse } from "next/server";
import { calculateCheckout, sanitizeCheckoutItems } from "@/lib/checkout";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const body = await request.json().catch(() => null);
  const items = sanitizeCheckoutItems(body?.items);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Add at least one valid item to create an order." },
      { status: 400 },
    );
  }

  const itemIds = items.map((item) => item.id);
  const { data: menuItems, error } = await supabase
    .from("menu_items")
    .select("item_id, name, price")
    .in("item_id", itemIds);

  if (error || !menuItems) {
    return NextResponse.json(
      { error: error?.message ?? "Could not validate menu item prices." },
      { status: 500 },
    );
  }

  const menuItemById = new Map(
    menuItems.map((item) => [
      String(item.item_id),
      {
        name: String(item.name),
        price: Number(item.price),
      },
    ]),
  );
  const validatedItems = items
    .map((item) => {
      const menuItem = menuItemById.get(item.id);

      if (!menuItem || !Number.isFinite(menuItem.price)) {
        return null;
      }

      return {
        ...item,
        name: menuItem.name,
        price: menuItem.price,
      };
    })
    .filter((item): item is (typeof items)[number] => item !== null);

  if (validatedItems.length === 0) {
    return NextResponse.json(
      { error: "No matching menu items found for checkout." },
      { status: 400 },
    );
  }

  const totals = calculateCheckout(validatedItems);

  if (!keyId || !keySecret) {
    return NextResponse.json({
      mode: "demo",
      keyId: null,
      order: {
        id: `demo_order_${Date.now()}`,
        amount: totals.totalPaise,
        currency: "INR",
      },
      totals,
    });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const receipt = `cfc_${Date.now()}`.slice(0, 40);

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: totals.totalPaise,
      currency: "INR",
      receipt,
      notes: {
        source: "campus_food_court",
        item_count: String(items.reduce((sum, item) => sum + item.quantity, 0)),
      },
    }),
  });

  const order = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          order?.error?.description ??
          "Payment gateway could not create the order.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    mode: "razorpay",
    keyId,
    order,
    totals,
  });
}
