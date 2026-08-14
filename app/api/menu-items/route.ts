import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isOwnerAuthenticated } from "@/lib/owner-auth";
import { supabase } from "@/lib/supabase";

type MenuItemPayload = {
  stall_id?: string | number;
  name?: string;
  price?: string | number;
  is_available?: boolean;
};

function cleanPayload(payload: MenuItemPayload) {
  const price = Number(payload.price);

  if (!payload.stall_id || !payload.name?.trim()) {
    return { error: "Stall and item name are required." };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Price must be greater than zero." };
  }

  return {
    item: {
      stall_id: payload.stall_id,
      name: payload.name.trim(),
      price,
      is_available: payload.is_available ?? true,
    },
  };
}

export async function POST(request: Request) {
  if (!(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | MenuItemPayload
    | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = cleanPayload(payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("menu_items")
    .insert(result.item)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/owner");

  return NextResponse.json({ item: data }, { status: 201 });
}
