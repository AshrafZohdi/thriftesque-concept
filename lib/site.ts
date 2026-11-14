// The public address of the shop, for absolute URLs (Open Graph, sitemap, robots). Must be the real https domain in a deploy
// build; `check:build-secrets -- --deploy` refuses anything else.
// Search title and description for the shop (D-058): the words people type ("vintage", "secondhand", "Doha", "Qatar").
// One source for the page title, share cards, manifest and structured data.
export const SITE_TITLE = "Thriftesque | Vintage and secondhand clothes in Doha, Qatar";
export const SITE_DESCRIPTION =
  "Hand-picked vintage and secondhand clothing in Doha, Qatar. Every piece is one of one. Browse the drop and order on WhatsApp.";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

// Preview mode (D-044): the live domain shows sample pieces until the real content is in. Shows a strip on every page and
// keeps search engines out. Set NEXT_PUBLIC_SHOP_PREVIEW to "1" in the target's vars; remove it and redeploy at launch.
export const isPreview = process.env.NEXT_PUBLIC_SHOP_PREVIEW === "1";

// Cloudflare Web Analytics is on (D-058): set NEXT_PUBLIC_WEB_ANALYTICS to "1" in the target's vars. Allows its script in
// the CSP (next.config.ts) and describes it on the privacy page, so what runs and what's disclosed can't drift apart.
export const webAnalytics = process.env.NEXT_PUBLIC_WEB_ANALYTICS === "1";
