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
  for (const path of ["/", "/p/TQ-0705"]) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${path} ${v.id}: ${v.help}`)).toEqual([]);
  }
});
