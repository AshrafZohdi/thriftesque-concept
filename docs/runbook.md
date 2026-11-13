# Runbook

Filled in as each phase lands. Commands marked *(Phase N)* don't exist yet.

## Branches

| Branch | What deploys from it |
| --- | --- |
| `main` | The concept mockup (`index.html`) on Vercel, the client demo. Becomes production at launch |
| `dev` | The production app until launch. Nothing deploys automatically; deploys are manual (`npm run deploy`) |

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
| Full gate | `caffeinate -dim npm run gate` (needs local Supabase running; the gate re-seeds, builds, and runs e2e). On battery the Mac can still sleep: plug in or keep the lid open |
| Real Gemini e2e (uses free quota) | `E2E_AI=1 npx playwright test --project=team-writes --no-deps -g "AI"` with the preview running, then `npm run seed` |
| Regenerate Cloudflare binding types | `npm run cf-typegen` (after editing `wrangler.jsonc`) |
| Smoke test (read-only) | `npm run smoke` (the running preview) or `npm run smoke -- https://<domain>` |
| Run the keep-alive cron on the preview | `curl -X POST "http://localhost:8787/cdn-cgi/local/explorer/api/local/scheduled?worker=thriftesque"` |
| Local Supabase | `npx supabase start` (Docker running). API on :55321, Studio on :55323 (D-025). Stop with `npx supabase stop` |
| Write `.env.local` for local Supabase | `npm run env:local` (keys go to the file, never the terminal) |
| Reset local DB and re-apply migrations | `npm run db:reset`, then `npm run seed` |
| Seed sample products and photos | `npm run seed` (local only, refuses other hosts) |
| Database tests (RLS, codes, triggers) | `npm run db:test` |
| Regenerate DB types | `npm run db:types` (after changing a migration) |

Deploying is `npm run deploy -- <target>`. See "Deploy and roll back" below.

## Cloudflare bindings (`wrangler.jsonc`)

| Binding | Type | Purpose |
| --- | --- | --- |
| `ASSETS` | Workers Assets | static files from `.open-next/assets` |
| `WORKER_SELF_REFERENCE` | service | OpenNext revalidation. Must match the Worker name `thriftesque` |
| `NEXT_INC_CACHE_KV` | KV | page cache (D-005). ID added in Phase 9 |
| `NEXT_TAG_CACHE_D1` | D1 `thriftesque-tag-cache` | revalidation records (D-021). ID added in Phase 9 |

## Deploy and roll back

Rehearsed on 2026-11-13 on a throwaway Worker (`thriftesque-rehearsal`, Nuvai's Cloudflare account) against a throwaway Supabase
project: two deploys, a cron run seen in the live logs, a rollback, then everything deleted (progress log, Phase 8).

**Deploys are manual, from this machine, one commit at a time.** Nothing deploys on push.

### Deploy

```
npx wrangler login                      # once per machine, as the client's Cloudflare account member
git switch main && git pull             # the branch that is live (main from launch)
npm run deploy -- production            # runs the full gate first; ~10 min
```

What `scripts/deploy.sh` does, in order (any failure stops it):
1. Refuses uncommitted changes. Reads the target's public config from `env.<target>.vars` in `wrangler.jsonc`.
2. Runs `npm run gate` (skip only with `--skip-gate`, and only for a commit that just passed it).
3. Builds a clean copy of the commit (`git worktree` plus `npm ci`). Local env files are never in it, so local URLs and the
   Gemini key can't be baked in (D-038).
4. Checks the Worker size and runs `check:build-secrets --deploy` (https site and Supabase URLs, the live Supabase URL inside the
   bundle, no local URL, no secrets).
5. Notes the live version ID (the rollback target), deploys (this also uploads the prerendered cache to KV and creates the D1
   tag table if needed), and prints the new version ID with the commit.
6. Waits until the site answers with the new `x-worker-version`, then runs `npm run smoke -- <site>`.
7. If the smoke fails, rolls back to the noted version on its own and smokes again.

It ends with the rollback command for this deploy. Keep it in the deploy notes.

**First deploy on a new Cloudflare account:** open Workers & Pages in the dashboard once before deploying. Until then the
account has no workers.dev subdomain and Cloudflare refuses cron triggers (code 10063; hit on 2026-11-13, fixed with
`npx wrangler triggers deploy --env production`).

### Roll back

```
npx wrangler deployments status --env production          # what's live now
npx wrangler deployments list --env production            # earlier versions, newest last
npx wrangler rollback <version-id> --env production -m "<reason>" -y
curl -sI https://<domain>/robots.txt | grep -i x-worker-version   # must show <version-id>
npm run smoke -- https://<domain>
```

Rehearsal timing: the rollback command took 5 s and the old version was answering 7 s after it started. Roll back first,
investigate second. A rollback restores code and Worker config, not data: Supabase changes stay as they are.

### Secrets (don't trigger a deploy)

```
npx wrangler versions secret put GEMINI_API_KEY --env production   # paste when asked; never as an argument
```

That makes a new version (the live code plus the secret) without deploying it. Make it live and check:

```
npx wrangler versions list --env production            # the newest one says: Updated secret "GEMINI_API_KEY"
npx wrangler versions deploy <version-id>@100% --env production -y --message "Add the Gemini key"
npm run smoke -- https://thriftesque.com               # "Worker version" must show <version-id>
```

`--message` must be spelled out here (`-m` is a usage error for this command). `wrangler secret put` (without `versions`)
deploys the latest uploaded version immediately, so don't use it. Done for production on 2026-11-13 (version `9fab1e83`).

### The production target (add in Phase 9)

Create the stores once on the client's account, then add this block under `"env"` in `wrangler.jsonc` with the real values:

```
npx wrangler kv namespace create thriftesque-cache
npx wrangler d1 create thriftesque-tag-cache
```

```jsonc
"production": {
  "vars": {
    "NEXT_PUBLIC_SITE_URL": "https://<domain>",
    "NEXT_PUBLIC_SUPABASE_URL": "https://<project-ref>.supabase.co",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
    "GEMINI_MODEL": "gemini-3.8-flash",
    "GEMINI_FALLBACK_MODEL": "gemini-3.5-flash-lite"
  },
  "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "thriftesque-production" }],
  "kv_namespaces": [{ "binding": "NEXT_INC_CACHE_KV", "id": "<kv id>" }],
  "d1_databases": [{ "binding": "NEXT_TAG_CACHE_D1", "database_name": "thriftesque-tag-cache", "database_id": "<d1 id>" }],
  "version_metadata": { "binding": "CF_VERSION_METADATA" },
  "triggers": { "crons": ["0 3 * * *"] },
  "routes": [{ "pattern": "<domain>", "custom_domain": true }]
}
```

The Worker is named `thriftesque-production` (wrangler adds the env name). The self-reference must match it.

### Watching it

- Worker logs (requests, errors, cron runs): Cloudflare dashboard > Workers > thriftesque-production > Logs, or
  `npx wrangler tail --env production --format pretty`.
- `gemini <model> <status>` lines are AI errors with Google's reason. `keep-alive: ok` should appear once a day.
- "Failed to set to cache" means the KV free write limit ran out for the day (D-041); "Failed to revalidate stale page" means
  a queue is needed after all (D-040).

## Preview mode and sample pieces (until launch, D-044)

| Task | Command |
| --- | --- |
| Put the 21 sample pieces in | `npm run demo -- load production <your team email>` (asks for your password, hidden) |
| Take them out again | `npm run demo -- remove production <your team email>` |
| Refresh the cached pages afterwards | deploy, or press Save settings in the dashboard |
| End preview mode | delete `NEXT_PUBLIC_SHOP_PREVIEW` from `env.production.vars`, commit, `npm run deploy -- production` |

The loader signs in as a team member, so your account must be in `team_members` first (see "Adding a team member").

## Backups (weekly, D-047)

The free Supabase plan keeps no downloadable backups, so:

```
npx supabase link --project-ref pexllnnfemgdutonpdqw   # once per machine; asks for the database password
npm run backup                                         # schema, data and photos into backups/<date>/
```

Copy the folder somewhere safe and private (it holds team sign-in records). To restore into a fresh project: push the
migrations, then load `data.sql` with `psql` and copy the photos back with `npx supabase storage cp -r`.

## Shop details on the terms and privacy pages (D-046, D-048)

The team fills them in on the dashboard (Shop settings > Terms and privacy details). Empty ones are left off the pages.
`npm run deploy` lists any that are empty (a note, not a blocker), and fails if it can't read them at all (migration not
pushed yet).
To check by hand: `NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... node scripts/check-facts.ts`.
Change `LEGAL_UPDATED` in `lib/shop-facts.ts` when the fixed wording of `app/terms` or `app/privacy` changes.

## Database changes (migrations)

Push the migration before deploying code that needs it, and keep migrations additive so the live site works in between:

```
npx supabase db push        # linked to production; lists the new migrations and asks to confirm
npm run deploy -- production
```

## Share card

After a design change, run `node scripts/make-og-image.mjs` to remake `public/og.jpg` (needs the internet for the fonts while it
runs), check the image, commit it.

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
| `NEXT_PUBLIC_SUPABASE_URL` | `env.production.vars` in `wrangler.jsonc` (local: `.env.local`) | no | Exported into the build by the deploy script, and a Worker var |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same as above | no (public by design, RLS protects data) | `sb_publishable_...` (D-024). Also used by the keep-alive cron |
| `SUPABASE_SECRET_KEY` | nowhere in the repo | **yes** | `sb_secret_...`. Never in `.env*` (OpenNext bakes those into the Worker, D-038). The local seed reads it from `supabase status` |
| `GEMINI_API_KEY` | Worker secret | **yes** | `wrangler versions secret put GEMINI_API_KEY --env production` (pasted at the prompt). May sit in `.env.local` for local previews only; the deploy build refuses it |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | `env.production.vars` | no | `gemini-3.8-flash` / `gemini-3.5-flash-lite` |
| `NEXT_PUBLIC_SITE_URL` | `env.production.vars` | no | Open Graph URLs, robots.txt, sitemap. The deploy check refuses http or localhost |
