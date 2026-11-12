# Thriftesque production app: docs hub

**Status (2026-10-27):** Phase 6 (product editor) done. Next: Phase 7 (AI autofill and AI looks). Branch `dev`. Branch `dev`.

Start here. `CLAUDE.md` at the repo root is the project brief and wins over anything in this folder if they disagree.

## The brief in one paragraph

A photo catalogue for Thriftesque, a secondhand clothing shop in Doha. Every piece is one of one. Customers browse on their phones
(mostly from TikTok), add pieces to a bag, and the bag becomes a prefilled WhatsApp message. There is no checkout or payment. A small
team manages stock in a protected dashboard, with an optional "Fill from photo" button powered by Gemini. It must run on free tiers
(Cloudflare Workers, Supabase, Google AI Studio) and be easy to hand over.

## Documents

| File | What it holds |
| --- | --- |
| [00-brief.md](00-brief.md) | Goals, audience, constraints, success criteria |
| [02-decisions.md](02-decisions.md) | Numbered decisions with reasons, including the open ones |
| [03-architecture.md](03-architecture.md) | Routes, data model, caching, auth, photo pipeline, AI |
| [04-design-system.md](04-design-system.md) | Tokens from the mockup, contrast results, component notes |
| [10-roadmap.md](10-roadmap.md) | Phases, tasks and acceptance criteria |
| [11-qa-plan.md](11-qa-plan.md) | Budgets, test layers, the ship gate |
| [08-launch-checklist.md](08-launch-checklist.md) | Launch gate. Every line `[x]` done or `[~]` waived with a reason |
| [content-inventory.md](content-inventory.md) | Everything the client or Ashraf must supply, confirm or do |
| [progress-log.md](progress-log.md) | Newest first: what was done, verified, what's next |
| [runbook.md](runbook.md) | Run, preview, deploy, roll back, secrets table |

## Rules that don't bend

1. `main` and the root `index.html` stay untouched until launch.
2. No invented facts. Anything not confirmed by the client is marked "owner to confirm".
3. Every change works at 360px and 390px. Tap targets of 40px or more. Inputs use 16px text.
4. Worker stays under 3 MiB compressed. Check the size `wrangler` prints on every build.
5. No customer data is ever sent to Gemini. Only product photos.
6. Secrets never go in git, chat or command arguments.
