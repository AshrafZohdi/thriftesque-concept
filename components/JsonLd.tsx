import { jsonLdText } from "@/lib/structured-data";

// Structured data for search engines. Not executable, so the CSP doesn't apply; jsonLdText keeps it inside its tag.
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
