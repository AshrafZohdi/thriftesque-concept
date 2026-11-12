# QA plan

## Budgets

| What | Budget | Measured with |
| --- | --- | --- |
| Worker, compressed | 2.5 MiB or less (hard limit 3 MiB) | `wrangler deploy --dry-run` output |
| Shop first-load JS | 150 KB gzip or less | build output and a Lighthouse treemap |
| Shop LCP | 2.5 s or less, mobile and throttled | Lighthouse on the workerd preview |
| CLS | 0.05 or less | Lighthouse |
| INP | 200 ms or less (filter tap, add to bag) | Playwright trace and Performance panel |
| Product photo | 80 KB or less, 720x900 WebP | editor e2e asserts it |
| Accessibility | 0 serious or critical axe issues per route | `@axe-core/playwright` |

## Test layers

| Layer | Tool | Covers |
| --- | --- | --- |
| Types | `tsc --noEmit` (strict) | everything |
| Lint | ESLint (Next config) and a raw-colour check | no hex colours outside the tokens file |
| Unit | Vitest | WhatsApp message builder, fees, bag reconcile, zod schemas, photo size maths, AI response parsing |
| Database | pgTAP via `supabase test db` | RLS per role, code sequence, `sold_at` trigger |
| E2E | Playwright: Chromium, Firefox, WebKit, Pixel 7 (412), iPhone 14-like (390), and a custom 360px viewport | user flows in the roadmap's accept criteria, keyboard paths, overlay taps (old bug 1), dashboard scroll (old bug 2), add button on touch (old bug 3) |
| Visual | Playwright screenshots at 360/390/768/1280, reviewed by eye | every page and overlay |
| Runtime | `opennextjs-cloudflare preview` (workerd) | e2e runs against this, not `next dev` |
| Smoke | `scripts/smoke.sh <base-url>` | 200s, 404s, headers, OG tags, `/api/autofill` 401 when signed out. Read-only |

Each fix gets a test that fails on the old code and passes on the new one.

## Ship gate

`npm run gate`, run under `set -o pipefail`, with every step chained by `&&` and never piped into `tail`:

```
npm audit --omit=dev --audit-level=high
&& next typegen && tsc --noEmit && eslint . && check-tokens && vitest run
&& supabase status && supabase test db
&& opennextjs-cloudflare build && (Worker size check)
&& playwright test   # starts the workerd preview on :8787 itself
```

The smoke script joins the gate in Phase 3, once there are routes to probe.

The database tests run separately when migrations change (they need Docker).
