# Thriftesque

Production website for Thriftesque (@thriftesque on TikTok), a secondhand clothing shop in Doha, Qatar. Every piece is one of one. Customers browse the catalogue and order through WhatsApp; there is no online checkout or payment.

Built by Nuvai Solutions (Ashraf) for free. After 2 months the client can opt into paid maintenance, so keep it simple, cheap to run and easy to hand over.

## Current state of this repo

- `index.html` (root) is the approved concept mockup, deployed on Vercel as the client demo. **Do not edit or delete it on `main`.**
- `design/mockup-source.html` is the readable source of that mockup (photos load from `design/img/`). Open it in a browser to see the target UX. Treat it as the design spec: layout, copy, tokens, interactions.
- `design/img/` has 21 sample product photos (CC0, 720x900).
- `design/seed-products.json` has the 21 sample products matching those photos. Use it to seed the database.

## Branch workflow

Build the production app on a `dev` branch. `main` stays the live client demo until launch. At launch, the app replaces the mockup on `main`.

## Stack (decided)

- Next.js 16, App Router, TypeScript, Tailwind CSS.
- Supabase: Postgres, Auth, Storage, via `@supabase/ssr`.
- Hosting: Cloudflare Workers via `@opennextjs/cloudflare` (free plan, commercial use allowed). Vercel Hobby is not allowed for commercial sites, so do not target it for production.
- React Hook Form + Zod for the product editor.
- Gemini via `@google/genai`, called from a Next route handler. Key stays server-side.

### Free-tier constraints (respect these)

- Cloudflare free Worker limit is 3 MiB compressed. Keep dependencies light: no large UI kits, date libraries or icon packs. Inline SVG icons. Check the size `wrangler` prints after each build.
- Edge middleware only. Node middleware is not supported on OpenNext Cloudflare.
- Do not use Next image optimization (paid on Cloudflare). Photos are resized in the browser to 720x900 (4:5), compressed to roughly 60 KB WebP, then uploaded. Serve them as-is from Supabase Storage.
- Supabase free: 500 MB DB, 1 GB storage, 5 GB egress/month, pauses after 7 days without requests. Add a daily scheduled ping (Cloudflare Cron Trigger) to prevent pausing. Photo size is the main egress cost.
- Cache product pages and revalidate when the dashboard saves, to cut Supabase reads.

## Data model

`products`
- id uuid pk, code text unique (`TQ-0001` style, next number auto-assigned), name, brand (default `Unbranded`), era, category, size, price_qar int, condition, measurements jsonb (cm, keys depend on category), status, photos text[] (storage paths, first is the cover), description, styling_tip, created_at, sold_at.
- status: `live` | `reserved` | `sold` | `hidden`. Reserved = someone asked on WhatsApp and payment is pending. Hidden = draft.

`settings` (single row): whatsapp_number, delivery_fees (area to QAR), drop_name.

Enums used in the mockup:
- categories: Outerwear, Knitwear, Tops, Dresses, Bottoms, Shoes, Bags
- eras: 70s, 80s, 90s, Y2K, 2000s, 2010s
- conditions: Excellent, Very good, Good
- measurement keys per category: see `MEASURE` in `design/mockup-source.html`

### Security (RLS)

- Public (anon): select products where status != 'hidden'; select settings.
- Authenticated team members: full insert/update/delete on products and settings; write to the `product-photos` bucket.
- Bucket `product-photos`: public read.
- Auth is invite-only. Disable public signups.

## Pages

- `/` shop: hero, filters (category, size, sort, hide sold), grid, how-to-order, policies, footer with team dashboard link.
- `/p/[code]` product page with Open Graph tags (cover photo, name, price) so links shared on WhatsApp/TikTok show a preview card. The grid can still open the product as a sheet on top of the shop.
- Bag: client-side (localStorage), receipt style, builds a prefilled `https://wa.me/<number>?text=...` message with items, sizes, codes, subtotal, delivery fee by area or pickup, total, customer name and area. Reserved and sold items cannot be added.
- `/dashboard` (protected): stats (live, sold, sales total, live stock value, average days to sell), product table with search, status tabs and inline status dropdown, add/edit drawer, delete with in-page confirm (no `confirm()` dialogs), settings editor.

## AI autofill

"Fill from photo" button in the product editor. Sends the uploaded photo to Gemini, gets structured JSON back: name, category, colour, era guess, description, styling_tip. Fills the form; the team reviews before saving. Generated once and stored, never at page view time.

- Model from env `GEMINI_MODEL` (default Gemini 3.8 Flash). On 429, retry once with `GEMINI_FALLBACK_MODEL` (Gemini 3.5 Flash-Lite). Confirm exact model IDs in Google AI Studio.
- Free tier only, billing never enabled. Google may use free-tier inputs, so never send customer data.
- No AI pricing, no customer chatbot, no generated trend insights.

## Mobile first

Most customers arrive from TikTok on phones. Every change must work at 360px and 390px widths.

- Tap targets at least 40px. No hover-only features.
- Inputs use 16px font so iOS doesn't zoom.
- No horizontal page scroll.
- When a sheet or drawer is open, lock the page behind it (iOS-safe: position fixed on body, restore scroll on close).
- Hidden overlays must not block taps (`[hidden]{display:none!important}` or unmount them).
- Respect safe-area insets.

Bugs fixed in the mockup that must not come back:
1. Invisible overlays swallowing taps.
2. Dashboard not scrolling on iOS while the shop scrolled behind it.
3. Hover zoom only working on pure-mouse devices.

## Copy style

Plain, direct English. No em dashes, no hype words. Prices in QAR, measurements in cm, laid flat.

## Environment variables

See `.env.example`.

## Still needed from the client

- Real WhatsApp number.
- Delivery areas and fees.
- Payment methods.
- Logo or brand colours, if any.
- Team member names and emails.
- Domain.
- First batch of real product photos.

Accounts (Supabase, Cloudflare, Google AI Studio, domain) are created under the client's email with Nuvai added as a member.
