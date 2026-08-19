import MenuBoard from "./components/MenuBoard";
import { supabase } from "../lib/supabase";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: stalls, error } = await supabase
    .from('stalls')
    .select('*, menu_items(*)');

  if (error) {
    console.error('Database Error:', error.message);
  }

  return (
    <main className="min-h-screen bg-[#e3e6e6] font-sans text-zinc-950">
      {stalls && stalls.length > 0 ? (
        <MenuBoard stalls={stalls} />
      ) : (
        <div className="mx-auto max-w-3xl p-8 text-red-600">
          No products found. Check your database connection and table data.
        </div>
      )}
    </main>
  );
}
