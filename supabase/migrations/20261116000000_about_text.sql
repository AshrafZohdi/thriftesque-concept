-- The About page's text, written by the team in the dashboard (D-059). Plain text; a blank line starts a new paragraph.
-- '' means not written yet: the page then shows a short default made only from facts already on the site.
-- Additive only, so the live site keeps working while this is applied before the code that reads it.
alter table public.settings
  add column about_text text not null default '' check (char_length(about_text) <= 3000);

create or replace function public.schema_version() returns text
  language sql immutable
  as $$ select '20261116000000'::text $$;
