-- RLS, product codes, sold_at and storage rules. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- ----- fixtures (as the postgres owner) -----
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000aaaa', 'team@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000bbbb', 'stranger@example.test', 'authenticated', 'authenticated');
insert into public.team_members (user_id, name) values ('00000000-0000-0000-0000-00000000aaaa', 'Test team');

insert into public.products (code, name, era, category, size, price_qar, condition, status) values
  ('TQ-9001', 'Test live jacket', '90s', 'Outerwear', 'M', 100, 'Excellent', 'live'),
  ('TQ-9002', 'Test hidden draft', '90s', 'Tops', 'S', 50, 'Good', 'hidden'),
  ('TQ-9003', 'Test reserved dress', 'Y2K', 'Dresses', 'S', 80, 'Very good', 'reserved');

-- ----- code formatting -----
select is(public.format_product_code(7), 'TQ-0007', 'codes pad to four digits');
select is(public.format_product_code(722), 'TQ-0722', 'next code after the seed looks right');
select is(public.format_product_code(10000), 'TQ-10000', 'codes over 9999 are not truncated');
with inserted as (
  insert into public.products (name, era, category, size, price_qar, condition)
  values ('Auto code', '80s', 'Bags', 'One size', 60, 'Good') returning code
)
select matches(code, '^TQ-[0-9]{4,}$', 'a new product gets a code automatically') from inserted;
select is(
  (select status::text from public.products where name = 'Auto code'), 'hidden', 'new products default to hidden');

-- ----- triggers -----
update public.products set status = 'sold' where code = 'TQ-9001';
select isnt((select sold_at from public.products where code = 'TQ-9001'), null, 'marking sold sets sold_at');
update public.products set status = 'live' where code = 'TQ-9001';
select is((select sold_at from public.products where code = 'TQ-9001'), null, 'leaving sold clears sold_at');
select throws_ok(
  $$ update public.products set code = 'TQ-9999' where code = 'TQ-9001' $$,
  '23514', null, 'codes cannot be changed');
select throws_ok(
  $$ insert into public.products (name, era, category, size, price_qar, condition, photos)
     values ('Too many photos', '90s', 'Tops', 'M', 10, 'Good', '{a,b,c,d,e}') $$,
  '23514', null, 'at most four photos');
select throws_ok(
  $$ insert into public.products (name, era, category, size, price_qar, condition)
     values ('Bad category', '90s', 'Hats', 'M', 10, 'Good') $$,
  '23514', null, 'category must be one of the fixed list');
select throws_ok(
  $$ update public.settings set whatsapp_number = '+974 1234' $$,
  '23514', null, 'WhatsApp number must be digits only');

-- ----- anon (a shop visitor) -----
set local role anon;
select is((select count(*)::int from public.products where code like 'TQ-900%'), 2, 'anon sees live and reserved, not hidden');
select is((select count(*)::int from public.products where code = 'TQ-9002'), 0, 'anon cannot see a hidden draft');
select is((select count(*)::int from public.settings), 1, 'anon can read settings');
select throws_ok(
  $$ insert into public.products (name, era, category, size, price_qar, condition) values ('x', '90s', 'Tops', 'M', 1, 'Good') $$,
  '42501', null, 'anon cannot add products');
update public.products set price_qar = 1 where code = 'TQ-9001';
delete from public.products where code = 'TQ-9001';
update public.settings set drop_name = 'hacked';
reset role;
select is((select price_qar from public.products where code = 'TQ-9001'), 100, 'anon update changed nothing');
select is((select count(*)::int from public.products where code = 'TQ-9001'), 1, 'anon delete removed nothing');
select isnt((select drop_name from public.settings), 'hacked', 'anon cannot change settings');
set local role anon;
select is((select count(*)::int from public.team_members), 0, 'anon cannot see the team list');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('product-photos', 'TQ-9001/anon.webp') $$,
  '42501', null, 'anon cannot upload photos');
select throws_ok($$ select public.sync_product_code_seq() $$, '42501', null, 'anon cannot move the code sequence');
reset role;

-- ----- signed in but not on the team -----
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000bbbb", "role": "authenticated"}';
select is((select count(*)::int from public.products where code = 'TQ-9002'), 0, 'non-team user cannot see hidden drafts');
select throws_ok(
  $$ insert into public.products (name, era, category, size, price_qar, condition) values ('x', '90s', 'Tops', 'M', 1, 'Good') $$,
  '42501', null, 'non-team user cannot add products');
update public.products set price_qar = 2 where code = 'TQ-9001';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('product-photos', 'TQ-9001/stranger.webp') $$,
  '42501', null, 'non-team user cannot upload photos');
reset role;
select is((select price_qar from public.products where code = 'TQ-9001'), 100, 'non-team update changed nothing');

-- ----- team member -----
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000aaaa", "role": "authenticated"}';
select is((select count(*)::int from public.products where code like 'TQ-900%'), 3, 'team sees hidden drafts too');
select lives_ok(
  $$ insert into public.products (name, era, category, size, price_qar, condition, status)
     values ('Team piece', 'Y2K', 'Shoes', 'EU 38', 130, 'Excellent', 'live') $$,
  'team can add products');
update public.products set status = 'reserved', price_qar = 120 where name = 'Team piece';
select is((select price_qar from public.products where name = 'Team piece'), 120, 'team can edit products');
update public.settings set drop_name = 'Drop 08';
select is((select drop_name from public.settings), 'Drop 08', 'team can update settings');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('product-photos', 'TQ-9001/team.webp') $$,
  'team can upload photos');
delete from public.products where name = 'Team piece';
select is((select count(*)::int from public.products where name = 'Team piece'), 0, 'team can delete products');
select throws_ok($$ delete from public.settings $$, '42501', null, 'nobody deletes the settings row through the API');
reset role;

select * from finish();
rollback;
