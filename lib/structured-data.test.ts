import { describe, expect, it } from "vitest";
import type { ShopProduct } from "./shop-model";
import { jsonLdText, productJsonLd, shopJsonLd } from "./structured-data";

const piece: ShopProduct = {
  code: "TQ-0705", name: "Butter yellow pinafore", brand: "Unbranded", era: "90s", category: "Dresses", size: "M", price: 140,
  condition: "Very good", colour: "Yellow", measurements: [], status: "live", photos: ["https://x.supabase.co/a.webp"],
  cutout: null, description: "Cotton twill.", stylingTip: null,
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
  it("names the shop and its TikTok", () => {
    expect(shopJsonLd("https://thriftesque.com")[0]).toMatchObject({ "@type": "OnlineStore", sameAs: ["https://www.tiktok.com/@thriftesque"] });
  });
  it("can't be broken out of with a script tag in a name", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("</script>");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)</script>");
  });
});
