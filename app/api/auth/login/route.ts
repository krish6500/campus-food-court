import { NextResponse } from "next/server";
import { signCustomerToken } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const mobile = String(body?.mobile ?? "").replace(/\D/g, "");
  const name = String(body?.name ?? "Super Bazar Customer").trim();

  if (mobile.length !== 10) {
    return NextResponse.json(
      { error: "Enter a valid 10 digit mobile number." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    token: signCustomerToken({
      sub: mobile,
      mobile,
      name: name || "Super Bazar Customer",
    }),
    user: {
      name: name || "Super Bazar Customer",
      mobile,
    },
  });
}
