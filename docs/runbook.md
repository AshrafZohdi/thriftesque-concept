# Runbook

Filled in as each phase lands. Commands marked *(Phase N)* don't exist yet.

## Branches

| Branch | What deploys from it |
| --- | --- |
| `main` | The concept mockup (`index.html`) on Vercel, the client demo. Becomes production at launch |
| `dev` | The production app. Nothing deploys from it automatically yet |

## Local

Needs Node 24 and npm 11.

| Task | Command |
| --- | --- |
| Install | `npm ci`, then `npx playwright install chromium firefox webkit` the first time |
| Dev server (Node, fast refresh) | `npm run dev` |
| Workers build | `npm run cf:build` |
| Workers preview (workerd on :8787) | `npm run preview` (builds first). Stop it with `npm run preview:stop` (stops only this repo's processes, parents first) |
| Compressed Worker size | `npm run cf:size` (after a build). Budget 2.5 MiB, limit 3 MiB |
| Unit tests | `npm test` |
| E2E (5 browser configs, starts the preview itself) | `npm run e2e` (after a build) |
| Full gate | `caffeinate -i npm run gate` (needs local Supabase running; the gate re-seeds, builds, and runs e2e; `caffeinate` stops the Mac sleeping mid-run) |
| Regenerate Cloudflare binding types | `npm run cf-typegen` (after editing `wrangler.jsonc`) |
| Local Supabase | `npx supabase start` (Docker running). API on :55321, Studio on :55323 (D-025). Stop with `npx supabase stop` |
| Write `.env.local` for local Supabase | `npm run env:local` (keys go to the file, never the terminal) |
| Reset local DB and re-apply migrations | `npm run db:reset`, then `npm run seed` |
| Seed sample products and photos | `npm run seed` (local only, refuses other hosts) |
| Database tests (RLS, codes, triggers) | `npm run db:test` |
| Regenerate DB types | `npm run db:types` (after changing a migration) |

There is deliberately no `deploy` script yet. Deploys get added in Phase 8 with a rehearsed rollback.

## Cloudflare bindings (`wrangler.jsonc`)

| Binding | Type | Purpose |
| --- | --- | --- |
| `ASSETS` | Workers Assets | static files from `.open-next/assets` |
| `WORKER_SELF_REFERENCE` | service | OpenNext revalidation. Must match the Worker name `thriftesque` |
| `NEXT_INC_CACHE_KV` | KV | page cache (D-005). ID added in Phase 9 |
| `NEXT_TAG_CACHE_D1` | D1 `thriftesque-tag-cache` | revalidation records (D-021). ID added in Phase 9 |

## Deploy and roll back *(Phase 8)*

Recorded here after the rehearsal: deploy command, how to find the last good version ID, rollback command, and smoke command.

Already fixed: a deploy build must pass `npm run check:build-secrets -- --deploy` (no Supabase secret key and no Gemini key in the
bundle, D-038). Build from a checkout whose `.env*` files hold only public values.

## Local team accounts

`npm run seed` creates two accounts on the **local** database only (`scripts/dev-accounts.ts`): `team@thriftesque.test` (on the
team) and `stranger@thriftesque.test` (signed in but not on the team). The seed refuses any host other than localhost.

## Supabase Auth settings (production)

- Authentication > Providers > Email: **enabled** (team members sign in with it).
- Authentication > Sign In / Up: **Allow new users to sign up: off**. Confirm email: on.
- Don't turn the Email provider off to stop signups: that also blocks sign-in. Locally, `[auth] enable_signup = false` blocks
  signups and `[auth.email] enable_signup` stays `true` (found in Phase 5).

## Adding a team member (production)

1. Supabase dashboard > Authentication > Users > Add user. Enter their email and a password, and tick auto-confirm.
2. SQL editor:
   ```sql
   insert into public.team_members (user_id, name)
   select id, 'Their name' from auth.users where email = 'their@email';
   ```
3. Removing someone: delete them in Authentication > Users. Their `team_members` row is removed with them.

## Config and secrets

| Name | Where | Secret? | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | build env | no | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | build env | no (public by design, RLS protects data) | `sb_publishable_...` (D-024) |
| `SUPABASE_SECRET_KEY` | nowhere in the repo | **yes** | `sb_secret_...`. Never in `.env*` (OpenNext bakes those into the Worker, D-038). The local seed reads it from `supabase status` |
| `GEMINI_API_KEY` | Worker secret | **yes** | set with `wrangler versions secret put`, piped from stdin. May sit in `.env.local` for local previews only; deploy builds must pass `npm run check:build-secrets -- --deploy` |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | Worker vars | no | `gemini-3.8-flash` / `gemini-3.5-flash-lite` |
| `NEXT_PUBLIC_SITE_URL` | build env | no | used for OG URLs |
