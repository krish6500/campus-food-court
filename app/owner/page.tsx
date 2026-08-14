import { redirect } from "next/navigation";
import OwnerMenuManager from "../components/OwnerMenuManager";
import { isOwnerAuthenticated } from "../../lib/owner-auth";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  if (!(await isOwnerAuthenticated())) {
    redirect("/owner/login");
  }

  const { data: stalls, error } = await supabase
    .from("stalls")
    .select("*, menu_items(*)");

  if (error) {
    console.error("Database Error:", error.message);
  }

  if (!stalls || stalls.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-8 text-red-600">
          No stalls found. Add stalls in Supabase first, then manage menu items
          here.
        </div>
      </main>
    );
  }

  return <OwnerMenuManager stalls={stalls} />;
}
