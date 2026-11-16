import { describe, expect, it } from "vitest";
import type { ShopProduct } from "./shop-model";
import { jsonLdText, productJsonLd, productSnippet, shopJsonLd } from "./structured-data";

const piece: ShopProduct = {
  code: "TQ-0705", name: "Butter yellow pinafore", brand: "Unbranded", era: "90s", category: "Dresses", size: "M", price: 140,
  condition: "Very good", colour: "Yellow", measurements: [], status: "live", photos: ["https://x.supabase.co/a.webp"],
  cutout: null, description: "Cotton twill.", stylingTip: null, wasPrice: null, sections: [],
};

describe("productJsonLd", () => {
  it("describes the piece with its real price, availability and condition", () => {
    const [product, crumbs] = productJsonLd(piece, "https://thriftesque.com");
    expect(product).toMatchObject({
      "@type": "Product", name: "Butter yellow pinafore", sku: "TQ-0705", url: "https://thriftesque.com/p/TQ-0705", color: "Yellow",
      itemCondition: "https://schema.org/UsedCondition",
      offers: { price: 140, priceCurrency: "QAR", availability: "https://schema.org/InStock" },
    });
    expect(product).not.toHaveProperty("brand"); // "Unbranded" isn't a brand
    expect(product).not.toHaveProperty("aggregateRating");
    expect(crumbs).toMatchObject({ "@type": "BreadcrumbList" });
  });
  it("maps reserved and sold honestly", () => {
    expect(productJsonLd({ ...piece, status: "reserved" }, "https://t")[0]).toMatchObject({ offers: { availability: "https://schema.org/OutOfStock" } });
    expect(productJsonLd({ ...piece, status: "sold", brand: "Levi's" }, "https://t")[0]).toMatchObject({
      offers: { availability: "https://schema.org/SoldOut" }, brand: { name: "Levi's" },
    });
  });
});

describe("shopJsonLd and jsonLdText", () => {
  it("names the shop, its TikTok and Instagram", () => {
    expect(shopJsonLd("https://thriftesque.com")[0]).toMatchObject({
      "@type": "OnlineStore", sameAs: ["https://www.tiktok.com/@thriftesque", "https://www.instagram.com/thriftesqueqa/"],
    });
  });
  it("can't be broken out of with a script tag in a name", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("</script>");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("productSnippet (D-058)", () => {
  it("leads with the description and fits a search result", () => {
    const long = { ...piece, description: "Navy knit with a big yellow star across the front. Soft wool blend, ribbed cuffs and hem, barely worn. Fits relaxed through the body." };
    const s = productSnippet(long);
    expect(s.startsWith("Navy knit with a big yellow star across the front.")).toBe(true);
    expect(s).toContain("Size M, 140 QAR, very good condition. One of one, order on WhatsApp.");
    expect(s.length).toBeLessThanOrEqual(160);
  });
  it("says sold or reserved first, and falls back without a description", () => {
    expect(productSnippet({ ...piece, status: "sold" })).toMatch(/^Cotton twill\. Sold\. Size M/);
    expect(productSnippet({ ...piece, description: null })).toBe("Size M · Very good · 90s. One of one, order on WhatsApp.");
  });
});

describe("productSnippet on sale (D-060)", () => {
  it("mentions the old price while the piece can still be bought", () => {
    expect(productSnippet({ ...piece, wasPrice: 200 })).toContain("140 QAR (was 200)");
    expect(productSnippet({ ...piece, wasPrice: 200, status: "sold" })).not.toContain("was 200");
  });
});
