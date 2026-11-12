import { describe, expect, it } from "vitest";
import { emptyProduct, productSchema, toProductRow } from "./product-schema";

const good = {
  ...emptyProduct(),
  name: "  Sage V-neck sweater ", brand: "", category: "Knitwear", size: "M", price: "120", condition: "Very good",
  measurements: { "Pit to pit": "55", Length: "", Sleeve: 58 }, status: "live", photos: ["p/abc-123.webp"], cutout: "c/def-456.webp",
};

describe("productSchema", () => {
  it("accepts a good product and cleans it into a row", () => {
    const r = productSchema.safeParse(good);
    expect(r.success).toBe(true);
    const row = toProductRow(r.data!);
    expect(row).toMatchObject({
      name: "Sage V-neck sweater", brand: "Unbranded", category: "Knitwear", price_qar: 120, colour: null,
      measurements: { "Pit to pit": 55, Sleeve: 58 }, photos: ["p/abc-123.webp"], cutout: "c/def-456.webp", description: null,
    });
  });

  it("explains what's missing in plain words", () => {
    const r = productSchema.safeParse({ ...emptyProduct() });
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(["Give the piece a name.", "Add a size.", "Add a photo so customers can see the piece."]));
  });

  it("rejects bad prices, too many photos, odd paths and the wrong measurements", () => {
    const bad = (over: object) => productSchema.safeParse({ ...good, ...over }).success;
    expect(bad({ price: "12.5" })).toBe(false);
    expect(bad({ price: "0" })).toBe(false);
    expect(bad({ photos: ["a/1.webp", "a/2.webp", "a/3.webp", "a/4.webp", "a/5.webp"] })).toBe(false);
    expect(bad({ photos: ["../secret.webp"] })).toBe(false);
    expect(bad({ cutout: "a/x.gif" })).toBe(false);
    expect(bad({ measurements: { Inseam: "70" } })).toBe(false);
    expect(bad({ status: "deleted" })).toBe(false);
  });
});
