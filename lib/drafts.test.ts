import { describe, expect, it } from "vitest";
import { dashboardStats, missingForShop, type TeamProduct } from "./dashboard";
import { draftSchema } from "./product-schema";
import { toShopProduct, type ShopProductRow } from "./shop-model";

const draft: TeamProduct = {
  code: "TQ-0723", name: "Untitled draft", brand: "Unbranded", era: null, category: null, size: null, price_qar: null, condition: null,
  status: "hidden", photos: ["p/a.webp"], created_at: "2026-11-13T10:00:00Z", sold_at: null,
};

describe("drafts from a bulk upload (D-051)", () => {
  it("lists what a draft still needs before it can show in the shop", () => {
    expect(missingForShop(draft)).toEqual(["price", "size", "category", "era", "condition"]);
    expect(missingForShop({ ...draft, price_qar: 90, size: "M", category: "Tops", era: "90s", condition: "Good" })).toEqual([]);
  });
  it("leaves drafts out of the stats' money totals", () => {
    expect(dashboardStats([draft, { ...draft, code: "TQ-0724", status: "live", price_qar: 120, size: "M" }])).toMatchObject({ liveValue: 120, hidden: 1 });
  });
  it("never maps an incomplete row into the shop", () => {
    const row = { code: "TQ-0723", name: "X", brand: "Unbranded", era: null, category: "Tops", size: "M", price_qar: 90, condition: "Good",
      colour: null, measurements: {}, status: "live", photos: [], cutout: null, description: null, styling_tip: null } as unknown as ShopProductRow;
    expect(toShopProduct(row, (p) => p)).toBeNull();
    expect(toShopProduct({ ...row, era: "90s" } as ShopProductRow, (p) => p)).not.toBeNull();
  });
  it("accepts a photo with or without AI suggestions, and refuses bad paths and off-list values", () => {
    expect(draftSchema.safeParse({ photo: "p/abc-123.webp" }).success).toBe(true);
    expect(draftSchema.safeParse({ photo: "p/abc.webp", name: "Ringer tee", category: "Tops", era: "90s" }).success).toBe(true);
    expect(draftSchema.safeParse({ photo: "../secret.webp" }).success).toBe(false);
    expect(draftSchema.safeParse({ photo: "p/abc.webp", category: "Hats" }).success).toBe(false);
  });
});
