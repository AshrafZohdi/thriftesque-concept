# Launch checklist

`[x]` done, `[~]` waived (reason required), `[ ]` not done. Launch happens when there are no `[ ]` lines left.

## Content
- [ ] C-1 to C-12 in `content-inventory.md` answered. No "owner to confirm" text left on the site
- [ ] Sample products removed (`npm run demo -- remove production <email>`). Real products live
- [ ] Preview mode off: `NEXT_PUBLIC_SHOP_PREVIEW` removed from the production vars and deployed (strip gone, robots.txt allows the shop) (D-044)
- [ ] Settings row holds the real WhatsApp number, areas, fees and drop name

## Accounts and config
- [x] Supabase production project on the client's account. Public signups disabled. Migrations pushed (2026-11-13, Mumbai, D-045)
- [ ] Team accounts created and each person has signed in
- [x] Cloudflare Worker on the client's account. KV and D1 bound. Cron trigger active (2026-11-13)
- [ ] Gemini key on the client's AI Studio account, billing disabled, model IDs re-checked
- [x] Secrets set with the non-deploying command (`wrangler versions secret put`). Table in `runbook.md` complete (Gemini key, 2026-11-13)
- [ ] The deploy build passed `npm run check:build-secrets -- --deploy` (D-038)
- [x] Domain connected over HTTPS. `NEXT_PUBLIC_SITE_URL` set to it (the deploy check refuses localhost or http)
- [x] `www.thriftesque.com` redirects to `thriftesque.com` (smoke checks it)
- [ ] Cloudflare rate-limiting rule on `/p/*` (free plan includes one rule), per D-041
- [ ] Sitemap submitted in Google Search Console (optional, ask the client)

## Quality (see `11-qa-plan.md`)
- [ ] Gate green on the production build, including e2e against the workerd preview
- [ ] Budgets met (Worker size, LCP, CLS, INP, JS, photo size)
- [ ] axe clean on every route (the F palette passes AA, so no contrast waiver, D-029)
- [ ] Checked by hand on a real iPhone (Safari and the TikTok in-app browser) and a real Android phone
- [ ] Product link previews checked in WhatsApp and TikTok
- [ ] `npm audit --omit=dev` clean, including the moderate build-time advisories waived in D-032

## Operations
- [x] Rollback rehearsed on a throwaway Worker. Command and target in `runbook.md` (2026-11-13: back on the old version in 7 s)
- [ ] Deployed with `npm run deploy -- production` (runs the gate, clean build, smoke, rollback on failure)
- [x] Smoke run against production after deploy: `npm run smoke -- https://thriftesque.com` (2026-11-13, all ok)
- [ ] Keep-alive cron seen succeeding once in the Worker's logs (Cron events)
- [ ] `dev` merged into `main`. The mockup's Vercel demo retired or left as-is (ask the client)
- [ ] Team guide handed over (add a product, mark sold, change settings)
