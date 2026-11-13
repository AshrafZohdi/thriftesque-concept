-- Lets the deploy check the database is at least as new as the code before it deploys (D-052). Every later migration must
-- update this function to return its own timestamp prefix (scripts/check-schema.mjs compares it with the newest file).
create or replace function public.schema_version() returns text
  language sql immutable
  as $$ select '20261113020000'::text $$;

grant execute on function public.schema_version() to anon, authenticated;
