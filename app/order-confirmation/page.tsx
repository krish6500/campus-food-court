import Link from "next/link";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; total?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId ?? "SB-CONFIRMED";
  const total = Number(params.total ?? 0);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e3e6e6] px-5 text-zinc-950">
      <section className="w-full max-w-xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-extrabold uppercase tracking-wide text-emerald-700">
          Order confirmed
        </p>
        <h1 className="mt-3 text-4xl font-extrabold">Thank you for shopping</h1>
        <p className="mt-4 text-lg font-semibold text-zinc-700">
          Your Super Bazar order ID is {orderId}.
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-500">
          Total paid: Rs {Math.round(total)}
        </p>
        <Link
          className="mt-6 inline-flex h-11 items-center rounded-full bg-amber-300 px-6 text-sm font-extrabold text-zinc-950 hover:bg-amber-400"
          href="/"
        >
          Continue shopping
        </Link>
      </section>
    </main>
  );
}
