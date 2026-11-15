import { describe, expect, it } from "vitest";
import { SALE, categoryChips, filterShop, percentOff, sectionChips, sortForShop, toShopProduct, visibleLooks, type ShopProduct, type ShopProductRow } from "./shop-model";
import { askAboutPiece, waLink } from "./wa";

const row = (over: Partial<ShopProductRow> = {}): ShopProductRow => ({
  code: "TQ-0701", name: "Jacket", brand: "Unbranded", era: "90s", category: "Outerwear", size: "M", price_qar: 100,
  condition: "Good", colour: null, measurements: { "Pit to pit": 52, Length: "60", Sleeve: null, Bad: "x" }, status: "live",
  photos: ["TQ-0701/a.webp"], cutout: "TQ-0701/c.webp", description: null, styling_tip: null, was_price_qar: null, section_ids: [], ...over,
});
const url = (p: string) => `https://cdn.test/${p}`;
const prod = (code: string, category: ShopProduct["category"], status: ShopProduct["status"], cutout = true): ShopProduct =>
  ({ ...toShopProduct(row({ code, category, status }), url)!, cutout: cutout ? "x" : null });

describe("toShopProduct", () => {
  it("builds public URLs and keeps only real measurements", () => {
    const p = toShopProduct(row(), url)!;
    expect(p.photos).toEqual(["https://cdn.test/TQ-0701/a.webp"]);
    expect(p.cutout).toBe("https://cdn.test/TQ-0701/c.webp");
    expect(p.measurements).toEqual([["Pit to pit", 52], ["Length", 60]]);
  });
  it("never maps a hidden product", () => {
    expect(toShopProduct(row({ status: "hidden" }), url)).toBeNull();
  });
  it("handles a missing cut-out and odd measurement JSON", () => {
    const p = toShopProduct(row({ cutout: null, measurements: [1, 2] }), url)!;
    expect(p.cutout).toBeNull();
    expect(p.measurements).toEqual([]);
  });
});

describe("sale and sections (D-060)", () => {
  const BASICS = "b1";
  const MENS = "m1";
  const list = [
    { ...prod("TQ-0701", "Tops", "live"), wasPrice: 150, sections: [BASICS] },
    { ...prod("TQ-0702", "Outerwear", "live"), sections: [BASICS, MENS] },
    { ...prod("TQ-0703", "Outerwear", "sold"), sections: [MENS] },
    prod("TQ-0704", "Tops", "live"),
  ];
  const sections = [{ id: MENS, name: "Men's" }, { id: BASICS, name: "Basics" }, { id: "empty", name: "Bags" }];

  it("keeps a was price only when it's above the price", () => {
    expect(toShopProduct(row({ was_price_qar: 150 }), url)!.wasPrice).toBe(150);
    expect(toShopProduct(row({ was_price_qar: 100 }), url)!.wasPrice).toBeNull();
    expect(percentOff({ price: 100, wasPrice: 150 })).toBe(33);
    expect(percentOff({ price: 320, wasPrice: 400 })).toBe(20);
    expect(percentOff({ price: 100, wasPrice: null })).toBe(0);
  });
  it("filters by section or sale, together with the category", () => {
    expect(filterShop(list, { category: "All", hideSold: false, section: MENS }).map((p) => p.code)).toEqual(["TQ-0702", "TQ-0703"]);
    expect(filterShop(list, { category: "Outerwear", hideSold: true, section: MENS }).map((p) => p.code)).toEqual(["TQ-0702"]);
    expect(filterShop(list, { category: "All", hideSold: false, section: SALE }).map((p) => p.code)).toEqual(["TQ-0701"]);
  });
  it("shows Sale first, then the team's sections in their order, skipping empty ones", () => {
    expect(sectionChips(list, sections)).toEqual([
      { id: SALE, name: "Sale", live: 1 }, { id: MENS, name: "Men's", live: 1 }, { id: BASICS, name: "Basics", live: 2 },
    ]);
    expect(sectionChips(list.map((p) => ({ ...p, wasPrice: null })), [])).toEqual([]);
  });
});

describe("ordering and filters", () => {
  const list = [prod("TQ-0701", "Tops", "sold"), prod("TQ-0705", "Tops", "live"), prod("TQ-0703", "Shoes", "reserved"), prod("TQ-0709", "Shoes", "live")];
  it("puts live first, then reserved, then sold, newest first", () => {
    expect(sortForShop(list).map((p) => p.code)).toEqual(["TQ-0709", "TQ-0705", "TQ-0703", "TQ-0701"]);
  });
  it("filters by category and hides sold", () => {
    expect(filterShop(list, { category: "Tops", hideSold: true }).map((p) => p.code)).toEqual(["TQ-0705"]);
    expect(filterShop(list, { category: "All", hideSold: false })).toHaveLength(4);
  });
  it("counts live pieces per category and skips empty categories", () => {
    expect(categoryChips(list)).toEqual([
      { category: "All", live: 2 }, { category: "Tops", live: 1 }, { category: "Shoes", live: 1 },
    ]);
  });
});

describe("visibleLooks", () => {
  const byCode = new Map([
    ["A", prod("TQ-0001", "Tops", "live")], ["B", prod("TQ-0002", "Bottoms", "live")],
    ["S", prod("TQ-0003", "Shoes", "sold")], ["N", prod("TQ-0004", "Shoes", "live", false)],
  ]);
  const look = (codes: string[]) => ({ id: codes.join(""), title: "t", note: null, codes, source: "team" as const });
  it("shows a look only when every piece is live and has a cut-out", () => {
    expect(visibleLooks([look(["A", "B"]), look(["A", "S"]), look(["A", "N"]), look(["A", "missing"]), look(["A"])], byCode).map((l) => l.id))
      .toEqual(["AB"]);
  });
});

describe("waLink", () => {
  it("builds an encoded wa.me link", () => {
    expect(waLink("97412345678", askAboutPiece({ name: "Denim & co jacket", code: "TQ-0701" })))
      .toBe("https://wa.me/97412345678?text=Hi%20Thriftesque%2C%20is%20the%20Denim%20%26%20co%20jacket%20(TQ-0701)%20still%20available%3F");
  });
  it("gives no link when the number isn't set or valid", () => {
    expect(waLink("", "hi")).toBeNull();
    expect(waLink("+974 1234", "hi")).toBeNull();
  });
});
