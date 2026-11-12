-- Cut-outs for the outfit builder and looks (D-027), and the looks table (D-028).

-- Storage path of a transparent WebP of the piece, in the product-photos bucket. Pieces without one stay out of the builder and looks.
alter table public.products add column cutout text check (char_length(cutout) <= 200);

create type public.look_status as enum ('draft', 'published');
create type public.look_source as enum ('ai', 'team');

create table public.looks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(btrim(title)) between 1 and 60),
  note          text check (char_length(note) <= 200),
  product_codes text[] not null check (cardinality(product_codes) between 2 and 4),
  source        public.look_source not null default 'team', -- drives the "AI picks" label, so labels follow the data
  status        public.look_status not null default 'draft',  -- shoppers only see published looks
  created_at    timestamptz not null default now()
);

create index looks_status_created_at_idx on public.looks (status, created_at desc);

alter table public.looks enable row level security;

create policy "Anyone can see published looks"
  on public.looks for select
  to anon, authenticated
  using (status = 'published');

create policy "Team can see every look"
  on public.looks for select
  to authenticated
  using ((select public.is_team()));

create policy "Team can add looks"
  on public.looks for insert
  to authenticated
  with check ((select public.is_team()));

create policy "Team can edit looks"
  on public.looks for update
  to authenticated
  using ((select public.is_team()))
  with check ((select public.is_team()));

create policy "Team can delete looks"
  on public.looks for delete
  to authenticated
  using ((select public.is_team()));
