import type { MetadataRoute } from "next";
import { getShop } from "@/lib/shop";
import { siteUrl } from "@/lib/site";

// Cached like the shop pages and refreshed when the dashboard saves (D-021). Sold pieces are left out: their pages still work
// for old links, but there's nothing left to find.
export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getShop();
  return [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    ...products
      .filter((p) => p.status !== "sold")
      .map((p) => ({ url: `${siteUrl}/p/${p.code}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
