-- The team can put a piece live with only a name, a photo and a price (D-066). Size, category, era and condition are optional
-- for any status now; the shop leaves out what's missing. The price stays required so bag totals and orders always add up.
alter table public.products drop constraint products_complete_unless_hidden;

alter table public.products
  add constraint products_shop_ready_unless_hidden check (
    status = 'hidden' or (price_qar is not null and cardinality(photos) >= 1)
  );

create or replace function public.schema_version() returns text
  language sql immutable
  as $$ select '20261120000000'::text $$;
