-- Looks table rules and the product cut-out column. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000cccc', 'team2@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000dddd', 'stranger2@example.test', 'authenticated', 'authenticated');
insert into public.team_members (user_id, name) values ('00000000-0000-0000-0000-00000000cccc', 'Test team');

insert into public.looks (title, product_codes, source, status) values
  ('Test published look', '{TQ-9101,TQ-9102}', 'ai', 'published'),
  ('Test draft look', '{TQ-9101,TQ-9103}', 'ai', 'draft');

select has_column('public', 'products', 'cutout', 'products have a cutout column');
select throws_ok(
  $$ insert into public.looks (title, product_codes) values ('One piece', '{TQ-9101}') $$,
  '23514', null, 'a look needs at least two pieces');
select is((select status::text from public.looks where title = 'Test draft look'), 'draft', 'looks can be drafts');

set local role anon;
select is((select count(*)::int from public.looks where title like 'Test %'), 1, 'anon sees only published looks');
select throws_ok(
  $$ insert into public.looks (title, product_codes) values ('x', '{TQ-1,TQ-2}') $$,
  '42501', null, 'anon cannot add looks');
update public.looks set title = 'hacked' where title = 'Test published look';
reset role;
select is((select count(*)::int from public.looks where title = 'hacked'), 0, 'anon update changed nothing');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000dddd", "role": "authenticated"}';
select is((select count(*)::int from public.looks where title like 'Test %'), 1, 'non-team user sees only published looks');
select throws_ok(
  $$ insert into public.looks (title, product_codes) values ('x', '{TQ-1,TQ-2}') $$,
  '42501', null, 'non-team user cannot add looks');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000cccc", "role": "authenticated"}';
select is((select count(*)::int from public.looks where title like 'Test %'), 2, 'team sees drafts too');
update public.looks set status = 'published' where title = 'Test draft look';
select is((select status::text from public.looks where title = 'Test draft look'), 'published', 'team can publish a look');
delete from public.looks where title = 'Test draft look';
select is((select count(*)::int from public.looks where title = 'Test draft look'), 0, 'team can delete a look');
reset role;

select * from finish();
rollback;
