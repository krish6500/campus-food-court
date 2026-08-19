import { NextResponse } from "next/server";
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

export async function GET() {
  const { data, error } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, link_url, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data?.length) {
    return NextResponse.json({ banners: fallbackBanners });
  }

  return NextResponse.json({
    banners: data.map((banner) => ({
      id: String(banner.id),
      title: String(banner.title),
      subtitle: String(banner.subtitle ?? ""),
      imageUrl: String(banner.image_url),
      linkUrl: String(banner.link_url ?? "#Fresh"),
      isActive: Boolean(banner.is_active),
    })),
  });
}
