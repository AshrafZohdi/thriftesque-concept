import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Runs against the seeded local database (npm run seed): 21 sample products plus a test bag (TQ-0700), TQ-0705 and TQ-0711 sold, TQ-0710 on sale (was 90),
// and a Basics section with 3 pieces (plus an empty Men's section the shop leaves out).

const cards = (page: Page) => page.locator("#shop article");
const chip = (page: Page, name: string) => page.getByRole("toolbar", { name: "Categories" }).getByRole("button", { name: new RegExp(`^${name}\\s*\\d+$`) });

test("category chips filter the grid", async ({ page }) => {
  await page.goto("/");
  const all = await cards(page).count();
  expect(all).toBe(22);
  await chip(page, "Shoes").click();
  await expect(chip(page, "Shoes")).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(2);
  for (const name of await cards(page).locator("h3").allTextContents()) expect(name).toMatch(/boots|pumps/i);
  await chip(page, "All").click();
  await expect(cards(page)).toHaveCount(all);
});

test("Hide sold removes sold pieces and shows them again", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#shop article", { hasText: "Sold" })).toHaveCount(2);
  const hide = page.getByRole("button", { name: "Hide sold" });
  await hide.click();
  await expect(hide).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(20);
  await hide.click();
  await expect(cards(page)).toHaveCount(22);
});

test("opening a piece shows the sheet with a shareable URL, Escape closes it and returns focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "View Denim midi skirt" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Denim midi skirt" })).toBeVisible();
  await expect(dialog).toContainText("TQ-0718");
  await expect(dialog).toContainText("Waist");
  expect(new URL(page.url()).pathname).toBe("/p/TQ-0718");

  const { violations } = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(trigger).toBeFocused();
});

test("Back closes the sheet and keeps the chosen filter", async ({ page }) => {
  await page.goto("/");
  await chip(page, "Knitwear").click();
  await page.getByRole("button", { name: "View Sage V-neck sweater" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(chip(page, "Knitwear")).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(4);
});

test("the page behind an open sheet can't be tapped or tabbed into", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View Denim midi skirt" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.locator("[data-page]").getAttribute("inert")).not.toBeNull();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.locator("[data-page]").getAttribute("inert")).toBeNull();
  // The closed sheet is unmounted, so nothing invisible is left over the grid (mockup bug 1).
  await page.getByRole("button", { name: "View Denim midi skirt" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("a shared product link opens the full page with preview tags", async ({ page }) => {
  const res = await page.goto("/p/TQ-0701");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Embroidered tiger souvenir jacket" })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Embroidered tiger souvenir jacket, 260 QAR | Thriftesque");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /TQ-0701\/seed-cover\.webp$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
});

test("a sold piece says so and can't be ordered", async ({ page }) => {
  await page.goto("/p/TQ-0705");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /\(sold\)/);
  await expect(page.getByRole("button", { name: "Sold" })).toBeDisabled();
});

test("unknown or malformed product codes are 404", async ({ request }) => {
  for (const path of ["/p/TQ-9999", "/p/not-a-code"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("a piece on sale shows the old price crossed out, and Sale and section chips filter the grid (D-060)", async ({ page }) => {
  await page.goto("/");
  const tee = cards(page).filter({ hasText: "Navy stripe ringer tee" });
  await expect(tee.locator("s")).toHaveText("Was 90");
  await expect(tee).toContainText("27% off");
  const sections = page.getByRole("toolbar", { name: "Sections" });
  await expect(sections.getByRole("button")).toHaveText([/^Sale\s*1$/, /^Basics\s*3$/]);
  await sections.getByRole("button", { name: /^Sale/ }).click();
  await expect(cards(page)).toHaveCount(1);
  await sections.getByRole("button", { name: /^Basics/ }).click();
  await expect(cards(page)).toHaveCount(3);
  await chip(page, "Bottoms").click();
  await expect(cards(page)).toHaveText([/Light wash straight jeans/]);
  // Tapping the chosen section again shows every section.
  await sections.getByRole("button", { name: /^Basics/ }).click();
  await expect(sections.getByRole("button", { pressed: true })).toHaveCount(0);
  await expect(cards(page)).toHaveCount(4);

  await page.goto("/p/TQ-0710");
  await expect(page.getByRole("main")).toContainText("Was 90 QAR, now 65 QAR27% off");
});
