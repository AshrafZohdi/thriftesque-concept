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

// Shop stats are on (D-067): set NEXT_PUBLIC_SHOP_STATS to "1" in the target's vars. The shop then sends anonymous counts to
// /api/tally for Nuvai's monthly report, and the privacy page describes them. Off everywhere else, so tests count nothing.
export const shopStats = process.env.NEXT_PUBLIC_SHOP_STATS === "1";

// The shop's social accounts (Instagram handle confirmed by Ashraf, 2026-11-16).
export const TIKTOK = { handle: "thriftesque", url: "https://www.tiktok.com/@thriftesque" };
export const INSTAGRAM = { handle: "thriftesqueqa", url: "https://www.instagram.com/thriftesqueqa/" };
