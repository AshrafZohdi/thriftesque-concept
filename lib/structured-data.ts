// schema.org JSON-LD for search engines: the shop on the home page, and each piece with its price, availability and condition
// on its product page. Built only from real product data; nothing here is invented (no ratings, no reviews, no stock counts).
import type { ShopProduct } from "./shop-model";
import { INSTAGRAM, SITE_DESCRIPTION, TIKTOK } from "./site";

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
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Qatar" },
      currenciesAccepted: "QAR",
      sameAs: [TIKTOK.url, INSTAGRAM.url],
    },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": `${siteUrl}/#website`, name: "Thriftesque", url: `${siteUrl}/` },
  ];
}

export function productJsonLd(p: ShopProduct, siteUrl: string) {
  const url = `${siteUrl}/p/${p.code}`;
  const facts = [p.size && `Size ${p.size}.`, p.era && `${p.era}.`, p.condition && `Condition: ${p.condition}.`].filter(Boolean).join(" ");
  const description = [p.description, facts].filter(Boolean).join(" ") || `${p.name}. One of one.`;
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
      ...(p.category && { category: p.category }),
      ...(p.size && { size: p.size }),
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

// The product page's search snippet (D-058): the piece's own description first, cut at a sentence or word so it reads
// whole, then size, price and how to order. About 160 characters, which is what search results show.
export function productSnippet(p: Pick<ShopProduct, "description" | "size" | "price" | "condition" | "era" | "status"> & Partial<Pick<ShopProduct, "wasPrice">>): string {
  const state = p.status === "sold" ? "Sold. " : p.status === "reserved" ? "Reserved. " : "";
  const was = p.wasPrice && p.status !== "sold" ? ` (was ${p.wasPrice})` : "";
  const facts = `${state}${[p.size && `Size ${p.size}`, `${p.price} QAR${was}`, p.condition && `${p.condition.toLowerCase()} condition`].filter(Boolean).join(", ")}. One of one, order on WhatsApp.`;
  const desc = (p.description ?? "").replace(/\s+/g, " ").trim();
  if (!desc) return `${state}${[p.size && `Size ${p.size}`, p.condition, p.era, `${p.price} QAR`].filter(Boolean).join(" · ")}. One of one, order on WhatsApp.`;
  const room = 160 - facts.length - 1;
  let lead = desc;
  if (lead.length > room) {
    const cut = lead.slice(0, room);
    const sentence = cut.lastIndexOf(". ");
    lead = sentence > room * 0.5 ? cut.slice(0, sentence + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
  }
  return `${/[.!?…]$/.test(lead) ? lead : `${lead}.`} ${facts}`;
}
