# Brief

## Who it's for

- **Customers:** people in Qatar, mostly arriving from TikTok links on phones. They want to see what's available, check size and
  measurements, and order quickly. Many will open a shared product link inside the TikTok or WhatsApp in-app browser.
- **The Thriftesque team:** a few people adding pieces each drop, marking them reserved or sold as WhatsApp orders come in. They
  are not technical and will mostly use the dashboard on a phone.
- **Nuvai (Ashraf):** builds it for free and may maintain it later. It has to be cheap to run and simple to hand over.

## Goals

1. A customer can go from a TikTok link to a sent WhatsApp order in under a minute on a phone.
2. A product link shared on WhatsApp or TikTok shows a preview card (photo, name, price).
3. Sold and reserved pieces can't be ordered, and the shop shows their state within a minute of the team changing it.
4. The team can add a piece from a phone photo in about two minutes, with AI filling the text for them to review.
5. Running cost stays at zero on free tiers for normal traffic.

## Constraints

- Stack, hosting, data model, RLS and page list are decided in `CLAUDE.md`.
- Free tiers: Cloudflare Workers free (3 MiB compressed Worker), Supabase free (500 MB DB, 1 GB storage, 5 GB egress a month,
  pauses after 7 days idle), Gemini free tier (inputs may be used by Google).
- No online payments, no customer accounts, no AI pricing, no chatbot.
- Mobile first. The approved mockup (`design/mockup-source.html`) is the design spec.

## Success criteria (checked at launch)

- All of `08-launch-checklist.md` is ticked or waived with a reason.
- Shop LCP of 2.5 s or less on a throttled mid-range phone. No horizontal scroll at 360px.
- axe reports nothing serious or critical on every route.
- The team has signed in, added a real product and marked one sold without help.

## Out of scope for launch

Customer accounts, online payment, stock reservations held by the site, analytics, multiple languages, dark theme
(see D-003). Any of these can be a paid-maintenance follow-up.
