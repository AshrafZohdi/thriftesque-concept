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
    // Only a price and a photo are needed to go live (D-066); size, category, era and condition are optional.
    expect(missingForShop(draft)).toEqual(["price"]);
    expect(missingForShop({ ...draft, price_qar: 90 })).toEqual([]);
    expect(missingForShop({ ...draft, price_qar: 90, photos: [] })).toEqual(["a photo"]);
  });
  it("leaves drafts out of the stats' money totals", () => {
    expect(dashboardStats([draft, { ...draft, code: "TQ-0724", status: "live", price_qar: 120, size: "M" }])).toMatchObject({ liveValue: 120, hidden: 1 });
  });
  it("maps a piece with only a name, photo and price, and never one without a price or photo (D-066)", () => {
    const row = { code: "TQ-0723", name: "X", brand: "Unbranded", era: null, category: null, size: null, price_qar: 90, was_price_qar: null,
      condition: null, colour: null, measurements: {}, status: "live", photos: ["p/a.webp"], cutout: null, description: null, styling_tip: null,
      section_ids: [] } as unknown as ShopProductRow;
    expect(toShopProduct(row, (p) => p)).toMatchObject({ era: null, category: null, size: null, condition: null, price: 90 });
    expect(toShopProduct({ ...row, price_qar: null } as ShopProductRow, (p) => p)).toBeNull();
    expect(toShopProduct({ ...row, photos: [] } as ShopProductRow, (p) => p)).toBeNull();
  });
  it("accepts a photo with or without AI suggestions, and refuses bad paths and off-list values", () => {
    expect(draftSchema.safeParse({ photo: "p/abc-123.webp" }).success).toBe(true);
    expect(draftSchema.safeParse({ photo: "p/abc.webp", name: "Ringer tee", category: "Tops", era: "90s" }).success).toBe(true);
    expect(draftSchema.safeParse({ photo: "../secret.webp" }).success).toBe(false);
    expect(draftSchema.safeParse({ photo: "p/abc.webp", category: "Hats" }).success).toBe(false);
  });
});
