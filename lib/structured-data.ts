// schema.org JSON-LD for search engines: the shop on the home page, and each piece with its price, availability and condition
// on its product page. Built only from real product data; nothing here is invented (no ratings, no reviews, no stock counts).
import type { ShopProduct } from "./shop-model";

const TIKTOK = "https://www.tiktok.com/@thriftesque";

// Reserved pieces may come back if the buyer doesn't pay, so they're out of stock rather than sold out.
const AVAILABILITY = { live: "InStock", reserved: "OutOfStock", sold: "SoldOut" } as const;

export function shopJsonLd(siteUrl: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${siteUrl}/#store`,
      name: "Thriftesque",
      url: `${siteUrl}/`,
      logo: `${siteUrl}/icon-512.png`,
      description: "Hand-picked secondhand clothing in Qatar. Every piece is one of one, ordered on WhatsApp.",
      areaServed: { "@type": "Country", name: "Qatar" },
      currenciesAccepted: "QAR",
      sameAs: [TIKTOK],
    },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${siteUrl}/#website`, name: "Thriftesque", url: `${siteUrl}/` },
  ];
}

export function productJsonLd(p: ShopProduct, siteUrl: string) {
  const url = `${siteUrl}/p/${p.code}`;
  const description = [p.description, `Size ${p.size}. ${p.era}. Condition: ${p.condition}.`].filter(Boolean).join(" ");
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: p.name,
      sku: p.code,
      url,
      image: p.photos,
      description,
      category: p.category,
      size: p.size,
      ...(p.colour ? { color: p.colour } : {}),
      ...(p.brand && p.brand !== "Unbranded" ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      itemCondition: "https://schema.org/UsedCondition",
      offers: {
        "@type": "Offer",
        url,
        price: p.price,
        priceCurrency: "QAR",
        availability: `https://schema.org/${AVAILABILITY[p.status]}`,
        itemCondition: "https://schema.org/UsedCondition",
        seller: { "@id": `${siteUrl}/#store` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "The drop", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: p.name, item: url },
      ],
    },
  ];
}

// Safe inside a <script> tag: a "</script>" or "<!--" in a product name can't end the tag early.
export function jsonLdText(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
