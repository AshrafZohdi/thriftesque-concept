import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Supabase serves product photos; it's the only other origin the page may talk to.
const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:55321").origin;

test("home renders with self-hosted fonts and no third-party requests", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.origin !== origin && url.origin !== supabaseOrigin) foreign.push(r.url());
  });

  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveText("Pre-loved pieces, one of each.");
  await page.waitForLoadState("networkidle");

  expect(foreign).toEqual([]);
  expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Anton/i);
});

test("no horizontal page scroll", async ({ page }) => {
  for (const path of ["/", "/p/TQ-0701"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain(supabaseOrigin);
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["cross-origin-opener-policy"]).toBe("same-origin");
});

test("robots.txt keeps team pages out and points to a sitemap of what's for sale", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const path of ["/dashboard", "/login", "/api/"]) expect(robots).toContain(`Disallow: ${path}`);
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const listed = new Set([...xml.matchAll(/\/p\/(TQ-\d+)</g)].map((m) => m[1]));
  const seed: { code: string; status: string }[] = JSON.parse(readFileSync("design/seed-products.json", "utf8"));
  const forSale = seed.filter((p) => p.status === "live" || p.status === "reserved");
  expect([...listed].sort()).toEqual(forSale.map((p) => p.code).sort());
});

test("no serious or critical accessibility issues", async ({ page }) => {
  // axe checks contrast on every text node, including the ticker's animated copies; that alone can take 20 s in Firefox.
  test.slow();
  for (const path of ["/", "/p/TQ-0705"]) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${path} ${v.id}: ${v.help}`)).toEqual([]);
  }
});

test("the scrolling strips never run out, even on a 4K screen", async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 900 });
  await page.goto("/");
  // At the loop point the track has moved by one half, so what's left (track minus one half) must still fill the screen.
  const shown = await page.locator("[aria-hidden='true']").evaluateAll((tracks) => tracks
    .filter((t) => t.parentElement?.className.includes("ticker"))
    .map((t) => t.getBoundingClientRect().width - t.firstElementChild!.getBoundingClientRect().width));
  expect(shown.length).toBe(2);
  for (const w of shown) expect(w).toBeGreaterThanOrEqual(3840);
});

test("terms and privacy are linked from every page and pass axe", async ({ page }) => {
  test.slow(); // two axe scans; slow in Firefox because of the ticker (see the test above)
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Law No. 13 of 2016");
  for (const path of ["/privacy", "/terms"]) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  }
  await page.goto("/p/TQ-0705");
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible();
});

test("search engines get structured data, a share card and a manifest", async ({ page, request }) => {
  await page.goto("/");
  const home = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(home.map((t) => JSON.parse(t)).flat().map((d) => d["@type"])).toEqual(["OnlineStore", "WebSite", "FAQPage"]);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\.jpg$/);
  expect((await request.get("/og.jpg")).headers()["content-type"]).toContain("image/jpeg");

  await page.goto("/p/TQ-0705");
  const [product] = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).flat();
  expect(product).toMatchObject({ "@type": "Product", sku: "TQ-0705", offers: { priceCurrency: "QAR" } });

  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Thriftesque", start_url: "/" });
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
});

test("the FAQ, its structured data, llms.txt and product snippets (D-058)", async ({ page, request }) => {
  await page.goto("/");
  const faq = page.getByRole("region", { name: "Good to know" });
  await faq.getByText("How do I order?").click();
  await expect(faq).toContainText("Your bag becomes a ready-made message");
  const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)).flat();
  expect(data.find((d) => d["@type"] === "FAQPage").mainEntity.length).toBeGreaterThanOrEqual(4);
  await expect(page).toHaveTitle("Thriftesque | Vintage and secondhand clothes in Doha, Qatar");

  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  const text = await llms.text();
  expect(text).toMatch(/^# Thriftesque\n\n> Hand-picked vintage and secondhand clothing in Doha, Qatar\./);
  expect(text).toMatch(/- \[.+\]\(http.+\/p\/TQ-\d+\): /);

  await page.goto("/p/TQ-0705");
  const desc = await page.locator('meta[name="description"]').getAttribute("content");
  expect(desc!.length).toBeLessThanOrEqual(160);
  expect(desc).toContain("One of one, order on WhatsApp.");
});
