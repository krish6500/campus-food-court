export type ShopProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  stallName: string;
  imageUrl: string;
};

export type ShopCartItem = ShopProduct & {
  quantity: number;
};

export const SUPER_BAZAR_CART_KEY = "super_bazar_cart";
export const SUPER_BAZAR_TOKEN_KEY = "super_bazar_token";

export const productImages = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=500&q=80",
];

export function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function cartTotals(items: ShopCartItem[]) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee = subtotal > 0 && subtotal < 499 ? 40 : 0;
  const total = subtotal + deliveryFee;

  return { subtotal, deliveryFee, total };
}

export function readCart(): ShopCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(SUPER_BAZAR_CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function writeCart(items: ShopCartItem[]) {
  localStorage.setItem(SUPER_BAZAR_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("super-bazar-cart"));
}
