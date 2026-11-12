import { expect, test, type Page } from "@playwright/test";
import { DEV_TEAM } from "../../scripts/dev-accounts";

// Changes data. Runs once in Chromium after every read-only suite; the "restore" teardown re-seeds afterwards.
test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEV_TEAM.email);
  await page.getByLabel("Password").fill(DEV_TEAM.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
}

test("a status change reaches the shop", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#shop article", { hasText: "Coral stripe open-knit jumper" })).not.toContainText("Reserved");
  await signIn(page);
  await page.getByLabel("Status of Coral stripe open-knit jumper").selectOption("reserved");
  await expect(page.getByRole("status").filter({ hasText: "Coral stripe open-knit jumper reserved" })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#shop article", { hasText: "Coral stripe open-knit jumper" })).toContainText("Reserved");
  await expect(page.getByRole("button", { name: "Add Coral stripe open-knit jumper to bag" })).toHaveCount(0);
  const res = await page.goto("/p/TQ-0708");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("button", { name: "Reserved" })).toBeDisabled();
});

test("delete needs two taps, then the piece is gone from the shop", async ({ page }) => {
  await signIn(page);
  const del = page.getByRole("button", { name: "Delete Asymmetric zip denim jacket" });
  await del.click();
  const confirm = page.getByRole("button", { name: "Confirm delete Asymmetric zip denim jacket" });
  await expect(confirm).toHaveText("Tap again to delete");
  await confirm.click();
  await expect(page.getByRole("status").filter({ hasText: "Asymmetric zip denim jacket deleted" })).toBeVisible();
  await expect(page.getByLabel("Status of Asymmetric zip denim jacket")).toHaveCount(0);
  expect((await page.request.get("/p/TQ-0703")).status()).toBe(404);
  await page.goto("/");
  await expect(page.locator("#shop article", { hasText: "Asymmetric zip denim jacket" })).toHaveCount(0);
});

test("settings: a bad number is refused, a new drop name reaches every page", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("WhatsApp number for orders").fill("5555");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^WhatsApp number: digits only/ })).toBeVisible();
  await page.getByLabel("WhatsApp number for orders").fill("97400000000");
  await page.getByLabel("Drop name").fill("Drop 99");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("note")).toHaveAttribute("aria-label", /^Drop 99 is live/);
  await page.goto("/p/TQ-0701");
  await expect(page.getByRole("note")).toHaveAttribute("aria-label", /^Drop 99 is live/);
});
