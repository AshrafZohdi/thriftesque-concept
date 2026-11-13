import type { MetadataRoute } from "next";
import { isPreview, siteUrl } from "@/lib/site";

// The shop is public. Team pages and the API aren't for search engines (they're also noindex).
export default function robots(): MetadataRoute.Robots {
  // While the domain shows sample pieces, keep every crawler out (D-044).
  if (isPreview) return { rules: { userAgent: "*", disallow: "/" }, sitemap: `${siteUrl}/sitemap.xml` };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/login", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
