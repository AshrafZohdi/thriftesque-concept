import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DEV_STRANGER, DEV_TEAM } from "../../scripts/dev-accounts";

const seed: { status: string; price_qar: number }[] = JSON.parse(readFileSync("design/seed-products.json", "utf8"));

// Read-only team checks. Changing data is in team-writes.spec.ts, which runs after everything else.

// After signing in, the dashboard makes two auth round-trips. With five browsers sharing one local Supabase that can pass 5 s.
const SIGNED_IN = 15_000;

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("signed out, the dashboard sends you to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Team sign in" })).toBeVisible();
});

test("a wrong password says so", async ({ page }) => {
  await signIn(page, { email: DEV_TEAM.email, password: "not-the-password" });
  // Next.js keeps its own empty role="alert" route announcer on the page, so match ours by text.
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is wrong." })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("a signed-in account that isn't on the team is refused", async ({ page }) => {
  await signIn(page, DEV_STRANGER);
  await expect(page.getByRole("heading", { name: "Not on the team" })).toBeVisible({ timeout: SIGNED_IN });
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("the team sees stats, every product, search and status tabs", async ({ page }) => {
  await signIn(page, DEV_TEAM);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: SIGNED_IN });
  const live = seed.filter((p) => p.status === "live");
  const sold = seed.filter((p) => p.status === "sold");
  const stats = page.getByRole("region", { name: "Stats" });
  await expect(stats).toContainText(`Live in shop${live.length}`);
  await expect(stats).toContainText(`Sold${sold.length}`);
  await expect(stats).toContainText(`Sales${sold.reduce((t, p) => t + p.price_qar, 0)} QAR`);
  await expect(stats).toContainText(`Live stock value${live.reduce((t, p) => t + p.price_qar, 0).toLocaleString("en")} QAR`);

  const rows = page.getByRole("region", { name: "Products" }).getByRole("combobox");
  await expect(rows).toHaveCount(seed.length);
  await page.getByRole("searchbox", { name: "Search products" }).fill("jeans");
  await expect(rows).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Search products" }).fill("");
  await page.getByRole("toolbar", { name: "Status" }).getByRole("button", { name: /^Sold/ }).click();
  await expect(rows).toHaveCount(sold.length);

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("team pages aren't indexed and the dashboard has no horizontal scroll", async ({ page }) => {
  await signIn(page, DEV_TEAM);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: SIGNED_IN });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test("sign out returns to sign in and the dashboard is closed again", async ({ page }) => {
  await signIn(page, DEV_TEAM);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: SIGNED_IN });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("the team sees the looks, and Fill from photo waits for a photo", async ({ page }) => {
  await signIn(page, DEV_TEAM);
  const looks = page.getByRole("region", { name: "Looks" });
  // The looks load in their own request after sign-in.
  await expect(looks.getByRole("article")).toHaveCount(4, { timeout: SIGNED_IN });
  await expect(looks).toContainText("Drafts (0)");
  await expect(looks).toContainText("Published (4)");
  await expect(looks.getByRole("button", { name: "Suggest looks" })).toBeEnabled();
  await page.getByRole("button", { name: "+ Add product" }).click();
  const editor = page.getByRole("dialog", { name: "Add product" });
  await expect(editor.getByRole("button", { name: "Fill from photo" })).toBeDisabled();
});

test.describe("the autofill route only answers the team, from this site", () => {
  const ok = { path: "p/00000000-0000-0000-0000-000000000000.webp" };
  const post = (page: Page, data: unknown, origin: string | null) =>
    page.request.post("/api/autofill", { data: typeof data === "string" ? data : JSON.stringify(data), headers: { "content-type": "application/json", ...(origin ? { origin } : {}) } });

  test("signed out", async ({ page, baseURL }) => {
    expect((await page.request.get("/api/autofill")).status()).toBe(405);
    expect((await post(page, ok, null)).status()).toBe(403);
    expect((await post(page, ok, "https://evil.example")).status()).toBe(403);
    expect((await post(page, "x".repeat(5000), baseURL!)).status()).toBe(413);
    expect((await post(page, "{not json", baseURL!)).status()).toBe(400);
    expect((await post(page, { path: "../settings" }, baseURL!)).status()).toBe(400);
    expect((await post(page, { path: "https://evil.example/a.webp" }, baseURL!)).status()).toBe(400);
    const res = await post(page, ok, baseURL!);
    expect(res.status()).toBe(401);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test("signed in but not on the team", async ({ page, baseURL }) => {
    await signIn(page, DEV_STRANGER);
    await expect(page.getByRole("heading", { name: "Not on the team" })).toBeVisible({ timeout: SIGNED_IN });
    expect((await post(page, ok, baseURL!)).status()).toBe(403);
  });

  test("the team, with a photo that doesn't exist", async ({ page, baseURL }) => {
    await signIn(page, DEV_TEAM);
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: SIGNED_IN });
    expect((await post(page, ok, baseURL!)).status()).toBe(404);
  });
});

test("the team can see which terms and privacy details are still missing", async ({ page }) => {
  await signIn(page, DEV_TEAM);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: SIGNED_IN });
  const details = page.getByRole("group", { name: "Terms and privacy details" });
  for (const label of ["Who runs the shop", "Contact email", "Delivery", "Payment", "Returns and exchanges", "How long a reserved piece is held", "How long order chats are kept"]) {
    await expect(details.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(details).toContainText("Still to fill in: Who runs the shop, Contact email");
});
