# Content inventory and owner actions

Anything not confirmed here stays as a visible placeholder or is left out. Nothing gets invented.

## Open questions for Ashraf

| # | Question | Recommendation | Status |
| --- | --- | --- | --- |
| Q-1 | Incremental cache on R2 (needs a card on the client's Cloudflare account) or Workers KV (no card, possible brief staleness)? (D-005) | KV. Switch to R2 later if needed | **decided 2026-10-27: KV** |
| Q-2 | Change the mockup colours for contrast? (D-017) | n/a | decided 2026-10-27: keep them. Superseded by D-029 (F palette passes AA) |
| Q-4 | Which design direction? (D-026) | n/a | **decided 2026-11-12: option F (Sky), D-029** |
| Q-5 | Include the outfit builder at launch (D-027)? | Yes | **decided 2026-11-12: yes** |
| Q-6 | Include AI looks at launch (D-028)? | Yes | **decided 2026-11-12: yes. The team reviews suggestions each drop** |
| Q-3 | Accept the proposed decisions D-004, D-008, D-010, D-011, D-013, D-014, D-015, D-018, D-019 as a set? | Yes. Override any individually | going ahead with these defaults (2026-10-27). Can be changed any time |

## From the client

| # | Item | Needed by | Status |
| --- | --- | --- | --- |
| C-1 | Real WhatsApp number (country code first) | Phase 9 (placeholder until then) | waiting |
| C-2 | Delivery areas and the fee for each. Is pickup offered, and where? | Phase 9 | waiting. The mockup uses 10 sample areas at 15 or 25 QAR |
| C-3 | Payment methods. The mockup says "Cash on delivery or bank transfer" | Phase 9 | owner to confirm |
| C-4 | Logo, if any | Phase 3 ideally | waiting. F's chrome heart and wordmark are used until then. Colours now come from option F |
| C-5 | Team member names and emails (one account each is recommended) | Phase 9 | one shared login for now: `admin@thriftesque.com` |
| C-6 | Domain | Phase 9 | **thriftesque.com**, bought on the client's Gmail (2026-11-13) |
| C-7 | First batch of real product photos and details | Phase 9 | waiting |
| C-8 | Mockup claims to confirm: "New drop every Thursday, 8 pm", "Doha orders arrive within 24 hours", "Delivery across Qatar" | Phase 9 | owner to confirm |
| C-9 | Current drop name (the mockup says "Drop 07") | Phase 9 | owner to confirm. Editable in settings |
| C-10 | Any returns or exchange policy? The mockup has none, and none will be written without one | Phase 9 | ask |
| C-11 | Footer credit. The mockup says "Concept by Nuvai Solutions". Proposed: "Site by Nuvai Solutions" | Phase 9 | ask |
| C-13 | Who runs the shop, as shown on the terms and privacy pages: a registered business name, or "Thriftesque, Doha" | before launch | ask (lib/shop-facts.ts) |
| C-14 | A public contact email for privacy requests and security.txt | before launch | ask |
| C-15 | How long a reserved piece is held while payment is pending | before launch | ask |
| C-16 | How long order chats and delivery details are kept | before launch | ask |
| C-12 | The condition definitions in the mockup ("Barely worn, no flaws we could find.", etc.). Are these accurate for how they grade? | Phase 9 | owner to confirm |

## Accounts (created under the client's email, Nuvai added as a member)

2026-11-13: Ashraf created a Gmail for the client. Every account below goes under it, and the domain is being bought on it too.

| # | Account | Used for | Status |
| --- | --- | --- | --- |
| A-1 | Supabase | DB, Auth, Storage (production project) | `pexllnnfemgdutonpdqw`, Mumbai, on the client's Gmail (D-045) |
| A-2 | Cloudflare | Worker, KV, D1, Cron, DNS | client's account `674d3c1a...`, Ashraf a Super Administrator; KV and D1 created (2026-11-13) |
| A-3 | Google AI Studio | Gemini API key, billing left disabled | Nuvai's own account, not the client's (D-043) |
| A-4 | Domain registrar | Custom domain | bought on the client's Gmail (2026-11-13) |

## Ashraf, before upcoming phases

| # | Action | Needed by |
| --- | --- | --- |
| N-1 | ~~Start Docker Desktop~~ Done 2026-10-27 | Phase 2 |
| N-2 | Create a Gemini API key for development (any free-tier key works locally). Set it with `read -s` into `.env.local`, never paste it in chat | Phase 7 |
