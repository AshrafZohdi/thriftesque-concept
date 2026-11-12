# Architecture

## Overview

```
 Phone browser ──► Cloudflare Worker (Next 16 via OpenNext)
                     │  shop pages: cached, revalidated by tag (D-005)
                     │  /dashboard: dynamic, signed-in only
                     │  /api/autofill: signed-in only ──► Gemini (photo only)
                     │  cron (daily): keep-alive select ──┐
                     ▼                                    ▼
                  Supabase: Postgres (RLS) · Auth · Storage (product-photos, public read)
 Photos: the browser loads them straight from Supabase Storage's public URL.
 Orders: the browser opens wa.me with a prefilled message. Nothing about the order touches our server.
```

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static/ISR, invalidated with `revalidatePath` (D-021) | Hero, filters, grid, how to order, policies, footer. Filters and sort run client-side over the cached list |
| `/p/[code]` | ISR on first request, invalidated with `revalidatePath` | Full product page with Open Graph and Twitter tags (cover photo, name, price). Unknown or hidden code returns 404 |
| `/` with sheet | Client-side | Tapping a card opens the sheet over the shop and pushes `/p/<code>` to history, so back closes it and the URL can be shared. Built as an intercepting route or `history.pushState` (decided in Phase 3) |
| Bag | Client-side drawer | localStorage only (D-009) |
| `/login` | Static shell | Email and password (D-013) |
| `/dashboard` | Static client shell, data loaded in the browser | Signed in only. No middleware (D-020) |
| `/api/autofill` | Route handler, POST, signed in | Photo in, JSON out (D-012) |
| `/robots.txt`, `/sitemap.xml` | Generated | Dashboard and login disallowed |

## Data model

As in `CLAUDE.md`, with the additions from D-006, D-007 and D-014.

```sql
create type product_status as enum ('live','reserved','sold','hidden');
create sequence product_code_seq;

create table products (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null default 'TQ-' || lpad(nextval('product_code_seq')::text, 4, '0'),
  name          text not null check (length(name) between 1 and 120),
  brand         text not null default 'Unbranded',
  era           text not null check (era in ('70s','80s','90s','Y2K','2000s','2010s')),
  category      text not null check (category in ('Outerwear','Knitwear','Tops','Dresses','Bottoms','Shoes','Bags')),
  size          text not null,
  price_qar     int  not null check (price_qar > 0),
  condition     text not null check (condition in ('Excellent','Very good','Good')),
  colour        text,                                   -- D-014
  measurements  jsonb not null default '{}',            -- cm, keys per category (MEASURE in the mockup)
  status        product_status not null default 'hidden',
  photos        text[] not null default '{}',           -- storage paths, [1] is the cover, max 4 (D-011)
  description   text,
  styling_tip   text,
  created_at    timestamptz not null default now(),
  sold_at       timestamptz                             -- trigger-maintained (D-007)
);

create table settings (
  id              int primary key default 1 check (id = 1),  -- single row
  whatsapp_number text not null,                             -- digits only, country code first
  delivery_fees   jsonb not null default '[]',               -- [{area, fee_qar}] in display order (D-010)
  drop_name       text not null default ''
);
```

Era, category and condition are text with checks rather than enums, so adding one later is a one-line migration.
Measurement keys are checked in the zod schema, not the database. One schema module is shared by the editor (client) and the
save action (server).

### RLS

| Table / bucket | anon | authenticated |
| --- | --- | --- |
| products | select where `status <> 'hidden'` | same as anon; team members: all (D-023) |
| settings | select | select; team members: update. No insert or delete through the API |
| team_members | none | team members: select |
| storage `product-photos` | read through the public URL only (can't list) | team members: select, insert, update, delete |

Public signups are disabled in Supabase Auth, and every write also needs a `team_members` row (D-023). The secret key is only used
by local scripts, never in the Worker (D-024). The migration also creates the bucket (200 KB per file, WebP/JPEG/PNG) and the
single settings row, so production gets them from `supabase db push`.

Codes come from `format_product_code(nextval(...))`, which pads to four digits but never truncates. A trigger refuses code
changes and keeps `sold_at` in sync. `sync_product_code_seq()` (secret key only) moves the sequence past imported codes.

Source of truth: `supabase/migrations/`. Tests: `supabase/tests/database/` (32 pgTAP assertions). Generated types:
`lib/database.types.ts` (`npm run db:types`).

## Caching and freshness

- Shop pages render with the anon key, so RLS still applies, and are cached by OpenNext (D-021).
- Dashboard writes are server actions. Each one checks `getUser()`, writes, then calls `revalidatePath('/')` and
  `revalidatePath('/p/<code>')`. A settings change calls `revalidatePath('/', 'layout')`.
- Incremental cache: Workers KV (D-005). Tag cache (which also tracks paths): D1.
- Status changes reach customers on the next request after invalidation. KV can lag by about a minute in other regions. The bag
  re-checks status as a second line of defence (D-009).

## Auth without middleware (D-020)

- `/login` signs in with the browser Supabase client. Cookies are managed by `@supabase/ssr`'s `createBrowserClient`.
- `/dashboard` is a client shell. With no session, it sends people to `/login`. All data comes through the browser client under RLS.
- Server actions create a server client from cookies, call `getUser()`, and refuse anything without a team user. `/api/autofill`
  does the same.

## Photo pipeline

`File` → `createImageBitmap` (respects EXIF orientation) → canvas 720x900 center-crop → `canvas.toBlob('image/webp', q)`. Step q
down from 0.8 to 0.5 until the blob is 80 KB or less. Then upload with the signed-in browser client. Safari 16 and newer encodes
WebP from canvas. Older Safari returns PNG; detect that and fall back to JPEG at 0.8. The AI autofill sends the already-resized
image, so the request is small.

## AI autofill

`POST /api/autofill` with `{ path }` of an uploaded photo (or the resized image as base64 before first save). The server checks the
session, fetches the image, and calls Gemini with a fixed prompt and response schema
`{ name, category, colour, era, description, styling_tip }`, constrained to the enums. On 429 it retries once with the fallback
model. On any other failure it returns a plain error ("Couldn't fill from this photo. Fill it in by hand."). Results only fill the
form. Nothing is saved until the team member presses Save.

## Security headers

CSP with `default-src 'self'`, `img-src 'self' data: blob: <supabase-host>`, `connect-src 'self' <supabase-host>`, `frame-ancestors
'none'`, plus HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin` and a minimal
`Permissions-Policy`. Fonts are self-hosted (D-018), so there are no third-party style or font hosts. wa.me and tiktok.com are links
only, so they need no CSP entries.
