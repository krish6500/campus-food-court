"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  money,
  productImages,
  readCart,
  type ShopCartItem,
  type ShopProduct,
  writeCart,
} from "@/lib/shop";

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

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
};

const demoProducts: ShopProduct[] = [
  {
    id: "demo-mobile-1",
    name: "5G Smartphone",
    price: 14999,
    category: "Mobiles",
    stallName: "Super Bazar Devices",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "demo-electronics-1",
    name: "Wireless Headphones",
    price: 1299,
    category: "Electronics",
    stallName: "Super Bazar Electronics",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "demo-home-1",
    name: "Kitchen Storage Set",
    price: 499,
    category: "Home & Kitchen",
    stallName: "Home Essentials",
    imageUrl:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "demo-fashion-1",
    name: "Campus Sneakers",
    price: 799,
    category: "Fashion",
    stallName: "Style Hub",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "demo-beauty-1",
    name: "Daily Care Kit",
    price: 349,
    category: "Beauty",
    stallName: "Personal Care",
    imageUrl:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "demo-computer-1",
    name: "Laptop Backpack",
    price: 899,
    category: "Computers",
    stallName: "Tech Gear",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "demo-deal-1",
    name: "Festival Combo Pack",
    price: 599,
    category: "Daily Deals",
    stallName: "Super Deals",
    imageUrl:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=500&q=80",
  },
];

const fallbackBanners: Banner[] = [
  {
    id: "great-indian-festival",
    title: "Great Indian Festival",
    subtitle: "Fresh deals, campus essentials, gadgets and more",
    imageUrl:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1800&q=80",
    linkUrl: "#deals",
    isActive: true,
  },
];

const marketplaceCategories = [
  "Fresh",
  "Electronics",
  "Home & Kitchen",
  "Fashion",
  "Mobiles",
  "Beauty",
  "Computers",
  "Daily Deals",
];

function priceOf(item: MenuItem) {
  const amount = Number(item.price);
  return Number.isFinite(amount) ? amount : 0;
}

function toProducts(stalls: Stall[]): ShopProduct[] {
  const products = stalls.flatMap((stall, stallIndex) =>
    (stall.menu_items ?? [])
      .filter((item) => item.is_available !== false)
      .map((item, itemIndex) => ({
        id: String(item.item_id),
        name: item.name,
        price: priceOf(item),
        category:
          item.category ??
          stall.cuisine ??
          marketplaceCategories[stallIndex % marketplaceCategories.length],
        stallName: stall.stall_name,
        imageUrl: productImages[(stallIndex + itemIndex) % productImages.length],
      })),
  );

  const existingCategories = new Set(products.map((product) => product.category));
  const missingDemoProducts = demoProducts.filter(
    (product) => !existingCategories.has(product.category),
  );

  return [...products, ...missingDemoProducts];
}

function groupProducts(products: ShopProduct[]) {
  const groups = new Map<string, ShopProduct[]>();

  products.forEach((product) => {
    const current = groups.get(product.category) ?? [];
    groups.set(product.category, [...current, product]);
  });

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    items: items.slice(0, 4),
  }));
}

function categoryAnchor(category: string) {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function useCartCount() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const syncCart = () => {
      setCartCount(
        readCart().reduce((sum, item) => sum + item.quantity, 0),
      );
    };

    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("super-bazar-cart", syncCart);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("super-bazar-cart", syncCart);
    };
  }, []);

  return cartCount;
}

function HeroBanner() {
  const [banners, setBanners] = useState<Banner[]>(fallbackBanners);

  useEffect(() => {
    let isMounted = true;

    async function loadBanners() {
      const response = await fetch("/api/banners", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (isMounted && data.banners?.length) {
        setBanners(data.banners);
      }
    }

    loadBanners();

    return () => {
      isMounted = false;
    };
  }, []);

  const banner = banners.find((item) => item.isActive) ?? fallbackBanners[0];

  return (
    <section className="relative min-h-[300px] overflow-hidden bg-sky-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={banner.title}
        className="absolute inset-0 h-full w-full object-cover"
        src={banner.imageUrl}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent" />
      <div className="relative mx-auto flex min-h-[300px] max-w-[1500px] items-center px-5 py-10">
        <div className="max-w-xl">
          <p className="text-sm font-extrabold uppercase tracking-wide text-amber-700">
            Super Bazar
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-zinc-950 md:text-6xl">
            {banner.title}
          </h1>
          <p className="mt-3 text-lg font-semibold text-zinc-700">
            {banner.subtitle}
          </p>
          <a
            className="mt-6 inline-flex h-11 items-center rounded-sm bg-amber-400 px-5 text-sm font-extrabold text-zinc-950 hover:bg-amber-300"
            href={banner.linkUrl}
          >
            Shop now
          </a>
        </div>
      </div>
    </section>
  );
}

function TopNavbar({
  cartCount,
  query,
  setQuery,
  category,
  setCategory,
  categories,
}: {
  cartCount: number;
  query: string;
  setQuery: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  categories: string[];
}) {
  const [draftQuery, setDraftQuery] = useState(query);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draftQuery.trim());
    document
      .getElementById("super-bazar-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <div className="flex min-h-16 items-center gap-4 bg-[#131921] px-4 text-white">
        <Link className="shrink-0 text-2xl font-extrabold tracking-tight" href="/">
          Super Bazar
        </Link>
        <button className="hidden rounded-sm border border-transparent px-2 py-1 text-left text-xs hover:border-white md:block">
          <span className="block text-zinc-300">Deliver to</span>
          <span className="block text-sm font-extrabold">560068</span>
        </button>
        <form
          className="flex h-11 min-w-0 flex-1 overflow-hidden rounded-sm"
          onSubmit={submitSearch}
        >
          <label className="sr-only" htmlFor="category-search">
            Category
          </label>
          <select
            className="w-28 border-0 bg-zinc-100 px-2 text-sm text-zinc-900 outline-none"
            id="category-search"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option>All</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="site-search">
            Search Super Bazar
          </label>
          <input
            className="min-w-0 flex-1 px-3 text-base text-zinc-950 outline-none"
            id="site-search"
            onChange={(event) => {
              setDraftQuery(event.target.value);
              setQuery(event.target.value.trim());
            }}
            placeholder="Search Super Bazar"
            type="search"
            value={draftQuery}
          />
          <button
            className="w-20 bg-amber-400 text-sm font-extrabold text-zinc-950 hover:bg-amber-300"
            type="submit"
          >
            Search
          </button>
        </form>
        <Link className="relative shrink-0 px-2 py-1 text-sm font-extrabold" href="/cart">
          <span className="absolute -top-1 left-5 rounded-full bg-amber-400 px-1.5 text-xs text-zinc-950">
            {cartCount}
          </span>
          <span className="text-lg leading-none">Cart</span>
        </Link>
      </div>
      <nav className="flex h-11 items-center gap-5 overflow-x-auto bg-[#232f3e] px-4 text-sm font-bold text-white">
        <span className="shrink-0">All</span>
        {categories.map((item) => (
          <a
            className="shrink-0 hover:text-amber-300"
            href={`#${categoryAnchor(item)}`}
            key={item}
          >
            {item}
          </a>
        ))}
      </nav>
    </header>
  );
}

export default function MenuBoard({ stalls }: { stalls: Stall[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const cartCount = useCartCount();
  const products = useMemo(() => toProducts(stalls), [stalls]);
  const categories = useMemo(
    () =>
      Array.from(
        new Set([...marketplaceCategories, ...products.map((product) => product.category)]),
      ),
    [products],
  );
  const groups = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesSearch =
        !search ||
        `${product.name} ${product.category} ${product.stallName}`
          .toLowerCase()
          .includes(search);

      return matchesCategory && matchesSearch;
    });

    return groupProducts(filtered);
  }, [category, products, query]);

  function addToCart(product: ShopProduct) {
    const cart = readCart();
    const existing = cart.find((item) => item.id === product.id);
    const nextCart: ShopCartItem[] = existing
      ? cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      : [...cart, { ...product, quantity: 1 }];

    writeCart(nextCart);
  }

  return (
    <div className="min-h-screen bg-[#e3e6e6] pt-[108px] text-zinc-950">
      <TopNavbar
        cartCount={cartCount}
        category={category}
        query={query}
        setCategory={setCategory}
        setQuery={setQuery}
        categories={categories}
      />
      <HeroBanner />
      <main className="mx-auto -mt-10 max-w-[1500px] px-5 pb-10">
        <section
          className="grid scroll-mt-32 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          id="super-bazar-results"
        >
          {groups.length > 0 ? (
            groups.map((group) => (
              <article
                className="relative z-10 min-h-[420px] bg-white p-5 shadow-sm"
                id={categoryAnchor(group.category)}
                key={group.category}
              >
                <h2 className="text-2xl font-extrabold leading-tight">
                  {group.category} picks for you
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {group.items.map((product) => (
                    <div key={product.id}>
                      <div className="aspect-square overflow-hidden bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={product.name}
                          className="h-full w-full object-cover"
                          src={product.imageUrl}
                        />
                      </div>
                      <p className="mt-2 line-clamp-1 text-sm font-semibold">
                        {product.name}
                      </p>
                      <p className="text-sm font-extrabold text-emerald-700">
                        {money(product.price)}
                      </p>
                      <button
                        className="mt-2 h-8 w-full rounded-sm bg-amber-300 text-xs font-extrabold hover:bg-amber-400"
                        onClick={() => addToCart(product)}
                        type="button"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
                <Link
                  className="absolute bottom-5 left-5 text-sm font-semibold text-sky-700 hover:text-amber-700"
                  href="/cart"
                >
                  See more
                </Link>
              </article>
            ))
          ) : (
            <div className="col-span-full bg-white p-8 text-center text-sm font-semibold text-zinc-500">
              No matching products found.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
