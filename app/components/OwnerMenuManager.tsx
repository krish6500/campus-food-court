"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  item_id: number | string;
  stall_id: number | string;
  name: string;
  price: number | string;
  is_available?: boolean | null;
};

type Stall = {
  stall_id: number | string;
  stall_name: string;
  cuisine?: string | null;
  menu_items?: MenuItem[] | null;
};

type FormState = {
  stall_id: string;
  name: string;
  price: string;
  is_available: boolean;
};

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

type CounterOrder = {
  orderId: string;
  customer: {
    name: string;
    mobile: string;
    loginMethod: "google" | "mobile";
  };
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    stallName: string;
  }[];
  paymentMethod: string;
  paymentUpiId?: string;
  status: "sent_to_counter" | "preparing" | "ready";
  subtotal: number;
  gst: number;
  platformFee: number;
  total: number;
  createdAt: string;
  billMessage: string;
};

const ORDERS_STORAGE_KEY = "campus_food_court_orders";

const emptyForm: FormState = {
  stall_id: "",
  name: "",
  price: "",
  is_available: true,
};

function sortItems(items: MenuItem[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function readCounterOrders(): CounterOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function OwnerMenuManager({ stalls }: { stalls: Stall[] }) {
  const [itemsByStall, setItemsByStall] = useState(() =>
    Object.fromEntries(
      stalls.map((stall) => [
        String(stall.stall_id),
        sortItems(stall.menu_items ?? []),
      ]),
    ) as Record<string, MenuItem[]>,
  );
  const [selectedStall, setSelectedStall] = useState(
    stalls[0] ? String(stalls[0].stall_id) : "",
  );
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    stall_id: stalls[0] ? String(stalls[0].stall_id) : "",
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [counterOrders, setCounterOrders] = useState<CounterOrder[]>([]);

  const selectedStallRecord = useMemo(
    () => stalls.find((stall) => String(stall.stall_id) === selectedStall),
    [selectedStall, stalls],
  );
  const currentItems = itemsByStall[selectedStall] ?? [];
  const totalItems = Object.values(itemsByStall).reduce(
    (sum, items) => sum + items.length,
    0,
  );
  const availableItems = Object.values(itemsByStall)
    .flat()
    .filter((item) => item.is_available !== false).length;
  const activeOrders = counterOrders.filter((order) => order.status !== "ready");

  useEffect(() => {
    const syncOrders = () => setCounterOrders(readCounterOrders());

    syncOrders();
    window.addEventListener("storage", syncOrders);
    window.addEventListener("campus-food-court-orders", syncOrders);
    const interval = window.setInterval(syncOrders, 3000);

    return () => {
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener("campus-food-court-orders", syncOrders);
      window.clearInterval(interval);
    };
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm(stallId = selectedStall) {
    setEditingItemId(null);
    setForm({ ...emptyForm, stall_id: stallId });
  }

  function selectStall(stallId: string) {
    setSelectedStall(stallId);
    resetForm(stallId);
  }

  function startEdit(item: MenuItem) {
    setEditingItemId(String(item.item_id));
    setForm({
      stall_id: String(item.stall_id),
      name: item.name,
      price: String(item.price),
      is_available: item.is_available !== false,
    });
    setStatus(null);
  }

  function upsertLocal(item: MenuItem) {
    const stallId = String(item.stall_id);
    setItemsByStall((current) => {
      const existing = current[stallId] ?? [];
      const next = existing.some(
        (menuItem) => String(menuItem.item_id) === String(item.item_id),
      )
        ? existing.map((menuItem) =>
            String(menuItem.item_id) === String(item.item_id) ? item : menuItem,
          )
        : [...existing, item];

      return {
        ...current,
        [stallId]: sortItems(next),
      };
    });
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus({ tone: "info", message: "Saving menu item..." });

    try {
      const response = await fetch(
        editingItemId ? `/api/menu-items/${editingItemId}` : "/api/menu-items",
        {
          method: editingItemId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not save menu item.");
      }

      upsertLocal(data.item);
      selectStall(String(data.item.stall_id));
      resetForm(String(data.item.stall_id));
      setStatus({
        tone: "success",
        message: editingItemId ? "Item updated." : "Item added.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Could not save menu item.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    const nextAvailable = item.is_available === false;
    setStatus({ tone: "info", message: "Updating availability..." });

    try {
      const response = await fetch(`/api/menu-items/${item.item_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: nextAvailable }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not update availability.");
      }

      upsertLocal(data.item);
      setStatus({
        tone: "success",
        message: nextAvailable ? "Item is available." : "Item marked sold out.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Could not update item.",
      });
    }
  }

  async function deleteItem(item: MenuItem) {
    const shouldDelete = window.confirm(`Delete ${item.name}?`);

    if (!shouldDelete) {
      return;
    }

    setStatus({ tone: "info", message: "Deleting item..." });

    try {
      const response = await fetch(`/api/menu-items/${item.item_id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not delete menu item.");
      }

      setItemsByStall((current) => ({
        ...current,
        [String(item.stall_id)]: (current[String(item.stall_id)] ?? []).filter(
          (menuItem) => String(menuItem.item_id) !== String(item.item_id),
        ),
      }));
      if (editingItemId === String(item.item_id)) {
        resetForm();
      }
      setStatus({ tone: "success", message: "Item deleted." });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Could not delete item.",
      });
    }
  }

  function updateOrderStatus(
    orderId: string,
    nextStatus: CounterOrder["status"],
  ) {
    const nextOrders = counterOrders.map((order) =>
      order.orderId === orderId ? { ...order, status: nextStatus } : order,
    );

    setCounterOrders(nextOrders);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(nextOrders));
    window.dispatchEvent(new Event("campus-food-court-orders"));
    setStatus({
      tone: "success",
      message:
        nextStatus === "ready"
          ? `Order ${orderId} marked ready. Customer can pick it up.`
          : `Order ${orderId} moved to preparing.`,
    });
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Owner dashboard
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
              Manage Menu
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Add dishes, change prices, remove old items, and control what
              customers can order.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="flex h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-zinc-500"
              href="/"
            >
              Customer view
            </Link>
            <div className="rounded-md bg-zinc-100 px-4 py-3 text-center">
              <p className="text-lg font-extrabold">{totalItems}</p>
              <p className="text-xs font-semibold text-zinc-500">Items</p>
            </div>
            <div className="rounded-md bg-emerald-100 px-4 py-3 text-center">
              <p className="text-lg font-extrabold text-emerald-800">
                {availableItems}
              </p>
              <p className="text-xs font-semibold text-emerald-700">Live</p>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold">Counter orders</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {activeOrders.length} active orders waiting in the counter system
              </p>
            </div>
            <div className="rounded-md bg-amber-100 px-4 py-3 text-center">
              <p className="text-lg font-extrabold text-amber-800">
                {counterOrders.length}
              </p>
              <p className="text-xs font-semibold text-amber-700">Total orders</p>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {counterOrders.length > 0 ? (
              counterOrders.map((order) => (
                <article
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                  key={order.orderId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold">
                        {order.orderId}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">
                        {new Date(order.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        order.status === "ready"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "preparing"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <p className="font-semibold text-zinc-700">
                      {order.customer.name} · {order.customer.mobile} ·{" "}
                      {order.customer.loginMethod}
                    </p>
                    <p className="font-semibold text-zinc-700">
                      {order.paymentMethod}
                      {order.paymentUpiId ? ` · ${order.paymentUpiId}` : ""} ·{" "}
                      {money(order.total)}
                    </p>
                    <div className="rounded-md bg-white p-3">
                      {order.items.map((item) => (
                        <div
                          className="flex justify-between gap-3 py-1"
                          key={`${order.orderId}-${item.id}`}
                        >
                          <span>
                            {item.quantity} x {item.name}
                          </span>
                          <span className="font-bold">{item.stallName}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-zinc-500">
                      {order.billMessage}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="h-10 rounded-md border border-amber-300 px-3 text-sm font-bold text-amber-800 hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={order.status === "preparing" || order.status === "ready"}
                      onClick={() => updateOrderStatus(order.orderId, "preparing")}
                      type="button"
                    >
                      Start preparing
                    </button>
                    <button
                      className="h-10 rounded-md bg-blue-700 px-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                      disabled={order.status === "ready"}
                      onClick={() => updateOrderStatus(order.orderId, "ready")}
                      type="button"
                    >
                      Mark prepared
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 lg:col-span-2">
                New customer orders will appear here after checkout.
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="h-fit rounded-lg border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-xl font-extrabold">
              {editingItemId ? "Edit item" : "Add new item"}
            </h2>
            <form className="mt-5 space-y-4" onSubmit={submitForm}>
              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  htmlFor="stall-id"
                >
                  Stall
                </label>
                <select
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  id="stall-id"
                  onChange={(event) =>
                    updateForm("stall_id", event.target.value)
                  }
                  value={form.stall_id}
                >
                  {stalls.map((stall) => (
                    <option key={stall.stall_id} value={stall.stall_id}>
                      {stall.stall_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  htmlFor="item-name"
                >
                  Item name
                </label>
                <input
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  id="item-name"
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Masala dosa"
                  required
                  value={form.name}
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  htmlFor="item-price"
                >
                  Price
                </label>
                <input
                  className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  id="item-price"
                  min="1"
                  onChange={(event) =>
                    updateForm("price", event.target.value)
                  }
                  placeholder="60"
                  required
                  type="number"
                  value={form.price}
                />
              </div>

              <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm font-bold">
                <input
                  checked={form.is_available}
                  className="h-4 w-4 accent-emerald-700"
                  onChange={(event) =>
                    updateForm("is_available", event.target.checked)
                  }
                  type="checkbox"
                />
                Available for customers
              </label>

              <div className="flex gap-2">
                <button
                  className="h-11 flex-1 rounded-md bg-emerald-700 px-4 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving
                    ? "Saving..."
                    : editingItemId
                      ? "Update item"
                      : "Add item"}
                </button>
                {editingItemId ? (
                  <button
                    className="h-11 rounded-md border border-zinc-300 px-4 text-sm font-bold text-zinc-700 hover:border-zinc-500"
                    onClick={() => resetForm()}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>

              {status ? (
                <div
                  className={`rounded-lg border p-3 text-sm font-semibold ${
                    status.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : status.tone === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {status.message}
                </div>
              ) : null}
            </form>
          </section>

          <section className="min-w-0 space-y-4">
            <div className="flex gap-2 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
              {stalls.map((stall) => (
                <button
                  className={`h-11 shrink-0 rounded-md border px-4 text-sm font-bold ${
                    selectedStall === String(stall.stall_id)
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
                  }`}
                  key={stall.stall_id}
                  onClick={() => selectStall(String(stall.stall_id))}
                  type="button"
                >
                  {stall.stall_name}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-5">
                <h2 className="text-xl font-extrabold">
                  {selectedStallRecord?.stall_name ?? "Menu items"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {currentItems.length} items in this stall
                </p>
              </div>

              <div className="divide-y divide-zinc-100">
                {currentItems.length > 0 ? (
                  currentItems.map((item) => (
                    <article
                      className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                      key={item.item_id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold">
                            {item.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              item.is_available === false
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.is_available === false
                              ? "Sold out"
                              : "Available"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-500">
                          Price: Rs {item.price}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-bold text-zinc-700 hover:border-zinc-500"
                          onClick={() => startEdit(item)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="h-10 rounded-md border border-amber-300 px-3 text-sm font-bold text-amber-800 hover:border-amber-500"
                          onClick={() => toggleAvailability(item)}
                          type="button"
                        >
                          {item.is_available === false
                            ? "Make available"
                            : "Mark sold out"}
                        </button>
                        <button
                          className="h-10 rounded-md bg-red-600 px-3 text-sm font-bold text-white hover:bg-red-700"
                          onClick={() => deleteItem(item)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-zinc-500">
                    No items yet. Add the first item from the owner form.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
