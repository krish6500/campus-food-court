export type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stallName: string;
};

export const GST_RATE = 0.05;
export const PLATFORM_FEE = 6;

export function calculateCheckout(items: CheckoutItem[]) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const gst = subtotal * GST_RATE;
  const platformFee = subtotal > 0 ? PLATFORM_FEE : 0;
  const total = subtotal + gst + platformFee;

  return {
    subtotal,
    gst,
    platformFee,
    total,
    totalPaise: Math.round(total * 100),
  };
}

export function sanitizeCheckoutItems(value: unknown): CheckoutItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const price = Number(record.price);
      const quantity = Number(record.quantity);

      if (
        !record.id ||
        !record.name ||
        !Number.isFinite(price) ||
        !Number.isFinite(quantity) ||
        price <= 0 ||
        quantity <= 0
      ) {
        return null;
      }

      return {
        id: String(record.id),
        name: String(record.name),
        price,
        quantity: Math.floor(quantity),
        stallName: String(record.stallName ?? "Campus Food Court"),
      };
    })
    .filter((item): item is CheckoutItem => item !== null);
}
