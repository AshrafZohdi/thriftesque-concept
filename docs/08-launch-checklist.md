# Launch checklist

`[x]` done, `[~]` waived (reason required), `[ ]` not done. Launch happens when there are no `[ ]` lines left.

## Content
- [ ] C-1 to C-12 in `content-inventory.md` answered. No "owner to confirm" text left on the site
- [ ] Sample products removed or hidden. Real products live
- [ ] Settings row holds the real WhatsApp number, areas, fees and drop name

## Accounts and config
- [ ] Supabase production project on the client's account. Public signups disabled. Migrations pushed
- [ ] Team accounts created and each person has signed in
- [ ] Cloudflare Worker on the client's account. KV and D1 bound. Cron trigger active
- [ ] Gemini key on the client's AI Studio account, billing disabled, model IDs re-checked
- [ ] Secrets set with the non-deploying command (`wrangler versions secret put`). Table in `runbook.md` complete
- [ ] Domain connected over HTTPS. `NEXT_PUBLIC_SITE_URL` set to it

## Quality (see `11-qa-plan.md`)
- [ ] Gate green on the production build, including e2e against the workerd preview
- [ ] Budgets met (Worker size, LCP, CLS, INP, JS, photo size)
- [ ] axe clean on every route (the F palette passes AA, so no contrast waiver, D-029)
- [ ] Checked by hand on a real iPhone (Safari and the TikTok in-app browser) and a real Android phone
- [ ] Product link previews checked in WhatsApp and TikTok
- [ ] `npm audit --omit=dev` clean, including the moderate build-time advisories waived in D-032

## Operations
- [ ] Rollback rehearsed on a throwaway Worker. Command and target in `runbook.md`
- [ ] Smoke run against production after deploy
- [ ] `dev` merged into `main`. The mockup's Vercel demo retired or left as-is (ask the client)
- [ ] Team guide handed over (add a product, mark sold, change settings)
