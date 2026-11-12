import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Bag, outfit builder and looks against the seeded local database. Each test starts with an empty bag (fresh context).

const drawer = (page: Page) => page.getByRole("dialog", { name: "Your bag" });
const bagButton = (page: Page) => page.getByRole("button", { name: /^Bag \d+ pieces?$/ });

test("add from a card, the bag keeps it after a reload, remove empties it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add Denim midi skirt to bag" }).click();
  await expect(bagButton(page)).toHaveAccessibleName("Bag 1 piece");
  await expect(page.getByRole("button", { name: "Denim midi skirt is in your bag. Open bag" })).toBeVisible();
  await page.reload();
  await expect(bagButton(page)).toHaveAccessibleName("Bag 1 piece");
  await bagButton(page).click();
  await expect(drawer(page)).toContainText("Denim midi skirt");
  await page.getByRole("button", { name: "Remove Denim midi skirt" }).click();
  await expect(drawer(page)).toContainText("Your bag is empty");
  await expect(bagButton(page)).toHaveAccessibleName("Bag 0 pieces");
});

test("the order needs a name and an area, then builds the WhatsApp message", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add Sage V-neck sweater to bag" }).click();
  await page.getByRole("button", { name: "Add Rigid dark wash straight jeans to bag" }).click();
  await bagButton(page).click();
  const send = drawer(page).getByRole("button", { name: "Send order on WhatsApp" });
  await expect(send).toBeDisabled();
  await expect(drawer(page)).toContainText("Add your name to send the order.");
  await drawer(page).getByLabel("Your name").fill("Sara");
  await expect(drawer(page)).toContainText("Choose your area to send the order.");
  await drawer(page).getByLabel("Area").selectOption("Al Khor");
  await expect(drawer(page)).toContainText("Total285 QAR");

  const href = await drawer(page).getByRole("link", { name: "Send order on WhatsApp" }).getAttribute("href");
  const url = new URL(href!);
  expect(url.origin + url.pathname).toBe("https://wa.me/97400000000");
  const text = url.searchParams.get("text")!;
  expect(text).toContain("1. Sage V-neck sweater (size M), 120 QAR [TQ-0709]");
  expect(text).toContain("2. Rigid dark wash straight jeans (size W30), 140 QAR [TQ-0716]");
  expect(text).toContain("Delivery: 25 QAR\nTotal: 285 QAR");
  expect(text).toMatch(/Name: Sara\nDeliver to: Al Khor$/);

  await drawer(page).getByRole("button", { name: /^Pickup/ }).click();
  const pickup = new URL((await drawer(page).getByRole("link", { name: "Send order on WhatsApp" }).getAttribute("href"))!).searchParams.get("text")!;
  expect(pickup).toContain("Pickup: free\nTotal: 260 QAR");
});

test("Add to bag from the product sheet opens the bag; closing returns focus to the Bag button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View Patchwork knit sweater" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add to bag" }).click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page)).toContainText("Patchwork knit sweater");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  expect(new URL(page.url()).pathname).toBe("/");
  // The sheet closed after the bag opened; the page must stay locked and inert behind the bag.
  await page.waitForTimeout(400);
  expect(await page.locator("[data-page]").getAttribute("inert")).not.toBeNull();
  expect(await page.evaluate(() => document.body.classList.contains("locked"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(bagButton(page)).toBeFocused();
  expect(await page.locator("[data-page]").getAttribute("inert")).toBeNull();
  expect(await page.evaluate(() => document.body.classList.contains("locked"))).toBe(false);
});

test("sold pieces can't be added", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Add Olive bomber with shearling collar to bag" })).toHaveCount(0);
  await page.goto("/p/TQ-0705");
  await expect(page.getByRole("button", { name: "Sold" })).toBeDisabled();
});

test("the product page has a working bag too", async ({ page }) => {
  await page.goto("/p/TQ-0701");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(drawer(page)).toContainText("Embroidered tiger souvenir jacket");
});

test.describe("outfit builder", () => {
  const row = (page: Page, slot: string) => page.locator(`#outfit button[aria-label^="${slot}: "]`);

  test("arrows, lock and shuffle", async ({ page }) => {
    await page.goto("/");
    const top0 = await row(page, "Top").getAttribute("aria-label");
    await page.getByRole("button", { name: "Next top" }).click();
    const top1 = await row(page, "Top").getAttribute("aria-label");
    expect(top1).not.toBe(top0);
    await page.getByRole("button", { name: "Previous top" }).click();
    expect(await row(page, "Top").getAttribute("aria-label")).toBe(top0);

    await page.getByRole("button", { name: "Keep this top when shuffling" }).click();
    await expect(page.getByRole("button", { name: "Keep this top when shuffling" })).toHaveAttribute("aria-pressed", "true");
    const bottoms = new Set<string>();
    for (let i = 0; i < 6; i++) {
      await page.getByRole("button", { name: "Shuffle" }).click();
      expect(await row(page, "Top").getAttribute("aria-label")).toBe(top0);
      bottoms.add((await row(page, "Bottom").getAttribute("aria-label"))!);
    }
    expect(bottoms.size).toBeGreaterThan(1);
  });

  test("Shuffle keeps keyboard focus, dress mode swaps the slots", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Shuffle" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Shuffle" })).toBeFocused();
    await page.getByRole("button", { name: "Dress", exact: true }).click();
    await expect(row(page, "Dress")).toHaveCount(1);
    await expect(row(page, "Top")).toHaveCount(0);
    await expect(row(page, "Bottom")).toHaveCount(0);
  });

  test("a sideways swipe changes the piece without opening it", async ({ page }) => {
    await page.goto("/");
    const before = await row(page, "Bottom").getAttribute("aria-label");
    const img = row(page, "Bottom").locator("img");
    await img.scrollIntoViewIfNeeded();
    const b = (await img.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.8, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.1, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(row(page, "Bottom")).not.toHaveAttribute("aria-label", before!);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await row(page, "Shoes").locator("img").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("Add outfit puts every piece in the bag; sold or reserved pieces never appear", async ({ page }) => {
    await page.goto("/");
    const labels = await page.locator('#outfit button[aria-label$="View details"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(labels.join(" ")).not.toMatch(/Olive bomber|Speedway graphic tee/);
    await page.getByRole("button", { name: /^Add outfit · \d+ QAR$/ }).click();
    await expect(drawer(page).locator("button", { hasText: "Remove" })).toHaveCount(labels.length);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Outfit is in your bag" })).toBeVisible();
  });

  test("Build an outfit with this places and locks the piece", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "View Blue floral sheath dress" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Build an outfit with this" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(row(page, "Dress")).toHaveAttribute("aria-label", /Blue floral sheath dress/);
    await expect(page.getByRole("button", { name: "Keep this dress when shuffling" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("looks", () => {
  test("four team looks show, without an AI label", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#looks article")).toHaveCount(4);
    await expect(page.locator("#looks")).toContainText("Outfits the team put together");
    await expect(page.locator("#looks")).not.toContainText("AI");
  });

  test("open a look, add it all to the bag", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Florals for dinner/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "Florals for dinner" })).toBeVisible();
    await sheet.getByRole("button", { name: /^Add look to bag/ }).click();
    await expect(drawer(page).locator("button", { hasText: "Remove" })).toHaveCount(2);
  });

  test("Remix loads the look into the builder, locked", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Stripes and dark denim/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remix it in the outfit builder" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator('#outfit button[aria-label^="Top: "]')).toHaveAttribute("aria-label", /Navy stripe ringer tee/);
    await expect(page.locator('#outfit button[aria-label^="Bottom: "]')).toHaveAttribute("aria-label", /Rigid dark wash straight jeans/);
    await expect(page.locator('#outfit button[aria-label^="Shoes: "]')).toHaveAttribute("aria-label", /White cut-out heel pumps/);
    await expect(page.locator('#outfit [aria-pressed="true"][aria-label^="Keep this"]')).toHaveCount(3);
  });
});

test("the open bag and an open look pass axe", async ({ page }) => {
  // Wait for the dialog's open animation to finish: mid-fade text is partly transparent and fails contrast.
  const settled = () => expect.poll(() => page.locator("[role=dialog]:not([aria-hidden])").evaluate((el) =>
    el.getAnimations({ subtree: true }).every((a) => a.playState !== "running"))).toBe(true);
  const serious = async () => {
    await settled();
    return (await new AxeBuilder({ page }).include("[role=dialog]:not([aria-hidden])").analyze()).violations
      .filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id);
  };
  await page.goto("/");
  await page.getByRole("button", { name: "Add Denim midi skirt to bag" }).click();
  await bagButton(page).click();
  await expect(drawer(page)).toBeVisible();
  expect(await serious()).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Denim day/ }).click();
  await expect(page.getByRole("dialog", { name: "Denim day" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  expect(await serious()).toEqual([]);
});
