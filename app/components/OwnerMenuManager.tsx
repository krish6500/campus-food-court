"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  item_id: number | string;
  stall_id: number | string;
  name: string;
  price: number | string;
  category?: string | null;
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
  category: string;
  is_available: boolean;
};

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  displayOrder: number;
};

type BannerForm = {
  id: string | null;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  displayOrder: string;
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

const emptyForm: FormState = {
  stall_id: "",
  name: "",
  price: "",
  category: "Fresh",
  is_available: true,
};

const emptyBannerForm: BannerForm = {
  id: null,
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "#fresh",
  isActive: true,
  displayOrder: "0",
};

const storefrontCategories = [
  "Fresh",
  "Electronics",
  "Home & Kitchen",
  "Fashion",
  "Mobiles",
  "Beauty",
  "Computers",
  "Daily Deals",
];

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

function ownerErrorMessage(message: string, fallback: string) {
  if (message === "Owner login required.") {
    return "Owner session expired. Click Logout, then login again.";
  }

  return message || fallback;
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
  const defaultStallId = stalls[0] ? String(stalls[0].stall_id) : "";
  const [selectedCategory, setSelectedCategory] = useState("Fresh");
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    stall_id: defaultStallId,
  });
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBannerForm);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [counterOrders, setCounterOrders] = useState<CounterOrder[]>([]);

  const allItems = useMemo(
    () => sortItems(Object.values(itemsByStall).flat()),
    [itemsByStall],
  );
  const currentItems = allItems.filter(
    (item) => (item.category ?? "Fresh") === selectedCategory,
  );
  const totalItems = Object.values(itemsByStall).reduce(
    (sum, items) => sum + items.length,
    0,
  );
  const availableItems = Object.values(itemsByStall)
    .flat()
    .filter((item) => item.is_available !== false).length;
  const activeOrders = counterOrders.filter((order) => order.status !== "ready");

  useEffect(() => {
    const syncOrders = async () => {
      const response = await fetch("/api/orders", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setCounterOrders(data.orders ?? []);
    };

    syncOrders();
    const interval = window.setInterval(syncOrders, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const syncBanners = async () => {
      const response = await fetch("/api/banners?owner=1", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setBanners(data.banners ?? []);
    };

    syncBanners();
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateBannerForm<K extends keyof BannerForm>(
    key: K,
    value: BannerForm[K],
  ) {
    setBannerForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm(stallId = defaultStallId, category = selectedCategory) {
    setEditingItemId(null);
    setForm({ ...emptyForm, stall_id: stallId, category });
  }

  function startBannerEdit(banner: Banner) {
    setBannerForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      isActive: banner.isActive,
      displayOrder: String(banner.displayOrder),
    });
    setStatus(null);
  }

  function upsertBannerLocal(banner: Banner) {
    setBanners((current) => {
      const next = current.some((item) => item.id === banner.id)
        ? current.map((item) => (item.id === banner.id ? banner : item))
        : [...current, banner];

      return [...next].sort((a, b) => a.displayOrder - b.displayOrder);
    });
  }

  function uploadBannerImage(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus({ tone: "error", message: "Upload an image file." });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateBannerForm("imageUrl", String(reader.result ?? ""));
      setStatus({
        tone: "success",
        message: "Banner image loaded. Save the banner to publish it.",
      });
    };
    reader.onerror = () => {
      setStatus({ tone: "error", message: "Could not read banner image." });
    };
    reader.readAsDataURL(file);
  }

  function startEdit(item: MenuItem) {
    setEditingItemId(String(item.item_id));
    setForm({
      stall_id: String(item.stall_id),
      name: item.name,
      price: String(item.price),
      category: item.category ?? "Fresh",
      is_available: item.is_available !== false,
    });
    setSelectedCategory(item.category ?? "Fresh");
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
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          ownerErrorMessage(data?.error, "Could not save menu item."),
        );
      }

      upsertLocal(data.item);
      setSelectedCategory(data.item.category ?? "Fresh");
      resetForm(String(data.item.stall_id), data.item.category ?? "Fresh");
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

  async function submitBanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingBanner(true);
    setStatus({ tone: "info", message: "Saving banner..." });

    try {
      const response = await fetch("/api/banners", {
        method: bannerForm.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bannerForm.id,
          title: bannerForm.title,
          subtitle: bannerForm.subtitle,
          imageUrl: bannerForm.imageUrl,
          linkUrl: bannerForm.linkUrl,
          isActive: bannerForm.isActive,
          displayOrder: bannerForm.displayOrder,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(ownerErrorMessage(data?.error, "Could not save banner."));
      }

      upsertBannerLocal(data.banner);
      setBannerForm(emptyBannerForm);
      setStatus({ tone: "success", message: "Banner saved." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not save banner.",
      });
    } finally {
      setIsSavingBanner(false);
    }
  }

  async function deleteBanner(banner: Banner) {
    const shouldDelete = window.confirm(`Delete banner ${banner.title}?`);

    if (!shouldDelete) {
      return;
    }

    setStatus({ tone: "info", message: "Deleting banner..." });

    try {
      const response = await fetch(`/api/banners?id=${banner.id}`, {
        credentials: "include",
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          ownerErrorMessage(data?.error, "Could not delete banner."),
        );
      }

      setBanners((current) => current.filter((item) => item.id !== banner.id));
      setStatus({ tone: "success", message: "Banner deleted." });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Could not delete banner.",
      });
    }
  }

  async function toggleAvailability(item: MenuItem) {
    const nextAvailable = item.is_available === false;
    setStatus({ tone: "info", message: "Updating availability..." });

    try {
      const response = await fetch(`/api/menu-items/${item.item_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: nextAvailable }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          ownerErrorMessage(data?.error, "Could not update availability."),
        );
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
        credentials: "include",
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          ownerErrorMessage(data?.error, "Could not delete menu item."),
        );
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

  async function updateOrderStatus(
    orderId: string,
    nextStatus: CounterOrder["status"],
  ) {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(ownerErrorMessage(data?.error, "Could not update order."));
      }

      setCounterOrders((current) =>
        current.map((order) =>
          order.orderId === orderId ? data.order : order,
        ),
      );
      setStatus({
        tone: "success",
        message:
          nextStatus === "ready"
            ? `Order ${orderId} marked ready. Customer can pick it up. ${data.order.smsStatus ?? ""}`
            : `Order ${orderId} moved to preparing.`,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Could not update order.",
      });
    }
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
              Super Bazar Owner
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Manage storefront products, category columns, counter orders,
              banners, and payment settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="flex h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-zinc-500"
              href="/"
            >
              Customer view
            </Link>
            <form action="/api/owner/logout" method="post">
              <button
                className="h-11 rounded-md border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-zinc-500"
                type="submit"
              >
                Logout
              </button>
            </form>
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

        {status ? (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm font-semibold ${
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
                      {order.customer.name} / {order.customer.mobile} /{" "}
                      {order.customer.loginMethod}
                    </p>
                    <p className="font-semibold text-zinc-700">
                      {order.paymentMethod}
                      {order.paymentUpiId ? ` / ${order.paymentUpiId}` : ""} /{" "}
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

        <section className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold">Hero banners</h2>
            <form className="mt-4 grid gap-3" onSubmit={submitBanner}>
              <input
                className="h-11 rounded-md border border-zinc-300 px-3 text-sm"
                onChange={(event) => updateBannerForm("title", event.target.value)}
                placeholder="Banner title"
                required
                value={bannerForm.title}
              />
              <input
                className="h-11 rounded-md border border-zinc-300 px-3 text-sm"
                onChange={(event) =>
                  updateBannerForm("subtitle", event.target.value)
                }
                placeholder="Subtitle"
                value={bannerForm.subtitle}
              />
              <input
                className="h-11 rounded-md border border-zinc-300 px-3 text-sm"
                onChange={(event) =>
                  updateBannerForm("imageUrl", event.target.value)
                }
                placeholder="Image URL"
                required
                type="text"
                value={bannerForm.imageUrl}
              />
              <input
                accept="image/*"
                className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm font-semibold"
                onChange={(event) => uploadBannerImage(event.target.files?.[0])}
                type="file"
              />
              {bannerForm.imageUrl ? (
                <div className="overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Banner preview"
                    className="h-32 w-full object-cover"
                    src={bannerForm.imageUrl}
                  />
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                <select
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold"
                  onChange={(event) =>
                    updateBannerForm("linkUrl", event.target.value)
                  }
                  value={bannerForm.linkUrl}
                >
                  {storefrontCategories.map((category) => (
                    <option key={category} value={`#${category.toLowerCase().replaceAll(" ", "-").replace("&", "")}`}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  className="h-11 rounded-md border border-zinc-300 px-3 text-sm"
                  min="0"
                  onChange={(event) =>
                    updateBannerForm("displayOrder", event.target.value)
                  }
                  placeholder="Order"
                  type="number"
                  value={bannerForm.displayOrder}
                />
              </div>
              <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm font-bold">
                <input
                  checked={bannerForm.isActive}
                  className="h-4 w-4 accent-emerald-700"
                  onChange={(event) =>
                    updateBannerForm("isActive", event.target.checked)
                  }
                  type="checkbox"
                />
                Show banner on home page
              </label>
              <div className="flex gap-2">
                <button
                  className="h-11 flex-1 rounded-md bg-emerald-700 px-4 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:bg-zinc-300"
                  disabled={isSavingBanner}
                  type="submit"
                >
                  {isSavingBanner
                    ? "Saving..."
                    : bannerForm.id
                      ? "Update banner"
                      : "Add banner"}
                </button>
                {bannerForm.id ? (
                  <button
                    className="h-11 rounded-md border border-zinc-300 px-4 text-sm font-bold"
                    onClick={() => setBannerForm(emptyBannerForm)}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {banners.map((banner) => (
                <article
                  className="rounded-md border border-zinc-200 p-3"
                  key={banner.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold">{banner.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">
                        {banner.isActive ? "Visible" : "Hidden"} /{" "}
                        {banner.linkUrl}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-bold"
                        onClick={() => startBannerEdit(banner)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white"
                        onClick={() => deleteBanner(banner)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold">Payment gateway</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <label className="flex items-center justify-between rounded-md border border-zinc-200 p-3 font-bold">
                Mock card checkout
                <input readOnly className="h-4 w-4" type="checkbox" />
              </label>
              <label className="flex items-center justify-between rounded-md border border-zinc-200 p-3 font-bold">
                Razorpay live gateway
                <input checked readOnly className="h-4 w-4 accent-emerald-700" type="checkbox" />
              </label>
              <p className="text-xs font-semibold text-zinc-500">
                Orders are sent to the counter only after Razorpay payment
                verification succeeds. Add Razorpay keys in Vercel before going
                live.
              </p>
            </div>
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

              <div>
                <label
                  className="mb-2 block text-sm font-bold"
                  htmlFor="item-category"
                >
                  Storefront category
                </label>
                <select
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  id="item-category"
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                  value={form.category}
                >
                  {storefrontCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
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
              {storefrontCategories.map((category) => (
                <button
                  className={`h-11 shrink-0 rounded-md border px-4 text-sm font-bold ${
                    selectedCategory === category
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
                  }`}
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    resetForm(defaultStallId, category);
                  }}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-5">
                <h2 className="text-xl font-extrabold">
                  {selectedCategory}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {currentItems.length} products in this category
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
                          {item.category ?? "Fresh"} / Price: Rs {item.price}
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
