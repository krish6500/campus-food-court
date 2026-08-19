import { NextResponse } from "next/server";
import { isOwnerAuthenticated } from "@/lib/owner-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const fallbackBanners = [
  {
    id: "great-indian-festival",
    title: "Great Indian Festival",
    subtitle: "Festival deals across groceries, gadgets and home essentials",
    imageUrl:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1800&q=80",
    linkUrl: "#Fresh",
    isActive: true,
  },
];

type BannerPayload = {
  id?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  displayOrder?: number | string;
};

function toBanner(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title),
    subtitle: String(row.subtitle ?? ""),
    imageUrl: String(row.image_url),
    linkUrl: String(row.link_url ?? "#fresh"),
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order ?? 0),
  };
}

function cleanBanner(payload: BannerPayload) {
  const title = payload.title?.trim();
  const imageUrl = payload.imageUrl?.trim();

  if (!title || !imageUrl) {
    return { error: "Banner title and image URL are required." };
  }

  return {
    banner: {
      title,
      subtitle: payload.subtitle?.trim() ?? "",
      image_url: imageUrl,
      link_url: payload.linkUrl?.trim() || "#fresh",
      is_active: payload.isActive ?? true,
      display_order: Number(payload.displayOrder ?? 0),
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ownerMode = url.searchParams.get("owner") === "1";

  if (ownerMode && !(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const client = ownerMode ? getSupabaseAdmin() : supabase;
  let query = client
    .from("banners")
    .select("id, title, subtitle, image_url, link_url, is_active, display_order")
    .order("display_order", { ascending: true });

  if (!ownerMode) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    return NextResponse.json({ banners: fallbackBanners });
  }

  return NextResponse.json({
    banners: data.map((banner) => toBanner(banner as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  if (!(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as BannerPayload | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid banner details." }, { status: 400 });
  }

  const result = cleanBanner(payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("banners")
    .insert(result.banner)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ banner: toBanner(data as Record<string, unknown>) });
}

export async function PATCH(request: Request) {
  if (!(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as BannerPayload | null;

  if (!payload?.id) {
    return NextResponse.json({ error: "Banner ID is required." }, { status: 400 });
  }

  const result = cleanBanner(payload);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("banners")
    .update(result.banner)
    .eq("id", payload.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ banner: toBanner(data as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  if (!(await isOwnerAuthenticated())) {
    return NextResponse.json({ error: "Owner login required." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Banner ID is required." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("banners")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
