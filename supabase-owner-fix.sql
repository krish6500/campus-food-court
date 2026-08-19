alter table public.menu_items
  add column if not exists category text default 'Fresh';

alter table public.menu_items
  add column if not exists is_available boolean not null default true;

update public.menu_items
set
  category = coalesce(nullif(category, ''), 'Fresh'),
  is_available = coalesce(is_available, true);
