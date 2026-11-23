-- Shop stats (D-067): anonymous counts of visits, product views, bag adds and WhatsApp messages, recorded in the background
-- for the monthly report Nuvai sends the shop. The shop's team doesn't see or do anything here. Nothing identifies a
-- shopper: no names, phone numbers, areas or IP addresses are ever stored.

create extension if not exists pgcrypto with schema extensions;

-- ===== Events =====
-- One row per counted moment. Written only through record_event() (the /api/tally route calls it). Read only by the
-- service role, through monthly_report().
create table public.site_events (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  name    text not null check (name in ('page_view', 'product_view', 'bag_add', 'order_sent', 'ask_sent')),
  path    text not null default '' check (char_length(path) <= 200),
  -- A code that changes every day (see record_event), so the same browser counts once a day and can't be followed across days.
  visitor text check (visitor ~ '^[0-9a-f]{16}$'),
  props   jsonb not null default '{}' check (jsonb_typeof(props) = 'object' and pg_column_size(props) < 4096)
);

create index site_events_at_idx on public.site_events (at);

alter table public.site_events enable row level security;

revoke all on public.site_events from anon, authenticated;

-- One random salt per Doha day. Nobody can read it, and yesterday's is deleted, so a visitor code can't be traced back.
create table public.site_event_salts (
  day  date primary key,
  salt bytea not null default extensions.gen_random_bytes(32)
);

alter table public.site_event_salts enable row level security;
revoke all on public.site_event_salts from anon, authenticated;

-- p_fingerprint is the IP address and browser name of the request, passed by /api/tally. It is only hashed with today's
-- salt, never stored. Old events are deleted once a day here (when the day's salt is made), so no cron is needed.
create function public.record_event(p_name text, p_path text, p_props jsonb, p_fingerprint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Qatar')::date;
  made integer;
  day_salt bytea;
begin
  insert into public.site_event_salts (day) values (today) on conflict (day) do nothing;
  get diagnostics made = row_count;
  if made > 0 then
    delete from public.site_event_salts where day < today;
    delete from public.site_events where at < now() - interval '400 days';
  end if;
  select salt into day_salt from public.site_event_salts where day = today;

  insert into public.site_events (name, path, visitor, props)
  values (
    p_name,
    left(coalesce(p_path, ''), 200),
    case when coalesce(p_fingerprint, '') = '' then null
         else left(encode(extensions.digest(day_salt || convert_to(p_fingerprint, 'UTF8'), 'sha256'), 'hex'), 16) end,
    coalesce(p_props, '{}')
  );
end;
$$;

revoke all on function public.record_event(text, text, jsonb, text) from public;
grant execute on function public.record_event(text, text, jsonb, text) to anon, authenticated;

-- ===== Monthly report =====
-- Everything the monthly report shows for the Doha calendar month that contains p_month, in the generic shape Nuvai's report
-- tool renders for every client: metrics (key, label, value, unit), lists (title, rows) and one daily series.
-- Only the service role can run it; the report tool calls it with the project's secret key.
create function public.monthly_report(p_month date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  first_day date := date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Qatar')::date))::date;
  last_day date := (first_day + interval '1 month' - interval '1 day')::date;
  since timestamptz := first_day::timestamp at time zone 'Asia/Qatar';
  until timestamptz := (first_day + interval '1 month')::timestamp at time zone 'Asia/Qatar';
  result jsonb;
begin
  with ev as (
    select e.*, (e.at at time zone 'Asia/Qatar')::date as day
    from public.site_events e
    where e.at >= since and e.at < until
  ),
  sent_items as (
    -- Every piece in a WhatsApp message, with the price it had when the message was made.
    select ev.name as kind, i ->> 'code' as code, (i ->> 'price')::integer as price
    from ev, jsonb_array_elements(case when jsonb_typeof(ev.props -> 'items') = 'array' then ev.props -> 'items' else '[]' end) i
    where ev.name in ('order_sent', 'ask_sent') and i ->> 'code' ~ '^TQ-[0-9]{4,}$' and i ->> 'price' ~ '^[0-9]{1,6}$'
  ),
  ordered as (select code, price from sent_items where kind = 'order_sent'),
  sold as (
    -- Pieces the team marked Sold this month, as part of their normal work (sold_at is set by the database, D-007).
    select p.code, p.price_qar from public.products p
    where p.status = 'sold' and p.sold_at >= since and p.sold_at < until
  ),
  m as (
    select
      (select count(distinct (day, visitor)) from ev where visitor is not null) as visitors,
      (select count(*) from ev where name = 'page_view') as page_views,
      (select count(*) from ev where name = 'product_view') as product_views,
      (select coalesce(sum(case when jsonb_typeof(props -> 'codes') = 'array' then jsonb_array_length(props -> 'codes') else 0 end), 0)
         from ev where name = 'bag_add') as bag_adds,
      (select count(*) from ev where name = 'order_sent') as orders_sent,
      (select count(*) from ordered) as items_sent,
      (select coalesce(sum(price), 0) from ordered) as order_value,
      (select count(*) from ev where name = 'ask_sent') as asks_sent,
      (select count(*) from sold) as sold_count,
      (select coalesce(sum(price_qar), 0) from sold) as sold_value,
      (select count(distinct o.code) from ordered o join sold s on s.code = o.code) as sent_then_sold
  )
  select jsonb_build_object(
    'month', to_char(first_day, 'YYYY-MM'),
    'from', first_day,
    'to', last_day,
    'metrics', jsonb_build_array(
      jsonb_build_object('key', 'visitors', 'label', 'Visitors (counted once a day)', 'value', m.visitors, 'unit', 'count'),
      jsonb_build_object('key', 'page_views', 'label', 'Pages viewed', 'value', m.page_views, 'unit', 'count'),
      jsonb_build_object('key', 'product_views', 'label', 'Pieces viewed', 'value', m.product_views, 'unit', 'count'),
      jsonb_build_object('key', 'bag_adds', 'label', 'Pieces added to bags', 'value', m.bag_adds, 'unit', 'count'),
      jsonb_build_object('key', 'orders_sent', 'label', 'Orders sent on WhatsApp', 'value', m.orders_sent, 'unit', 'count'),
      jsonb_build_object('key', 'items_sent', 'label', 'Pieces in those orders', 'value', m.items_sent, 'unit', 'count'),
      jsonb_build_object('key', 'order_value', 'label', 'Value of orders sent (pieces, before delivery)', 'value', m.order_value, 'unit', 'qar'),
      jsonb_build_object('key', 'asks_sent', 'label', 'Questions sent about a piece, outfit or look', 'value', m.asks_sent, 'unit', 'count'),
      jsonb_build_object('key', 'sold_count', 'label', 'Pieces marked sold', 'value', m.sold_count, 'unit', 'count'),
      jsonb_build_object('key', 'sold_value', 'label', 'Value of pieces marked sold', 'value', m.sold_value, 'unit', 'qar'),
      jsonb_build_object('key', 'sent_then_sold', 'label', 'Pieces ordered on WhatsApp and marked sold this month', 'value', m.sent_then_sold, 'unit', 'count')
    ),
    'lists', jsonb_build_array(
      jsonb_build_object('title', 'Most sent to WhatsApp', 'rows', (select coalesce(jsonb_agg(jsonb_build_object(
          'label', coalesce(t.name, 'Deleted piece') || ' (' || t.code || ')',
          'value', t.times || case when t.times = 1 then ' time, ' else ' times, ' end || t.price || ' QAR' || case when t.status = 'sold' then ', sold' else '' end
        ) order by t.times desc, t.code), '[]') from (
          select s.code, p.name, p.status, count(*) as times, max(s.price) as price
          from sent_items s left join public.products p on p.code = s.code
          group by s.code, p.name, p.status order by count(*) desc, s.code limit 10) t)),
      jsonb_build_object('title', 'Most viewed pieces', 'rows', (select coalesce(jsonb_agg(jsonb_build_object(
          'label', coalesce(t.name, 'Deleted piece') || ' (' || t.code || ')', 'value', t.views || case when t.views = 1 then ' view' else ' views' end
        ) order by t.views desc, t.code), '[]') from (
          select ev.props ->> 'code' as code, p.name, count(*) as views
          from ev left join public.products p on p.code = ev.props ->> 'code'
          where ev.name = 'product_view' and ev.props ->> 'code' is not null
          group by ev.props ->> 'code', p.name order by count(*) desc, ev.props ->> 'code' limit 10) t)),
      jsonb_build_object('title', 'Where visits came from', 'rows', (select coalesce(jsonb_agg(jsonb_build_object(
          'label', t.source, 'value', t.visits || case when t.visits = 1 then ' visit' else ' visits' end
        ) order by t.visits desc, t.source), '[]') from (
          select coalesce(nullif(props ->> 'source', ''), 'Direct or unknown') as source, count(*) as visits
          from ev where name = 'page_view' and props ->> 'landing' = 'true' -- first page of each visit
          group by 1 order by count(*) desc, 1 limit 8) t))
    ),
    'series', jsonb_build_object('label', 'Visitors per day', 'points', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date,
        'value', (select count(distinct visitor) from ev where ev.day = d::date and visitor is not null)
      ) order by d), '[]') from generate_series(first_day, last_day, interval '1 day') d))
  ) into result
  from m;

  return result;
end;
$$;

revoke all on function public.monthly_report(date) from public, anon, authenticated;
grant execute on function public.monthly_report(date) to service_role;

create or replace function public.schema_version() returns text
  language sql immutable
  as $$ select '20261123000000'::text $$;
