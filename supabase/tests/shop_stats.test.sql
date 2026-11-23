-- Shop stats (D-067): shoppers can only count, nobody but the service role reads, the daily visitor code, and the monthly
-- report's numbers. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000eeee', 'team3@example.test', 'authenticated', 'authenticated');
insert into public.team_members (user_id, name) values ('00000000-0000-0000-0000-00000000eeee', 'Test team');

insert into public.products (code, name, price_qar, status, photos) values
  ('TQ-9501', 'Test denim jacket', 150, 'live', '{t/a.webp}'),
  ('TQ-9502', 'Test silk scarf', 50, 'sold', '{t/b.webp}');
delete from public.site_events; -- start from none (rolled back at the end)
-- Pieces the seed marked sold this month would count too; move them out of the month (rolled back at the end).
update public.products set sold_at = now() - interval '2 months' where status = 'sold' and code <> 'TQ-9502';

-- Shoppers (anon) can only count, through record_event
set local role anon;
select lives_ok($$select public.record_event('page_view', '/', '{"landing": true, "source": "tiktok.com"}', '1.2.3.4 Safari')$$, 'anon can record a visit');
select lives_ok($$select public.record_event('page_view', '/p/TQ-9501', '{}', '1.2.3.4 Safari')$$, 'the same browser again');
select lives_ok($$select public.record_event('page_view', '/', '{}', '5.6.7.8 Chrome')$$, 'a second browser');
select lives_ok($$select public.record_event('product_view', '/p/TQ-9501', '{"code": "TQ-9501"}', '1.2.3.4 Safari')$$, 'a product view');
select lives_ok($$select public.record_event('bag_add', '/', '{"codes": ["TQ-9501", "TQ-9502"]}', '1.2.3.4 Safari')$$, 'a bag add');
select lives_ok($$select public.record_event('order_sent', '/', '{"items": [{"code": "TQ-9501", "price": 150}, {"code": "TQ-9502", "price": 50}], "subtotal": 200, "fee": 20, "total": 220, "mode": "delivery"}', '1.2.3.4 Safari')$$, 'an order sent');
select lives_ok($$select public.record_event('ask_sent', '/', '{"kind": "piece", "items": [{"code": "TQ-9501", "price": 150}]}', '5.6.7.8 Chrome')$$, 'an ask sent');
select throws_ok($$select public.record_event('sign_up', '/', '{}', 'x')$$, '23514', null, 'unknown event names are refused');
select throws_ok($$select public.record_event('page_view', '/', '[]', 'x')$$, '23514', null, 'props must be an object');
select throws_ok($$select count(*) from public.site_events$$, '42501', null, 'anon cannot read events');
select throws_ok($$select count(*) from public.site_event_salts$$, '42501', null, 'anon cannot read the salts');
select throws_ok($$insert into public.site_events (name) values ('page_view')$$, '42501', null, 'anon cannot write events directly');
select throws_ok($$select public.monthly_report(current_date)$$, '42501', null, 'anon cannot run the monthly report');
reset role;

select is((select count(distinct visitor)::int from public.site_events where name = 'page_view'), 2, 'one visitor code per browser per day');
select is((select count(*)::int from public.site_events where props::text like '%1.2.3.4%' or path like '%1.2.3.4%'), 0, 'the IP address is never stored');
select is((select count(*)::int from public.site_event_salts), 1, 'one salt for today only');

-- The shop's team doesn't see the counts either (the report goes to them from Nuvai)
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000eeee", "role": "authenticated"}';
select throws_ok($$select count(*) from public.site_events$$, '42501', null, 'a team member cannot read events');
select throws_ok($$select public.monthly_report(current_date)$$, '42501', null, 'a team member cannot run the monthly report');
reset role;

-- The service role (Nuvai's report tool) reads the month
set local role service_role;
create temp table r as select public.monthly_report((now() at time zone 'Asia/Qatar')::date) as j;
select is((select j ->> 'month' from r), to_char((now() at time zone 'Asia/Qatar')::date, 'YYYY-MM'), 'report: the month asked for');
select is(
  (select jsonb_object_agg(x ->> 'key', (x ->> 'value')::int) from r, jsonb_array_elements(r.j -> 'metrics') x),
  '{"visitors": 2, "page_views": 3, "product_views": 1, "bag_adds": 2, "orders_sent": 1, "items_sent": 2, "order_value": 200,
    "asks_sent": 1, "sold_count": 1, "sold_value": 50, "sent_then_sold": 1}'::jsonb,
  'report: every metric adds up');
select is((select j -> 'lists' -> 0 -> 'rows' -> 0 ->> 'label' from r), 'Test denim jacket (TQ-9501)', 'report: the most sent piece comes first');
select is((select j -> 'lists' -> 2 -> 'rows' from r), '[{"label": "tiktok.com", "value": "1 visit"}]'::jsonb, 'report: where visits came from, first pages only');
select is((select jsonb_array_length(j -> 'series' -> 'points') from r),
  extract(day from date_trunc('month', now() at time zone 'Asia/Qatar') + interval '1 month' - interval '1 day')::int, 'report: one point per day of the month');
select is((select (x ->> 'value')::int from public.monthly_report(((now() at time zone 'Asia/Qatar')::date - interval '1 month')::date) j2,
  jsonb_array_elements(j2 -> 'metrics') x where x ->> 'key' = 'visitors'), 0, 'report: last month is empty');
reset role;

select * from finish();
rollback;
