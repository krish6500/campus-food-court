import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CustomerProfile = {
  loginMethod: "google" | "mobile";
  name: string;
  mobile: string;
};

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stallName: string;
};

export type OrderStatus = "sent_to_counter" | "preparing" | "ready";

export type StoredOrder = {
  orderId: string;
  customer: CustomerProfile;
  items: OrderItem[];
  paymentMethod: string;
  paymentUpiId?: string;
  status: OrderStatus;
  subtotal: number;
  gst: number;
  platformFee: number;
  total: number;
  createdAt: string;
  billMessage: string;
  smsStatus?: string;
};

type OrderRow = {
  order_id: string;
  customer_name: string;
  customer_mobile: string;
  login_method: "google" | "mobile";
  items: OrderItem[];
  payment_method: string;
  payment_upi_id: string | null;
  status: OrderStatus;
  subtotal: number;
  gst: number;
  platform_fee: number;
  total: number;
  bill_message: string;
  sms_status: string | null;
  created_at: string;
};

export function toStoredOrder(row: OrderRow): StoredOrder {
  return {
    orderId: row.order_id,
    customer: {
      name: row.customer_name,
      mobile: row.customer_mobile,
      loginMethod: row.login_method,
    },
    items: row.items ?? [],
    paymentMethod: row.payment_method,
    paymentUpiId: row.payment_upi_id ?? undefined,
    status: row.status,
    subtotal: Number(row.subtotal),
    gst: Number(row.gst),
    platformFee: Number(row.platform_fee),
    total: Number(row.total),
    createdAt: row.created_at,
    billMessage: row.bill_message,
    smsStatus: row.sms_status ?? undefined,
  };
}

export async function createOrder(order: StoredOrder) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_id: order.orderId,
      customer_name: order.customer.name,
      customer_mobile: order.customer.mobile,
      login_method: order.customer.loginMethod,
      items: order.items,
      payment_method: order.paymentMethod,
      payment_upi_id: order.paymentUpiId ?? null,
      status: order.status,
      subtotal: order.subtotal,
      gst: order.gst,
      platform_fee: order.platformFee,
      total: order.total,
      bill_message: order.billMessage,
      sms_status: order.smsStatus ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save order.");
  }

  return toStoredOrder(data as OrderRow);
}

export async function getOrders() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load orders.");
  }

  return (data as OrderRow[]).map(toStoredOrder);
}

export async function getOrder(orderId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load order.");
  }

  return toStoredOrder(data as OrderRow);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("order_id", orderId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not update order.");
  }

  return toStoredOrder(data as OrderRow);
}
