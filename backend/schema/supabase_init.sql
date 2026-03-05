-- Supabase bootstrap schema for AVC PRO
-- Run in Supabase SQL editor or via migration tooling

create extension if not exists pgcrypto;

-- ===== Tables =====
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('client', 'master')),
  full_name text not null,
  phone text,
  rating numeric(3,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  name text not null,
  unit text not null,
  unique (category_id, name)
);

create table if not exists public.price_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('econom', 'comfort', 'business')),
  name text not null
);

create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  service_item_id uuid not null references public.service_items(id) on delete cascade,
  policy_id uuid not null references public.price_policies(id) on delete cascade,
  price_kzt integer not null check (price_kzt >= 0),
  unique (service_item_id, policy_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  policy_code text not null check (policy_code in ('econom', 'comfort', 'business')),
  address_text text not null,
  contact_name text not null,
  contact_phone text not null,
  comment text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.lead_items (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  service_item_id uuid not null references public.service_items(id) on delete restrict,
  qty numeric(10,2) not null check (qty > 0),
  unit_price_kzt integer not null check (unit_price_kzt >= 0),
  line_total_kzt integer not null check (line_total_kzt >= 0)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  master_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (lead_id, master_id)
);

create table if not exists public.master_presence (
  master_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_items_category_id on public.service_items(category_id);
create index if not exists idx_prices_service_item_id on public.prices(service_item_id);
create index if not exists idx_prices_policy_id on public.prices(policy_id);
create index if not exists idx_leads_client_id on public.leads(client_id);
create index if not exists idx_lead_items_lead_id on public.lead_items(lead_id);
create index if not exists idx_offers_lead_id on public.offers(lead_id);
create index if not exists idx_offers_master_id on public.offers(master_id);

-- ===== Seed data =====
insert into public.service_categories (name)
values
  ('Электрика'),
  ('Сантехника'),
  ('Клининг'),
  ('Сборка мебели'),
  ('Мелкий ремонт')
on conflict (name) do nothing;

insert into public.service_items (category_id, name, unit)
select c.id, s.name, s.unit
from (
  values
    ('Электрика', 'Установка розетки', 'шт'),
    ('Электрика', 'Замена выключателя', 'шт'),
    ('Электрика', 'Монтаж светильника', 'шт'),
    ('Сантехника', 'Установка смесителя', 'шт'),
    ('Сантехника', 'Устранение протечки', 'услуга'),
    ('Сантехника', 'Чистка сифона', 'шт'),
    ('Клининг', 'Генеральная уборка', 'м²'),
    ('Клининг', 'Мытье окон', 'створка'),
    ('Клининг', 'Химчистка дивана', 'шт'),
    ('Сборка мебели', 'Сборка шкафа', 'шт'),
    ('Сборка мебели', 'Сборка кровати', 'шт'),
    ('Сборка мебели', 'Сборка кухонного гарнитура', 'пог.м'),
    ('Мелкий ремонт', 'Навес полки', 'шт'),
    ('Мелкий ремонт', 'Установка карниза', 'шт'),
    ('Мелкий ремонт', 'Подклейка обоев', 'м²')
) as s(category_name, name, unit)
join public.service_categories c on c.name = s.category_name
on conflict (category_id, name) do nothing;

insert into public.price_policies (code, name)
values
  ('econom', 'Эконом'),
  ('comfort', 'Комфорт'),
  ('business', 'Бизнес')
on conflict (code) do nothing;

with base_prices as (
  select si.id as service_item_id,
         case si.name
           when 'Установка розетки' then 3000
           when 'Замена выключателя' then 2500
           when 'Монтаж светильника' then 5000
           when 'Установка смесителя' then 7000
           when 'Устранение протечки' then 6000
           when 'Чистка сифона' then 4000
           when 'Генеральная уборка' then 900
           when 'Мытье окон' then 2500
           when 'Химчистка дивана' then 12000
           when 'Сборка шкафа' then 10000
           when 'Сборка кровати' then 7000
           when 'Сборка кухонного гарнитура' then 15000
           when 'Навес полки' then 3500
           when 'Установка карниза' then 4500
           when 'Подклейка обоев' then 1800
           else 0
         end as econom_price
  from public.service_items si
),
calculated as (
  select bp.service_item_id,
         pp.id as policy_id,
         case pp.code
           when 'econom' then bp.econom_price
           when 'comfort' then round(bp.econom_price * 1.20)::integer
           when 'business' then round(bp.econom_price * 1.45)::integer
         end as price_kzt
  from base_prices bp
  cross join public.price_policies pp
)
insert into public.prices (service_item_id, policy_id, price_kzt)
select service_item_id, policy_id, price_kzt
from calculated
on conflict (service_item_id, policy_id) do update
set price_kzt = excluded.price_kzt;
