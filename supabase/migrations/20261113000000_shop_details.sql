-- Shop details shown on the terms, privacy and home pages, edited by the team in the dashboard (D-048).
-- '' means not filled in yet: the pages then say "To be confirmed", and the deploy won't leave preview mode.
-- Additive only, so the live site keeps working while this is applied before the code that reads it.
alter table public.settings
  add column operator_name        text not null default '' check (char_length(operator_name) <= 120),
  add column contact_email        text not null default ''
    check (contact_email = '' or (char_length(contact_email) <= 120 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add column delivery_text        text not null default '' check (char_length(delivery_text) <= 400),
  add column payment_text         text not null default '' check (char_length(payment_text) <= 400),
  add column returns_text         text not null default '' check (char_length(returns_text) <= 600),
  add column reserved_hold_text   text not null default '' check (char_length(reserved_hold_text) <= 120),
  add column order_retention_text text not null default '' check (char_length(order_retention_text) <= 120);
