import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { Band, Faq, Footer, Header, HowToOrder, Section, Strip } from "@/components/Site";
import { BagButton } from "@/components/shop/BagDrawer";
import { Catalog } from "@/components/shop/Catalog";
import { Hero } from "@/components/shop/Hero";
import { Looks, LooksIntro } from "@/components/shop/Looks";
import { OutfitBuilder } from "@/components/shop/OutfitBuilder";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { initialOutfit, pools } from "@/lib/outfit";
import { faqJsonLd, shopFaq } from "@/lib/faq";
import { getShop } from "@/lib/shop";
import { SITE_DESCRIPTION, SITE_TITLE, siteUrl } from "@/lib/site";
import { shopJsonLd } from "@/lib/structured-data";
import { waLink } from "@/lib/wa";

// Cached and refreshed only when the dashboard saves (revalidatePath, D-021).
export const revalidate = false;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  // The share card WhatsApp and TikTok show for the home page (scripts/make-og-image.mjs makes it).
  openGraph: {
    type: "website", siteName: "Thriftesque", title: SITE_TITLE, description: SITE_DESCRIPTION, url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Thriftesque: pre-loved pieces, one of each" }],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: ["/og.jpg"] },
};

export default async function ShopPage() {
  const { products, looks, settings } = await getShop();
  const live = products.filter((p) => p.status === "live");
  const faq = shopFaq(settings.details);
  const hasBuilder = initialOutfit(pools(products)) !== null;
  const nav: [string, string][] = [
    ...(looks.length ? [["/#looks", "Looks"] as [string, string]] : []),
    ...(hasBuilder ? [["/#outfit", "Build an outfit"] as [string, string]] : []),
    ["/#shop", "The drop"],
    ["/#how", "How to order"],
  ];
  return (
    <ShopProvider products={products} settings={settings} hasBuilder={hasBuilder}>
      <div data-page>
        <Strip dropName={settings.dropName} />
        <Header nav={nav} right={<BagButton />} />
        <main>
          <JsonLd data={shopJsonLd(siteUrl)} />
          <Hero piece={live.find((p) => p.cutout)} liveCount={live.length} dropName={settings.dropName} firstSection={looks.length ? "looks" : "shop"} />
          <Band dropName={settings.dropName} />
          {looks.length > 0 && (
            <Section id="looks" kicker="Looks" title="Looks from this drop" intro={<LooksIntro looks={looks} />}>
              <Looks looks={looks} />
            </Section>
          )}
          {hasBuilder && (
            <Section id="outfit" kicker="Build an outfit" title="Make your own look" intro="Tap the arrows or swipe a piece to switch it. Lock what you like and Shuffle the rest. Tap a piece for its measurements.">
              <OutfitBuilder />
            </Section>
          )}
          <Section id="shop" kicker={settings.dropName || "This week"} title="The drop" intro="Tap a piece for measurements and condition.">
            <Catalog />
          </Section>
          <HowToOrder details={settings.details} />
          <Faq items={faq} />
          <JsonLd data={faqJsonLd(faq)} />
        </main>
        <Footer waHref={waLink(settings.whatsappNumber, "Hi Thriftesque!")} />
      </div>
    </ShopProvider>
  );
}
