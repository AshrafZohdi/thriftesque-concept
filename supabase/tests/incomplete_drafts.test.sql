begin;
select plan(7);

insert into public.products (code, name, status) values ('TQ-9001', 'Untitled draft', 'hidden');
select is((select price_qar from public.products where code = 'TQ-9001'), null, 'a hidden draft can be saved without a price');

-- To be in the shop a piece needs a price and a photo (D-066); everything else is optional.
select throws_ok($$update public.products set status = 'live' where code = 'TQ-9001'$$, '23514', null,
  'a piece without a price or photo cannot go live');
update public.products set price_qar = 90 where code = 'TQ-9001';
select throws_ok($$update public.products set status = 'live' where code = 'TQ-9001'$$, '23514', null,
  'a price alone is not enough: it needs a photo');
select throws_ok($$insert into public.products (code, name, status) values ('TQ-9002', 'X', 'sold')$$, '23514', null,
  'a product without a price cannot be created as sold');

update public.products set photos = '{p/x.webp}' where code = 'TQ-9001';
select lives_ok($$update public.products set status = 'live' where code = 'TQ-9001'$$,
  'with a price and a photo it can go live, without size, category, era or condition');
select is((select era from public.products where code = 'TQ-9001'), null, 'and the missing details stay empty');

-- The old value checks still apply when a value is given.
select throws_ok($$update public.products set price_qar = 0 where code = 'TQ-9001'$$, '23514', null, 'a zero price is still refused');

select * from finish();
rollback;
