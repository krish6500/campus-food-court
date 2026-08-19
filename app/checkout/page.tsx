"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  cartTotals,
  money,
  readCart,
  SUPER_BAZAR_TOKEN_KEY,
  type ShopCartItem,
  writeCart,
} from "@/lib/shop";

type Step = "login" | "address" | "payment" | "review";

type AddressState = {
  fullName: string;
  mobile: string;
  line1: string;
  city: string;
  pincode: string;
};

const emptyAddress: AddressState = {
  fullName: "",
  mobile: "",
  line1: "",
  city: "",
  pincode: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [step, setStep] = useState<Step>("login");
  const [address, setAddress] = useState<AddressState>(emptyAddress);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const totals = cartTotals(items);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setItems(readCart());
      if (localStorage.getItem(SUPER_BAZAR_TOKEN_KEY)) {
        setStep("address");
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  async function login() {
    setIsBusy(true);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: address.fullName || "Super Bazar Customer",
          mobile: address.mobile,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Login failed.");
      }

      localStorage.setItem(SUPER_BAZAR_TOKEN_KEY, data.token);
      setStep("address");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function validateAddress() {
    setIsBusy(true);
    setStatus(null);

    try {
      if (!address.fullName || !address.line1 || !address.mobile) {
        throw new Error("Fill name, mobile and address.");
      }

      const response = await fetch(
        `/api/serviceability?pincode=${address.pincode}`,
      );
      const data = await response.json();

      if (!response.ok || !data.serviceable) {
        throw new Error("This pincode is not serviceable yet.");
      }

      setAddress((current) => ({ ...current, city: data.city ?? current.city }));
      setStep("payment");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not validate address.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function completePayment() {
    const orderId = `SB-${Date.now().toString().slice(-8)}`;

    writeCart([]);
    router.push(`/order-confirmation?orderId=${orderId}&total=${totals.total}`);
  }

  return (
    <main className="min-h-screen bg-[#e3e6e6] text-zinc-950">
      <header className="bg-[#131921] px-5 py-4 text-white">
        <div className="mx-auto max-w-5xl text-2xl font-extrabold">
          Super Bazar Checkout
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="bg-white p-5 shadow-sm">
            <h1 className="text-3xl font-extrabold">Checkout</h1>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-extrabold uppercase">
              {(["login", "address", "payment", "review"] as Step[]).map(
                (item) => (
                  <span
                    className={`rounded-full px-2 py-2 ${
                      item === step
                        ? "bg-amber-300 text-zinc-950"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                    key={item}
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          {step === "login" ? (
            <section className="bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold">Sign in</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  className="h-11 rounded-sm border border-zinc-300 px-3"
                  onChange={(event) =>
                    setAddress({ ...address, fullName: event.target.value })
                  }
                  placeholder="Full name"
                  value={address.fullName}
                />
                <input
                  className="h-11 rounded-sm border border-zinc-300 px-3"
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setAddress({ ...address, mobile: event.target.value })
                  }
                  placeholder="Mobile number"
                  value={address.mobile}
                />
              </div>
              <button
                className="mt-4 h-11 rounded-full bg-amber-300 px-6 text-sm font-extrabold hover:bg-amber-400 disabled:bg-zinc-200"
                disabled={isBusy}
                onClick={login}
                type="button"
              >
                Continue with JWT Login
              </button>
            </section>
          ) : null}

          {step === "address" ? (
            <section className="bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold">Delivery address</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="h-11 rounded-sm border border-zinc-300 px-3"
                  onChange={(event) =>
                    setAddress({ ...address, line1: event.target.value })
                  }
                  placeholder="House number, street, area"
                  value={address.line1}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="h-11 rounded-sm border border-zinc-300 px-3"
                    onChange={(event) =>
                      setAddress({ ...address, city: event.target.value })
                    }
                    placeholder="City"
                    value={address.city}
                  />
                  <input
                    className="h-11 rounded-sm border border-zinc-300 px-3"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) =>
                      setAddress({ ...address, pincode: event.target.value })
                    }
                    placeholder="Pincode"
                    value={address.pincode}
                  />
                </div>
              </div>
              <button
                className="mt-4 h-11 rounded-full bg-amber-300 px-6 text-sm font-extrabold hover:bg-amber-400 disabled:bg-zinc-200"
                disabled={isBusy}
                onClick={validateAddress}
                type="button"
              >
                Use this address
              </button>
            </section>
          ) : null}

          {step === "payment" ? (
            <section className="bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold">Mock payment gateway</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="h-11 rounded-sm border border-zinc-300 px-3"
                  inputMode="numeric"
                  placeholder="Card number"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-11 rounded-sm border border-zinc-300 px-3"
                    placeholder="MM/YY"
                  />
                  <input
                    className="h-11 rounded-sm border border-zinc-300 px-3"
                    inputMode="numeric"
                    placeholder="CVV"
                    type="password"
                  />
                </div>
              </div>
              <button
                className="mt-4 h-11 rounded-full bg-amber-300 px-6 text-sm font-extrabold hover:bg-amber-400"
                onClick={() => setStep("review")}
                type="button"
              >
                Review order
              </button>
            </section>
          ) : null}

          {step === "review" ? (
            <section className="bg-white p-5 shadow-sm">
              <h2 className="text-xl font-extrabold">Place your order</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-600">
                Delivering to {address.line1}, {address.city} {address.pincode}
              </p>
              <button
                className="mt-4 h-11 rounded-full bg-amber-300 px-6 text-sm font-extrabold hover:bg-amber-400"
                onClick={completePayment}
                type="button"
              >
                Pay {money(totals.total)} and place order
              </button>
            </section>
          ) : null}

          {status ? (
            <div className="border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {status}
            </div>
          ) : null}
        </section>

        <aside className="h-fit bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold">Order summary</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div className="flex justify-between gap-3 text-sm" key={item.id}>
                <span>
                  {item.quantity} x {item.name}
                </span>
                <span className="font-bold">
                  {money(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-zinc-200 pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{money(totals.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
