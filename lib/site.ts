// The public address of the shop, for absolute URLs (Open Graph, sitemap, robots). Must be the real https domain in a deploy
// build; `check:build-secrets -- --deploy` refuses anything else.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

// Preview mode (D-044): the live domain shows sample pieces until the real content is in. Shows a strip on every page and
// keeps search engines out. Set NEXT_PUBLIC_SHOP_PREVIEW to "1" in the target's vars; remove it and redeploy at launch.
export const isPreview = process.env.NEXT_PUBLIC_SHOP_PREVIEW === "1";
