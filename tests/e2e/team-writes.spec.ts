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

test.describe("product editor", () => {
  test("an empty save explains what's missing", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "+ Add product" }).click();
    const editor = page.getByRole("dialog", { name: "Add product" });
    await expect(editor).toBeVisible();
    await editor.getByRole("button", { name: "Add to shop" }).click();
    await expect(editor).toContainText("Give the piece a name.");
    await expect(editor).toContainText("Add a size.");
    await expect(editor).toContainText("Add a photo so customers can see the piece.");
    await editor.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("add a product with a photo and your own cut-out; it reaches the shop and the builder", async ({ page, request }) => {
    await signIn(page);
    await page.getByRole("button", { name: "+ Add product" }).click();
    const editor = page.getByRole("dialog", { name: "Add product" });
    await editor.locator('input[type=file][accept="image/*"]').setInputFiles("design/img/striped-tee.jpg");
    const photo = editor.getByRole("img", { name: "Photo 1, cover" });
    await expect(photo).toBeVisible({ timeout: 20_000 });

    // The uploaded file is the small 4:5 WebP the brief asks for.
    const src = (await photo.getAttribute("src"))!;
    const res = await request.get(src);
    expect(res.headers()["content-type"]).toBe("image/webp");
    const bytes = await res.body();
    expect(bytes.length).toBeLessThanOrEqual(80 * 1024);
    const { default: sharp } = await import("sharp");
    const meta = await sharp(bytes).metadata();
    expect([meta.width, meta.height]).toEqual([720, 900]);

    await editor.locator('input[type=file][accept="image/png,image/webp"]').setInputFiles("design/img/cutouts/striped-tee.webp");
    await expect(editor.getByRole("img", { name: "Cut-out preview" })).toBeVisible({ timeout: 20_000 });

    await editor.getByLabel("Product name").fill("Test striped tee");
    await editor.getByLabel("Category").selectOption("Tops");
    await editor.getByLabel("Size").fill("M");
    await editor.getByLabel("Price (QAR)").fill("70");
    await editor.getByLabel("Pit to pit").fill("51");
    await editor.getByLabel("Visibility").selectOption("live");
    await editor.getByRole("button", { name: "Add to shop" }).click();
    await expect(page.getByRole("status").filter({ hasText: "TQ-0722 added" })).toBeVisible();

    await page.goto("/p/TQ-0722");
    await expect(page.getByRole("heading", { level: 1, name: "Test striped tee" })).toBeVisible();
    await expect(page.locator("table")).toContainText("51 cm");
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Add Test striped tee to bag" })).toBeVisible();
    // It has a cut-out, so the builder can use it.
    for (let i = 0; i < 12; i++) {
      if (/Test striped tee/.test((await page.locator('#outfit button[aria-label^="Top: "]').getAttribute("aria-label")) ?? "")) break;
      await page.getByRole("button", { name: "Next top" }).click();
    }
    await expect(page.locator('#outfit button[aria-label^="Top: "]')).toHaveAttribute("aria-label", /Test striped tee/);
  });

  test("editing a product changes it in the shop", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Edit Navy stripe ringer tee" }).click();
    const editor = page.getByRole("dialog", { name: "Edit TQ-0710" });
    await expect(editor.getByLabel("Product name")).toHaveValue("Navy stripe ringer tee");
    await editor.getByLabel("Price (QAR)").fill("72");
    await editor.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "TQ-0710 saved" })).toBeVisible();
    await page.goto("/p/TQ-0710");
    await expect(page.getByText("72 QAR", { exact: true })).toBeVisible();
  });

  test("Make cut-out runs the background-removal model in the browser", async ({ page }) => {
    test.slow(); // the first run downloads the 44 MB model
    await signIn(page);
    await page.getByRole("button", { name: "Edit Teal V-neck skater dress" }).click();
    const editor = page.getByRole("dialog", { name: "Edit TQ-0712" });
    const before = await editor.getByRole("img", { name: "Cut-out preview" }).getAttribute("src");
    await editor.getByRole("button", { name: "Make cut-out from cover" }).click();
    await expect(editor.getByRole("img", { name: "Cut-out preview" })).not.toHaveAttribute("src", before!, { timeout: 120_000 });
    await expect(editor.getByRole("status")).toHaveText("");
  });
});

test.describe("looks", () => {
  test("unpublish hides a look from the shop, publish brings it back, delete takes two taps", async ({ page }) => {
    await signIn(page);
    const looks = page.getByRole("region", { name: "Looks" });
    await looks.getByRole("button", { name: "Unpublish Florals for dinner" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Florals for dinner is a draft again" })).toBeVisible();
    await expect(looks).toContainText("Drafts (1)");
    await page.goto("/");
    await expect(page.locator("#looks article", { hasText: "Florals for dinner" })).toHaveCount(0);

    await signIn(page);
    await looks.getByRole("button", { name: "Publish Florals for dinner" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Florals for dinner published" })).toBeVisible();
    await page.goto("/");
    await expect(page.locator("#looks article", { hasText: "Florals for dinner" })).toHaveCount(1);

    await signIn(page);
    await looks.getByRole("button", { name: "Delete Leather and light wash" }).click();
    await looks.getByRole("button", { name: "Confirm delete Leather and light wash" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Leather and light wash deleted" })).toBeVisible();
    await expect(looks.getByRole("article")).toHaveCount(3);
  });
});

// Real Gemini calls use the free quota, so they run only when asked: E2E_AI=1 npm run e2e -- --project=team-writes
test.describe("AI (real Gemini)", () => {
  test.skip(!process.env.E2E_AI, "Set E2E_AI=1 to call Gemini");

  test("Fill from photo fills the form for the team to check", async ({ page }) => {
    test.slow();
    await signIn(page);
    await page.getByRole("button", { name: "+ Add product" }).click();
    const editor = page.getByRole("dialog", { name: "Add product" });
    await editor.locator('input[type=file][accept="image/*"]').setInputFiles("design/img/striped-tee.jpg");
    await expect(editor.getByRole("img", { name: "Photo 1, cover" })).toBeVisible({ timeout: 20_000 });
    await editor.getByRole("button", { name: "Fill from photo" }).click();
    await expect(editor.getByRole("status")).toHaveText("Filled from the photo. Check every field before saving.", { timeout: 60_000 });
    await expect(editor.getByLabel("Product name")).not.toHaveValue("");
    await expect(editor.getByLabel("Category")).toHaveValue("Tops");
    for (const label of ["Product name", "Description (optional)", "Styling tip (optional)"]) {
      expect(await editor.getByLabel(label).inputValue()).not.toContain("—");
    }
    // Price, size and condition stay with the team.
    await expect(editor.getByLabel("Price (QAR)")).toHaveValue("");
    await expect(editor.getByLabel("Size")).toHaveValue("");
    await editor.getByRole("button", { name: "Cancel" }).click();
  });

  test("Suggest looks adds drafts that only use live pieces", async ({ page }) => {
    test.slow();
    await signIn(page);
    const looks = page.getByRole("region", { name: "Looks" });
    await looks.getByRole("button", { name: "Suggest looks" }).click();
    await expect(looks.getByRole("status")).toHaveText(/new looks? added as drafts|No new looks/, { timeout: 90_000 });
    await expect(looks).not.toContainText("Hidden in the shop:");
    const drafts = looks.locator("article", { hasText: "Draft" });
    if (await drafts.count()) {
      await expect(drafts.first()).toContainText("AI");
      const title = (await drafts.first().getByRole("heading").textContent())!;
      await drafts.first().getByRole("button", { name: `Publish ${title}` }).click();
      await expect(page.getByRole("status").filter({ hasText: `${title} published` })).toBeVisible();
      await page.goto("/");
      await expect(page.locator("#looks article", { hasText: title })).toContainText("AI pick");
    }
  });
});
