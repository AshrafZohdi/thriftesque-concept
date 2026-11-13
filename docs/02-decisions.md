# Decisions

Each line is a decision with its reason. Status: **Decided**, **Proposed** (my default, overridable), or **Open** (needs an owner
answer). Newest decisions go at the bottom. Don't edit a decided entry; add a new one that supersedes it.

---

### D-001 Stack and versions. Decided, 2026-10-27
From `CLAUDE.md`. Versions checked on npm on 2026-10-27 and pinned to these lines:

| Package | Version | Note |
| --- | --- | --- |
| next | 16.4.x | `@opennextjs/cloudflare` peer range is `>=16.4.1` for Next 16 |
| @opennextjs/cloudflare | 1.20.x | |
| wrangler | 4.154.x | adapter needs `^4.148.0` |
| @supabase/ssr / @supabase/supabase-js | 0.12.x / 2.118.x | |
| react-hook-form / zod / @hookform/resolvers | 7.91 / 4.6 / 6.0 | dashboard only, never imported by shop code |
| @google/genai | 2.31.x | server only. If it pushes the Worker near the size limit, call the REST endpoint with `fetch` instead (see D-012) |
| tailwindcss | 4.3.x | |

Upgrades: patch releases freely, minors only after checking the adapter's peer range and running the full gate on the Workers preview.

### D-002 Production host is Cloudflare Workers. Decided
Vercel Hobby doesn't allow commercial use. The current Vercel deploy stays as the client demo only.

### D-003 Light theme only. Decided, 2026-10-27
The approved mockup is light only (`color-scheme: light`). A dark theme would be unapproved design work. Ashraf accepted this
on 2026-10-27. Tokens are set up so a dark theme can be added later.

### D-004 Session middleware on the Edge runtime, scoped to the dashboard. Superseded by D-020
OpenNext Cloudflare doesn't support Node middleware yet (checked in its docs on 2026-10-27). Next 16 renamed `middleware` to `proxy`
and changed the runtime rules. Before writing it, read the installed Next docs (`node_modules/next/dist/docs`) and pick whichever file
runs on Edge.
- It only runs on `/dashboard/*` and `/login`, so shop pages pay nothing.
- It only refreshes the Supabase session. Access control is also enforced in the dashboard layout (server-side `getUser()`) and
  by RLS. The middleware is not the security boundary.

### D-005 Caching: on-demand revalidation by tag. Decided, 2026-10-27: Workers KV
Ashraf chose KV (no card on the client's account, possible delay of about a minute). The options considered:
- Shop pages are cached and every dashboard save invalidates them. Phase 1 changed how: see D-021. No time-based
  revalidation, so no queue is needed.
- Tag cache: D1 (`d1NextTagCache`), which is OpenNext's recommendation for small sites. It's free on the Workers free plan.
- **Open: incremental cache storage.** See Q-1 in `content-inventory.md`.
  - **R2** (OpenNext's recommendation, strongly consistent). It needs a payment card on the Cloudflare account, even on the free tier.
  - **Workers KV**. No card needed, but it's eventually consistent, so another region can briefly show the old state. Most customers
    are in Qatar, and the team confirms every order by hand.
  - **Recommendation: KV.** It keeps the client account card-free, and a short delay is acceptable here because the bag also
    re-checks status (D-009). We can switch to R2 later with a config change.

### D-006 Product codes come from a Postgres sequence. Decided
`code` defaults to `'TQ-' || lpad(nextval('product_code_seq')::text, 4, '0')`. The seed inserts its own codes (TQ-0701 to
TQ-0721) and then sets the sequence so the next new product is TQ-0722. Codes are never reused after a delete.

### D-007 `sold_at` is set by a database trigger. Decided
When status changes to `sold`, `sold_at = now()`. When it changes away from `sold`, `sold_at = null`. Average days to sell is the
mean of `sold_at - created_at` over sold products. A trigger keeps it correct whoever makes the change (table dropdown, editor, SQL).

### D-008 How "reserved" looks. Proposed
The mockup has no reserved state, but `CLAUDE.md` adds one. Behaviour:
- Card: a "Reserved" label in the same style as "Sold", with a lighter photo treatment than sold. No add button.
- Sheet and product page: a disabled "Reserved" button. "Ask about this piece" stays, so people can still message about it.
- Sort order: live, then reserved, then sold. "Hide sold" hides sold only. Hero count and category counts include live only,
  as in the mockup.

### D-009 The bag stores codes only and re-checks on every render. Decided
localStorage holds `{codes, name, area, mode}`. Prices, names and status always come from current shop data. Codes that are no
longer live drop out of the bag, with a one-line notice ("1 piece in your bag was just sold or reserved"). The bag never sends
anything to our server. Name and area only go into the WhatsApp message.

### D-010 Delivery fees stored as an ordered list. Proposed
`settings.delivery_fees` is `[{ "area": "Al Sadd", "fee_qar": 15 }, ...]`, kept in display order for the area dropdown. The
"Delivery" option shows "from <lowest fee> QAR". Pickup is free. The mockup's areas and fees (15 QAR in Doha, 25 QAR outside)
are placeholders until the client confirms (content inventory C-2).

### D-011 Photos: up to 4 per product, resized in the browser. Proposed
- In the browser: center-crop to 4:5, resize to 720x900, encode as WebP. Start at quality 0.8 and step down to 0.4 until the
  file is 80 KB or less (target about 60 KB). The floor was 0.5 until Phase 2: one busy print in the samples (TQ-0714) was 82 KB at
  0.5 and 78 KB at 0.45, and looked clean at 0.4 on review. The 21 samples average 57 KB.
- Stored at `product-photos/<code>/<random>.webp`, served directly from Supabase Storage's public URL. No Next image
  optimisation.
- Up to 4 photos, with a "Make cover" control (first photo = cover). The product page shows a swipeable gallery built with CSS
  scroll-snap, no library. The limit of 4 caps storage and egress.
- The seed script converts the 21 sample JPGs to WebP the same way.

### D-012 Gemini model IDs. Decided, 2026-10-27
Checked on ai.google.dev on 2026-10-27: `gemini-3.8-flash` (default) and `gemini-3.5-flash-lite` (fallback on 429). Both are
free tier. The pricing page confirms free-tier content is used to improve Google products, so only the product photo and a fixed
prompt are sent, never customer data. The route handler requires a signed-in team member and returns structured JSON (response
schema). Ashraf re-checks the IDs in AI Studio when the key is created.

### D-013 Team sign-in: email and password, accounts created by Nuvai. Proposed
Public signups disabled. Nuvai creates each team member in the Supabase dashboard. No magic links: Supabase's built-in email is
heavily rate-limited on the free plan, so sign-in shouldn't depend on email. Password reset by email still works for the rare
case. One shared login is possible, but personal logins are recommended.

### D-014 Add a nullable `colour` column. Proposed
The AI returns a colour, but the data model has nowhere to keep it. Adding `colour text` (nullable) is one small change. It shows
as a "Colour" row in the product details. The alternative is folding colour into the name only.

### D-015 Daily keep-alive from a Cron Trigger. Decided, verified locally 2026-11-13
`worker.ts` is the Worker entry: it passes requests to OpenNext's handler and adds a `scheduled` handler. The cron (`0 3 * * *`,
06:00 in Doha) runs `lib/keep-alive.ts`, which reads one `settings` row with the publishable key. This stops the Supabase free
project pausing after 7 idle days. A failed read throws, so the run shows as failed in Cloudflare's logs.
- OpenNext doesn't load its env for scheduled events, so the handler takes the public Supabase URL and key from Worker vars,
  or else from the build's baked public env. No public endpoint is involved, so visitors can't trigger it.
- Verified on the workerd preview: the scheduled event returned `ok` and Supabase's gateway logged
  `GET /rest/v1/settings?select=id&limit=1 200`.

### D-016 Test tooling. Decided
Vitest for pure logic (message builder, fees, code formatting, zod schemas, image sizing maths). Playwright for e2e in Chromium,
Firefox and WebKit, plus 360px and 390px mobile emulation. `@axe-core/playwright` for accessibility. RLS tests are pgTAP via
`supabase test db` against a local Supabase. All of these are dev dependencies and never ship in the Worker.

### D-017 Keep the mockup palette as approved. Decided, 2026-10-27
Five colour pairs in the mockup measure below WCAG AA contrast (see `04-design-system.md`). Ashraf decided to keep the approved
colours unchanged. Consequence: some small text on pink and green buttons, and input borders, are harder to read for people with
low vision. Recorded as a waiver in the launch checklist. It can be revisited if the client supplies brand colours.

### D-018 Fonts are self-hosted with `next/font`. Proposed
The mockup loads Google Fonts from Google's CDN. `next/font/google` downloads them at build time and serves them from our own
origin, which means no third-party request (better for privacy), no layout shift with `size-adjust` fallbacks, and no
render-blocking CSS. Same three families: Bricolage Grotesque, Instrument Sans, Courier Prime.

### D-019 Local development uses local Supabase. Proposed
Supabase CLI (`npx supabase`) with Docker for local work and RLS tests. One hosted Supabase project for production, on the
client's account. Migrations live in `supabase/migrations/` and are applied to production with `supabase db push`.

### D-020 No middleware or proxy at all. Decided, 2026-10-27 (supersedes D-004)
Found in Phase 1:
- Next 16.4's bundled docs say `proxy.ts` always runs on Node.js, and its runtime can't be configured. `middleware.ts` (Edge)
  still works but is deprecated.
- OpenNext Cloudflare's `proxy.ts` support is experimental (PR #1357). Open issue #1373 reports that a no-op `proxy.ts` grows
  the Worker from about 356 KB to about 4.6 MB, more than the free plan's 3 MiB limit.

So the app uses neither. The dashboard works without one:
- `/dashboard` renders a client-side shell with no data in its HTML. The browser Supabase client holds the session, refreshes it
  itself, and sends anyone signed out to `/login`.
- Dashboard reads go through the browser client, so RLS decides what comes back.
- Writes and cache invalidation run in server actions, which check `getUser()` first. Server actions can set cookies, so a
  token refresh there is saved safely. Server components never refresh tokens, which avoids rotating a refresh token the browser
  still holds.

This removes a deprecated API, a Worker-size risk and a per-request cost. If middleware becomes necessary later, use Edge
`middleware.ts` scoped to `/dashboard` only.

### D-021 Cache Components off; classic ISR with `revalidatePath`. Decided, 2026-10-27
`create-next-app` 16.4 turns on `cacheComponents` and `partialPrefetching` by default. OpenNext Cloudflare has many open bugs with
Cache Components right now (#1458, #1464, #1450, #1369, #1349, #1225, #1130), including 500s, hung requests and hydration failures,
several reported this month. Both flags are off.
- Shop pages (`/`, `/p/[code]`) are static or ISR. Data is fetched at render time with the anon key.
- Dashboard saves call `revalidatePath('/')` and `revalidatePath('/p/<code>')` (plus every product path when settings change,
  through `revalidatePath('/', 'layout')`). The bundled Next guide recommends paths over tags for most cases. `revalidateTag(tag,
  'max')` would serve stale content once after a save.
- Revisit Cache Components once those OpenNext issues are closed.

### D-022 Dependency hygiene. Decided, 2026-10-27
- npm 11 runs install scripts only for approved packages. Approved, pinned: `esbuild@0.28.2` and `workerd@1.20261023.1` (both
  set up native binaries wrangler needs). Denied: `unrs-resolver` and `fsevents` (prebuilt binaries are already installed; their
  scripts are only fallbacks). Re-approve after upgrading either approved package.
- `npm audit` flagged GHSA-5j98-mcp5-4vw2 (glob CLI `-c` command injection) in `glob@10.3.3`, which
  `@opennextjs/aws` → `@node-minify/core` uses at build time. Fixed with an npm override to `glob@10.5.0` (same major, patched).
  Remove the override once `@node-minify/core` ships the fix itself.
- `@types/node` moved to v24 to match the Node 24 toolchain (vitest 5 needs v22 or later).

### D-023 Write access needs a `team_members` row, not just a sign-in. Decided, 2026-10-27
`CLAUDE.md` says authenticated users get full write access. If public signups were ever switched back on in the Supabase
dashboard, anyone could sign up and edit the shop. So every write policy (products, settings, photo bucket) checks
`public.is_team()`, which looks for the user in `public.team_members`. Adding a team member is two steps: create the user in
Supabase Auth, then add their row (`runbook.md`). The pgTAP suite covers a signed-in stranger being refused.

### D-024 Supabase publishable and secret keys. Decided, 2026-10-27
Supabase now issues `sb_publishable_...` and `sb_secret_...` keys, and the legacy anon and service-role JWT keys are being
phased out. Env names changed in `.env.example`: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. The secret key is
only used by local scripts. The seed refuses to run against any host other than localhost.

### D-025 Local Supabase uses ports 55320 to 55329. Decided, 2026-10-27
Another local Supabase project on Ashraf's machine (`nedaa-school-system`) already uses the default 543xx ports. This project's
`supabase/config.toml` uses 553xx, so both can run at once. API: http://127.0.0.1:55321. Studio: http://127.0.0.1:55323.

### D-026 Visual direction for production. Open, 2026-11-12
The client asked for a look closer to y2kdream.com, y2k-streetwear.com and laceandflareco.com. Four working options are in
`design/options/` (open `index.html`): A Street, B Electric, C Lace, D Mix. All four keep the same products, copy, receipt bag
and WhatsApp flow, so only the visual layer changes. The chosen option replaces the mockup tokens and supersedes D-017 and D-018
(the fonts change with it). Phase 3 (shop) waits on this choice.

### D-027 Outfit builder. Proposed, 2026-11-12 (revised the same day)
Ashraf's idea. A vertical stack of cut-out pieces (no backgrounds): Top over Bottom over Shoes, or Dress over Shoes. Arrows beside
each piece (or a sideways swipe) switch it. Lock keeps a piece while Shuffle changes the rest. The whole outfit goes to the bag, or
customers can ask about it on WhatsApp. Tapping a piece opens its details, and the product sheet has a "Build an outfit with this"
shortcut. Only live pieces are used. Similar patterns exist in Fits, Top & Bottom, Aurendi, Whering and the Head to Toe Shopify
app. Why: it turns single-piece visits into multi-piece orders, and Shuffle suits the TikTok audience.
- Mockup: option E (`design/options/e-outfit.html`), on option D's look. The code is shared, so it works with any option.
- The mockup's 21 cut-outs (`design/img/cutouts/`) were made locally with macOS Vision (built in, nothing installed, no
  upload). Two show leftovers from the source photos (a hand on the denim skirt, part of a rack beside the striped knit).
- **Open for production: how cut-outs get made.** (a) Remove the background in the browser when the team uploads a photo.
  Free, runs on their phone, but it needs a new dependency and a one-time model download. (b) The team uses the iPhone or Samsung
  built-in "lift subject" and uploads the cut-out as a second photo. No code, one extra step per piece. Either way the original
  photo stays for the product page. Decide in Phase 6 (dependency needs Ashraf's OK).
- Production cost: client-side only. Adds one cut-out image per product (about 45 KB). No new tables.
- Known limit: sizes can mix within an outfit (one-of-one stock). Each piece shows its size in the list.

### D-028 AI looks (moodboards). Proposed, 2026-11-12
Ashraf's idea, after ShopLook. Collage boards of 2 to 3 cut-out pieces that go together, each with a title and total. Customers
open a look to add the whole thing to the bag, ask about it on WhatsApp, or remix it in the outfit builder (D-027).
How AI is used, within `CLAUDE.md` ("generated once and stored, never at page view time", no customer chatbot, free tier only):
- In the dashboard, the team presses "Suggest looks". A route handler sends Gemini the live stock as text (code, name, category,
  colour, era, size; never customer data) and asks for JSON: `[{ title, note, codes[] }]` with fixed rules (one top and one
  bottom, or one dress, plus shoes).
- The server checks every code is live and the slot rules hold, and drops anything else. The looks are saved as drafts. The team
  approves, edits or deletes them. Shoppers only ever see saved, approved looks.
- A look hides itself as soon as any of its pieces isn't live, so a sold item never shows in a look.
- Needs a small `looks` table (id, title, note, product_codes text[], status draft or published, created_at) with the same RLS
  pattern as products. The board layout is drawn from the pieces' slots, not by AI. Cost: one Gemini call per "Suggest looks"
  press, nothing per visitor.
- Mockup: option F (`design/options/f-sky.html`). Its 4 looks were picked by hand and are labelled as samples on the page.
- Not doing: a live AI stylist that answers each shopper. It's against `CLAUDE.md`, would hit free-tier rate limits, and would
  send shopper input to Google.

### D-029 Design direction: option F (Sky), with the outfit builder and AI looks. Decided, 2026-11-12
The client chose option F (`design/options/f-sky.html`) with its features. This closes D-026 and accepts D-027 (outfit builder)
and D-028 (AI looks). It supersedes the approved mockup's look:
- **Palette (supersedes D-017):** ink `#0d0d0f`, background `#f4f7fb`, white surfaces, neon lime `#d6f84c`, sky `#8ecbff` to
  `#d9efff`, soft text `#4f5563`, WhatsApp green `#1a8048`. Every text pair passes WCAG AA, so the D-017 contrast waiver is no
  longer needed.
- **Fonts (D-018 still applies, self-hosted with `next/font`):** Anton (headlines), Space Mono (labels, receipt), Instrument Sans
  (body). Bricolage Grotesque and Courier Prime are dropped.
- **Copy:** the approved mockup copy carries over unchanged. Claims still marked "owner to confirm" stay that way (C-8).
- **Labels come from data:** the "AI picks" chip only shows on looks the AI actually suggested (`looks.source = 'ai'`). Sample
  looks in the local seed are `source = 'team'`.
- What's still open: how cut-outs are made in production (D-027), decided before Phase 6.

### D-030 Drop the `global_fetch_strictly_public` compatibility flag. Decided, 2026-11-12
OpenNext's scaffold added it. It blocks the Worker from fetching private addresses, which breaks rendering against local Supabase
(127.0.0.1) in the workerd preview. Production Supabase is public, so the flag protects nothing we use, and it isn't needed for
any OpenNext feature we rely on.

### D-031 Component styles in CSS Modules over the Tailwind tokens. Decided, 2026-11-12
Shop components port option F's CSS almost line for line into CSS Modules (`components/**/*.module.css`) that only use the
`@theme` tokens. Tailwind stays for the tokens and a few utilities (`wrap`, `mono`, `display`). Rewriting F as utility classes
would be slower and drift from the approved design. The raw-colour check covers the modules too.
Found in Phase 3: the scaffold's Turbopack rule sent every `*.css` file through the Tailwind loader as plain CSS, which silently
dropped all CSS Module class names (the page rendered unstyled). The rule now matches `globals.css` only.

### D-032 Two moderate build-time advisories waived for now. Decided, 2026-11-12
`npm audit --omit=dev` reports GHSA-3g3m-2fjr-6pw4 (`glob` up to 14.0.1) and GHSA-g3hv-75wg-m249 (`minimatch` below 11.0.1),
both pulled in by `@opennextjs/cloudflare` for its build step. They don't run in the Worker, and the patterns they see are ours,
not user input. npm's suggested fix is downgrading the adapter to 0.3.0. The newest adapter (1.20.17) still uses the affected
lines and needs Next 16.4.5. Forcing major-version overrides under the build tool risks breaking the build. The gate stays at
`--audit-level=high`, which these don't reach.
**Revisit when:** OpenNext ships `glob` 14.0.2+ and `minimatch` 11.0.1+, or before launch, whichever is first. Tracked in the
launch checklist.

### D-033 JavaScript budget corrected to match the stack. Decided, 2026-11-12
The Phase 0 budget of 150 KB gzip first-load JS was set before measuring Next 16. On `/`, React (70 KB) and the Next.js runtime
(about 87 KB) come to about 160 KB before any app code. Our own code is about 25 KB, for 185 KB in all. The budget is now
**our code 40 KB or less, total 200 KB or less**. What shoppers feel was measured directly instead: on a 360px phone with slow
4G (150 ms, 1.6 Mbps) and a 4x slower CPU, LCP has a median of 1.6 s on `/` and 1.2 s on a product page, with CLS 0. Both are
well under the 2.5 s budget.

### D-034 Overlays are counted, and accessible names include the visible text. Decided, 2026-11-12
- "Add to bag" in the product sheet opens the bag while the sheet is still closing. `useOverlay` counts open overlays, so only
  the last to close unlocks the page and returns focus (falling back to the Bag button when the opener has gone). An e2e test
  checks the page stays locked behind the bag, and failed when the counter was removed on purpose.
- WCAG 2.5.3 (label in name): the Bag button is named "Bag 2 pieces", not "Open your bag", and look cards are named by their
  visible title and total, so voice-control users can say what they see.

### D-035 Team sign-in details and how data-changing tests run. Decided, 2026-11-12
- Sign out is for this device only (`scope: "local"`), so a team member stays signed in on their other device. The page goes to
  sign-in even if the request fails.
- Supabase's email provider must stay on: in local config `[auth.email] enable_signup = false` turned off sign-in as well as
  signups. Signups are blocked by `[auth] enable_signup = false` (checked: a signup attempt returns `signup_disabled`). The
  production equivalent is in the runbook.
- E2E tests that change data (status, delete, settings) run once in Chromium after every read-only suite, then a teardown
  re-seeds. The gate also re-seeds before building, so every run starts from known data. Local-only team accounts come from
  `scripts/dev-accounts.ts`, so tests never read env files.
- Closing overlays are `inert` and `aria-hidden` while they animate out.

### D-036 Cut-outs: made automatically in the team's browser, with the phone as fallback. Decided, 2026-11-12
Ashraf chose automatic background removal in the browser (supersedes the open question in D-027).
- **Model:** `onnx-community/ormbg-ONNX`, int8 (44 MB, Apache-2.0), run with `onnxruntime-web` (MIT) in a Web Worker on the CPU.
  It downloads once from Hugging Face and is then cached by the browser. It never runs on our servers and never for shoppers.
- **Ruled out:** `@imgly/background-removal` (AGPL-3.0, would require publishing the site's source), BRIA RMBG 1.4 and 2.0
  (non-commercial licences), ISNet builds marked AGPL. BiRefNet-lite (MIT) ran out of memory on the CPU path (`bad_alloc`) and
  would need WebGPU, which not every team phone has. Transformers.js was skipped because it pulls in `onnxruntime-node`
  (307 MB with an install script); about 40 lines of our own pre- and post-processing replace it.
- **Quality, measured on the 21 sample photos:** clean on most pieces; weak on low-contrast ones (white heels on a light floor,
  the tweed coat) and on background enclosed by the garment (between jean legs). The mask is hardened (smoothstep 0.3 to 0.6),
  trimmed and saved as WebP with transparency (PNG where a browser can't encode WebP). Speed: about 4 s per photo on a desktop
  CPU; expect longer on phones.
- **Fallback:** the editor shows the cut-out on the sky background, and "Upload your own cut-out" takes the phone's built-in
  "lift subject" result. Photos on a plain, contrasting background make the automatic result much better.
- **Hosting:** the ONNX Runtime CPU file (14 MB) is emitted by the bundler into `/_next/static/media`, under Cloudflare's 25 MiB
  per-file limit. The WebGPU build (28 MB) isn't used. Only `/dashboard` widens the CSP (`connect-src` Hugging Face,
  `'wasm-unsafe-eval'`, `worker-src 'self' blob:`).

### D-037 Dependencies added for the editor. Decided, 2026-11-12
Approved by Ashraf: `react-hook-form` 7.92.0, `zod` 4.6.7, `@hookform/resolvers` 7.0.6 and `onnxruntime-web` 1.31.1, all MIT, all
pinned. They load only on the dashboard. `protobufjs`'s install script (a version notice) is denied. One schema
(`lib/product-schema.ts`) validates in the editor and again in the save action.

### D-038 Secrets stay out of the project's env files. Decided, 2026-11-12
**Found:** OpenNext copies every variable from the project's env files (`.env`, `.env.local`, ...) into
`.open-next/cloudflare/next-env.mjs`, which is bundled into the Worker. With `SUPABASE_SECRET_KEY` in `.env.local`, a deploy
from this machine would have shipped the key that bypasses every RLS rule. Nothing was deployed, so nothing leaked.
- `.env.local` holds only the Supabase URL and publishable key (`npm run env:local` writes exactly those) plus the local
  `GEMINI_API_KEY` for previews.
- The seed asks `supabase status` for the local secret key itself and refuses any non-local host.
- `scripts/check-build-secrets.mjs` runs in the gate after the build and fails if the Supabase secret key is in the bundle
  (names only, never values). Deploy builds run it with `--deploy`, which also fails on `GEMINI_API_KEY`: production gets the
  Gemini key as a Worker secret, never baked in.

### D-039 Gemini through plain `fetch`, no SDK. Decided, 2026-11-12
`lib/gemini.ts` calls the Gemini REST API (`generateContent`, JSON output with a response schema) with `fetch`, so there is no
new dependency and nothing extra in the Worker (D-012 allowed this switch). The key goes in the `x-goog-api-key` header, not the
URL. One retry with `GEMINI_FALLBACK_MODEL` on 429, any 5xx, a timeout or a network error (Google returned "high demand" 503s
during testing, and on the live site Suggest looks timed out with no fallback; the main model now gets half the time); thinking level `low` on the main model (Flash defaults to medium, which was too slow, and refuses `minimal`); the
Flash-Lite fallback keeps its `minimal` default; 30 s timeout per call (45 s for looks). Google's
error text goes to the server log only, never to the team.
- **Autofill:** `POST /api/autofill` takes only a storage path from our bucket (pattern-checked, so it can't fetch other URLs),
  checks the origin (403), body size (413), sign-in (401) and team (403), sends the cover photo and a fixed prompt, and returns
  cleaned fields. Off-list category or era is dropped, em dashes are replaced. Price, size, condition and measurements are never
  suggested. Nothing is saved until the team saves the form.
- **Looks:** `suggestLooks` sends live pieces with cut-outs as text (code, category, name, colour, era, size). Answers are kept
  only if every code is one we sent and the slot rules hold (a dress plus shoes, or one top-layer piece plus one bottom with
  optional shoes; 2 to 4 pieces, matching the table's check), and if the set isn't a repeat. They are saved as `source='ai'`, `status='draft'`. The team publishes them.
- Only product photos and product facts are sent, never customer data (free tier inputs may be used by Google).
- Real Gemini calls in e2e are opt-in (`E2E_AI=1`) so the gate doesn't use the free quota.

### D-040 No revalidation queue. Decided, 2026-11-13
OpenNext only needs a queue for time-based revalidation. Shop pages use `revalidate = false` and dashboard saves call
`revalidatePath`, which makes the next visit render fresh (checked on the preview: after a save, all 21 product pages came back
MISS and then HIT with the new content). The "Dummy queue is not implemented" errors seen locally came from cache entries left
over from earlier runs combined with the seed writing straight to the database, which skips revalidation. Production data only
changes through the dashboard. If "Failed to revalidate stale page" ever shows up in production logs, add OpenNext's memory
queue (no Durable Objects needed).

### D-041 Made-up product URLs. Decided, 2026-11-13
Every unknown `/p/<code>` renders once (a full shop query) and is cached as a 404 in KV. The KV free plan allows 1,000 writes a
day. When that runs out, OpenNext logs the failed write and the site keeps working, just uncached (more Supabase reads).
- Malformed codes (anything but `TQ-` plus digits) now 404 before any database read.
- Well-formed made-up codes are an accepted risk: nothing links to them, and crawlers don't invent URLs.
- At launch, add Cloudflare's free rate-limiting rule on `/p/*` (launch checklist).

### D-042 Manual deploys from a clean build, with automatic rollback on a failed smoke. Decided, 2026-11-13
`npm run deploy -- <target>` (`scripts/deploy.sh`) is the only way to deploy. No CI: one person deploys a few times a month,
and a script is easier to hand over than a pipeline plus its secrets.
- **Clean build:** the commit is checked out with `git worktree` and installed with `npm ci`, so the developer's local env
  files can't leak into the Worker (D-038). Turbopack refused a symlinked `node_modules`, hence the full install.
- **Config:** public values live in `wrangler.jsonc` under `env.<target>.vars`. The script exports them into the build (Next
  inlines `NEXT_PUBLIC_` values) and Cloudflare also sets them as Worker vars. Secrets only via `wrangler versions secret put`.
- **Proof of what's live:** `worker.ts` adds `x-worker-version` (version metadata binding) to every response. The script waits
  for the new ID before smoking, and a rollback can be checked the same way.
- **Rollback:** the script notes the live version before deploying and runs `wrangler rollback` itself if the smoke fails.
- **Found in the rehearsal and fixed:** OpenNext forwards only positional arguments to `wrangler deploy` (my `--tag` turned into
  a bogus entry point), so the commit is printed next to the version ID instead of tagged; a first deploy has no live version,
  which `pipefail` treated as fatal.
- **Rejected:** Cloudflare Workers Builds (Git-connected CI). It builds with whatever env Cloudflare holds and can't run our
  gate (local Supabase, Playwright), and it would deploy on every push.

### D-043 Where the accounts live. Decided by Ashraf, 2026-11-13
- A Gmail was created for the client. The domain (thriftesque.com), Cloudflare and the production Supabase project
  (`xuzndssktrgqfonedctw`) are on it, with Ashraf as a member. The client owns the data and the domain if maintenance ends.
- The Gemini key stays on Ashraf's own Google AI Studio account, since Nuvai maintains the site and the key is free. At a
  handover it's one Worker secret to replace (runbook). Only product photos and product facts are ever sent.
- Supersedes the line in `CLAUDE.md` that put every account under the client's email (updated).

### D-044 The domain goes live in preview, with the sample pieces. Decided by Ashraf, 2026-11-13
thriftesque.com shows the app with the 21 sample products until the real content (WhatsApp number, fees, team, products)
arrives. To keep that honest:
- `NEXT_PUBLIC_SHOP_PREVIEW=1` in the production vars shows a strip on every page ("Preview: these are sample pieces, not for
  sale yet. The shop opens soon."), sets `noindex, nofollow`, and makes robots.txt disallow everything, so sample products
  don't end up in search results after launch.
- The WhatsApp number stays empty, so there are no order buttons pointing at a fake number (`waLink` returns nothing).
- `npm run demo -- load production <team email>` puts the samples in, signed in as a team member (RLS applies, no secret key,
  no test accounts). It refuses if real products exist and only fills settings nobody has set. `npm run demo -- remove ...`
  takes the samples, their photos and the sample looks out again.
- At launch: remove the samples, add the real settings and products, delete `NEXT_PUBLIC_SHOP_PREVIEW` and deploy.
- Found while building it: a new Tailwind `@utility` class was silently not generated, so the strip moved to a CSS Module like
  the other components (D-031). Checked by screenshot, not just by markup.

### D-045 Production Supabase in Mumbai. Decided by Ashraf, 2026-11-13
The first production project was created in Sydney. Measured from Qatar: 658 ms to first byte, against about 60 ms to AWS
Mumbai or UAE. Supabase has no Middle East region, so the project was recreated in Mumbai (`ap-south-1`,
`pexllnnfemgdutonpdqw`) while it was still empty, and the Sydney one deleted. The D1 tag cache is in `apac`.
- Set up through the dashboard in Ashraf's browser: signups off (a signup attempt returns `signup_disabled`), Site URL
  `https://thriftesque.com`, the `admin@thriftesque.com` login (password set by Ashraf, in his password manager) added to
  `team_members`. The schema went in with `supabase db push`.
- `admin@thriftesque.com` has no mailbox. A forgotten password is reset in the Supabase dashboard.
