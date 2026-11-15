begin;
select plan(5);

select has_column('public', 'settings', 'about_text', 'settings has about_text');
select is((select about_text from public.settings where id = 1), '', 'the about text starts empty (default shown)');
select lives_ok($$update public.settings set about_text = repeat('x', 3000) where id = 1$$, '3000 characters are accepted');
select throws_ok($$update public.settings set about_text = repeat('x', 3001) where id = 1$$, '23514', null, 'the about text is capped at 3000');

-- Public on the About page; only the team can change it.
set local role anon;
select is_empty($$update public.settings set about_text = 'hacked' where id = 1 returning 1$$, 'anon cannot change the about text');
reset role;

select * from finish();
rollback;
