create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text not null default '#Fresh',
  is_active boolean not null default true,
  display_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.serviceable_pincodes (
  pincode text primary key,
  city text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.banners (
  title,
  subtitle,
  image_url,
  link_url,
  is_active,
  display_order
) values (
  'Great Indian Festival',
  'Festival deals across groceries, gadgets and home essentials',
  'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1800&q=80',
  '#Fresh',
  true,
  1
) on conflict do nothing;

insert into public.serviceable_pincodes (pincode, city, is_active)
values
  ('560068', 'Bengaluru', true),
  ('560076', 'Bengaluru', true),
  ('560100', 'Bengaluru', true),
  ('560102', 'Bengaluru', true),
  ('562106', 'Anekal', true)
on conflict (pincode) do update set
  city = excluded.city,
  is_active = excluded.is_active;
