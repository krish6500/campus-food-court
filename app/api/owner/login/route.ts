import { redirect } from "next/navigation";
import { setOwnerSession, verifyOwnerLogin } from "@/lib/owner-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!verifyOwnerLogin(username, password)) {
    redirect("/owner/login?error=1");
  }

  await setOwnerSession();
  redirect("/owner");
}
