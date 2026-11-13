# Roadmap

One phase at a time. Each phase ends with the gate green (`11-qa-plan.md`), docs updated and a report. Commit or push happens only
when Ashraf asks.

## Phase 0: Plan (done)
- [x] `dev` branch, docs hub, decisions, roadmap, QA plan, content inventory.
- **Accept when:** Ashraf approves the plan and answers or defers the open questions (Q-1 to Q-3).

## Phase 1: Scaffold and gate (done 2026-10-27)
- Next 16.4 app (App Router, TS strict, Tailwind 4) in the repo root, alongside `index.html` and `design/`. `index.html` isn't
  served by the app.
- `@opennextjs/cloudflare` and `wrangler.jsonc`. `next/font` for the three families (D-018). Design tokens in `@theme`, using the
  mockup colours unchanged (D-017).
- [x] Read the installed Next docs on `proxy`/`middleware` runtime. Settled as D-020 (no middleware). Cache Components off (D-021).
- Vitest and Playwright wired up. `npm run gate` script (`set -o pipefail`, chained with `&&`). Security headers.
- **Accept when:** a placeholder shop page renders in `opennextjs-cloudflare preview` (workerd) at 360 and 390px. The gate passes.
  The compressed Worker size is recorded in the progress log and is well under 3 MiB.

## Phase 2: Database (done 2026-10-27)
- Supabase CLI project: migrations for tables, sequence, `sold_at` trigger, RLS, bucket and storage policies. Generated TS types.
- Seed script (local only, service role): converts the 21 photos to WebP (D-011), uploads them, inserts products with their codes,
  sets the sequence, and inserts a placeholder settings row marked "owner to confirm".
- pgTAP tests: anon can't read hidden products or write anything. Authenticated users can do everything. The sequence gives
  TQ-0722 next. The trigger sets and clears `sold_at`.
- **Accept when:** `supabase test db` passes locally, and the seed runs twice without duplicates.

## Phase 3: Shop in the F design (done 2026-11-12)
- F tokens, fonts and frame layout. Ticker strip, header, hero, black band, footer, How to order and policies.
- Migration: `products.cutout` (transparent cut-out path) and a `looks` table (title, note, product codes, source `ai` or `team`,
  status `draft` or `published`) with RLS like products. Seed uploads the 21 cut-outs and 4 sample looks (`source = 'team'`).
- Catalogue: chips, Hide sold, framed grid, reserved and sold states. Product sheet over the grid with a shareable URL.
  `/p/[code]` page with Open Graph tags and a photo gallery (D-011). Unknown or hidden codes return 404.
- Cached reads (D-021), with the shop reading products, settings and published looks with the publishable key.
- **Accept when:** e2e covers filters, Hide sold, sheet open and close (including Back), a deep link to `/p/<code>` with correct
  OG tags, and 404s. axe is clean. Screenshots at 360, 390, 768 and 1280 reviewed against the F mockup. The Worker stays under
  budget.

## Phase 4: Bag, outfit builder and looks (done 2026-11-12)
- Bag drawer with receipt, name, delivery or pickup, area and fee from settings, and the WhatsApp message (pure, unit tested).
  localStorage reconcile (D-009).
- Outfit builder (D-027): vertical cut-out stack, arrows and swipe, lock, Shuffle, Top + bottom or Dress, Add outfit, Ask on
  WhatsApp, sheet shortcut. Only live products with a cut-out take part.
- Looks (D-028): boards from published looks, a look sheet with Add look, Remix in the builder and Ask on WhatsApp. A look hides
  when any piece isn't live.
- **Accept when:** unit tests cover the message, fees, outfit and look rules. The e2e suites from the mockup (builder and looks)
  are ported and pass on the workerd preview in WebKit and Chromium, plus bag persistence and a well-formed wa.me URL.

## Phase 5: Auth and dashboard (done 2026-11-12)
- `/login` (D-013). Client-side session guard on the dashboard and `getUser()` in every server action (D-020). Sign out.
- Stats (live, sold, sales total, live stock value, average days to sell), search, status tabs (All, Live, Reserved, Sold, Hidden),
  inline status select, two-tap delete, and the settings editor (WhatsApp number, delivery areas and fees, drop name). Each write
  revalidates the affected paths.
- **Accept when:** e2e covers a signed-out redirect, sign in, a status change reaching the shop, delete confirm, and a settings
  change reaching the bag. pgTAP and e2e both prove anon writes fail. The dashboard scrolls correctly on WebKit mobile (old bug 2).

## Phase 6: Product editor (done 2026-11-12)
- Drawer form with RHF and zod (shared schema). Category-driven measurement fields. Photo pipeline (D-011) with up to 4 photos and
  "Make cover". Code assigned on create. Unsaved-changes guard without `confirm()`.
- **Accept when:** e2e creates a product from a fixture photo, edits it and deletes it. The uploaded file is 80 KB or less and
  720x900. Validation messages match the mockup copy. The dashboard chunk doesn't load on shop routes (checked in the build
  output).

## Phase 7: AI autofill and AI looks (done 2026-11-13)
- `/api/autofill` (D-012) and a "Fill from photo" button with loading, error and "review before saving" states.
- "Suggest looks" in the dashboard (D-028): Gemini gets live stock as text, the server validates codes and slot rules, and
  results are saved as drafts the team approves.
- **Accept when:** a unit test covers the schema and parse handling for good, partial and garbage responses. The route rejects
  signed-out calls (401) and oversized bodies (413). One manual run with the real key on a sample photo is recorded. The Worker
  size is re-checked (switch to `fetch` if `@google/genai` costs too much).

## Phase 8: Hardening and ops (done 2026-11-13)
- Keep-alive cron (D-015), robots and sitemap, CSP finalised, `npm audit`, Lighthouse on the preview, full cross-browser e2e,
  runbook filled in, and a rollback rehearsed on a throwaway Worker.
- **Accept when:** the full gate including e2e on the workerd preview is green, budgets are met, and the rollback has been
  rehearsed and written down.

## Phase 9: Launch (needs the client's accounts and content)
- Production Supabase project and secrets. Cloudflare Worker on the client's account. Domain. Real settings and first products.
  Team accounts.
- Merge `dev` into `main` (replacing the mockup at launch, per `CLAUDE.md`). Smoke production. Hand over a one-page guide for
  the team.
- **Accept when:** every line of `08-launch-checklist.md` is `[x]` or `[~]` with a reason.
