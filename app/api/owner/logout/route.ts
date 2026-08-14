import { redirect } from "next/navigation";
import { clearOwnerSession } from "@/lib/owner-auth";

export const runtime = "nodejs";

export async function POST() {
  await clearOwnerSession();
  redirect("/owner/login");
}
