begin;
select plan(11);

-- Sale prices
select has_column('public', 'products', 'was_price_qar', 'products has was_price_qar');
select lives_ok($$update public.products set price_qar = 100, was_price_qar = 150 where code = 'TQ-0701'$$, 'a was price above the price is accepted');
select throws_ok($$update public.products set price_qar = 100, was_price_qar = 100 where code = 'TQ-0701'$$, '23514', null, 'a was price that is not higher is refused');
select lives_ok($$update public.products set was_price_qar = null where code = 'TQ-0701'$$, 'clearing the was price ends the sale');

-- Sections: removing one takes it off its pieces, the pieces stay
delete from public.sections; -- start from none, whatever the seed made (rolled back at the end)
insert into public.sections (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Basics'), ('00000000-0000-0000-0000-0000000000a2', 'Men''s');
update public.products set section_ids = '{00000000-0000-0000-0000-0000000000a1,00000000-0000-0000-0000-0000000000a2}' where code = 'TQ-0701';
select throws_ok($$insert into public.sections (name) values (' basics ')$$, '23505', null, 'section names are unique, ignoring case and spaces');
delete from public.sections where id = '00000000-0000-0000-0000-0000000000a1';
select is((select section_ids from public.products where code = 'TQ-0701'), '{00000000-0000-0000-0000-0000000000a2}'::uuid[], 'a removed section is taken off its pieces');
select is((select count(*)::int from public.products where code = 'TQ-0701'), 1, 'the piece itself stays');

-- About photos
select throws_ok($$update public.settings set about_photos = (select jsonb_agg(jsonb_build_object('path', 'a/x.webp', 'alt', '')) from generate_series(1, 9)) where id = 1$$, '23514', null, 'at most 8 about photos');
select throws_ok($$update public.settings set about_photos = '{}'::jsonb where id = 1$$, '23514', null, 'about photos must be a list');

-- Anyone can read sections; only the team can change them
set local role anon;
select is((select count(*)::int from public.sections), 1, 'anon can read sections');
select throws_ok($$insert into public.sections (name) values ('Hacked')$$, '42501', null, 'anon cannot add sections');
reset role;

select * from finish();
rollback;
