"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  cartTotals,
  money,
  readCart,
  type ShopCartItem,
  writeCart,
} from "@/lib/shop";

export default function CartPage() {
  const [items, setItems] = useState<ShopCartItem[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setItems(readCart()), 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const totals = cartTotals(items);

  function updateQuantity(productId: string, change: number) {
    const nextItems = items
      .map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity + change }
          : item,
      )
      .filter((item) => item.quantity > 0);

    setItems(nextItems);
    writeCart(nextItems);
  }

  return (
    <main className="min-h-screen bg-[#e3e6e6] text-zinc-950">
      <header className="bg-[#131921] px-5 py-4 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link className="text-2xl font-extrabold" href="/">
            Super Bazar
          </Link>
          <Link className="text-sm font-bold text-amber-300" href="/">
            Continue shopping
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="bg-white p-5 shadow-sm">
          <h1 className="text-3xl font-extrabold">Shopping Cart</h1>
          <div className="mt-5 divide-y divide-zinc-200">
            {items.length > 0 ? (
              items.map((item) => (
                <article
                  className="grid gap-4 py-5 sm:grid-cols-[130px_minmax(0,1fr)_auto]"
                  key={item.id}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.name}
                    className="h-32 w-32 object-cover"
                    src={item.imageUrl}
                  />
                  <div>
                    <h2 className="text-xl font-extrabold">{item.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-zinc-500">
                      Sold by {item.stallName}
                    </p>
                    <p className="mt-2 text-lg font-extrabold text-emerald-700">
                      {money(item.price)}
                    </p>
                    <div className="mt-4 inline-flex h-9 items-center rounded-full border border-amber-500 bg-amber-100">
                      <button
                        className="h-full w-10 font-extrabold"
                        onClick={() => updateQuantity(item.id, -1)}
                        type="button"
                      >
                        -
                      </button>
                      <span className="w-9 text-center text-sm font-extrabold">
                        {item.quantity}
                      </span>
                      <button
                        className="h-full w-10 font-extrabold"
                        onClick={() => updateQuantity(item.id, 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-lg font-extrabold">
                    {money(item.price * item.quantity)}
                  </p>
                </article>
              ))
            ) : (
              <div className="py-10 text-center text-sm font-semibold text-zinc-500">
                Your Super Bazar cart is empty.
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit bg-white p-5 shadow-sm">
          <p className="text-lg font-extrabold">
            Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
          </p>
          <p className="mt-2 text-3xl font-extrabold">
            {money(totals.subtotal)}
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-500">
            Delivery fee: {money(totals.deliveryFee)}
          </p>
          <Link
            className={`mt-5 flex h-11 items-center justify-center rounded-full text-sm font-extrabold ${
              items.length
                ? "bg-amber-300 text-zinc-950 hover:bg-amber-400"
                : "pointer-events-none bg-zinc-200 text-zinc-500"
            }`}
            href="/checkout"
          >
            Proceed to Buy
          </Link>
        </aside>
      </div>
    </main>
  );
}
