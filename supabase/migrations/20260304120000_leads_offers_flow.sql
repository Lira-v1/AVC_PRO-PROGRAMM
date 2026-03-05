-- Lead creation + dispatch flow for nearby masters.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  title text,
  description text,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'new',
  assigned_master_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_items (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  service_id uuid,
  service_name text,
  qty integer not null default 1,
  price numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.master_presence (
  master_id uuid primary key,
  is_online boolean not null default false,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  master_id uuid not null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lead_id, master_id)
);

create index if not exists idx_leads_client_status on public.leads(client_id, status);
create index if not exists idx_offers_master_status on public.offers(master_id, status);
create index if not exists idx_offers_lead_status on public.offers(lead_id, status);
create index if not exists idx_master_presence_online on public.master_presence(is_online);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

drop trigger if exists trg_master_presence_updated_at on public.master_presence;
create trigger trg_master_presence_updated_at
before update on public.master_presence
for each row execute function public.set_updated_at();

create or replace function public.distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 2 * 6371 * asin(
    sqrt(
      power(sin(radians((lat2 - lat1) / 2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians((lng2 - lng1) / 2)), 2)
    )
  );
$$;

create or replace function public.create_lead_and_dispatch(
  p_client_id uuid,
  p_title text,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_items jsonb,
  p_radius_km double precision default 5,
  p_max_masters integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
begin
  insert into public.leads (client_id, title, description, lat, lng, status)
  values (p_client_id, p_title, p_description, p_lat, p_lng, 'new')
  returning id into v_lead_id;

  insert into public.lead_items (lead_id, service_id, service_name, qty, price)
  select
    v_lead_id,
    nullif(item->>'service_id', '')::uuid,
    item->>'service_name',
    coalesce((item->>'qty')::integer, 1),
    nullif(item->>'price', '')::numeric
  from jsonb_array_elements(p_items) as item;

  insert into public.offers (lead_id, master_id, status)
  select
    v_lead_id,
    mp.master_id,
    'sent'
  from public.master_presence mp
  where mp.is_online = true
    and mp.lat is not null
    and mp.lng is not null
    and public.distance_km(p_lat, p_lng, mp.lat, mp.lng) <= p_radius_km
  order by public.distance_km(p_lat, p_lng, mp.lat, mp.lng)
  limit greatest(1, least(p_max_masters, 10));

  return v_lead_id;
end;
$$;

create or replace function public.accept_offer(
  p_offer_id uuid,
  p_master_id uuid
)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.offers;
begin
  update public.offers o
  set status = 'accepted'
  where o.id = p_offer_id
    and o.master_id = p_master_id
    and o.status = 'sent'
  returning o.* into v_offer;

  if v_offer.id is null then
    raise exception 'Offer not found or cannot be accepted';
  end if;

  return v_offer;
end;
$$;

create or replace function public.assign_master_to_lead(
  p_lead_id uuid,
  p_client_id uuid,
  p_master_id uuid
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  update public.leads l
  set
    status = 'assigned',
    assigned_master_id = p_master_id
  where l.id = p_lead_id
    and l.client_id = p_client_id
  returning l.* into v_lead;

  if v_lead.id is null then
    raise exception 'Lead not found or assignment denied';
  end if;

  return v_lead;
end;
$$;
