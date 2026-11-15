-- Sale prices, team-made sections and photos on the About page (D-060). Additive only, so the live site keeps working while
-- this is applied before the code that reads it.

-- Sale: the price before the reduction. Empty means not on sale. It must be above the current price, or it isn't a sale.
alter table public.products
  add column was_price_qar integer check (was_price_qar is null or (was_price_qar > 0 and was_price_qar < 1000000)),
  add constraint products_was_price_above_price check (was_price_qar is null or price_qar is null or was_price_qar > price_qar);

-- Sections the team names (Basics, Jackets, Men's...). A piece can be in several, so it lists their ids.
create table public.sections (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 30),
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index sections_name_key on public.sections (lower(btrim(name)));

alter table public.sections enable row level security;

create policy "Anyone can see sections"
  on public.sections for select
  to anon, authenticated
  using (true);

create policy "Team can add sections"
  on public.sections for insert
  to authenticated
  with check ((select public.is_team()));

create policy "Team can change sections"
  on public.sections for update
  to authenticated
  using ((select public.is_team()))
  with check ((select public.is_team()));

create policy "Team can remove sections"
  on public.sections for delete
  to authenticated
  using ((select public.is_team()));

alter table public.products
  add column section_ids uuid[] not null default '{}' check (cardinality(section_ids) <= 10);

-- Removing a section takes it off its pieces too; the pieces themselves stay.
create function public.forget_section() returns trigger
  language plpgsql
  set search_path = ''
  as $$
begin
  update public.products set section_ids = array_remove(section_ids, old.id) where old.id = any(section_ids);
  return old;
end
$$;

create trigger sections_forget_on_delete
  after delete on public.sections
  for each row execute function public.forget_section();

-- About page photos: [{path, alt}], at most 8, stored in the product-photos bucket under a/.
alter table public.settings
  add column about_photos jsonb not null default '[]'
    check (case when jsonb_typeof(about_photos) = 'array' then jsonb_array_length(about_photos) <= 8 else false end);

create or replace function public.schema_version() returns text
  language sql immutable
  as $$ select '20261116010000'::text $$;
