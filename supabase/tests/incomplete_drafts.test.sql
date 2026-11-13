begin;
select plan(5);

insert into public.products (code, name, status) values ('TQ-9001', 'Untitled draft', 'hidden');
select is((select price_qar from public.products where code = 'TQ-9001'), null, 'a hidden draft can be saved without a price');

select throws_ok($$update public.products set status = 'live' where code = 'TQ-9001'$$, '23514', null,
  'an incomplete draft cannot go live');
select throws_ok($$insert into public.products (code, name, status) values ('TQ-9002', 'X', 'sold')$$, '23514', null,
  'an incomplete product cannot be created as sold');

update public.products set era = '90s', category = 'Tops', size = 'M', price_qar = 90, condition = 'Good' where code = 'TQ-9001';
select lives_ok($$update public.products set status = 'live' where code = 'TQ-9001'$$, 'once complete it can go live');

-- The old value checks still apply when a value is given.
select throws_ok($$update public.products set price_qar = 0 where code = 'TQ-9001'$$, '23514', null, 'a zero price is still refused');

select * from finish();
rollback;
