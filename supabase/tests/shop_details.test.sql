begin;
select plan(9);

select has_column('public', 'settings', 'operator_name', 'settings has operator_name');
select has_column('public', 'settings', 'contact_email', 'settings has contact_email');
select has_column('public', 'settings', 'returns_text', 'settings has returns_text');
select is((select returns_text from public.settings where id = 1), '', 'details start empty (not filled in yet)');

select lives_ok($$update public.settings set contact_email = 'hello@thriftesque.com' where id = 1$$, 'a real email is accepted');
select throws_ok($$update public.settings set contact_email = 'not an email' where id = 1$$, '23514', null, 'a malformed email is refused');
select throws_ok($$update public.settings set returns_text = repeat('x', 601) where id = 1$$, '23514', null, 'returns text is capped at 600');

-- Anyone can read the details (they're public on the terms and privacy pages); only the team can change them.
set local role anon;
select is((select count(*)::int from public.settings), 1, 'anon can read settings');
select is_empty($$update public.settings set returns_text = 'hacked' where id = 1 returning 1$$, 'anon cannot change the details');
reset role;

select * from finish();
rollback;
