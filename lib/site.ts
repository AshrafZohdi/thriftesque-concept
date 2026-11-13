// The public address of the shop, for absolute URLs (Open Graph, sitemap, robots). Must be the real https domain in a deploy
// build; `check:build-secrets -- --deploy` refuses anything else.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
