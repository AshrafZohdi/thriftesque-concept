-- Bulk upload (D-051): a hidden draft may be missing its era, category, size, price and condition while the team fills them in.
-- Anything the shop can show (live, reserved, sold) must still have all of them, so nothing half-finished reaches customers.
alter table public.products
  alter column era drop not null,
  alter column category drop not null,
  alter column size drop not null,
  alter column price_qar drop not null,
  alter column condition drop not null;

alter table public.products
  add constraint products_complete_unless_hidden check (
    status = 'hidden'
    or (era is not null and category is not null and size is not null and price_qar is not null and condition is not null)
  );
