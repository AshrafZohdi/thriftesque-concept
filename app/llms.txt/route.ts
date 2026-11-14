// /llms.txt (D-058): a plain summary for AI assistants and their crawlers (llmstxt.org): what the shop is, how ordering works,
// the FAQ answers and what's in stock, with links. Built from the same data as the pages, cached like them, and refreshed on
// every dashboard save (actions.ts revalidates "/llms.txt").
import { shopFaq } from "@/lib/faq";
import { getShop } from "@/lib/shop";
import { SITE_DESCRIPTION, siteUrl } from "@/lib/site";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const { products, settings } = await getShop();
  const live = products.filter((p) => p.status === "live");
  const line = (p: (typeof live)[number]) =>
    `- [${p.name}](${siteUrl}/p/${p.code}): ${p.category}, size ${p.size}, ${p.price} QAR, ${p.era}, ${p.condition.toLowerCase()} condition${p.colour ? `, ${p.colour.toLowerCase()}` : ""}`;
  const body = [
    "# Thriftesque",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Prices are in Qatari riyals (QAR). Measurements are in cm, laid flat. There is no online checkout: customers order with one WhatsApp message from their bag on this site.",
    "",
    "## Questions",
    "",
    ...shopFaq(settings.details).flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    `## In stock now (${live.length})`,
    "",
    ...(live.length ? live.map(line) : ["Nothing right now. New pieces arrive with each drop."]),
    "",
    "## Links",
    "",
    `- [Shop](${siteUrl}/): every piece in the current drop`,
    `- [Terms](${siteUrl}/terms) and [Privacy](${siteUrl}/privacy)`,
    `- [Sitemap](${siteUrl}/sitemap.xml)`,
    "- [TikTok @thriftesque](https://www.tiktok.com/@thriftesque)",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
