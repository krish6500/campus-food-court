import Link from "next/link";
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
    <main className="min-h-screen bg-zinc-100 px-4 py-6 font-sans text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Live campus ordering
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-zinc-950">
              Campus Food Court
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Browse stalls, add favourites to cart, review GST, and complete a
              quick counter payment flow.
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-2 md:justify-end">
            <Link
              className="flex h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-zinc-500"
              href="/owner"
            >
              Owner dashboard
            </Link>
            <div className="rounded-md bg-zinc-100 px-4 py-3">
              <p className="text-lg font-extrabold text-zinc-950">
                {stalls?.length ?? 0}
              </p>
              <p className="text-xs font-semibold text-zinc-500">Stalls</p>
            </div>
            <div className="rounded-md bg-zinc-100 px-4 py-3">
              <p className="text-lg font-extrabold text-zinc-950">5%</p>
              <p className="text-xs font-semibold text-zinc-500">GST</p>
            </div>
            <div className="rounded-md bg-zinc-100 px-4 py-3">
              <p className="text-lg font-extrabold text-zinc-950">Fast</p>
              <p className="text-xs font-semibold text-zinc-500">Pickup</p>
            </div>
          </div>
        </header>

        {stalls && stalls.length > 0 ? (
          <MenuBoard stalls={stalls} />
        ) : (
          <div className="rounded-lg border border-red-200 bg-white p-8 text-red-600">
            No stalls found. Check your database connection and table data.
          </div>
        )}
      </div>
    </main>
  );
}
