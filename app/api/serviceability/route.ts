import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const fallbackPincodes = new Set([
  "560068",
  "560076",
  "560100",
  "560102",
  "562106",
]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pincode = request.nextUrl.searchParams.get("pincode")?.trim() ?? "";

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { error: "Enter a valid 6 digit pincode." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("serviceable_pincodes")
    .select("pincode, city, is_active")
    .eq("pincode", pincode)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({
      serviceable: fallbackPincodes.has(pincode),
      city:
        pincode === "562106"
          ? "Anekal"
          : fallbackPincodes.has(pincode)
            ? "Bengaluru"
            : null,
    });
  }

  return NextResponse.json({
    serviceable: Boolean(data),
    city: data?.city ?? null,
  });
}
