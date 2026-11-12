-- Thriftesque shop schema: products, settings, team allowlist, photo bucket and row level security.
-- Design notes: docs/03-architecture.md. Decisions referenced as D-xxx: docs/02-decisions.md.

-- ===== Team allowlist (D-023) =====
-- Signups are disabled, but write access also requires a row here, so an accidental signup toggle can't open the shop to edits.
create table public.team_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  created_at timestamptz not null default now()
);

create function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members where user_id = (select auth.uid()));
$$;

revoke all on function public.is_team() from public;
grant execute on function public.is_team() to anon, authenticated;

alter table public.team_members enable row level security;

create policy "Team members can see the team"
  on public.team_members for select
  to authenticated
  using ((select public.is_team()));

-- ===== Products =====
create type public.product_status as enum ('live', 'reserved', 'sold', 'hidden');

create sequence public.product_code_seq;

-- Same format as formatCode() in lib/catalog.ts: at least four digits, never truncated (lpad alone would cut 10000 to 1000).
create function public.format_product_code(n bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'TQ-' || case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
$$;

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default public.format_product_code(nextval('public.product_code_seq'))
                 check (code ~ '^TQ-[0-9]{4,}$'),
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  brand        text not null default 'Unbranded' check (char_length(brand) <= 80),
  era          text not null check (era in ('70s', '80s', '90s', 'Y2K', '2000s', '2010s')),
  category     text not null check (category in ('Outerwear', 'Knitwear', 'Tops', 'Dresses', 'Bottoms', 'Shoes', 'Bags')),
  size         text not null check (char_length(btrim(size)) between 1 and 20),
  price_qar    integer not null check (price_qar > 0 and price_qar < 1000000),
  condition    text not null check (condition in ('Excellent', 'Very good', 'Good')),
  colour       text check (char_length(colour) <= 40),                     -- D-014
  measurements jsonb not null default '{}' check (jsonb_typeof(measurements) = 'object'),
  status       public.product_status not null default 'hidden',
  photos       text[] not null default '{}' check (cardinality(photos) <= 4), -- storage paths, first is the cover (D-011)
  description  text check (char_length(description) <= 1000),
  styling_tip  text check (char_length(styling_tip) <= 300),
  created_at   timestamptz not null default now(),
  sold_at      timestamptz                                                 -- maintained by trigger (D-007)
);

alter sequence public.product_code_seq owned by public.products.code;

create index products_status_created_at_idx on public.products (status, created_at desc);

-- sold_at follows status (D-007). Codes never change once assigned.
create function public.products_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.code is distinct from old.code then
    raise exception 'Product codes cannot be changed (% -> %)', old.code, new.code
      using errcode = 'check_violation';
  end if;

  if new.status = 'sold' then
    if tg_op = 'INSERT' or old.status is distinct from 'sold' then
      new.sold_at := coalesce(new.sold_at, now());
    end if;
  else
    new.sold_at := null;
  end if;

  return new;
end;
$$;

create trigger products_before_write
  before insert or update on public.products
  for each row execute function public.products_before_write();

-- Moves the code sequence past the highest existing code, after importing products that carry their own codes.
create function public.sync_product_code_seq()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select setval(
    'public.product_code_seq',
    greatest(coalesce((select max(substring(code from 4)::bigint) from public.products), 0), 1),
    (select count(*) > 0 from public.products)
  );
$$;

revoke all on function public.sync_product_code_seq() from public, anon, authenticated;
grant execute on function public.sync_product_code_seq() to service_role;

alter table public.products enable row level security;

create policy "Anyone can see products that aren't hidden"
  on public.products for select
  to anon, authenticated
  using (status <> 'hidden');

create policy "Team can see every product"
  on public.products for select
  to authenticated
  using ((select public.is_team()));

create policy "Team can add products"
  on public.products for insert
  to authenticated
  with check ((select public.is_team()));

create policy "Team can edit products"
  on public.products for update
  to authenticated
  using ((select public.is_team()))
  with check ((select public.is_team()));

create policy "Team can delete products"
  on public.products for delete
  to authenticated
  using ((select public.is_team()));

-- ===== Settings (single row) =====
create table public.settings (
  id              integer primary key default 1 check (id = 1),
  whatsapp_number text not null default '' check (whatsapp_number ~ '^([0-9]{8,15})?$'), -- digits, country code first; '' = not set
  delivery_fees   jsonb not null default '[]' check (jsonb_typeof(delivery_fees) = 'array'), -- [{area, fee_qar}] (D-010)
  drop_name       text not null default '' check (char_length(drop_name) <= 40)
);

insert into public.settings (id) values (1);

alter table public.settings enable row level security;

create policy "Anyone can read settings"
  on public.settings for select
  to anon, authenticated
  using (true);

create policy "Team can update settings"
  on public.settings for update
  to authenticated
  using ((select public.is_team()))
  with check ((select public.is_team()));

-- Only update is allowed: the single row is created above and never inserted or deleted through the API.
revoke insert, delete, truncate on public.settings from anon, authenticated;
revoke insert, update, delete, truncate on public.team_members from anon, authenticated;

-- ===== Photo bucket =====
-- Public read through the public URL. No anon select policy, so the bucket can't be listed through the API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 204800, array['image/webp', 'image/jpeg', 'image/png']);

create policy "Team can see product photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-photos' and (select public.is_team()));

create policy "Team can upload product photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos' and (select public.is_team()));

create policy "Team can replace product photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos' and (select public.is_team()))
  with check (bucket_id = 'product-photos' and (select public.is_team()));

create policy "Team can delete product photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos' and (select public.is_team()));
