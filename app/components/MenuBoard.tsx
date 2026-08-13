"use client";

import { useEffect, useMemo, useState } from "react";
import { GST_RATE, PLATFORM_FEE } from "@/lib/checkout";

type MenuItem = {
  item_id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  category?: string | null;
  is_available?: boolean | null;
};

type Stall = {
  stall_id: number | string;
  stall_name: string;
  cuisine?: string | null;
  menu_items?: MenuItem[] | null;
};

type CartLine = {
  item: MenuItem;
  stallName: string;
  quantity: number;
};

const paymentMethods = [
  "UPI",
  "Card",
  "Net Banking",
  "Cash at Counter",
] as const;

const UPI_ID = "9008799949@ybl";
const ORDERS_STORAGE_KEY = "campus_food_court_orders";

type CheckoutStatus = {
  tone: "success" | "error" | "info";
  message: string;
};

type CustomerProfile = {
  loginMethod: "google" | "mobile";
  name: string;
  mobile: string;
};

type StoredOrder = {
  orderId: string;
  customer: CustomerProfile;
  items: ReturnType<typeof checkoutItemsFromLines>;
  paymentMethod: (typeof paymentMethods)[number];
  paymentUpiId?: string;
  status: "sent_to_counter" | "preparing" | "ready";
  subtotal: number;
  gst: number;
  platformFee: number;
  total: number;
  createdAt: string;
  billMessage: string;
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
  };
  method?: {
    upi?: boolean;
    card?: boolean;
    netbanking?: boolean;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function priceOf(item: MenuItem) {
  const amount = Number(item.price);
  return Number.isFinite(amount) ? amount : 0;
}

function checkoutItemsFromLines(lines: CartLine[]) {
  return lines.map((line) => ({
    id: String(line.item.item_id),
    name: line.item.name,
    price: priceOf(line.item),
    quantity: line.quantity,
    stallName: line.stallName,
  }));
}

function readOrders(): StoredOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveOrder(order: StoredOrder) {
  const orders = readOrders();
  localStorage.setItem(
    ORDERS_STORAGE_KEY,
    JSON.stringify([order, ...orders].slice(0, 50)),
  );
}

function buildStoredOrder({
  activeCustomer,
  selectedPaymentMethod,
  items,
  itemCount,
  subtotal,
  gst,
  platformFee,
  total,
}: {
  activeCustomer: CustomerProfile;
  selectedPaymentMethod: (typeof paymentMethods)[number];
  items: StoredOrder["items"];
  itemCount: number;
  subtotal: number;
  gst: number;
  platformFee: number;
  total: number;
}): StoredOrder {
  const orderId = `CFC-${Date.now().toString().slice(-6)}`;
  const billMessage = `Bill ${orderId}: ${money(total)} for ${itemCount} item${
    itemCount === 1 ? "" : "s"
  }. Sent to ${activeCustomer.mobile}.`;

  return {
    orderId,
    customer: activeCustomer,
    items,
    paymentMethod: selectedPaymentMethod,
    paymentUpiId: selectedPaymentMethod === "UPI" ? UPI_ID : undefined,
    status: "sent_to_counter",
    subtotal,
    gst,
    platformFee,
    total,
    createdAt: new Date().toISOString(),
    billMessage,
  };
}

export default function MenuBoard({ stalls }: { stalls: Stall[] }) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [query, setQuery] = useState("");
  const [selectedStall, setSelectedStall] = useState("All");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof paymentMethods)[number]>("UPI");
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus | null>(
    null,
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"google" | "mobile">("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);
  const [readyNotice, setReadyNotice] = useState<string | null>(null);

  const stallNames = useMemo(
    () => ["All", ...stalls.map((stall) => stall.stall_name)],
    [stalls],
  );

  const filteredStalls = useMemo(() => {
    const search = query.trim().toLowerCase();

    return stalls
      .filter(
        (stall) => selectedStall === "All" || stall.stall_name === selectedStall,
      )
      .map((stall) => ({
        ...stall,
        menu_items: (stall.menu_items ?? []).filter((item) => {
          const text = `${item.name} ${item.category ?? ""} ${item.description ?? ""}`.toLowerCase();
          return !search || text.includes(search);
        }),
      }))
      .filter((stall) => (stall.menu_items ?? []).length > 0);
  }, [query, selectedStall, stalls]);

  const cartLines = Object.values(cart);
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cartLines.reduce(
    (sum, line) => sum + priceOf(line.item) * line.quantity,
    0,
  );
  const gst = subtotal * GST_RATE;
  const total = subtotal > 0 ? subtotal + gst + PLATFORM_FEE : 0;
  const upiPaymentLink = useMemo(() => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "Campus Food Court",
      am: total > 0 ? total.toFixed(2) : "0",
      cu: "INR",
      tn: "Campus Food Court order",
    });

    return `upi://pay?${params.toString()}`;
  }, [total]);
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiPaymentLink,
  )}`;

  useEffect(() => {
    if (!latestOrderId) {
      return;
    }

    const checkOrderStatus = () => {
      const order = readOrders().find(
        (storedOrder) => storedOrder.orderId === latestOrderId,
      );

      if (order?.status === "ready") {
        const message = `Order ${order.orderId} is ready. Please pick it up from the counter.`;
        setReadyNotice(message);
        setCheckoutStatus({ tone: "success", message });

        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("Campus Food Court", { body: message });
        }
      }
    };

    checkOrderStatus();
    const interval = window.setInterval(checkOrderStatus, 3000);
    return () => window.clearInterval(interval);
  }, [latestOrderId]);

  function addToCart(item: MenuItem, stallName: string) {
    setCheckoutStatus(null);
    setCart((current) => {
      const key = String(item.item_id);
      const existing = current[key];

      return {
        ...current,
        [key]: {
          item,
          stallName,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
  }

  function updateQuantity(itemId: MenuItem["item_id"], change: number) {
    setCart((current) => {
      const key = String(itemId);
      const existing = current[key];

      if (!existing) {
        return current;
      }

      const quantity = existing.quantity + change;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      return {
        ...current,
        [key]: { ...existing, quantity },
      };
    });
  }

  function checkoutItems() {
    return checkoutItemsFromLines(cartLines);
  }

  function loginWithGoogle() {
    setLoginMethod("google");
    setCustomer({
      loginMethod: "google",
      name: "Google Student",
      mobile: mobileNumber.trim() || "9999999999",
    });
    setCheckoutStatus({
      tone: "success",
      message: "Google login selected. Add mobile number for bill messages.",
    });
  }

  function loginWithMobile() {
    const cleanedMobile = mobileNumber.replace(/\D/g, "");

    if (cleanedMobile.length !== 10) {
      setCheckoutStatus({
        tone: "error",
        message: "Enter a valid 10 digit mobile number before ordering.",
      });
      return false;
    }

    setLoginMethod("mobile");
    setCustomer({
      loginMethod: "mobile",
      name: "Campus Student",
      mobile: cleanedMobile,
    });
    setCheckoutStatus({
      tone: "success",
      message: `Logged in with mobile ${cleanedMobile}.`,
    });
    return true;
  }

  async function ensureCustomer() {
    if (customer?.mobile) {
      return customer;
    }

    const isMobileLoginReady = loginWithMobile();
    if (!isMobileLoginReady) {
      return null;
    }

    return {
      loginMethod,
      name: loginMethod === "google" ? "Google Student" : "Campus Student",
      mobile: mobileNumber.replace(/\D/g, ""),
    };
  }

  async function requestPickupNotifications() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  function recordCounterOrder(
    activeCustomer: CustomerProfile,
    selectedPaymentMethod: (typeof paymentMethods)[number],
  ) {
    const order = buildStoredOrder({
      activeCustomer,
      selectedPaymentMethod,
      items: checkoutItems(),
      itemCount,
      subtotal,
      gst,
      platformFee: subtotal > 0 ? PLATFORM_FEE : 0,
      total,
    });

    saveOrder(order);
    window.dispatchEvent(new Event("campus-food-court-orders"));
    setLatestOrderId(order.orderId);
    setReadyNotice(null);

    return order;
  }

  function methodOptions() {
    if (paymentMethod === "UPI") {
      return { upi: true };
    }

    if (paymentMethod === "Card") {
      return { card: true };
    }

    if (paymentMethod === "Net Banking") {
      return { netbanking: true };
    }

    return undefined;
  }

  async function loadRazorpayCheckout() {
    if (window.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function placeOrder() {
    if (itemCount === 0) {
      return;
    }

    const activeCustomer = await ensureCustomer();

    if (!activeCustomer) {
      return;
    }

    await requestPickupNotifications();

    if (paymentMethod === "Cash at Counter") {
      const order = recordCounterOrder(activeCustomer, paymentMethod);
      setCheckoutStatus({
        tone: "success",
        message: `${order.billMessage} Counter received the order. Pay cash during pickup.`,
      });
      setCart({});
      return;
    }

    setIsCheckingOut(true);
    setCheckoutStatus({
      tone: "info",
      message: "Creating secure payment order...",
    });

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checkoutItems() }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to create payment order.");
      }

      if (data.mode === "demo") {
        const verifyResponse = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "demo" }),
        });

        if (!verifyResponse.ok) {
          throw new Error("Demo payment verification failed.");
        }

        const order = recordCounterOrder(activeCustomer, paymentMethod);
        setCheckoutStatus({
          tone: "success",
          message:
            `${order.billMessage} Counter received the order. Add Razorpay keys to enable live checkout.`,
        });
        setCart({});
        return;
      }

      const scriptLoaded = await loadRazorpayCheckout();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Could not load Razorpay Checkout. Check your network.");
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: "INR",
        name: "Campus Food Court",
        description: `${itemCount} item campus food order`,
        order_id: data.order.id,
        handler: async (paymentResponse) => {
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paymentResponse),
          });
          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok || !verifyData.verified) {
            setCheckoutStatus({
              tone: "error",
              message:
                verifyData?.error ?? "Payment completed but verification failed.",
            });
            return;
          }

          setCheckoutStatus({
            tone: "success",
            message: `${recordCounterOrder(activeCustomer, paymentMethod).billMessage} Counter received the order via ${paymentMethod}.`,
          });
          setCart({});
        },
        prefill: {
          name: activeCustomer.name,
          email: "student@example.com",
          contact: activeCustomer.mobile,
        },
        notes: {
          payment_method: paymentMethod,
          source: "campus_food_court",
        },
        theme: {
          color: "#047857",
        },
        method: methodOptions(),
      });

      checkout.open();
    } catch (error) {
      setCheckoutStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong during checkout.",
      });
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="min-w-0 space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
          <label className="sr-only" htmlFor="menu-search">
            Search menu
          </label>
          <input
            id="menu-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 flex-1 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="Search dishes, snacks, drinks..."
            type="search"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {stallNames.map((name) => (
              <button
                className={`h-11 shrink-0 rounded-md border px-4 text-sm font-semibold transition ${
                  selectedStall === name
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
                }`}
                key={name}
                onClick={() => setSelectedStall(name)}
                type="button"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {filteredStalls.length > 0 ? (
          filteredStalls.map((stall) => (
            <section
              className="rounded-lg border border-zinc-200 bg-white shadow-sm"
              key={stall.stall_id}
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950">
                    {stall.stall_name}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {stall.cuisine ?? "Fresh campus favourites"}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                  Open
                </span>
              </div>

              <div className="grid gap-3 p-4 md:grid-cols-2">
                {(stall.menu_items ?? []).map((item) => {
                  const line = cart[String(item.item_id)];
                  const isAvailable = item.is_available !== false;

                  return (
                    <article
                      className="flex min-h-36 flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                      key={item.item_id}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-zinc-950">
                              {item.name}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                              {item.description ??
                                item.category ??
                                "Made fresh for a quick campus break"}
                            </p>
                          </div>
                          <p className="shrink-0 text-base font-extrabold text-emerald-700">
                            {money(priceOf(item))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span
                          className={`text-xs font-semibold ${
                            isAvailable ? "text-zinc-500" : "text-red-600"
                          }`}
                        >
                          {isAvailable ? "Available now" : "Sold out"}
                        </span>

                        {line ? (
                          <div className="flex h-10 items-center rounded-md border border-emerald-700 bg-white">
                            <button
                              className="h-full w-10 text-lg font-bold text-emerald-800"
                              onClick={() => updateQuantity(item.item_id, -1)}
                              type="button"
                            >
                              -
                            </button>
                            <span className="w-9 text-center text-sm font-bold text-zinc-950">
                              {line.quantity}
                            </span>
                            <button
                              className="h-full w-10 text-lg font-bold text-emerald-800"
                              onClick={() => updateQuantity(item.item_id, 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                            disabled={!isAvailable}
                            onClick={() => addToCart(item, stall.stall_name)}
                            type="button"
                          >
                            Add to cart
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
            No matching dishes found.
          </div>
        )}
      </section>

      <aside className="h-fit rounded-lg border border-zinc-200 bg-white shadow-sm xl:sticky xl:top-6">
        <div className="border-b border-zinc-100 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-zinc-950">Your cart</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {itemCount} {itemCount === 1 ? "item" : "items"} selected
              </p>
            </div>
            <span className="rounded-md bg-emerald-100 px-3 py-2 text-sm font-extrabold text-emerald-800">
              {money(total)}
            </span>
          </div>
        </div>

        <div className="max-h-80 space-y-3 overflow-auto p-5">
          {cartLines.length > 0 ? (
            cartLines.map((line) => (
              <div
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                key={line.item.item_id}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-zinc-950">{line.item.name}</p>
                    <p className="text-xs text-zinc-500">{line.stallName}</p>
                  </div>
                  <p className="font-bold text-zinc-900">
                    {money(priceOf(line.item) * line.quantity)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex h-9 items-center rounded-md border border-zinc-300 bg-white">
                    <button
                      className="h-full w-9 font-bold text-zinc-700"
                      onClick={() => updateQuantity(line.item.item_id, -1)}
                      type="button"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-zinc-950">
                      {line.quantity}
                    </span>
                    <button
                      className="h-full w-9 font-bold text-zinc-700"
                      onClick={() => updateQuantity(line.item.item_id, 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="text-sm font-bold text-red-600"
                    onClick={() =>
                      updateQuantity(line.item.item_id, -line.quantity)
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
              Add dishes to see GST and checkout total.
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-zinc-100 p-5 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>GST 5%</span>
            <span>{money(gst)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>Platform fee</span>
            <span>{subtotal > 0 ? money(PLATFORM_FEE) : money(0)}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-extrabold text-zinc-950">
            <span>Total payable</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <div className="space-y-4 border-t border-zinc-100 p-5">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-bold text-zinc-950">Login</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className={`h-10 rounded-md border px-3 text-sm font-bold ${
                  loginMethod === "google"
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-zinc-300 bg-white text-zinc-700"
                }`}
                onClick={loginWithGoogle}
                type="button"
              >
                Google
              </button>
              <button
                className={`h-10 rounded-md border px-3 text-sm font-bold ${
                  loginMethod === "mobile"
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-zinc-300 bg-white text-zinc-700"
                }`}
                onClick={() => {
                  setLoginMethod("mobile");
                  loginWithMobile();
                }}
                type="button"
              >
                Mobile
              </button>
            </div>
            <label className="mt-3 block text-xs font-bold text-zinc-600" htmlFor="customer-mobile">
              Mobile number for bill and pickup notification
            </label>
            <input
              className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              id="customer-mobile"
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => {
                setMobileNumber(event.target.value);
                if (customer) {
                  setCustomer({ ...customer, mobile: event.target.value });
                }
              }}
              placeholder="10 digit mobile number"
              value={mobileNumber}
            />
            {customer ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Logged in as {customer.name}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-bold text-zinc-950"
              htmlFor="payment-method"
            >
              Payment gateway
            </label>
            <select
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              id="payment-method"
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value as (typeof paymentMethods)[number],
                )
              }
              value={paymentMethod}
            >
              {paymentMethods.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </div>

          {paymentMethod === "UPI" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-sm font-extrabold text-emerald-900">
                Scan to pay UPI
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`UPI QR code for ${UPI_ID}`}
                className="mx-auto mt-3 h-44 w-44 rounded-md border border-white bg-white p-2"
                src={upiQrUrl}
              />
              <p className="mt-2 break-all text-xs font-bold text-emerald-900">
                {UPI_ID}
              </p>
              <a
                className="mt-3 inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-bold text-white"
                href={upiPaymentLink}
              >
                Open UPI app
              </a>
            </div>
          ) : null}

          <button
            className="h-12 w-full rounded-md bg-emerald-700 text-sm font-extrabold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={itemCount === 0 || isCheckingOut}
            onClick={placeOrder}
            type="button"
          >
            {isCheckingOut
              ? "Processing..."
              : `Pay ${total > 0 ? money(total) : ""} and place order`}
          </button>

          {checkoutStatus ? (
            <div
              className={`rounded-lg border p-3 text-sm font-semibold ${
                checkoutStatus.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : checkoutStatus.tone === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {checkoutStatus.message}
            </div>
          ) : null}

          {readyNotice ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">
              {readyNotice}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
