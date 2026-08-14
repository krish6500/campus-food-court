import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isOwnerAuthenticated } from "@/lib/owner-auth";
import { supabase } from "@/lib/supabase";

type MenuItemUpdate = {
  name?: string;
  price?: string | number;
  is_available?: boolean;
};

function cleanUpdate(payload: MenuItemUpdate) {
  const update: Record<string, string | number | boolean | null> = {};

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      return { error: "Item name is required." };
    }
    update.name = name;
  }

  if (payload.price !== undefined) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
      return { error: "Price must be greater than zero." };
    }
    update.price = price;
  }

  if (payload.is_available !== undefined) {
    update.is_available = payload.is_available;
  }

  return { update };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  if (!(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const { itemId } = await context.params;
  const payload = (await request.json().catch(() => null)) as
    | MenuItemUpdate
    | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = cleanUpdate(payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("menu_items")
    .update(result.update)
    .eq("item_id", itemId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/owner");

  return NextResponse.json({ item: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  if (!(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const { itemId } = await context.params;
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("item_id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/owner");

  return NextResponse.json({ ok: true });
}
