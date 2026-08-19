create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_id uuid not null unique,
  customer_name text not null,
  customer_mobile text not null,
  login_method text not null check (login_method in ('google', 'mobile')),
  items jsonb not null default '[]'::jsonb,
  payment_method text not null,
  payment_upi_id text,
  status text not null default 'sent_to_counter' check (
    status in ('sent_to_counter', 'preparing', 'ready')
  ),
  subtotal numeric(10, 2) not null default 0,
  gst numeric(10, 2) not null default 0,
  platform_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0,
  bill_message text not null,
  sms_status text,
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

create index if not exists orders_status_idx
  on public.orders (status);

alter table public.orders enable row level security;

-- Orders are read and changed only through Next.js API routes using
-- SUPABASE_SERVICE_ROLE_KEY. Do not add public anon policies for this table.
