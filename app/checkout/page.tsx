"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { calculateCheckout } from "@/lib/checkout";
import {
  money,
  readCart,
  SUPER_BAZAR_TOKEN_KEY,
  type ShopCartItem,
  writeCart,
} from "@/lib/shop";

type Step = "login" | "address" | "payment" | "review";

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (
        event: "payment.failed",
        handler: (response: { error?: { description?: string } }) => void,
      ) => void;
    };
  }
}

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
  const totals = calculateCheckout(items);

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

  async function savePaidOrder(payment: RazorpaySuccessResponse) {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: {
          loginMethod: "mobile",
          name: address.fullName,
          mobile: address.mobile,
        },
        items,
        payment,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error ?? "Payment succeeded, but order was not saved.");
    }

    const orderId = data.order?.orderId ?? data.order?.order_id;
    writeCart([]);
    router.push(`/?orderId=${orderId}`);
  }

  async function startRazorpayPayment() {
    setIsBusy(true);
    setStatus(null);

    try {
      if (items.length === 0) {
        throw new Error("Your cart is empty.");
      }

      if (!address.fullName || !address.mobile || !address.line1) {
        throw new Error("Complete login and address before payment.");
      }

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not start Razorpay payment.");
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout did not load. Refresh and try again.");
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency ?? "INR",
        name: "Super Bazar",
        description: "Super Bazar order payment",
        order_id: data.order.id,
        prefill: {
          name: address.fullName,
          contact: address.mobile,
        },
        theme: {
          color: "#facc15",
        },
        handler: async (paymentResponse) => {
          setIsBusy(true);
          setStatus(null);

          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paymentResponse),
            });
            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.verified) {
              throw new Error(
                verifyData?.error ?? "Payment verification failed.",
              );
            }

            await savePaidOrder(paymentResponse);
          } catch (error) {
            setStatus(
              error instanceof Error
                ? error.message
                : "Payment succeeded, but order could not be placed.",
            );
          } finally {
            setIsBusy(false);
          }
        },
      });

      razorpay.on("payment.failed", (paymentResponse) => {
        setStatus(paymentResponse.error?.description ?? "Payment failed.");
        setIsBusy(false);
      });

      setIsBusy(false);
      razorpay.open();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not open Razorpay.",
      );
      setIsBusy(false);
    }
  }

  function goToStep(nextStep: Step) {
    setStatus(null);
    setStep(nextStep);
  }

  function changeLogin() {
    localStorage.removeItem(SUPER_BAZAR_TOKEN_KEY);
    setStatus(null);
    setStep("login");
  }

  return (
    <main className="min-h-screen bg-[#e3e6e6] text-zinc-950">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
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
                  <button
                    className={`rounded-full px-2 py-2 transition ${
                      item === step
                        ? "bg-amber-300 text-zinc-950"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                    key={item}
                    onClick={() => goToStep(item)}
                    type="button"
                  >
                    {item}
                  </button>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold">Delivery address</h2>
                <button
                  className="rounded-sm border border-zinc-300 px-3 py-2 text-sm font-extrabold hover:bg-zinc-100"
                  onClick={changeLogin}
                  type="button"
                >
                  Change login
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
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
              <h2 className="text-xl font-extrabold">Razorpay payment</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-600">
                Your order will be sent to the counter only after Razorpay
                confirms and the server verifies the payment.
              </p>
              <button
                className="mt-4 h-11 rounded-full bg-amber-300 px-6 text-sm font-extrabold hover:bg-amber-400 disabled:bg-zinc-200"
                disabled={isBusy}
                onClick={startRazorpayPayment}
                type="button"
              >
                Pay {money(totals.total)} with Razorpay
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
                onClick={startRazorpayPayment}
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
              <span>GST</span>
              <span>{money(totals.gst)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform fee</span>
              <span>{money(totals.platformFee)}</span>
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
