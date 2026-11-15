# Progress log

Newest first.

## 2026-11-16: Sale prices, sections, About photos (D-060)

**Built, not deployed yet.** Needs migration `20261116010000` pushed first (`npx supabase db push`).

**Found and fixed while testing**
- "% off" said 19% for 320 down from 400 (floating point); now whole-number maths, with a unit test that fails on the old
  formula.
- The Sections panel lost its "Saved" message because the dashboard reload remounted it; it now keeps its own list.
- The new price field's label contained "Price (QAR)", which made the existing editor test ambiguous; renamed to "Price
  before the sale (QAR)".

**Verified**
- Typecheck, lint, tokens, 130 unit, 73 database tests. E2E on the Worker preview: the read-only suite in Chromium, Firefox,
  WebKit, a 360 px phone and iPhone (230 passed; one existing Firefox test timed out under load and passed 3 of 3 when
  re-run alone), then all 13 team-write tests.
- Screenshots at 360 px (shop chips and cards, product page, Sections panel, editor, About photos) and 1280 px (About).

## 2026-11-16: About page, cut-outs to redo

**Built, not deployed yet**: an About page the team edits on the dashboard (D-059). The production database needs the
migration first (`npx supabase db push`); the deploy refuses until then (D-052).

**Found and fixed**: the About page's "Browse the shop" button had ink text on an ink background (the text-link colour won);
an e2e check now compares its text and background colours.

**Verified**
- Typecheck, lint, tokens, 121 unit, 62 database tests. E2E on the Worker preview: 222 in Chromium and iPhone (the full
  read-only suite plus the team writes), then the About checks again in Chromium, WebKit and a 360 px phone after the fix.
- Screenshots of the page at 360 px and the dashboard field at 390 px.

**Cut-outs**: TQ-0023 and TQ-0026 have the bad automatic cut-outs again (made from the dashboard after D-054's removal).
TQ-0001 and TQ-0011 have none. Their cover photos (720x900, the largest stored) are in `backups/cutouts-to-redo/`
(git-ignored). TQ-0018 sold, so it was dropped from the folder.

## 2026-11-13: Phase 9 (part 2), standards, editable shop details, bulk add

**Live** (version `841819bc`, commit `a301165`): terms and privacy pages, structured data, share card, manifest and icons,
error pages, editable shop details on the dashboard (D-048, D-050), "Made with Nuvai" (D-049), bulk add (D-051), and the
deploy's database check (D-052). Still in preview mode with the sample pieces.

**Found and fixed**
- The scrolling strips left a gap on wide screens (two copies per loop); now five, with a 4K e2e test (fails on the old code).
- The AI client gave up when the main model timed out; timeouts and 5xx now go to the fallback.
- A deploy rolled itself back because this Mac's DNS cache still said the new domain didn't exist; the smoke now resolves
  through Cloudflare's public DNS.
- `http://thriftesque.com` served the page instead of redirecting; the Worker now redirects http and www.
- Twice a deploy needed a migration pushed first; the deploy now refuses while the database is behind (D-052).
- Several e2e checks were timing-sensitive with five browsers on one local Supabase (sign-in, sign-out, looks loading,
  Firefox axe scans); they got the same realistic waits as the other auth checks, not retries.

**Verified**
- Gate green: 104 unit, 57 database, 216 e2e. Smoke against production: all ok.
- No shopper cookies on the live site; LCP 1.61 s home, 1.24 s product on a slow phone profile.

**Not verified**
- AI suggestions on the live site seen succeeding in the Worker logs (Ashraf reported "perfect"; the log stream showed no
  call at the time).
- Bulk add on the live site with real photos (covered by e2e locally).

**Owner actions**
- Client: WhatsApp number, delivery areas and fees, the terms and privacy details, first real pieces, team emails, logo,
  and their own review of the terms and privacy pages. Then: remove the samples and turn preview mode off.

## 2026-11-13: Phase 9 (part 1), thriftesque.com live in preview

**Done**
- Accounts (D-043): the client's Gmail holds the domain, Cloudflare (Ashraf a Super Administrator) and Supabase. The Gemini
  key stays on Ashraf's account.
- Supabase moved to Mumbai before any data went in (D-045): 658 ms to first byte from Qatar in Sydney, against about 60 ms to
  Mumbai. Set up in Ashraf's browser: project, signups off, Site URL, the `admin@thriftesque.com` login on the team. Sydney
  project deleted.
- Preview mode (D-044): the 21 sample pieces loaded with `npm run demo`, a "Preview" strip on every page, noindex, robots.txt
  disallows everything, no WhatsApp number.
- Production target in `wrangler.jsonc` (client's account, KV and D1 there, cron, thriftesque.com and www as custom domains).
  www redirects to the bare domain from `worker.ts`.
- Deployed version `9403b0d4` of commit `e2884a5`.

**Went wrong, and fixed**
- The first production deploy run exported the production values before the gate, so the gate's local build and e2e talked to
  production Supabase. Sign-ins failed (the local test accounts don't exist there), I stopped the run, and nothing was written
  (checked: still 21 products, 4 looks, same settings) or deployed. The values are now exported after the gate, and the gate
  ignores `NEXT_PUBLIC_` and `GEMINI_` shell variables.
- The second run deployed the code and the domains, then failed on the cron: the client's account had no workers.dev
  subdomain yet. The script stopped before its own smoke test while the new code was live. I smoked it by hand (all ok),
  opened the Workers page once, and set the cron with `wrangler triggers deploy`. The script now smokes, and rolls back if
  needed, even when the deploy step reports an error.
- Auto mode blocked me from reading the Supabase CLI's stored login to create the project through the API. Done through the
  dashboard in the browser instead.

**Verified**
- Gate green before the deploy (87 unit, 43 database, 194 e2e).
- Smoke against https://thriftesque.com: all ok, including the www redirect, the 404s, the headers and the AI route
  refusals. robots.txt is `Disallow: /` and pages carry `noindex, nofollow`.
- Production signups refused (`signup_disabled`).

**After going live**
- `http://thriftesque.com` served the page instead of redirecting: the Worker now redirects http and www to
  `https://thriftesque.com`; production has no workers.dev or preview URL.
- Ashraf's network couldn't resolve the domain for about 15 minutes: his router had cached "no address" from before the
  records existed (Cloudflare's negative-cache time is 30 minutes). Every public resolver had it; nothing to fix.
- Suggest looks on the live dashboard said "The AI didn't answer in time": a timeout on the main model returned an error
  without trying the fallback. Timeouts, network errors and 5xx now go to the fallback, and the main model gets half the time.
- The scrolling strips showed an empty gap before restarting on screens wider than one copy (strip 771 px, band 1,184 px).
  Each half now holds 5 copies, evenly spaced, at the same speed; an e2e test at 3840 px fails on the old code and passes now.
- The deploy for the AI fix rolled itself back: this Mac's DNS cache still said the new domain didn't exist, so the smoke
  couldn't reach the site. The site was fine and the previous version kept serving. The deploy's smoke now resolves through
  Cloudflare's public DNS.
- Open: one Firefox e2e run lost the name typed into the bag ("Your name" empty after `fill`). Seen once in about ten runs;
  cause not found yet. Watch for it.

**Not verified yet**
- The cron's first run (06:00 Doha tomorrow): check the Worker's logs for `keep-alive: ok`.
- Signing in to the live dashboard and the Gemini key on the live site (the key isn't set yet).

**Owner actions**
- Set the Gemini key on the Worker (runbook, "Secrets").
- Real content: WhatsApp number, delivery areas and fees, team logins, first products (content inventory).

## 2026-11-13: Phase 8, hardening and ops

**Done**
- Keep-alive (D-015): `worker.ts` wraps OpenNext's handler and adds a daily cron (06:00 Doha) that reads one Supabase row.
- `robots.txt` (team pages and the API blocked) and `sitemap.xml` (home plus pieces for sale), refreshed on every dashboard save.
- Malformed product codes 404 before any database read (D-041).
- Headers: added `X-Frame-Options: DENY` and `Cross-Origin-Opener-Policy: same-origin`. Every response carries
  `x-worker-version`.
- `npm run smoke -- <url>`: 21 read-only checks (pages, 404s, robots, sitemap, OG tags, headers, AI route refusals).
- `npm run deploy -- <target>`: gate, clean build, deploy checks, deploy, smoke, automatic rollback (D-042). Runbook has
  deploy, rollback, secrets, the production block to add, and what to watch in the logs.
- `.env.example` no longer suggests putting the Supabase secret key in an env file.

**Rehearsal (throwaway Worker and Supabase project on Nuvai's accounts, all deleted afterwards)**
- Deploy 1 from a clean build: deploy checks passed, smoke all ok against real Cloudflare and Supabase.
- Cron seen in the live logs: `*/5 * * * *`, outcome ok, `keep-alive: ok`.
- Deploy 2, then `wrangler rollback` to version 1: the command took 5 s and version 1 was answering 7 s after it started
  (checked with `x-worker-version`), smoke all ok.
- Deleted the Worker, KV and D1 (URL returns 404) and unlinked the Supabase CLI. The rehearsal Supabase project is still in
  Ashraf's Supabase account.

**Found and fixed**
- Every made-up product URL ran a full shop query and used one of KV's 1,000 free daily writes (D-041).
- Checked the "Dummy queue" errors: leftovers from local runs, not a production problem (D-040).
- Deploy script, found by the rehearsal: Turbopack won't build with a linked `node_modules` (now `npm ci`); a first deploy has
  no live version, which `pipefail` treated as fatal; OpenNext doesn't forward wrangler flags.
- A new e2e test flaked once in Firefox (dashboard still checking the sign-in after 5 s with five browsers on one local
  Supabase). Post-sign-in waits are now 15 s.

**Verified**
- Gate green: 83 unit, 43 database, 194 e2e (2 opt-in AI tests skipped). Worker 1,652 KiB gzip (budget 2,560).
- Phone profile (390 px, slow 4G, 4x slower CPU, median of 5): LCP 1.60 s on `/`, 1.18 s on a product page (budget 2.5 s),
  CLS 0. Shop JS 147 KB gzip (budget 200).
- Keep-alive on the local preview (Supabase gateway logged the read) and on Cloudflare (above).

**Not verified**
- Lighthouse itself isn't installed (it would be a new dependency); budgets were measured with Playwright and Chrome's
  throttling, as in Phase 4.
- The automatic rollback branch of the deploy script didn't fire (both deploys passed). It runs the same `wrangler rollback`
  command that was rehearsed by hand.
- INP not measured.

**Owner actions**
- Delete the `thriftesque-rehearsal` Supabase project (Project Settings > General > Delete project).

**Next**
- Phase 9: needs the client's Supabase, Cloudflare and AI Studio accounts, the domain, and content (`content-inventory.md`).

## 2026-11-13: Phase 7, AI autofill and AI looks

**Done**
- "Fill from photo" in the product editor: `POST /api/autofill` sends the cover photo and a fixed prompt to Gemini and fills
  name, category, era, colour, description and styling tip. Price, size, condition and measurements stay with the team, and
  nothing is saved until they press Save.
- Looks panel on the dashboard: "Suggest looks" sends live pieces with cut-outs (product facts only), keeps answers that pass
  the outfit rules and saves them as AI drafts. Publish, unpublish and two-tap delete. The shop labels them "AI pick".
- Gemini over plain `fetch` (D-039), no new dependency. Falls back to Flash-Lite on 429 or 503. Errors are logged on the server
  with Google's message and timing; the team sees plain messages.
- The local seed now resets every look, including AI drafts made while testing.

**Found and fixed**
- Security (D-038): OpenNext bakes every variable in the project's env files into the Worker bundle, so the Supabase secret key
  in `.env.local` would have shipped on a deploy. Nothing was deployed. The seed now reads the key from `supabase status`,
  `env:local` no longer writes it, Ashraf removed the line, and a new gate step fails the build if it comes back.
- Google returned "high demand" 503s for `gemini-3.8-flash` on every call during testing (one after 18 s). The client only fell
  back on 429, so the button failed. It now falls back on 503 too.
- Flash's default thinking level made calls slow. The main model now asks for `low` (it refuses `minimal`, despite the docs
  page); the fallback keeps its `minimal` default. Fallback answers came back in 1.5 to 1.8 s.
- A real-Gemini test caught that a dress-only look (1 piece) passed my validator but broke the `looks` table's 2 to 4 piece
  check, which failed the whole insert. The validator now matches the table, and the prompt asks for shoes with a dress.
- A first e2e run took 3.1 hours with 63 failures because the Mac slept on battery in 15-minute stretches. Not a code problem;
  the run was thrown away.

**Verified**
- `npm run gate` green: 81 unit, 43 database, 189 e2e (2 opt-in AI tests skipped), Worker 1,578 KiB gzip (was 1,491), build
  secrets check ok.
- Real Gemini, `E2E_AI=1`, both pass: Fill from photo on the striped tee filled the form (category Tops, no em dashes, price and
  size left empty); Suggest looks saved drafts, and the published one ("Yellow pinafore style": TQ-0715 dress with TQ-0721
  Chelsea boots) shows in the shop with the AI label.
- Route security in all 5 browser projects: 405 on GET, 403 without or with a foreign origin, 413 over 1 KB, 400 for a bad body
  or a path outside our bucket, 401 signed out, 403 not on the team, 404 for a missing photo.

**Not verified**
- `gemini-3.8-flash` never answered successfully (503 every time), so its output quality and the `low` thinking setting are
  only checked against the API's validation, not a real answer.
- No phone check of the new panel and button beyond the 360 and 390 e2e projects.

**Next**
- Phase 8: keep-alive cron, robots and sitemap, CSP final pass, deploy and a rehearsed rollback.

## 2026-11-12: Phase 6, product editor

**Done**
- Editor drawer on the dashboard: "+ Add product" and "Edit" per row. React Hook Form with one Zod schema shared with the save
  action. Measurement fields follow the category, plus colour, description and styling tip. Errors in plain words, linked to
  their fields.
- Photos: up to 4, cropped to 4:5, resized to 720x900 and stepped down to 80 KB or less in the browser (JPEG fallback where WebP
  can't be encoded). Uploaded with the team member's session. "Make cover" and remove. Uploads from a cancelled edit (Cancel,
  Escape or the scrim) are deleted.
- Cut-outs (D-036): "Make cut-out from cover" runs ormbg in a Web Worker in the browser, and "Upload your own cut-out" takes the
  phone's "lift subject" result. Preview on the sky background.
- `saveProduct` action: validates, checks the team, inserts (next TQ code) or updates, deletes photos taken out, refreshes the
  shop pages.
- Dependencies approved and added (D-037). Dashboard-only CSP for the model download.

**Found and fixed**
- Licences: the obvious background-removal library is AGPL and several popular models are non-commercial. Picked an
  Apache-2.0 model after testing quality on all 21 sample photos (D-036).
- The bundler already emits ONNX Runtime's CPU file, so my extra `public/ort` copy was a 14 MB duplicate. Removed.
- The local seed didn't remove products added by tests, so a product created by the editor test broke the next run's stats.
  The seed now resets exactly (local only).
- React lint: refs read during render, and `watch()` (switched to `useWatch`).

**Verified**
- `caffeinate -i npm run gate` green: 67 unit, 43 database, 168 e2e. New e2e: an empty save lists what's missing; adding a
  product uploads a real photo, read back from storage as WebP, 720x900, 80 KB or less; your own cut-out; the new piece shows on
  `/p/TQ-0722`, in the bag and in the builder; editing a price reaches the shop; and the real in-browser model run makes a new
  cut-out (14 s, including the model download).
- Worker 1,491 KiB gzip (budget 2,560). The 14 MB runtime file is a static asset, under the 25 MiB per-file limit.

**Not verified:** cut-out speed on a real phone. Safari's WebP encoding fallback (the code handles it; not exercised in WebKit
e2e, where the cut-out tests run in Chromium).

**Next:** Phase 7: AI "Fill from photo" and "Suggest looks" (needs a Gemini key for local testing, N-2).

## 2026-11-12: Phase 5, team sign-in and dashboard

**Done**
- `/login` (email and password, plain error messages) and `/dashboard` (static shell, data loaded with the team member's session,
  `noindex` on both). Not on the team: a clear message. Signed out: back to sign-in.
- Dashboard in the F style: stats (live, sold, sales, live stock value, average days to sell), search, status tabs with counts,
  inline status select, two-tap delete (no `confirm()`), and shop settings (WhatsApp number, drop name, delivery areas and fees).
- Server actions `setStatus`, `deleteProduct` (removes its photos too) and `saveSettings`. Each checks the session and team
  membership, validates input, writes under RLS, then refreshes the affected shop pages.
- Pure logic with unit tests: stats, search, settings validation (`lib/dashboard.ts`).
- Seed creates local-only team and non-team accounts. `npm run preview:stop` stops only this repo's preview processes.

**Found and fixed**
- Local Supabase had email sign-in switched off by the `[auth.email]` signup flag. Fixed. Signups are still refused
  (`signup_disabled`, checked by hand).
- Closing overlays were still exposed as dialogs during their exit animation.
- Two flaky e2e checks: axe ran mid-fade on the look sheet (Firefox, 360px), and a WebKit sign-out waited on the network. Fixed
  (wait for the dialog's animation, sign out this device and always navigate), then 40/40 repeats passed.
- My process handling: killing only workerd left 4 stale preview stacks running, and a broad `pkill -f workerd` also matched
  another project's servers (they were not killed). Now `npm run preview:stop`, scoped to this repo. The Mac also idle-slept
  twice mid-run, which looked like hung tests. Long runs now use `caffeinate`.

**Verified**
- `caffeinate -i npm run gate` green: audit, typecheck, lint, 62 unit, 43 database, Workers build, size, and 164 e2e: everything
  before plus dashboard sign-in, wrong password, non-team refusal, stats, search, tabs, noindex, sign out, and (data-changing, in
  Chromium) status change reaching the shop, two-tap delete with a 404 after, and settings validation with the new drop name on
  every page. Then the seed was restored.
- Worker 1,392 KiB gzip (budget 2,560).

**Not verified:** password reset by email (not built; accounts are reset by Nuvai in Supabase for now). Real phones.
**Needs Ashraf before Phase 6:** how cut-outs are made (D-027) and OK to add React Hook Form and Zod for the editor.

## 2026-11-12: Phase 4, bag, outfit builder and looks

**Done**
- `ShopProvider`: shared bag (localStorage through `useSyncExternalStore`, with a memory fallback when storage is blocked),
  product sheet, builder requests and toast. One `Overlay` component for the product sheet, look sheet and bag drawer.
- Bag drawer in the F style: receipt, remove, name, delivery or pickup, area and fee from settings, and Send order on WhatsApp
  with a hint for what's missing. Pieces that sold since are named and left out of the order.
- Add to bag on cards, in the sheet and on the product page. Sold and reserved pieces can't be added.
- Outfit builder (D-027): vertical cut-out stack, arrows and swipe, lock, Shuffle, Top + bottom or Dress, list and total, sticky
  Shuffle / Add outfit, Ask on WhatsApp, and "Build an outfit with this" from the sheet. Deterministic first outfit (newest
  pieces), so server and browser render the same thing.
- Looks (D-028): boards from published looks, a look sheet with Add look, Remix in the builder and Ask on WhatsApp. The AI label
  only shows for `source = 'ai'`.
- Pure logic with unit tests: `lib/order.ts` (fees, totals, the exact message), `lib/outfit.ts` (pools, modes, step, shuffle
  with locks, load, sanitise) and `lib/bag-store.ts` (parsing junk safely).

**Found and fixed**
- Overlay race: the sheet closing after the bag opened would have unlocked the page behind the bag. Counted overlays (D-034).
- Two WCAG 2.5.3 failures found by axe: the Bag button and the look cards had names that didn't contain their visible text.
- The receipt's bottom border was chopped into dashes by the zigzag mask, and Tailwind's base styles had removed the underline
  from "Ask about this outfit". Both fixed.
- The first-load JS budget was unrealistic for Next 16. Corrected with measurements (D-033).

**Verified**
- `npm run gate` green: 56 unit, 43 database and 130 e2e tests (Chromium, Firefox, WebKit, 360px, 390px). The e2e covers add and
  remove, persistence across reload, the exact wa.me message for delivery and pickup, missing name or area, sheet to bag with
  focus and lock, sold pieces, the product page bag, builder arrows, lock, Shuffle, keyboard focus, dress mode, swipe, Add
  outfit, the sheet shortcut, the four team looks without an AI label, Add look, Remix, and axe on the bag and a look sheet.
- Mutation check: removing the overlay counter made the sheet-to-bag test fail. Restored.
- Worker 1,179 KiB gzip. Shop JS 185 KB gzip (our code about 25 KB). LCP median 1.6 s on `/` and 1.2 s on a product page under
  slow 4G with a 4x slower CPU, CLS 0.

**Not verified:** real phones and a real finger swipe. WhatsApp actually opening (links checked, not opened).

**Next:** Phase 5: team sign-in and the dashboard.

## 2026-11-12: Phase 3, shop in the F design

**Done**
- Client chose option F (D-029). F palette, Anton, Space Mono and Instrument Sans self-hosted, chrome heart and star as SVG
  symbols.
- Migration 2: `products.cutout` and a `looks` table with RLS (11 new pgTAP tests). Seed uploads the 21 cut-outs and 4 sample
  looks marked `source = 'team'`.
- Shop page: lime ticker, framed header, sky hero with the newest live cut-out, black band, the drop (chips, Hide sold, framed
  cards, sold and reserved states), how to order, footer. Data read with the publishable key, so RLS applies.
- Product sheet over the grid: shareable `/p/<code>` URL, Back and Escape close it, focus returns to the card, the page behind is
  inert, and it's unmounted after closing.
- `/p/[code]` page rendered on first visit and cached, with Open Graph and Twitter tags (photo, name, price, sold or reserved).
  Unknown and malformed codes are 404. A 404 page in the F style.
- Pure shop logic in `lib/shop-model.ts` and `lib/wa.ts` (15 new unit tests).

**Found and fixed**
- The Turbopack CSS rule from the scaffold stripped every CSS Module class, so the first build rendered unstyled. Scoped to
  `globals.css` (D-031).
- `global_fetch_strictly_public` blocked the Worker from reaching local Supabase. Dropped (D-030).
- The footer's Team dashboard link was being prefetched on every visit (and `/login` doesn't exist until Phase 5). Now a plain
  link.
- Sold cards faded their text to 60% opacity, which failed contrast (2.85:1). Now the photo greys out, the price chip is plain and
  struck through, and text keeps full contrast.
- I wrote a convoluted parameter type in `toShopProduct` at first. Replaced it with a plain `Pick`.

**Verified**
- `npm run gate` green: audit (no high), typecheck, lint, tokens, 39 unit tests, 43 database tests, Workers build, size, and 60
  e2e tests on the workerd preview (Chromium, Firefox, WebKit, 360px Android, 390px iPhone). The e2e covers filters, Hide sold,
  sheet open and close by Escape, Close and Back, focus return, inert background, deep link with OG tags, sold state, 404s, axe on
  `/`, a product page and the open sheet, and no horizontal scroll.
- Mutation check: disabling the Back handler made the Back test fail. Restored.
- Worker: 1,169 KiB gzip (Supabase client added about 190 KiB). Budget 2,560 KiB.
- Screenshots at 390 (WebKit) and 1280 (Chromium) reviewed against the F mockup.

**Not verified:** the reserved state in e2e (no reserved piece in the seed; unit and RLS tests cover the data side). Hidden
products in e2e (RLS tests cover them). Real phones. Link previews inside real WhatsApp and TikTok (needs a public URL).
**Waived:** two moderate build-time advisories (D-032), with a trigger to revisit.

**Next:** Phase 4: bag and WhatsApp order, outfit builder, looks.

## 2026-11-12: Option F, Sky with AI looks

**Done**
- Option F (`design/options/f-sky.html`), after the Collusion concept on Dribbble: sky backdrop with soft clouds, an original
  chrome heart and star (SVG gradients), neon lime, Anton headlines, Space Mono labels and thin black frame lines.
- AI looks section (D-028): 4 sample moodboards built from the cut-outs, with price tags. A look sheet offers Add look to bag,
  Remix in the outfit builder and Ask on WhatsApp. Labelled on the page as hand-picked samples.
- The outfit builder from E, themed for F. Looks and builder live in the shared code, so any option can use them.
- ShopLook was behind a bot check on the first visit, which I didn't try to get around. Its public example images were enough.

**Verified:** looks suite at 390 (WebKit) and 1280 (Chromium): 4 looks render, the sheet lists the pieces, remix loads the exact
3 codes locked, a dress look switches the builder to dress mode, and the 2-piece look adds 2 items to the bag. The builder suite
passes on both E and F at 390, 360 and 1280. No errors and no horizontal scroll.
**Fixed:** an invented "Spring 2026" label (now "Drop 07"), the chrome heart covering pieces on the boards, and an empty header
cell on phones.
**Needs the client:** Q-4 (design), Q-5 (builder), Q-6 (AI looks).

## 2026-11-12: Outfit builder, vertical cut-out version

**Done**
- Reworked option E to Ashraf's idea: a vertical stack of background-free pieces with arrows beside each, plus swipe, lock,
  Shuffle, Top + bottom or Dress, a list with sizes and total, and Add outfit / Ask on WhatsApp. Looked at existing examples
  first (Fits, Top & Bottom, Aurendi, Whering, Head to Toe).
- Cut out all 21 sample photos on this Mac with the built-in Vision framework (a small Swift script in the scratchpad, nothing
  installed). Saved as transparent WebP in `design/img/cutouts/` (942 KB total, about 45 KB each).

**Found and fixed**
- Each piece's box was taller than its row, so it spilled into the next row. Tapping the shoes opened the jeans, and swipes
  near a row edge sometimes moved the wrong piece (1 failure in the first full runs). Pieces are now pinned inside their rows and
  only the visible piece takes taps: 30/30 swipes in Chromium and WebKit afterwards.
- The shoes sat under the sticky Shuffle / Add bar on the first phone screen. Tightened the stack: the whole outfit and the bar
  now fit (390px: shoes end at 521px, bar starts at 536px).

**Verified:** the builder suite passed 4 times at 390 (WebKit), 360 and 1280 (Chromium): arrows, swipe, tap after swipe, lock
across 6 shuffles, focus kept, dress mode, whole outfit to bag, no sold or reserved pieces, sheet shortcut, no horizontal scroll.
All five options re-checked with no errors.
**Not verified:** a real finger swipe on a real phone (tested with simulated pointer drags).
**Needs Ashraf:** how cut-outs are made in production (D-027). Decide by Phase 6.

## 2026-11-12: Option E, outfit builder

**Done**
- Outfit builder in the shared mockup code, shown on option E (D's look). Arrows per slot, lock and Shuffle, Top + bottom or
  Dress, a sticky Shuffle / Add bar with the outfit total, Add whole outfit to bag, Ask on WhatsApp, and a shortcut from the
  product sheet. Option E is added to the switcher on every page and to `index.html`.

**Verified** (Playwright at 390 WebKit, 360 Chromium and 1280 Chromium)
- Arrows change the piece. A locked piece survives 6 shuffles while unlocked slots change. Keyboard focus stays on the control
  after Enter. Dress mode swaps the slots. The whole outfit lands in the bag. Sold and reserved pieces never appear. The sheet
  shortcut places and locks the piece. The Add bar is on the first screen and its label fits on one line. No horizontal scroll.
- All five options re-run: no script errors, no overflow.

**Fixed along the way:** tall tiles pushed the buttons below the fold on phones (now square tiles plus a sticky bar), the switcher
wrapped to two rows, and the Add label wrapped at 360px (Shuffle is icon-only under 380px, with its label kept for screen readers).

**Needs the client:** Q-4 (design) and Q-5 (include the builder).

## 2026-11-12: Design options

**Done**
- Four working design options in `design/options/`, based on the client's three references, plus `index.html` to compare them
  side by side in phone frames. Original designs: no logos, text or photos taken from the reference sites. The lace texture is
  an SVG pattern drawn for this.
- Shared `shared.js` and `shared.css` keep behaviour identical across options: category filter, Hide sold, product sheet,
  receipt bag, WhatsApp message, iOS-safe scroll lock, and live, reserved and sold states (TQ-0719 is shown as reserved to
  demonstrate it).

**Verified**
- Playwright on every option at 390 (WebKit), 360 (Chromium) and 1280 (Chromium): no script errors, no horizontal scroll, and
  add to bag, open sheet, open bag, fill name and area produce a wa.me link.
- Screenshots reviewed. Fixed along the way: section padding overriding page margins (A), unreadable hero text over photos (A),
  bag button scrolling away (A, C), a stray margin (B), uppercase script text (D).
- Contrast: body and soft text pass AA in all four. The WhatsApp green was 4.14:1 in A, B and D, now darkened to 4.97:1.

**Not verified:** real phones. Lighthouse (these are mockups and load Google Fonts from Google's servers; production self-hosts
fonts).

**Needs the client:** pick an option (Q-4).

## 2026-10-27: Phase 2, database

**Done**
- Supabase CLI 2.122 with a local stack on ports 553xx (D-025). Signups off and unused services disabled in `config.toml`.
- Migration `supabase/migrations/20261027000000_shop_schema.sql`: products, settings (single row), `team_members` allowlist (D-023),
  code sequence and formatter, `sold_at` and code-lock trigger, RLS on every table, photo bucket and storage policies.
- 32 pgTAP tests covering anon, signed-in non-team and team roles, code formatting, triggers and constraints.
- `npm run seed`: converts the 21 sample JPGs to 720x900 WebP with sharp, uploads them, upserts the products, sets the sample
  settings from the mockup (placeholders) and moves the code sequence. Next new code: TQ-0722.
- `npm run env:local` writes `.env.local` from `supabase status` without printing keys. `.env.example` uses the new key names
  (D-024).
- `lib/photo-spec.ts` (photo size rules and center-crop maths, 5 unit tests) and `lib/database.types.ts` (generated). A unit test
  keeps `STATUSES` in step with the database enum.

**Found and fixed**
- Using `lpad` alone for codes would have truncated TQ-10000 to TQ-1000, a collision. It's a formatting function now, tested at
  7, 722 and 10000.
- Write access needed only a sign-in. Now it also needs a `team_members` row (D-023).
- One sample photo couldn't reach 80 KB at quality 0.5. The floor is now 0.4, reviewed by eye (D-011).
- Two of my own test mistakes, caught on the first run: a wrong expected number in the crop test, and a database test that assumed
  an empty settings row. Both fixed. The database tests now pass on both an empty and a seeded database.

**Verified**
- `npm run db:test`: 32/32 on an empty DB and on a seeded DB.
- Mutation check: loosening the anon read policy and the team insert policy made 4 tests fail. Restored and re-verified.
- Through the real API as anon: sees 21 products and settings, the public photo URL returns 200 `image/webp`, bucket listing returns
  nothing, and update and upload are refused.
- The seed ran twice with no duplicates (still 21 products, next code TQ-0722).
- `npm run gate` green: 30 unit tests, 20 e2e, audit clean. Worker 975 KiB gzip (unchanged; the Supabase client isn't used by a
  route yet).

**Not verified:** the production Supabase project (doesn't exist yet). Storage limits on the hosted free plan.

**Next:** Phase 3 (shop).

## 2026-10-27: Phase 1, scaffold and gate

**Done**
- Next 16.4.3 app in the repo root (App Router, strict TS, Tailwind 4, Turbopack). The mockup, `index.html`, `design/` and the
  existing README are untouched. `index.html` isn't served by the app.
- OpenNext Cloudflare 1.20.13 and wrangler 4.154.0. `wrangler.jsonc` with KV page cache and D1 tag cache (D-005). No paid images
  binding.
- Design tokens from the mockup in `app/globals.css` (unchanged colours, D-017). The three fonts are self-hosted with `next/font`
  (D-018). A placeholder home page shows them.
- Security headers and CSP in `next.config.ts`. `X-Powered-By` removed.
- `lib/catalog.ts`: categories, eras, conditions, statuses, measurement keys, condition notes and product code helpers, with 24
  unit tests (including a check of all 21 seed products).
- Vitest, Playwright (Chromium, Firefox, WebKit, 360px Android, 390px iPhone), axe, a raw-colour check, a Worker size check and
  `npm run gate`.
- Favicon: the logo's pink dot on ink, replacing Next's default.

**Decisions made from findings** (details in `02-decisions.md`)
- D-020: no middleware or proxy. `proxy.ts` is Node-only in Next 16, and OpenNext's experimental support adds about 4 MB.
- D-021: Cache Components off. OpenNext has many open bugs with it. Classic ISR with `revalidatePath` instead.
- D-022: approved install scripts for `esbuild` and `workerd` only. Patched a high-severity `glob` advisory with an override.

**Verified**
- `npm run gate` green end to end: audit 0 vulnerabilities, typecheck, lint, tokens, 24 unit tests, Workers build, size, and 20 e2e
  tests on the workerd preview.
- Worker size baseline: **975 KiB gzip** (4.5 MiB raw). Budget 2,560 KiB, limit 3,072 KiB.
- Screenshots at 360 (Chromium), 390 (WebKit) and 1280 (Chromium) reviewed. Fonts render, type sizes switch at 860px, and nothing
  overflows.
- The token check fails on a raw colour (probe file added and removed).

**Not verified:** a real deploy (no Cloudflare account yet, Phase 9). Real devices. KV and D1 behaviour beyond local simulation.

**Next:** Phase 2 (database).
**Needs Ashraf:** N-1, start Docker Desktop. Local Supabase and the RLS tests need it.

## 2026-10-27: Phase 0, planning

**Done**
- Created the `dev` branch. `main` and `index.html` are untouched.
- Read the full mockup source, the seed data (21 products: 19 live, 2 sold) and `CLAUDE.md`.
- Checked current versions on npm. Next 16.4.3 fits the `@opennextjs/cloudflare` 1.20.13 peer range (`>=16.4.1`).
- Checked the OpenNext docs: Node middleware isn't supported yet (D-004). On-demand-only revalidation needs no queue. R2 + D1 is
  the recommended setup, but R2 needs a card on the account (D-005, Q-1).
- Confirmed the Gemini model IDs and free-tier data use on ai.google.dev (D-012).
- Ran a contrast check on the mockup palette. Five failing pairs, with proposed fixes (D-017, Q-2).
- Wrote the docs hub: brief, 19 decisions, architecture, design system, roadmap with acceptance criteria, QA plan, launch
  checklist, content inventory and runbook skeleton.

**Verified:** version numbers and peer ranges from `npm view`. Model IDs and free-tier terms from Google's docs pages. Contrast
ratios computed with the WCAG formula.
**Not verified:** Next 16 `proxy`/`middleware` runtime rules. These get checked in the installed docs during Phase 1.

**Next:** Phase 1 (scaffold and gate).
**Decided after review:** keep the mockup colours as is (D-017). Use Workers KV for the cache (D-005). Proposed defaults accepted.
**Needs Ashraf:** N-1 (start Docker) before Phase 2.
