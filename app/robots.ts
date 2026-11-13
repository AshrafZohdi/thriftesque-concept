import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// The shop is public. Team pages and the API aren't for search engines (they're also noindex).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/login", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
